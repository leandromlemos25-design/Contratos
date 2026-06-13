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

// -----------------------------------------------------------------------------
//  Padrões editáveis das condições jurídicas do contrato. Fonte ÚNICA: usados
//  tanto no estado inicial do formulário quanto no preenchimento do contrato.
// -----------------------------------------------------------------------------
export const CONTRATO_PADROES = {
  escopoServico:
    'implantação e configuração da plataforma, parametrização de funis e etapas de vendas, e desenvolvimento das automações de processos comerciais combinadas',
  periodoLicenca: '12 (doze) meses',
  prazoAceite: '7 (sete) dias',
  diasAtraso: '10 (dez)',
  avisoPrevio: '30 (trinta) dias',
  prazoSanar: '10 (dez) dias',
  multa: '20% (vinte por cento) sobre o valor total inicial',
  garantiaDefeitos: '30 (trinta) dias',
  indiceReajuste: 'IPCA (IBGE)',
  janelaExportacao: '15 (quinze) dias',
}

// =============================================================================
//  TEXTO-BASE DO CONTRATO  —  fonte única da verdade.
//
//  REGRAS:
//   • Não reescreva cláusulas a cada geração: o app só substitui as
//     variáveis {{ASSIM}} pelos dados do formulário.
//   • Trechos entre {{#MENSALIDADE}} ... {{/MENSALIDADE}} só entram quando
//     HÁ mensalidade; {{#SEM_MENSALIDADE}} ... {{/SEM_MENSALIDADE}} só quando NÃO há.
//   • Os sub-itens condicionais ficam SEMPRE por último em cada cláusula, para
//     a numeração N.M não deixar buracos quando o bloco some.
//
//  Variáveis disponíveis:
//   Partes:    {{CONTRATANTE_NOME}} {{CONTRATANTE_DOC}} {{CONTRATANTE_ENDERECO}}
//              {{CONTRATANTE_REP_CLAUSULA}} {{CONTRATADO_NOME}} {{CONTRATADO_DOC}} {{CONTRATADO_ENDERECO}}
//   Valores:   {{VALOR_LICENCA}} {{VALOR_IMPLANTACAO}} {{TOTAL_INICIAL}} {{VALOR_MENSALIDADE}}
//   Escopo:    {{ESCOPO}}
//   Condições: {{FORMA_PAGAMENTO}} {{DIAS_ATRASO}} {{PRAZO_IMPLANTACAO}} {{PRAZO_ACEITE}}
//              {{PERIODO_LICENCA}} {{AVISO_PREVIO}} {{PRAZO_SANAR}} {{MULTA}}
//              {{GARANTIA_DEFEITOS}} {{INDICE_REAJUSTE}} {{JANELA_EXPORTACAO}}
//              {{FORO_CIDADE}} {{DATA_EXTENSO}}
// =============================================================================
export const CONTRATO_BASE = `CONTRATO DE LICENCIAMENTO DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA

CONTRATANTE: {{CONTRATANTE_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATANTE_DOC}}, com endereço em {{CONTRATANTE_ENDERECO}}{{CONTRATANTE_REP_CLAUSULA}}, doravante denominado(a) CONTRATANTE.

CONTRATADO: {{CONTRATADO_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATADO_DOC}}, com endereço em {{CONTRATADO_ENDERECO}}, doravante denominado(a) CONTRATADO.

As partes, de comum acordo, celebram o presente Contrato de Licenciamento de Uso de Software e Prestação de Serviços de Tecnologia, regido pelo Código Civil (Lei nº 10.406/2002), pela Lei do Software (Lei nº 9.609/1998), pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e, no que couber, pela legislação sobre assinaturas eletrônicas (MP nº 2.200-2/2001 e Lei nº 14.063/2020), mediante as cláusulas e condições seguintes.

CLÁUSULA 1ª — DO OBJETO
1.1. Constitui objeto deste contrato: (a) a disponibilização, mediante revenda/intermediação, do acesso à plataforma de CRM Kommo, operada em modelo SaaS (Software as a Service) por terceiro; (b) os serviços de implantação, configuração e parametrização da plataforma; e (c) o desenvolvimento de automações de processos comerciais (fluxos, integrações e bots).
1.2. O CONTRATADO atua como integrador e revendedor autorizado, não sendo o desenvolvedor nem o titular da plataforma Kommo, limitando-se sua atuação aos termos da autorização concedida pelo titular.
{{#MENSALIDADE}}1.3. Integra também o objeto a prestação de serviço continuado de acompanhamento mensal, nos termos da Cláusula 3ª.
{{/MENSALIDADE}}
CLÁUSULA 2ª — DO ESCOPO E DAS EXCLUSÕES
2.1. O escopo dos serviços compreende: {{ESCOPO}}.
2.2. Salvo previsão expressa, não estão incluídos: provimento de infraestrutura de servidores da plataforma; conectividade de internet do CONTRATANTE; custos de APIs de terceiros (ex.: WhatsApp/Meta); telefonia; widgets do marketplace; e suporte além do expressamente previsto neste contrato.

CLÁUSULA 3ª — DO VALOR, DA FORMA DE PAGAMENTO E DA NOTA FISCAL
3.1. Pelo licenciamento e pela implantação, o CONTRATANTE pagará ao CONTRATADO o valor inicial de {{TOTAL_INICIAL}}, assim composto: licença {{VALOR_LICENCA}} e implantação {{VALOR_IMPLANTACAO}}.
3.2. Forma e condições de pagamento: {{FORMA_PAGAMENTO}}.
3.3. O CONTRATADO emitirá o documento fiscal correspondente aos valores recebidos, na forma da legislação aplicável.
3.4. O atraso superior a {{DIAS_ATRASO}} dias no pagamento, após notificação, autoriza o CONTRATADO a suspender os serviços e o acesso à plataforma, sem prejuízo da cobrança dos valores devidos.
{{#MENSALIDADE}}3.5. Pelo serviço de acompanhamento mensal, o CONTRATANTE pagará a quantia recorrente de {{VALOR_MENSALIDADE}} por mês, devida a partir da conclusão da implantação, reajustável anualmente pela variação do {{INDICE_REAJUSTE}}, ou, na sua extinção, por índice que o substitua.
{{/MENSALIDADE}}
CLÁUSULA 4ª — DOS PRAZOS E DA ENTREGA
4.1. O prazo de implantação é de {{PRAZO_IMPLANTACAO}}, contado do fornecimento, pelo CONTRATANTE, de todos os acessos, credenciais e informações necessários.
4.2. O atraso do CONTRATANTE no fornecimento desses insumos suspende a contagem do prazo do CONTRATADO.
4.3. Concluída a implantação, o CONTRATANTE terá {{PRAZO_ACEITE}} para validar a entrega; o silêncio nesse prazo importa aceite tácito dos serviços.

CLÁUSULA 5ª — DA GARANTIA E DA CORREÇÃO DE DEFEITOS
5.1. Pelo prazo de {{GARANTIA_DEFEITOS}} contado do aceite, o CONTRATADO corrigirá, sem custo adicional, defeitos de conformidade das automações entregues em relação ao escopo contratado.
5.2. Não constituem defeito, e serão objeto de orçamento próprio: novas funcionalidades, alterações de escopo, mudanças decorrentes de atualização ou descontinuação de plataformas e APIs de terceiros, e falhas causadas por uso indevido ou por terceiros.

CLÁUSULA 6ª — DAS OBRIGAÇÕES DO CONTRATANTE
6.1. O CONTRATANTE obriga-se a: (a) fornecer informações, acessos e credenciais corretos e tempestivos; (b) arcar com os custos de serviços e APIs de terceiros necessários à operação; (c) manter a regularidade e a conformidade de suas próprias contas junto a terceiros (ex.: WhatsApp/Meta), inclusive quanto a políticas antispam e de uso; e (d) indicar um responsável para interlocução durante o projeto.

CLÁUSULA 7ª — DA ASSINATURA DO SOFTWARE DE TERCEIRO (KOMMO)
7.1. O acesso à plataforma Kommo depende de assinatura recorrente, de natureza continuada, paga em ciclos e sujeita às condições, prazos mínimos e reajustes definidos pelo titular da plataforma.
7.2. O valor de licença previsto na Cláusula 3ª refere-se ao período inicial de {{PERIODO_LICENCA}}. A renovação da assinatura, após esse período, será objeto de ajuste próprio entre as partes; a não renovação implica a suspensão do acesso pelo titular da plataforma, sem responsabilidade do CONTRATADO.
7.3. Eventuais reajustes praticados pelo titular da plataforma poderão ser repassados ao CONTRATANTE, mediante comunicação prévia.
7.4. O CONTRATANTE declara conhecer e aderir aos termos de uso e às políticas do titular da plataforma, aos quais seu uso fica subordinado.

CLÁUSULA 8ª — DA PROPRIEDADE INTELECTUAL
8.1. Nos termos do Art. 4º da Lei nº 9.609/1998, pertencem exclusivamente ao CONTRATADO todos os direitos patrimoniais, códigos-fonte, lógicas estruturais, scripts, parametrizações e arquiteturas desenvolvidos para as automações e bots objeto deste contrato.
8.2. O CONTRATADO outorga ao CONTRATANTE licença de uso não exclusiva e intransferível, vigente enquanto durar a relação contratual, vedada a cópia, a engenharia reversa ou a cessão dos fluxos lógicos a terceiros.
8.3. Os dados e cadastros inseridos pelo CONTRATANTE na plataforma são de sua exclusiva e inalienável propriedade.

CLÁUSULA 9ª — DA LIMITAÇÃO DE RESPONSABILIDADE
9.1. O CONTRATADO não responde por lucros cessantes, perda de dados ou interrupções decorrentes de: (i) instabilidade ou indisponibilidade da plataforma Kommo; (ii) alterações em APIs de terceiros (ex.: WhatsApp/Meta); (iii) falha na conexão de internet do CONTRATANTE; ou (iv) uso indevido pelo CONTRATANTE.
9.2. Ressalvadas as hipóteses de dolo e os direitos indisponíveis assegurados por lei, a responsabilidade total do CONTRATADO fica limitada ao valor efetivamente pago neste contrato.

CLÁUSULA 10ª — DA PROTEÇÃO DE DADOS (LGPD)
10.1. O CONTRATANTE atua como CONTROLADOR dos dados pessoais tratados na plataforma, cabendo-lhe definir as finalidades, as bases legais e o atendimento aos titulares e à ANPD.
10.2. O CONTRATADO atua como OPERADOR, tratando dados pessoais apenas conforme as instruções documentadas do CONTRATANTE e na medida necessária à prestação dos serviços.
10.3. O CONTRATADO obriga-se a: (a) adotar medidas técnicas e administrativas de segurança razoáveis; (b) comunicar ao CONTRATANTE, sem demora injustificada, incidentes de segurança de que tiver conhecimento; (c) submeter-se ao dever de sigilo; e (d) ao término do contrato, eliminar ou devolver os dados pessoais a que tiver acesso, salvo obrigação legal de retenção.
10.4. O CONTRATANTE autoriza o uso do titular da plataforma (Kommo) e de provedores necessários como suboperadores, cujo armazenamento ocorre em sua infraestrutura.

CLÁUSULA 11ª — DA CONFIDENCIALIDADE
11.1. As partes obrigam-se a manter sigilo sobre as informações confidenciais a que tiverem acesso, durante e após a vigência do contrato, salvo obrigação legal de divulgação.

CLÁUSULA 12ª — DA VIGÊNCIA E DA RESCISÃO
{{#SEM_MENSALIDADE}}12.1. O contrato vigora até a conclusão e o aceite da implantação, extinguindo-se pelo cumprimento do objeto.
{{/SEM_MENSALIDADE}}{{#MENSALIDADE}}12.1. O contrato vigora por prazo indeterminado a partir da conclusão da implantação, podendo qualquer das partes rescindi-lo mediante aviso prévio de {{AVISO_PREVIO}}.
{{/MENSALIDADE}}12.2. A rescisão imotivada antes da conclusão da implantação obriga ao pagamento dos serviços já executados até a data da rescisão.
12.3. O descumprimento de obrigação contratual por qualquer das partes, não sanado em {{PRAZO_SANAR}} após notificação, autoriza a parte inocente a rescindir o contrato, sem prejuízo de multa de {{MULTA}} a cargo da parte inadimplente e das perdas e danos cabíveis.
12.4. Os valores de licença e de períodos já pagos não são restituíveis em caso de rescisão antecipada.
12.5. Extinto o contrato, o CONTRATANTE terá {{JANELA_EXPORTACAO}} para exportar seus dados da plataforma, observadas as condições do titular.

CLÁUSULA 13ª — DA ASSINATURA ELETRÔNICA
13.1. As partes reconhecem a validade e a eficácia da assinatura deste contrato por meio eletrônico, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020, incluindo a coleta por plataforma de assinatura digital com trilha de auditoria, que produzirá os mesmos efeitos da assinatura manuscrita.

CLÁUSULA 14ª — DO CASO FORTUITO E DA FORÇA MAIOR
14.1. Nenhuma das partes responderá por descumprimento decorrente de caso fortuito ou força maior, nos termos do Art. 393 do Código Civil, suspendendo-se as obrigações afetadas enquanto durar o evento.

CLÁUSULA 15ª — DAS DISPOSIÇÕES GERAIS
15.1. Este contrato não gera vínculo empregatício, societário ou de exclusividade entre as partes.
15.2. Nenhuma das partes poderá ceder ou transferir este contrato a terceiros sem o consentimento prévio e escrito da outra.
15.3. Qualquer alteração só terá validade mediante aditivo escrito assinado por ambas as partes.

CLÁUSULA 16ª — DO FORO
16.1. Fica eleito o foro da comarca de {{FORO_CIDADE}} para dirimir as controvérsias oriundas deste contrato. Tratando-se de relação de consumo, prevalecerá o foro do domicílio do CONTRATANTE consumidor, na forma da lei.

E, por estarem de pleno acordo, firmam o presente instrumento em 2 (duas) vias de igual teor, ou por assinatura eletrônica.

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
