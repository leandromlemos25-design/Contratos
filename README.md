# Gerador de Proposta & Contrato

Site simples e moderno (estilo SaaS, responsivo) para gerar, **a partir dos mesmos dados**,
dois documentos:

1. **Proposta comercial**
2. **Contrato de prestação de serviços** (implantação de CRM + automações)

Tudo roda **no navegador** — sem backend, sem banco de dados. Ideal para usar rápido em reunião.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (geralmente `http://localhost:5173`).

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # pré-visualiza o build
```

## Deploy grátis na Vercel

1. Suba o repositório no GitHub.
2. Na Vercel, **New Project → Import** o repositório.
3. Framework detectado automaticamente: **Vite**. Build: `npm run build`, Output: `dist`.
4. **Para o botão "Melhorar com IA" funcionar**, adicione a variável de ambiente
   `ANTHROPIC_API_KEY` em **Settings → Environment Variables** (cole sua chave da
   Anthropic). Sem isso, o app funciona normalmente, só o botão de IA fica indisponível.
5. Deploy. Pronto.

## Revisão de texto com IA (botão "Melhorar com IA")

O campo **Observações** tem um botão que corrige o português e melhora a escrita
usando a IA da Claude.

- A chamada à IA roda numa **função serverless** (`api/melhorar.js`) — sua chave da
  Anthropic fica **escondida no servidor** (variável `ANTHROPIC_API_KEY` na Vercel),
  nunca no navegador.
- O modelo é editável no topo de `api/melhorar.js` (constante `MODEL`). Padrão:
  `claude-haiku-4-5` (rápido e barato). Troque por `claude-sonnet-4-6` ou
  `claude-opus-4-8` se quiser mais qualidade.
- **Em desenvolvimento local** (`npm run dev`), a função serverless não roda — o botão
  só funciona no site publicado na Vercel (ou com `vercel dev`).

## Onde editar

Quase tudo que você precisa ajustar está em **`src/templates.js`**:

- **`CONTRATADO`** — seus dados (nome, CPF/CNPJ, endereço, se é MEI / emite nota fiscal).
  Aparecem na qualificação das partes do contrato.
- **`MARCA`** — nome do negócio e slogan exibidos na interface e na proposta.
- **`CONTRATO_BASE`** — o **texto-base único** do contrato. O app só preenche as
  variáveis `{{ASSIM}}`; você **não reescreve** as cláusulas a cada geração.

### Blocos condicionais do contrato

- `{{#MENSALIDADE}} ... {{/MENSALIDADE}}` → entra **só quando há mensalidade**.
- `{{#SEM_MENSALIDADE}} ... {{/SEM_MENSALIDADE}}` → entra **só quando não há**.

## Busca automática por CNPJ

No campo **CPF ou CNPJ** (seção do contrato), digite um **CNPJ** e clique em
**"Buscar"** — o app consulta a [BrasilAPI](https://brasilapi.com.br) (gratuita,
pública, sem chave) e preenche **razão social** e **endereço completo** do cliente
automaticamente.

- Roda direto no navegador, sem backend.
- **Só funciona com CNPJ** (empresa). Para **CPF** (pessoa física) o preenchimento é
  manual — dados de pessoa física são protegidos e não há API pública.
- Se a consulta falhar ou o CNPJ não existir, o app avisa e mantém o preenchimento manual.

### Busca de endereço por CEP

Há também um campo **CEP** que preenche o endereço do contratante via BrasilAPI
(rua, bairro, cidade - UF, CEP). Útil principalmente para **pessoa física (CPF)**,
onde o CNPJ não ajuda. O **número e o complemento** você adiciona à mão no endereço.

## Lógica da mensalidade (automática nos dois documentos)

- **Mensalidade em branco ou 0** → "Contrato SEM mensalidade".
  A proposta mostra só licença + implantação; o contrato **não** inclui cláusula
  de serviço recorrente.
- **Mensalidade com valor** → "Contrato COM acompanhamento mensal".
  A proposta destaca o total inicial **e** a mensalidade; o contrato inclui as
  cláusulas de serviço continuado e pagamento mensal.

## Recursos

- Botões **Gerar proposta**, **Gerar contrato**, **Copiar** e **Imprimir / PDF**
  (impressão limpa via `window.print`, sem canvas).
- Valores em **R$ no padrão brasileiro** (vírgula decimal, ponto de milhar).
- Aviso fixo na tela: *"Revise este contrato com um advogado antes do primeiro uso real."*

> ⚠️ Os modelos de cláusula são um ponto de partida. **Revise o contrato com um
> advogado antes do primeiro uso real.**
