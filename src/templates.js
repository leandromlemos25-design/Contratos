// =============================================================================
//  CONFIGURAÇÃO EDITÁVEL  —  edite só este bloco para personalizar o app.
// =============================================================================

// -----------------------------------------------------------------------------
//  SEUS DADOS (CONTRATADO) — aparecem na qualificação das partes do contrato.
//  Preencha uma única vez aqui. O app reaproveita em toda geração.
// -----------------------------------------------------------------------------
export const CONTRATADO = {
  nome: 'SEU NOME COMPLETO OU RAZÃO SOCIAL',
  documento: '000.000.000-00', // CPF ou CNPJ
  endereco: 'Rua Exemplo, nº 000, Bairro, Cidade - UF, CEP 00000-000',
  mei: true, // true = sou MEI (Microempreendedor Individual)
  emiteNotaFiscal: true, // true = emito nota fiscal de serviço
}

// -----------------------------------------------------------------------------
//  Identidade visual / textos da marca usados na PROPOSTA e no cabeçalho.
// -----------------------------------------------------------------------------
export const MARCA = {
  nomeNegocio: 'Especialista em CRM & Automação',
  slogan: 'Implantação completa do seu CRM, automações e acompanhamento.',
}

// =============================================================================
//  TEXTO-BASE DO CONTRATO  —  fonte única da verdade.
//
//  REGRAS:
//   • Não reescreva cláusulas a cada geração: o app só substitui as
//     variáveis {{ASSIM}} pelos dados do formulário.
//   • Trechos entre {{#MENSALIDADE}} ... {{/MENSALIDADE}} só entram no
//     documento quando HÁ mensalidade (acompanhamento mensal).
//   • Trechos entre {{#SEM_MENSALIDADE}} ... {{/SEM_MENSALIDADE}} só entram
//     quando NÃO há mensalidade.
//
//  Variáveis disponíveis:
//   Contratante: {{CONTRATANTE_NOME}} {{CONTRATANTE_DOC}} {{CONTRATANTE_ENDERECO}}
//   Contratado:  {{CONTRATADO_NOME}} {{CONTRATADO_DOC}} {{CONTRATADO_ENDERECO}}
//                {{CONTRATADO_REGIME}} {{CONTRATADO_NOTA}}
//   Valores:     {{VALOR_LICENCA}} {{VALOR_IMPLANTACAO}} {{TOTAL_INICIAL}}
//                {{VALOR_MENSALIDADE}}
//   Condições:   {{FORMA_PAGAMENTO}} {{VIGENCIA}} {{FORO_CIDADE}} {{DATA_EXTENSO}}
// =============================================================================
export const CONTRATO_BASE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE IMPLANTAÇÃO DE CRM E AUTOMAÇÃO

Pelo presente instrumento particular, de um lado:

CONTRATANTE: {{CONTRATANTE_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATANTE_DOC}}, com endereço em {{CONTRATANTE_ENDERECO}}, doravante denominado(a) simplesmente CONTRATANTE;

e, de outro lado,

CONTRATADO: {{CONTRATADO_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{CONTRATADO_DOC}}, {{CONTRATADO_REGIME}}com endereço em {{CONTRATADO_ENDERECO}}, doravante denominado(a) simplesmente CONTRATADO;

As partes acima identificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições a seguir, e ainda pela legislação aplicável, em especial o Código Civil Brasileiro (Lei nº 10.406/2002) e o Código de Defesa do Consumidor, quando cabível.

CLÁUSULA 1ª — DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pelo CONTRATADO, dos serviços de implantação e configuração de plataforma de CRM (Customer Relationship Management), incluindo a parametrização de funis de venda, cadastro de etapas, configuração de automações de processos comerciais e integrações com os canais de atendimento indicados pelo CONTRATANTE.
1.2. Integram o objeto, ainda, a estruturação inicial dos fluxos de trabalho, a importação assistida de dados quando aplicável e a orientação técnica para uso da plataforma pela equipe do CONTRATANTE.
{{#MENSALIDADE}}1.3. O objeto contempla, adicionalmente, o serviço continuado de ACOMPANHAMENTO MENSAL, compreendendo suporte técnico, ajustes nas automações, manutenção das configurações, otimização contínua dos processos e atendimento às dúvidas operacionais da equipe do CONTRATANTE, prestado de forma recorrente durante a vigência deste contrato.
{{/MENSALIDADE}}{{#SEM_MENSALIDADE}}1.3. O objeto deste contrato restringe-se à implantação inicial descrita nesta cláusula, NÃO abrangendo serviço de acompanhamento mensal, suporte continuado ou manutenção recorrente, os quais, caso desejados, deverão ser objeto de contratação à parte.
{{/SEM_MENSALIDADE}}
CLÁUSULA 2ª — DO VALOR E DA FORMA DE PAGAMENTO
2.1. Pelos serviços de implantação descritos na Cláusula 1ª, o CONTRATANTE pagará ao CONTRATADO o valor total de {{TOTAL_INICIAL}}, assim composto: (i) licença de uso da plataforma — {{VALOR_LICENCA}}; e (ii) implantação e configuração — {{VALOR_IMPLANTACAO}}.
2.2. O pagamento do valor de implantação será realizado da seguinte forma: {{FORMA_PAGAMENTO}}.
{{#MENSALIDADE}}2.3. Pelo serviço de acompanhamento mensal descrito no item 1.3, o CONTRATANTE pagará ao CONTRATADO o valor mensal de {{VALOR_MENSALIDADE}}, devido a partir da conclusão da implantação e durante toda a vigência deste contrato, com vencimento no mesmo dia de cada mês subsequente.
2.4. O atraso no pagamento de qualquer parcela acarretará multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, sem prejuízo da correção monetária.
2.5. {{CONTRATADO_NOTA}}
{{/MENSALIDADE}}{{#SEM_MENSALIDADE}}2.3. O atraso no pagamento de qualquer parcela acarretará multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, sem prejuízo da correção monetária.
2.4. {{CONTRATADO_NOTA}}
{{/SEM_MENSALIDADE}}

CLÁUSULA 3ª — DO PRAZO E DA VIGÊNCIA
3.1. O prazo para execução e entrega dos serviços de implantação é de {{VIGENCIA}}, contado do recebimento, pelo CONTRATADO, dos dados, acessos e informações necessários ao início dos trabalhos.
{{#MENSALIDADE}}3.2. O serviço de acompanhamento mensal vigorará por prazo indeterminado a partir da conclusão da implantação, podendo ser denunciado por qualquer das partes mediante aviso prévio, por escrito, de 30 (trinta) dias.
{{/MENSALIDADE}}{{#SEM_MENSALIDADE}}3.2. Concluída e aceita a implantação, e quitados os valores devidos, considerar-se-á cumprido o objeto deste contrato.
{{/SEM_MENSALIDADE}}3.3. O início dos prazos fica condicionado ao fornecimento, pelo CONTRATANTE, de todas as informações, acessos e materiais indispensáveis à execução dos serviços.

CLÁUSULA 4ª — DAS OBRIGAÇÕES DO CONTRATADO
4.1. Executar os serviços com zelo, diligência e dentro das melhores práticas técnicas aplicáveis.
4.2. Cumprir os prazos acordados, salvo por fato imputável ao CONTRATANTE ou por motivo de força maior, devidamente comunicado.
4.3. Manter o CONTRATANTE informado sobre o andamento dos trabalhos e prestar os esclarecimentos solicitados.
4.4. Tratar com sigilo as informações e os dados a que tiver acesso, na forma das Cláusulas 7ª e 8ª.
{{#MENSALIDADE}}4.5. Durante o período de acompanhamento mensal, prestar suporte e realizar os ajustes contratados em prazo razoável, conforme a natureza da solicitação.
{{/MENSALIDADE}}
CLÁUSULA 5ª — DAS OBRIGAÇÕES DO CONTRATANTE
5.1. Fornecer, em tempo hábil, todos os dados, acessos, credenciais e informações necessários à execução dos serviços.
5.2. Designar interlocutor responsável por validar entregas e prestar as informações solicitadas pelo CONTRATADO.
5.3. Efetuar os pagamentos nas datas e condições pactuadas na Cláusula 2ª.
5.4. Utilizar a plataforma e as configurações entregues em conformidade com a legislação vigente, responsabilizando-se pelo conteúdo dos dados que inserir ou tratar por meio dela.

CLÁUSULA 6ª — DA RESCISÃO E DA MULTA
6.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação escrita, em caso de descumprimento de qualquer cláusula não sanado no prazo de 10 (dez) dias contados da notificação.
6.2. Na hipótese de rescisão imotivada por iniciativa de qualquer das partes antes da conclusão da implantação, a parte que der causa pagará à outra multa equivalente a 20% (vinte por cento) do valor da implantação, sem prejuízo da remuneração pelos serviços já efetivamente prestados.
{{#MENSALIDADE}}6.3. A denúncia do serviço de acompanhamento mensal observará o aviso prévio previsto no item 3.2, permanecendo devidos os valores proporcionais ao período efetivamente prestado.
{{/MENSALIDADE}}6.4. A rescisão não desobriga as partes quanto às obrigações de confidencialidade e proteção de dados, que subsistem após o término deste contrato.

CLÁUSULA 7ª — DA PROTEÇÃO DE DADOS (LGPD)
7.1. As partes obrigam-se a observar a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD) no tratamento de quaisquer dados pessoais relacionados a este contrato.
7.2. O CONTRATANTE é o CONTROLADOR dos dados pessoais inseridos na plataforma de CRM (incluindo dados de seus clientes, leads e contatos), cabendo-lhe definir as finalidades e os meios do tratamento e assegurar a existência de base legal adequada.
7.3. O CONTRATADO atua como OPERADOR, tratando os dados pessoais estritamente conforme as instruções do CONTRATANTE e na medida necessária à prestação dos serviços, sendo vedado utilizá-los para finalidade diversa.
7.4. O CONTRATADO adotará medidas técnicas e administrativas razoáveis e aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão.
7.5. Encerrado o contrato, o CONTRATADO eliminará ou devolverá ao CONTRATANTE os dados pessoais a que teve acesso, salvo obrigação legal de retenção, comprometendo-se a não reter cópias além do estritamente necessário.
7.6. O CONTRATADO comunicará ao CONTRATANTE, sem demora injustificada, qualquer incidente de segurança de que tenha conhecimento e que possa acarretar risco aos titulares dos dados.

CLÁUSULA 8ª — DA CONFIDENCIALIDADE
8.1. As partes obrigam-se a manter o mais absoluto sigilo sobre todas as informações de natureza técnica, comercial, financeira ou estratégica a que tiverem acesso em razão deste contrato, não as divulgando a terceiros sem autorização prévia e escrita da outra parte.
8.2. A obrigação de confidencialidade vigorará durante a execução do contrato e por prazo de 2 (dois) anos após o seu término, ressalvadas as informações que se tornarem públicas por meio lícito ou cuja divulgação seja exigida por lei ou ordem de autoridade competente.

CLÁUSULA 9ª — DO FORO
9.1. As partes elegem o foro da Comarca de {{FORO_CIDADE}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir as questões oriundas do presente contrato.

E, por estarem assim justas e contratadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma.

{{FORO_CIDADE}}, {{DATA_EXTENSO}}.


_______________________________________
{{CONTRATANTE_NOME}}
CONTRATANTE


_______________________________________
{{CONTRATADO_NOME}}
CONTRATADO`
