"""
O Caçador de Ofertas — Script de Atualização via Keepa API → Google Sheets
v3.0 — Março 2026

Correções aplicadas:
- Keepa retorna preços em centavos (÷100) e dados intercalados [timestamp, preço, timestamp, preço...]
- Preço antigo calculado como média dos últimos 90 dias (não max artificial)
- Deduplicação por ASIN (atualiza linha existente em vez de duplicar)
- Tratamento de erros robusto com logging
- Colunas na ordem exata esperada pelo site:
  loja | titulo | preco_antigo | preco_novo | link | data | emoji | categoria | selo | ativo | imagem
"""

import os
import sys
import logging
from datetime import datetime

import keepa
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

# ══════════════════════════════════════════
# CONFIGURAÇÃO
# ══════════════════════════════════════════

load_dotenv()

KEEPA_KEY = os.getenv("KEEPA_KEY")
SHEET_ID = os.getenv("SHEET_ID")
AMAZON_TAG = os.getenv("AMAZON_TAG", "ocacadordeofertas-20")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json")

# ASINs para monitorar — substitua pelos seus
# Use o Keepa Product Finder para gerar listas por categoria
ASINS = os.getenv("ASINS", "").split(",") if os.getenv("ASINS") else [
    # Exemplos — substitua por ASINs reais do Amazon.com.br
    # "B0XXXXXXXXX",
    # "B0YYYYYYYYY",
]

# Remove ASINs vazios
ASINS = [a.strip() for a in ASINS if a.strip()]

# Mapeamento de categorias Keepa (categoryTree root) → nome legível
CATEGORIAS_KEEPA = {
    "Electronics": "Eletrônicos",
    "Computers": "Informática",
    "Cell Phones & Accessories": "Celulares",
    "Home & Kitchen": "Casa e Cozinha",
    "Sports & Outdoors": "Esportes",
    "Beauty & Personal Care": "Beleza",
    "Toys & Games": "Brinquedos",
    "Books": "Livros",
    "Fashion": "Moda",
    "Baby": "Bebê",
    "Health & Household": "Saúde",
    "Grocery & Gourmet Food": "Alimentos",
    "Pet Supplies": "Pet",
    "Tools & Home Improvement": "Ferramentas",
    "Automotive": "Automotivo",
}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════
# VALIDAÇÃO
# ══════════════════════════════════════════

def validar_config():
    """Verifica se todas as variáveis obrigatórias estão presentes."""
    erros = []
    if not KEEPA_KEY:
        erros.append("KEEPA_KEY não definida")
    if not SHEET_ID:
        erros.append("SHEET_ID não definida")
    if not ASINS:
        erros.append("Nenhum ASIN configurado (defina ASINS no .env ou no código)")
    if not os.path.exists(CREDENTIALS_FILE):
        erros.append(f"Arquivo de credenciais Google não encontrado: {CREDENTIALS_FILE}")
    if erros:
        for e in erros:
            log.error(e)
        sys.exit(1)


# ══════════════════════════════════════════
# FUNÇÕES AUXILIARES KEEPA
# ══════════════════════════════════════════

def extrair_preco_atual(csv_data, indice_tipo=1):
    """
    Extrai o preço mais recente de um array CSV da Keepa.

    A Keepa retorna dados no formato:
      csv[0] = Amazon price history
      csv[1] = New (marketplace) price history
      csv[2] = Used price history
      ...

    Cada array é intercalado: [keepa_time_1, preco_1, keepa_time_2, preco_2, ...]
    Preços em centavos (dividir por 100). Valor -1 = indisponível.

    Args:
        csv_data: dict com arrays de preços da Keepa
        indice_tipo: 0=Amazon, 1=New, 2=Used

    Returns:
        float ou None se indisponível
    """
    if not csv_data or indice_tipo not in csv_data:
        return None

    dados = csv_data[indice_tipo]
    if dados is None or len(dados) < 2:
        return None

    # Pegar o último preço (índice ímpar do final)
    preco_centavos = dados[-1]

    if preco_centavos is None or preco_centavos <= 0:
        return None

    return preco_centavos / 100.0


def calcular_preco_medio_90d(csv_data, indice_tipo=1):
    """
    Calcula o preço médio dos últimos 90 dias para servir como 'preço antigo' real.

    Usa a média (não o máximo) para evitar descontos artificialmente inflados.
    Keepa time = minutos desde 21/01/2011.

    Returns:
        float ou None
    """
    if not csv_data or indice_tipo not in csv_data:
        return None

    dados = csv_data[indice_tipo]
    if dados is None or len(dados) < 4:
        return None

    # Keepa time para 90 dias atrás
    # Keepa epoch: 21/01/2011 00:00 UTC
    keepa_epoch = datetime(2011, 1, 21)
    agora = datetime.utcnow()
    limite_90d = int((agora - keepa_epoch).total_seconds() / 60) - (90 * 24 * 60)

    precos_validos = []
    # Iterar em pares (timestamp, preço)
    for i in range(0, len(dados) - 1, 2):
        timestamp = dados[i]
        preco = dados[i + 1]

        if timestamp >= limite_90d and preco is not None and preco > 0:
            precos_validos.append(preco / 100.0)

    if not precos_validos:
        return None

    return round(sum(precos_validos) / len(precos_validos), 2)


def extrair_categoria(product):
    """Extrai a categoria legível a partir dos metadados Keepa."""
    cat_tree = product.get("categoryTree")
    if cat_tree and len(cat_tree) > 0:
        # A raiz da árvore de categorias
        raiz = cat_tree[0].get("name", "")
        return CATEGORIAS_KEEPA.get(raiz, raiz or "Geral")

    # Fallback: rootCategory
    root = product.get("rootCategory")
    if root:
        return str(root)

    return "Geral"


def extrair_imagem(product):
    """Extrai URL da imagem principal do produto Keepa."""
    images = product.get("imagesCSV")
    if images:
        # imagesCSV é uma string com URLs separadas por vírgula
        primeira = images.split(",")[0].strip()
        if primeira:
            return f"https://images-na.ssl-images-amazon.com/images/I/{primeira}"

    return ""


# ══════════════════════════════════════════
# GOOGLE SHEETS — LEITURA E ESCRITA
# ══════════════════════════════════════════

def conectar_sheets():
    """Conecta ao Google Sheets via Service Account."""
    scope = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scope)
    client = gspread.authorize(creds)
    return client.open_by_key(SHEET_ID).worksheet("Página1")


def obter_asins_existentes(sheet):
    """
    Lê a planilha e retorna um dicionário {asin: numero_da_linha}.

    Identifica o ASIN a partir do link da Amazon (coluna 5 = link).
    Isso permite atualizar linhas existentes em vez de duplicar.
    """
    mapa = {}
    try:
        todos = sheet.get_all_values()
        for idx, row in enumerate(todos):
            if idx == 0:
                continue  # pular header
            if len(row) >= 5:
                link = row[4]  # coluna E = link
                # Extrair ASIN do link: .../dp/BXXXXXXXXXX?...
                if "/dp/" in link:
                    asin = link.split("/dp/")[1].split("?")[0].split("/")[0]
                    mapa[asin] = idx + 1  # gspread usa base 1
    except Exception as e:
        log.warning(f"Erro ao ler ASINs existentes: {e}")

    return mapa


def verificar_header(sheet):
    """Garante que o header da planilha existe e está na ordem correta."""
    HEADER = [
        "loja", "titulo", "preco_antigo", "preco_novo", "link",
        "data", "emoji", "categoria", "selo", "ativo", "imagem"
    ]
    try:
        primeira_linha = sheet.row_values(1)
        if not primeira_linha or primeira_linha[0].lower().strip() != "loja":
            log.info("Header não encontrado. Criando header na planilha...")
            sheet.insert_row(HEADER, 1)
            log.info("Header criado com sucesso.")
    except Exception as e:
        log.warning(f"Erro ao verificar header: {e}. Tentando criar...")
        try:
            sheet.insert_row(HEADER, 1)
        except Exception as e2:
            log.error(f"Falha ao criar header: {e2}")


# ══════════════════════════════════════════
# EXECUÇÃO PRINCIPAL
# ══════════════════════════════════════════

def main():
    validar_config()

    log.info(f"Iniciando atualização: {len(ASINS)} ASINs para processar")

    # Conectar à Keepa
    try:
        api = keepa.Keepa(KEEPA_KEY)
        tokens = api.tokens_left
        log.info(f"Keepa conectada. Tokens restantes: {tokens}")

        if tokens < len(ASINS) * 2:
            log.warning(f"Poucos tokens Keepa ({tokens}). Pode não completar todos os ASINs.")
    except Exception as e:
        log.error(f"Falha ao conectar à Keepa: {e}")
        sys.exit(1)

    # Conectar ao Google Sheets
    try:
        sheet = conectar_sheets()
        verificar_header(sheet)
        asins_existentes = obter_asins_existentes(sheet)
        log.info(f"Sheets conectado. {len(asins_existentes)} ASINs já existentes na planilha.")
    except Exception as e:
        log.error(f"Falha ao conectar ao Google Sheets: {e}")
        sys.exit(1)

    # Consultar Keepa em lotes de 20 (limite da API)
    BATCH_SIZE = 20
    atualizados = 0
    novos = 0
    erros = 0

    for i in range(0, len(ASINS), BATCH_SIZE):
        lote = ASINS[i:i + BATCH_SIZE]
        log.info(f"Processando lote {i // BATCH_SIZE + 1}: {len(lote)} ASINs")

        try:
            # history=True necessário para csv (preços), offers=0 para economizar tokens
            products = api.query(lote, domain="BR", history=True, offers=0)
        except Exception as e:
            log.error(f"Erro na query Keepa (lote {i // BATCH_SIZE + 1}): {e}")
            erros += len(lote)
            continue

        for asin, product in zip(lote, products):
            try:
                if product is None or "title" not in product:
                    log.warning(f"ASIN {asin}: produto não encontrado ou sem título")
                    erros += 1
                    continue

                title = product["title"]
                csv_data = product.get("csv", {})

                # Preço atual (tenta New primeiro, depois Amazon)
                preco_atual = extrair_preco_atual(csv_data, 1)
                if preco_atual is None:
                    preco_atual = extrair_preco_atual(csv_data, 0)

                if preco_atual is None or preco_atual <= 0:
                    log.info(f"ASIN {asin}: sem preço disponível, pulando")
                    continue

                # Preço médio 90 dias (tenta New primeiro, depois Amazon)
                preco_antigo = calcular_preco_medio_90d(csv_data, 1)
                if preco_antigo is None:
                    preco_antigo = calcular_preco_medio_90d(csv_data, 0)
                if preco_antigo is None or preco_antigo <= preco_atual:
                    preco_antigo = preco_atual  # Sem desconto real

                # Calcular desconto real
                desconto = round((preco_antigo - preco_atual) / preco_antigo * 100) if preco_antigo > preco_atual else 0

                # Selo automático baseado no desconto
                selo = ""
                if desconto >= 50:
                    selo = "🔥 MEGA OFERTA"
                elif desconto >= 35:
                    selo = "⚡ OFERTÃO"

                # Extrair metadados
                categoria = extrair_categoria(product)
                imagem = extrair_imagem(product)
                link = f"https://www.amazon.com.br/dp/{asin}?tag={AMAZON_TAG}"
                agora = datetime.now().strftime("%d/%m/%Y %H:%M")

                # Montar linha na ordem exata do site:
                # loja | titulo | preco_antigo | preco_novo | link | data | emoji | categoria | selo | ativo | imagem
                row = [
                    "amazon",
                    title,
                    round(preco_antigo, 2),
                    round(preco_atual, 2),
                    link,
                    agora,
                    "🛒",
                    categoria,
                    selo,
                    "Sim",
                    imagem,
                ]

                # Deduplicação: atualizar se já existe, inserir se é novo
                if asin in asins_existentes:
                    linha_num = asins_existentes[asin]
                    try:
                        sheet.update(f"A{linha_num}:K{linha_num}", [row], value_input_option="USER_ENTERED")
                        atualizados += 1
                        log.info(f"Atualizado: {title[:50]} → R$ {preco_atual} ({desconto}%)")
                    except Exception as e:
                        log.error(f"Erro ao atualizar ASIN {asin} (linha {linha_num}): {e}")
                        erros += 1
                else:
                    try:
                        sheet.append_row(row, value_input_option="USER_ENTERED")
                        novos += 1
                        log.info(f"Novo: {title[:50]} → R$ {preco_atual} ({desconto}%)")
                    except Exception as e:
                        log.error(f"Erro ao inserir ASIN {asin}: {e}")
                        erros += 1

            except Exception as e:
                log.error(f"Erro processando ASIN {asin}: {e}")
                erros += 1

    # Resumo
    log.info("=" * 50)
    log.info(f"CONCLUÍDO!")
    log.info(f"  Novos:       {novos}")
    log.info(f"  Atualizados: {atualizados}")
    log.info(f"  Erros:       {erros}")
    log.info(f"  Tokens Keepa restantes: {api.tokens_left}")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
