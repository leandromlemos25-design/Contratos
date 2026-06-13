# Playbook de Revisão de Contratos — SmartFlux (Leandro Morais Lemos)

> Arquivo lido pela skill `legal:review-contract`. Define posições padrão, faixas aceitáveis e gatilhos de escalonamento.
> Não substitui advogado. Atualize conforme o negócio evolui.

## Perfil

- **Quem sou neste contrato:** CONTRATADO — integrador e **revendedor autorizado** do CRM Kommo + prestador de serviços de tecnologia (implantação, automações, bots).
- **Sou o autor do template** (contrato vendor-sided). Objetivo da revisão: proteger o CONTRATADO **e** garantir exequibilidade/defensabilidade (evitar nulidade).
- **Público:** B2B (maioria PJ) com eventual PF → assumir que **CDC pode incidir** em alguns casos.
- **Situação fiscal:** PF que emite nota. Revenda de licença como PF é ponto sensível → validar com contador.
- **Regência:** Código Civil, Lei do Software (9.609/98), LGPD (13.709/18), assinatura eletrônica (MP 2.200-2/2001 e Lei 14.063/2020).
- **Assinatura:** eletrônica via Autentique (WhatsApp).

## Princípios gerais

1. Nunca afirmar capacidade que não tenho (ex.: "sublicenciar" se só tenho autorização de **revenda**).
2. Todo contrato deve ser **exequível**: qualificação completa das partes + representante legal da PJ + reconhecimento de assinatura eletrônica.
3. Cláusulas que só me favorecem e podem ser anuladas sob CDC devem ter salvaguarda ("ressalvados direitos indisponíveis" / "foro do consumidor quando aplicável").
4. Sou **operador** de dados → cumprir o mínimo da LGPD do meu lado e cuidar da PII que guardo no meu próprio sistema.
5. Separar **defeito** (corrijo grátis na garantia) de **mudança de escopo** (orço à parte).

---

## Posições padrão por cláusula

### Qualificação das partes
- **Padrão:** PF — nome, CPF, endereço completo. PJ — razão social, CNPJ, endereço **e representante legal** (nome, cargo, CPF) que assina.
- 🔴 **Escalar / não assinar:** contrato com PJ sem representante legal identificado.

### Objeto / escopo
- **Padrão:** descrever revenda/intermediação do Kommo + serviços; listar exclusões explícitas (infra, internet, APIs de terceiros, WhatsApp/Meta, telefonia, widgets).
- 🔴 **Escalar:** usar "sublicenciamento" sem autorização escrita do titular que o permita. Faixa aceitável = "revenda/intermediação".

### Valor e pagamento
- **Padrão:** valor inicial (licença + implantação) à vista ou conforme combinado; emissão de nota fiscal prevista; suspensão por atraso > 10 dias após notificação.
- **Mensalidade (quando houver):** reajuste anual por **IPCA (IBGE)**.
- 🔴 **Escalar (bug operacional):** gerar contrato com valor R$ 0,00.

### Prazos e entrega
- **Padrão:** prazo de implantação contado da entrega de acessos; suspensão se o cliente atrasar insumos; aceite em 7 dias, silêncio = aceite tácito.
- ⚠️ **B2B:** ok. **Caso PF/consumo:** trocar aceite tácito por aceite expresso.

### Garantia
- **Padrão:** 30–90 dias de correção de defeitos de conformidade sem custo; mudanças/novas demandas são orçadas.
- 🟡 **Negociar:** cliente pedindo SLA ou garantia > 90 dias → avaliar preço.

### Propriedade intelectual
- **Padrão (inegociável a meu favor):** automações/scripts/lógicas são minhas (Art. 4º Lei 9.609/98); licença não exclusiva e intransferível ao cliente; dados do cliente são dele.
- 🔴 **Escalar:** qualquer cláusula que ceda meus fluxos/código ao cliente ou exija work-for-hire.

### Limitação de responsabilidade
- **Padrão:** sem lucros cessantes; teto = valor pago; ressalvados **dolo e direitos indisponíveis**.
- 🟡 **Negociar:** pedido de teto múltiplo dos valores ou exclusão do teto → escalar se uncapped.
- 🔴 **Escalar:** responsabilidade ilimitada ou indenização ampla sem teto.

### Proteção de dados (LGPD)
- **Padrão:** cliente = controlador; eu = operador, com: medidas de segurança razoáveis, notificação de incidente sem demora, sigilo, devolução/eliminação ao término; Kommo/provedores como suboperadores autorizados.
- 🔴 **Escalar:** processar dados sem definição de papéis ou sem essas obrigações mínimas.

### Confidencialidade
- **Padrão:** mútua, durante e após, salvo obrigação legal. Opcional: prazo e devolução.

### Vigência e rescisão
- **Padrão:** SEM mensalidade → extingue no aceite. COM mensalidade → indeterminado, aviso prévio de 30 dias. Multa por descumprimento **recíproca**, não sanado em 10 dias após notificação. Licença/períodos pagos não são restituíveis. Janela de exportação de dados na saída (≈15 dias).
- 🟡 **Negociar:** base da multa (implantação vs. total inicial) — decisão de negócio; % padrão 20%.
- 🔴 **Escalar:** multa unilateral só contra mim, ou rescisão sem aviso/cura.

### Assinatura eletrônica
- **Padrão:** cláusula reconhecendo validade da assinatura eletrônica (MP 2.200-2/2001; Lei 14.063/2020) com trilha de auditoria.
- 🔴 **Escalar:** assinar digital **sem** essa cláusula.

### Força maior / caso fortuito
- **Padrão:** presente, nos termos do Art. 393 CC.

### Cessão
- **Padrão:** vedada sem consentimento prévio e escrito da outra parte.

### Foro / resolução de disputas
- **Padrão:** foro da minha comarca (Sacramento-MG), **com ressalva**: em relação de consumo prevalece o foro do domicílio do consumidor.
- 🔴 **Escalar:** arbitragem obrigatória cara ou foro remoto desfavorável.

---

## Gatilhos de escalonamento (parar e buscar advogado/contador)

- Contrato com **PJ sem representante legal** ou qualificação incompleta.
- Pedido de **cessão da minha PI** / código das automações.
- **Responsabilidade ilimitada** ou indenização sem teto.
- Cliente claramente **consumidor (PF destinatário final)** em contrato de valor relevante → usar versão adaptada ao CDC.
- Dúvida fiscal sobre **emitir nota / revender licença como PF** → contador antes de fechar.
- Falta de **autorização escrita de revenda do Kommo** para o que o contrato afirma.

---

## Fora do escopo do contrato (lembrete recorrente)
- Regularizar situação fiscal (PF revendendo licença + nota).
- Guardar PII de clientes no banco Neon → eu sou controlador disso: base legal, retenção e segurança.
- Manter cópia escrita da autorização de revenda do Kommo.
