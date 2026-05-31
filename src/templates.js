// =============================================================================
//  CONFIGURAÇÃO EDITÁVEL  —  edite só este bloco para personalizar o app.
// =============================================================================

// -----------------------------------------------------------------------------
//  SEUS DADOS (CONTRATADO) — aparecem na qualificação das partes do contrato.
// -----------------------------------------------------------------------------
export const CONTRATADO = {
  nome: 'Leandro Morais Lemos',
  documento: '016.234.906-85', // CPF ou CNPJ
  endereco: 'Rua Manoel Gonzalves de Araújo, nº 52, Jardim América, Sacramento - MG, CEP 38190-000',
}

// -----------------------------------------------------------------------------
//  Identidade visual / textos da marca.
// -----------------------------------------------------------------------------
export const MARCA = {
  nomeNegocio: 'SmartFlux',
  slogan: 'Automação inteligente para empresas',
  logo: '/logo-smartflux.jpg', // logo completa (símbolo + texto + slogan)
}

// =============================================================================
//  TEXTO-BASE DO CONTRATO  —  fonte única da verdade.
//
//  REGRAS:
//   • Não reescreva cláusulas a cada geração: o app só substitui as
//     variáveis {{ASSIM}} pelos dados do formulário.
//   • Trechos entre {{#MENSALIDADE}} ... {{/MENSALIDADE}} só entram quando
//     HÁ mensalidade; {{#SEM_MENSALIDADE}} ... {{/SEM_MENSALIDADE}} só quando NÃO há.
//
//  Variáveis disponíveis:
//   Partes:    {{CONTRATANTE_NOME}} {{CONTRATANTE_DOC}} {{CONTRATANTE_ENDERECO}}
//              {{CONTRATADO_NOME}} {{CONTRATADO_DOC}} {{CONTRATADO_ENDERECO}}
//   Valores:   {{VALOR_LICENCA}} {{VALOR_IMPLANTACAO}} {{TOTAL_INICIAL}} {{VALOR_MENSALIDADE}}
//   Escopo:    {{ESCOPO}}
//   Condições: {{FORMA_PAGAMENTO}} {{DIAS_ATRASO}} {{PRAZO_IMPLANTACAO}} {{PRAZO_ACEITE}}
//              {{PERIODO_LICENCA}} {{AVISO_PREVIO}} {{PRAZO_SANAR}} {{MULTA}}
//              {{FORO_CIDADE}} {{DATA_EXTENSO}}
// =============================================================================
export const CONTRATO_BASE = `CONTRATO DE LICENCIAMENTO DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA

CONTRATANTE: {{CONTRATANTE_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATANTE_DOC}}, com endereço em {{CONTRATANTE_ENDERECO}}, doravante denominado(a) CONTRATANTE.

CONTRATADO: {{CONTRATADO_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATADO_DOC}}, com endereço em {{CONTRATADO_ENDERECO}}, doravante denominado(a) CONTRATADO.

As partes, de comum acordo, celebram o presente Contrato de Licenciamento de Uso de Software e Prestação de Serviços de Tecnologia, regido pelo Código Civil (Lei nº 10.406/2002), pela Lei do Software (Lei nº 9.609/1998) e pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), mediante as cláusulas e condições seguintes.

CLÁUSULA 1ª — DO OBJETO
1.1. Constitui objeto deste contrato: (a) a disponibilização, mediante revenda/sublicenciamento, do acesso à plataforma de CRM Kommo, operada em modelo SaaS (Software as a Service) por terceiro; (b) os serviços de implantação, configuração e parametrização da plataforma; e (c) o desenvolvimento de automações de processos comerciais (fluxos, integrações e bots).
{{#MENSALIDADE}}1.2. Integra também o objeto a prestação de serviço continuado de acompanhamento mensal, nos termos da Cláusula 3ª.
{{/MENSALIDADE}}1.3. O CONTRATADO atua como integrador e revendedor/sublicenciador, não sendo o desenvolvedor nem o titular da plataforma Kommo.

CLÁUSULA 2ª — DO ESCOPO E DAS EXCLUSÕES
2.1. O escopo dos serviços compreende: {{ESCOPO}}.
2.2. Salvo previsão expressa, não estão incluídos: provimento de infraestrutura de servidores da plataforma; conectividade de internet do CONTRATANTE; custos de APIs de terceiros (ex.: WhatsApp/Meta); telefonia; widgets do marketplace; e suporte além do expressamente previsto neste contrato.

CLÁUSULA 3ª — DO VALOR E DA FORMA DE PAGAMENTO
3.1. Pelo licenciamento e pela implantação, o CONTRATANTE pagará ao CONTRATADO o valor inicial de {{TOTAL_INICIAL}}, assim composto: licença {{VALOR_LICENCA}} e implantação {{VALOR_IMPLANTACAO}}.
{{#MENSALIDADE}}3.2. Pelo serviço de acompanhamento mensal, o CONTRATANTE pagará a quantia recorrente de {{VALOR_MENSALIDADE}} por mês, devida a partir da conclusão da implantação.
{{/MENSALIDADE}}3.3. Forma e condições de pagamento: {{FORMA_PAGAMENTO}}.
3.4. O atraso superior a {{DIAS_ATRASO}} dias no pagamento, após notificação, autoriza o CONTRATADO a suspender os serviços e o acesso à plataforma, sem prejuízo da cobrança dos valores devidos.

CLÁUSULA 4ª — DOS PRAZOS E DA ENTREGA
4.1. O prazo de implantação é de {{PRAZO_IMPLANTACAO}}, contado do fornecimento, pelo CONTRATANTE, de todos os acessos, credenciais e informações necessários.
4.2. O atraso do CONTRATANTE no fornecimento desses insumos suspende a contagem do prazo do CONTRATADO.
4.3. Concluída a implantação, o CONTRATANTE terá {{PRAZO_ACEITE}} para validar a entrega; o silêncio nesse prazo importa aceite tácito dos serviços.

CLÁUSULA 5ª — DA ASSINATURA DO SOFTWARE DE TERCEIRO (KOMMO)
5.1. O acesso à plataforma Kommo depende de assinatura recorrente, de natureza continuada, paga em ciclos e sujeita às condições, prazos mínimos e reajustes definidos pelo titular da plataforma.
5.2. O valor de licença previsto na Cláusula 3ª refere-se ao período inicial de {{PERIODO_LICENCA}}. A renovação da assinatura, após esse período, será objeto de ajuste próprio entre as partes; a não renovação implica a suspensão do acesso pelo titular da plataforma, sem responsabilidade do CONTRATADO.
5.3. Eventuais reajustes praticados pelo titular da plataforma poderão ser repassados ao CONTRATANTE, mediante comunicação prévia.

CLÁUSULA 6ª — DA PROPRIEDADE INTELECTUAL
6.1. Nos termos do Art. 4º da Lei nº 9.609/1998, pertencem exclusivamente ao CONTRATADO todos os direitos patrimoniais, códigos-fonte, lógicas estruturais, scripts, parametrizações e arquiteturas desenvolvidos para as automações e bots objeto deste contrato.
6.2. O CONTRATADO outorga ao CONTRATANTE licença de uso não exclusiva e intransferível, vigente enquanto durar a relação contratual, vedada a cópia, a engenharia reversa ou a cessão dos fluxos lógicos a terceiros.
6.3. Os dados e cadastros inseridos pelo CONTRATANTE na plataforma são de sua exclusiva e inalienável propriedade.

CLÁUSULA 7ª — DA LIMITAÇÃO DE RESPONSABILIDADE
7.1. O CONTRATADO não responde por lucros cessantes, perda de dados ou interrupções decorrentes de: (i) instabilidade ou indisponibilidade da plataforma Kommo; (ii) alterações em APIs de terceiros (ex.: WhatsApp/Meta); (iii) falha na conexão de internet do CONTRATANTE; ou (iv) uso indevido pelo CONTRATANTE.
7.2. A responsabilidade total do CONTRATADO fica limitada ao valor efetivamente pago neste contrato, ressalvada a hipótese de dolo.

CLÁUSULA 8ª — DA PROTEÇÃO DE DADOS (LGPD)
8.1. O CONTRATANTE atua como CONTROLADOR dos dados pessoais tratados na plataforma, cabendo-lhe as bases legais e o atendimento aos titulares e à ANPD.
8.2. O CONTRATADO atua como OPERADOR, tratando dados pessoais apenas conforme as instruções do CONTRATANTE e na medida necessária à prestação dos serviços.
8.3. O armazenamento dos dados ocorre na infraestrutura do titular da plataforma, na condição de suboperador.

CLÁUSULA 9ª — DA CONFIDENCIALIDADE
9.1. As partes obrigam-se a manter sigilo sobre as informações confidenciais a que tiverem acesso, durante e após a vigência do contrato, salvo obrigação legal de divulgação.

CLÁUSULA 10ª — DA VIGÊNCIA E DA RESCISÃO
{{#SEM_MENSALIDADE}}10.1. O contrato vigora até a conclusão e o aceite da implantação, extinguindo-se pelo cumprimento do objeto.
{{/SEM_MENSALIDADE}}{{#MENSALIDADE}}10.1. O contrato vigora por prazo indeterminado a partir da conclusão da implantação, podendo qualquer das partes rescindi-lo mediante aviso prévio de {{AVISO_PREVIO}}.
{{/MENSALIDADE}}10.2. A rescisão imotivada antes da conclusão da implantação obriga ao pagamento dos serviços já executados até a data da rescisão.
10.3. O descumprimento de obrigação contratual, não sanado em {{PRAZO_SANAR}} após notificação, autoriza a rescisão, sem prejuízo de multa de {{MULTA}} e das perdas e danos cabíveis.

CLÁUSULA 11ª — DAS DISPOSIÇÕES GERAIS
11.1. Este contrato não gera vínculo empregatício, societário ou de exclusividade entre as partes.
11.2. Qualquer alteração só terá validade mediante aditivo escrito assinado por ambas as partes.

CLÁUSULA 12ª — DO FORO
12.1. Fica eleito o foro da comarca de {{FORO_CIDADE}} para dirimir as controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem de pleno acordo, firmam o presente instrumento em 2 (duas) vias de igual teor.

{{FORO_CIDADE}}, {{DATA_EXTENSO}}.


_______________________________________
{{CONTRATANTE_NOME}}
CONTRATANTE


_______________________________________
{{CONTRATADO_NOME}}
CONTRATADO


Testemunhas:

_______________________________________  CPF: ____________________

_______________________________________  CPF: ____________________`
