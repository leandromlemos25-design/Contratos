import { useMemo, useRef, useState } from 'react'
import { CONTRATADO, MARCA, CONTRATO_BASE } from './templates.js'
import {
  parseMoeda,
  formatBRL,
  dataPorExtenso,
  temMensalidade,
  renderTemplate,
  soDigitos,
  formatarCnpj,
  formatarCep,
} from './lib.js'

// Estado inicial do formulário.
const FORM_INICIAL = {
  // --- Dados da proposta ---
  cliente: '',
  contato: '',
  valorLicenca: '',
  valorImplantacao: '',
  valorMensalidade: '', // opcional
  observacoes: '',
  // --- Extras só do contrato ---
  contratanteNome: '',
  contratanteDoc: '',
  contratanteEndereco: '',
  vigencia: '',
  formaPagamento: '',
  foroCidade: '',
}

export default function App() {
  const [form, setForm] = useState(FORM_INICIAL)
  const [doc, setDoc] = useState(null) // { tipo, com, ...dados } | null
  const [mostrarCamposContrato, setMostrarCamposContrato] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [melhorando, setMelhorando] = useState(false)
  const [erroIa, setErroIa] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjMsg, setCnpjMsg] = useState(null) // { texto, erro } | null
  const printRef = useRef(null)
  const camposContratoRef = useRef(null)

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  // ----- Cálculos derivados (ao vivo) -----
  const licenca = parseMoeda(form.valorLicenca)
  const implantacao = parseMoeda(form.valorImplantacao)
  const mensalidade = parseMoeda(form.valorMensalidade)
  const totalInicial = licenca + implantacao
  const com = temMensalidade(form.valorMensalidade)

  // ----- Geração da PROPOSTA -----
  function gerarProposta() {
    setDoc({
      tipo: 'proposta',
      com,
      cliente: form.cliente.trim() || '—',
      contato: form.contato.trim(),
      licenca,
      implantacao,
      mensalidade,
      totalInicial,
      observacoes: form.observacoes.trim(),
    })
    scrollParaDocumento()
  }

  // ----- Geração do CONTRATO -----
  function gerarContrato() {
    // Garante que os campos do contratante (dados do cliente) fiquem visíveis.
    setMostrarCamposContrato(true)

    // Se ainda faltam os dados essenciais do cliente, leva o usuário até eles
    // antes de gerar o documento.
    const faltaCliente =
      !form.contratanteNome.trim() || !form.contratanteDoc.trim()
    if (faltaCliente) {
      requestAnimationFrame(() => {
        camposContratoRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
      return
    }

    const regime =
      CONTRATADO.mei || CONTRATADO.emiteNotaFiscal
        ? `${[
            CONTRATADO.mei ? 'na qualidade de Microempreendedor Individual (MEI)' : '',
            CONTRATADO.emiteNotaFiscal ? 'emitente de nota fiscal de serviço' : '',
          ]
            .filter(Boolean)
            .join(' e ')}, `
        : ''

    const nota = CONTRATADO.emiteNotaFiscal
      ? 'O CONTRATADO emitirá a respectiva nota fiscal de serviço referente aos valores recebidos.'
      : 'Os valores serão comprovados mediante recibo emitido pelo CONTRATADO.'

    const vars = {
      CONTRATANTE_NOME: form.contratanteNome.trim() || '[NOME / RAZÃO SOCIAL DO CONTRATANTE]',
      CONTRATANTE_DOC: form.contratanteDoc.trim() || '[CPF/CNPJ]',
      CONTRATANTE_ENDERECO: form.contratanteEndereco.trim() || '[ENDEREÇO COMPLETO]',
      CONTRATADO_NOME: CONTRATADO.nome,
      CONTRATADO_DOC: CONTRATADO.documento,
      CONTRATADO_ENDERECO: CONTRATADO.endereco,
      CONTRATADO_REGIME: regime,
      CONTRATADO_NOTA: nota,
      VALOR_LICENCA: formatBRL(licenca),
      VALOR_IMPLANTACAO: formatBRL(implantacao),
      TOTAL_INICIAL: formatBRL(totalInicial),
      VALOR_MENSALIDADE: formatBRL(mensalidade),
      FORMA_PAGAMENTO: form.formaPagamento.trim() || '[FORMA DE PAGAMENTO]',
      VIGENCIA: form.vigencia.trim() || '[PRAZO / VIGÊNCIA]',
      FORO_CIDADE: form.foroCidade.trim() || '[CIDADE DO FORO]',
      DATA_EXTENSO: dataPorExtenso(),
    }

    const texto = renderTemplate(CONTRATO_BASE, vars, com)
    setDoc({ tipo: 'contrato', com, texto })
    scrollParaDocumento()
  }

  function scrollParaDocumento() {
    setCopiado(false)
    requestAnimationFrame(() => {
      printRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // ----- Texto plano (para "Copiar") -----
  const textoPlano = useMemo(() => {
    if (!doc) return ''
    return doc.tipo === 'contrato' ? doc.texto : propostaParaTexto(doc)
  }, [doc])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoPlano)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback simples
      const ta = document.createElement('textarea')
      ta.value = textoPlano
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  function imprimir() {
    window.print()
  }

  // ----- Buscar dados do cliente pelo CNPJ (BrasilAPI, grátis, sem chave) -----
  async function buscarCnpj() {
    if (buscandoCnpj) return
    const digitos = soDigitos(form.contratanteDoc)

    if (digitos.length === 11) {
      setCnpjMsg({
        texto: 'Isso é um CPF — dados de pessoa física são protegidos, preencha manualmente.',
        erro: true,
      })
      return
    }
    if (digitos.length !== 14) {
      setCnpjMsg({ texto: 'Digite um CNPJ válido (14 dígitos) para buscar.', erro: true })
      return
    }

    setBuscandoCnpj(true)
    setCnpjMsg(null)
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`)
      if (r.status === 404) throw new Error('CNPJ não encontrado.')
      if (!r.ok) throw new Error('Não foi possível consultar agora. Tente novamente.')
      const d = await r.json()

      const endereco = [
        (d.logradouro || '').trim(),
        d.numero ? `nº ${d.numero}` : '',
        (d.complemento || '').trim(),
        (d.bairro || '').trim(),
        `${d.municipio || ''}${d.uf ? ' - ' + d.uf : ''}`.trim(),
        d.cep ? `CEP ${formatarCep(d.cep)}` : '',
      ]
        .filter(Boolean)
        .join(', ')

      setForm((f) => ({
        ...f,
        contratanteDoc: formatarCnpj(digitos),
        contratanteNome: d.razao_social || f.contratanteNome,
        contratanteEndereco: endereco || f.contratanteEndereco,
      }))
      setCnpjMsg({
        texto: `Dados de "${d.razao_social}" preenchidos. Confira antes de gerar.`,
        erro: false,
      })
    } catch (e) {
      setCnpjMsg({ texto: e?.message || 'Falha na consulta.', erro: true })
    } finally {
      setBuscandoCnpj(false)
    }
  }

  // ----- Melhorar observações com IA -----
  async function melhorarObservacoes() {
    const texto = form.observacoes.trim()
    if (!texto || melhorando) return
    setMelhorando(true)
    setErroIa('')
    try {
      const r = await fetch('/api/melhorar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Falha ao melhorar o texto.')
      setForm((f) => ({ ...f, observacoes: data.texto }))
    } catch (e) {
      setErroIa(
        e?.message ||
          'Não foi possível melhorar agora. (A IA funciona no site publicado na Vercel.)',
      )
    } finally {
      setMelhorando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ---------- Topo ---------- */}
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {MARCA.logo ? (
              <img src={MARCA.logo} alt={MARCA.nomeNegocio} className="h-11 w-auto" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
                S
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold">Proposta &amp; Contrato</p>
              <p className="text-xs text-slate-500">{MARCA.nomeNegocio}</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline">
            Pronto para reunião
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        {/* Hero */}
        <section className="no-print mb-8 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Gere proposta e contrato a partir dos mesmos dados
          </h1>
          <p className="mt-2 text-slate-600">{MARCA.slogan}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ---------- Coluna do formulário ---------- */}
          <div className="no-print space-y-6">
            <Card>
              <CardTitle>Dados da proposta</CardTitle>
              <div className="grid gap-4">
                <Field label="Nome do cliente / empresa">
                  <input className={inputCls} value={form.cliente} onChange={set('cliente')} placeholder="Ex.: Loja do João LTDA" />
                </Field>
                <Field label="Contato (e-mail ou WhatsApp)">
                  <input className={inputCls} value={form.contato} onChange={set('contato')} placeholder="email@cliente.com ou (00) 00000-0000" />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Valor da licença (R$)">
                    <MoneyInput value={form.valorLicenca} onChange={set('valorLicenca')} />
                  </Field>
                  <Field label="Valor da implantação (R$)">
                    <MoneyInput value={form.valorImplantacao} onChange={set('valorImplantacao')} />
                  </Field>
                </div>

                <Field
                  label="Valor da mensalidade (R$)"
                  hint="Opcional — em branco ou 0 = sem acompanhamento mensal"
                >
                  <MoneyInput value={form.valorMensalidade} onChange={set('valorMensalidade')} />
                </Field>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">Observações</span>
                    <button
                      type="button"
                      onClick={melhorarObservacoes}
                      disabled={melhorando || !form.observacoes.trim()}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {melhorando ? 'Melhorando…' : '✨ Melhorar com IA'}
                    </button>
                  </div>
                  <textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.observacoes} onChange={set('observacoes')} placeholder="Escopo, condições especiais, prazos combinados…" />
                  {erroIa && <p className="mt-1 text-xs text-rose-600">{erroIa}</p>}
                </div>
              </div>

              {/* Indicador automático do tipo */}
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  com ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${com ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                {com
                  ? 'Contrato COM acompanhamento mensal'
                  : 'Contrato SEM mensalidade (apenas implantação)'}
              </div>
            </Card>

            {/* Campos extras do contrato */}
            <div ref={camposContratoRef} className="scroll-mt-20">
            <Card>
              <button
                type="button"
                onClick={() => setMostrarCamposContrato((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <CardTitle className="mb-0">Dados do cliente e do contrato</CardTitle>
                <span className="text-sm text-indigo-600">
                  {mostrarCamposContrato ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Dados do cliente (contratante) e condições, usados só no contrato. Seus dados (contratado) ficam em <code>src/templates.js</code>.
              </p>

              {mostrarCamposContrato && (
                <div className="mt-4 grid gap-4">
                  <Field label="Cliente (contratante) — nome completo / razão social">
                    <input className={inputCls} value={form.contratanteNome} onChange={set('contratanteNome')} placeholder="Nome do cliente ou empresa" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-sm font-medium text-slate-700">CPF ou CNPJ</span>
                      <div className="flex gap-2">
                        <input className={inputCls} value={form.contratanteDoc} onChange={set('contratanteDoc')} placeholder="CNPJ busca automático" />
                        <button
                          type="button"
                          onClick={buscarCnpj}
                          disabled={buscandoCnpj}
                          className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {buscandoCnpj ? '…' : 'Buscar'}
                        </button>
                      </div>
                      {cnpjMsg && (
                        <p className={`mt-1 text-xs ${cnpjMsg.erro ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {cnpjMsg.texto}
                        </p>
                      )}
                    </div>
                    <Field label="Cidade do foro">
                      <input className={inputCls} value={form.foroCidade} onChange={set('foroCidade')} placeholder="Ex.: São Paulo - SP" />
                    </Field>
                  </div>
                  <Field label="Endereço completo do contratante">
                    <input className={inputCls} value={form.contratanteEndereco} onChange={set('contratanteEndereco')} placeholder="Rua, nº, bairro, cidade - UF, CEP" />
                  </Field>
                  <Field label="Vigência / prazo de entrega">
                    <input className={inputCls} value={form.vigencia} onChange={set('vigencia')} placeholder="Ex.: 30 (trinta) dias úteis" />
                  </Field>
                  <Field label="Forma de pagamento">
                    <input className={inputCls} value={form.formaPagamento} onChange={set('formaPagamento')} placeholder="Ex.: 50% na assinatura e 50% na entrega, via PIX" />
                  </Field>
                </div>
              )}
            </Card>
            </div>

            {/* Botões de geração */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={gerarProposta} className={btnPrimary}>
                Gerar proposta
              </button>
              <button onClick={gerarContrato} className={btnSecondary}>
                Gerar contrato
              </button>
            </div>

            {/* Aviso fixo (tela, nunca no documento) */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span aria-hidden>⚠️</span>
              <span>Revise este contrato com um advogado antes do primeiro uso real.</span>
            </div>
          </div>

          {/* ---------- Coluna do documento ---------- */}
          <div>
            {/* Barra de ações */}
            {doc && (
              <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                  {doc.tipo === 'proposta' ? 'Proposta comercial' : 'Contrato'}
                </span>
                <div className="flex gap-2">
                  <button onClick={copiar} className={btnGhost}>
                    {copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                  <button onClick={imprimir} className={btnGhost}>
                    Imprimir / PDF
                  </button>
                </div>
              </div>
            )}

            {/* Área imprimível */}
            <div
              id="print-area"
              ref={printRef}
              className="min-h-[300px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              {!doc && (
                <div className="no-print flex h-full min-h-[260px] flex-col items-center justify-center text-center text-slate-400">
                  <div className="mb-3 text-4xl">📄</div>
                  <p className="max-w-xs text-sm">
                    Preencha os dados e clique em <strong>Gerar proposta</strong> ou{' '}
                    <strong>Gerar contrato</strong>. O documento aparece aqui.
                  </p>
                </div>
              )}

              {doc?.tipo === 'proposta' && <PropostaView doc={doc} />}
              {doc?.tipo === 'contrato' && <ContratoView doc={doc} />}
            </div>
          </div>
        </div>

        <footer className="no-print mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          Documentos gerados localmente no seu navegador — nenhum dado é enviado a servidores.
        </footer>
      </main>
    </div>
  )
}

/* =========================================================================
   Visualização da PROPOSTA
   ========================================================================= */
function LogoDoc() {
  if (!MARCA.logo) return null
  return (
    <div className="mb-4 flex justify-center">
      <img src={MARCA.logo} alt={MARCA.nomeNegocio} className="h-20 w-auto" />
    </div>
  )
}

function PropostaView({ doc }) {
  return (
    <div className="doc-paper text-slate-800" style={{ whiteSpace: 'normal' }}>
      <LogoDoc />
      <div className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Proposta comercial
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{doc.cliente}</h2>
        {doc.contato && <p className="text-sm text-slate-500">{doc.contato}</p>}
        <p className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {doc.com ? 'Com acompanhamento mensal' : 'Sem mensalidade (apenas implantação)'}
        </p>
      </div>

      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Detalhamento dos valores
      </h3>
      <table className="w-full text-sm">
        <tbody>
          <LinhaValor label="Licença da plataforma" valor={doc.licenca} />
          <LinhaValor label="Implantação e configuração" valor={doc.implantacao} />
        </tbody>
      </table>

      {/* Total inicial em destaque */}
      <div className="mt-5 rounded-xl bg-indigo-600 px-5 py-4 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
          Investimento inicial
        </p>
        <p className="text-2xl font-bold">{formatBRL(doc.totalInicial)}</p>
      </div>

      {/* Mensalidade em destaque (só quando houver) */}
      {doc.com && (
        <div className="mt-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
            Acompanhamento mensal
          </p>
          <p className="text-2xl font-bold text-indigo-700">
            {formatBRL(doc.mensalidade)}
            <span className="text-sm font-medium text-indigo-500"> / mês</span>
          </p>
        </div>
      )}

      {doc.observacoes && (
        <div className="mt-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Observações
          </h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{doc.observacoes}</p>
        </div>
      )}
    </div>
  )
}

function LinhaValor({ label, valor }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 text-slate-700">{label}</td>
      <td className="py-2 text-right font-medium text-slate-900">{formatBRL(valor)}</td>
    </tr>
  )
}

/* =========================================================================
   Visualização do CONTRATO
   ========================================================================= */
function ContratoView({ doc }) {
  return (
    <div className="text-[15px] text-slate-800">
      <LogoDoc />
      <div className="doc-paper">{doc.texto}</div>
    </div>
  )
}

/* =========================================================================
   Versão texto plano da proposta (para "Copiar")
   ========================================================================= */
function propostaParaTexto(doc) {
  const linhas = [
    'PROPOSTA COMERCIAL',
    '',
    `Cliente: ${doc.cliente}`,
    doc.contato ? `Contato: ${doc.contato}` : null,
    `Tipo: ${doc.com ? 'Com acompanhamento mensal' : 'Sem mensalidade (apenas implantação)'}`,
    '',
    'DETALHAMENTO DOS VALORES',
    `- Licença da plataforma: ${formatBRL(doc.licenca)}`,
    `- Implantação e configuração: ${formatBRL(doc.implantacao)}`,
    '',
    `INVESTIMENTO INICIAL: ${formatBRL(doc.totalInicial)}`,
    doc.com ? `ACOMPANHAMENTO MENSAL: ${formatBRL(doc.mensalidade)} / mês` : null,
  ]
  if (doc.observacoes) {
    linhas.push('', 'OBSERVAÇÕES', doc.observacoes)
  }
  return linhas.filter((l) => l !== null).join('\n')
}

/* =========================================================================
   Componentes / classes utilitárias de UI
   ========================================================================= */
const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400'

const btnPrimary =
  'rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[.99]'
const btnSecondary =
  'rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[.99]'
const btnGhost =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50'

function Card({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </div>
  )
}

function CardTitle({ children, className = '' }) {
  return (
    <h2 className={`mb-4 text-base font-semibold text-slate-900 ${className}`}>{children}</h2>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

function MoneyInput({ value, onChange }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        R$
      </span>
      <input
        className={`${inputCls} pl-9`}
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder="0,00"
      />
    </div>
  )
}
