import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [cepInput, setCepInput] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepMsg, setCepMsg] = useState(null) // { texto, erro } | null

  // --- Banco de dados / login ---
  const [autenticado, setAutenticado] = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [senha, setSenha] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvoMsg, setSalvoMsg] = useState(null) // { texto, erro } | null
  const [mostrarLista, setMostrarLista] = useState(false)
  const [lista, setLista] = useState([])
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [listaErro, setListaErro] = useState('')

  const printRef = useRef(null)
  const camposContratoRef = useRef(null)

  // Ao abrir o app, checa se já existe sessão válida.
  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setAutenticado(!!d.autenticado))
      .catch(() => {})
  }, [])

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

  // ----- Buscar endereço pelo CEP (BrasilAPI, grátis, sem chave) -----
  async function buscarCep() {
    if (buscandoCep) return
    const d = soDigitos(cepInput)
    if (d.length !== 8) {
      setCepMsg({ texto: 'Digite um CEP válido (8 dígitos).', erro: true })
      return
    }
    setBuscandoCep(true)
    setCepMsg(null)
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v1/${d}`)
      if (r.status === 404) throw new Error('CEP não encontrado.')
      if (!r.ok) throw new Error('Não foi possível consultar agora. Tente novamente.')
      const c = await r.json()

      const endereco = [
        (c.street || '').trim(),
        (c.neighborhood || '').trim(),
        `${c.city || ''}${c.state ? ' - ' + c.state : ''}`.trim(),
        `CEP ${formatarCep(d)}`,
      ]
        .filter(Boolean)
        .join(', ')

      setForm((f) => ({ ...f, contratanteEndereco: endereco }))
      setCepMsg({ texto: 'Endereço preenchido. Adicione o número e o complemento.', erro: false })
    } catch (e) {
      setCepMsg({ texto: e?.message || 'Falha na consulta.', erro: true })
    } finally {
      setBuscandoCep(false)
    }
  }

  // ----- Login / banco de dados -----
  async function fazerLogin(e) {
    e?.preventDefault?.()
    setLoginMsg('')
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ senha }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha no login.')
      setAutenticado(true)
      setMostrarLogin(false)
      setSenha('')
    } catch (err) {
      setLoginMsg(err?.message || 'Falha no login.')
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    setAutenticado(false)
    setMostrarLista(false)
  }

  // Monta o payload do documento atual para salvar no banco.
  function payloadAtual() {
    if (!doc) return null
    if (doc.tipo === 'contrato') {
      return {
        tipo: 'contrato',
        comMensalidade: doc.com,
        clienteNome: form.contratanteNome,
        contato: form.contato,
        doc: form.contratanteDoc,
        endereco: form.contratanteEndereco,
        valorLicenca: licenca,
        valorImplantacao: implantacao,
        valorMensalidade: mensalidade,
        totalInicial,
        observacoes: form.observacoes,
        vigencia: form.vigencia,
        formaPagamento: form.formaPagamento,
        foro: form.foroCidade,
        contratoTexto: doc.texto,
        form,
        status: 'salvo',
      }
    }
    return {
      tipo: 'proposta',
      comMensalidade: doc.com,
      clienteNome: form.cliente,
      contato: form.contato,
      valorLicenca: licenca,
      valorImplantacao: implantacao,
      valorMensalidade: mensalidade,
      totalInicial,
      observacoes: form.observacoes,
      contratoTexto: textoPlano,
      form,
      status: 'salvo',
    }
  }

  async function salvarNoBanco() {
    if (salvando) return
    if (!autenticado) {
      setMostrarLogin(true)
      return
    }
    const payload = payloadAtual()
    if (!payload) return
    setSalvando(true)
    setSalvoMsg(null)
    try {
      const r = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (r.status === 401) {
        setAutenticado(false)
        setMostrarLogin(true)
        throw new Error('Faça login para salvar.')
      }
      if (!r.ok) throw new Error(d.error || 'Falha ao salvar.')
      setSalvoMsg({ texto: 'Salvo no banco. ✓', erro: false })
    } catch (err) {
      setSalvoMsg({ texto: err?.message || 'Falha ao salvar.', erro: true })
    } finally {
      setSalvando(false)
    }
  }

  async function abrirLista() {
    if (!autenticado) {
      setMostrarLogin(true)
      return
    }
    setMostrarLista(true)
    setCarregandoLista(true)
    setListaErro('')
    try {
      const r = await fetch('/api/contratos', { credentials: 'same-origin' })
      if (r.status === 401) {
        setAutenticado(false)
        setMostrarLogin(true)
        throw new Error('Faça login.')
      }
      const d = await r.json()
      setLista(d.contratos || [])
    } catch (err) {
      setListaErro(err?.message || 'Falha ao carregar.')
    } finally {
      setCarregandoLista(false)
    }
  }

  async function abrirContrato(id) {
    try {
      const r = await fetch(`/api/contrato?id=${encodeURIComponent(id)}`, {
        credentials: 'same-origin',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Falha ao abrir.')
      const c = d.contrato
      if (c.form_json) setForm({ ...FORM_INICIAL, ...c.form_json })
      if (c.tipo === 'contrato') {
        setDoc({ tipo: 'contrato', com: c.com_mensalidade, texto: c.contrato_texto })
      } else {
        const f = c.form_json || {}
        const lic = parseMoeda(f.valorLicenca)
        const imp = parseMoeda(f.valorImplantacao)
        const men = parseMoeda(f.valorMensalidade)
        setDoc({
          tipo: 'proposta',
          com: temMensalidade(f.valorMensalidade),
          cliente: f.cliente?.trim() || '—',
          contato: f.contato?.trim() || '',
          licenca: lic,
          implantacao: imp,
          mensalidade: men,
          totalInicial: lic + imp,
          observacoes: f.observacoes?.trim() || '',
        })
      }
      setMostrarLista(false)
      scrollParaDocumento()
    } catch (err) {
      setListaErro(err?.message || 'Falha ao abrir.')
    }
  }

  function atualizarItemLista(id, campos) {
    setLista((l) => l.map((c) => (c.id === id ? { ...c, ...campos } : c)))
  }

  async function enviarAssinatura(c) {
    const tel = window.prompt(
      `WhatsApp de ${c.cliente_nome || 'cliente'} (com DDD):`,
      soDigitos(c.contato || ''),
    )
    if (!tel) return
    setListaErro('')
    atualizarItemLista(c.id, { _enviando: true })
    try {
      const r = await fetch('/api/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: c.id, telefone: tel }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha ao enviar.')
      atualizarItemLista(c.id, {
        status: 'enviado',
        assinatura_url: d.link,
        assinatura_doc_id: 'ok',
        _enviando: false,
      })
    } catch (err) {
      atualizarItemLista(c.id, { _enviando: false })
      setListaErro(err?.message || 'Falha ao enviar para assinatura.')
    }
  }

  async function atualizarStatus(c) {
    setListaErro('')
    atualizarItemLista(c.id, { _checando: true })
    try {
      const r = await fetch(`/api/assinatura?id=${encodeURIComponent(c.id)}`, {
        credentials: 'same-origin',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha ao consultar.')
      atualizarItemLista(c.id, {
        status: d.status,
        assinatura_url: d.signedUrl || c.assinatura_url,
        _checando: false,
      })
    } catch (err) {
      atualizarItemLista(c.id, { _checando: false })
      setListaErro(err?.message || 'Falha ao consultar status.')
    }
  }

  async function excluirContrato(id) {
    if (!confirm('Excluir este registro do banco? Esta ação não pode ser desfeita.')) return
    try {
      const r = await fetch(`/api/contrato?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!r.ok) throw new Error('Falha ao excluir.')
      setLista((l) => l.filter((c) => c.id !== id))
    } catch (err) {
      setListaErro(err?.message || 'Falha ao excluir.')
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
            {MARCA.logo && (
              <img src={MARCA.logo} alt="" className="h-10 w-auto" />
            )}
            <div className="leading-tight">
              <p className="text-base font-bold text-[#0a47a4]">{MARCA.nomeNegocio}</p>
              <p className="text-xs text-slate-500">Proposta &amp; Contrato</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autenticado ? (
              <>
                <button onClick={abrirLista} className={btnGhost}>
                  Meus contratos
                </button>
                <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700">
                  Sair
                </button>
              </>
            ) : (
              <button onClick={() => setMostrarLogin(true)} className={btnGhost}>
                Entrar
              </button>
            )}
          </div>
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
                  <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      CEP <span className="font-normal text-slate-400">(preenche o endereço)</span>
                    </span>
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        value={cepInput}
                        onChange={(e) => setCepInput(e.target.value)}
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={buscarCep}
                        disabled={buscandoCep}
                        className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {buscandoCep ? '…' : 'Buscar'}
                      </button>
                    </div>
                    {cepMsg && (
                      <p className={`mt-1 text-xs ${cepMsg.erro ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cepMsg.texto}
                      </p>
                    )}
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
                <div className="flex flex-wrap gap-2">
                  <button onClick={salvarNoBanco} disabled={salvando} className={btnGhost}>
                    {salvando ? 'Salvando…' : '💾 Salvar'}
                  </button>
                  <button onClick={copiar} className={btnGhost}>
                    {copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                  <button onClick={imprimir} className={btnGhost}>
                    Imprimir / PDF
                  </button>
                </div>
              </div>
            )}
            {salvoMsg && (
              <p className={`no-print mb-3 text-xs ${salvoMsg.erro ? 'text-rose-600' : 'text-emerald-600'}`}>
                {salvoMsg.texto}
              </p>
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
          Documentos gerados no seu navegador. Só vão para o banco quando você clica em “Salvar”.
        </footer>
      </main>

      {/* ---------- Modal de login ---------- */}
      {mostrarLogin && (
        <Modal onClose={() => setMostrarLogin(false)} titulo="Entrar">
          <form onSubmit={fazerLogin} className="space-y-3">
            <p className="text-sm text-slate-600">
              Digite sua senha para salvar e acessar seus contratos.
            </p>
            <input
              type="password"
              autoFocus
              className={inputCls}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
            />
            {loginMsg && <p className="text-xs text-rose-600">{loginMsg}</p>}
            <button type="submit" className={`${btnPrimary} w-full`}>
              Entrar
            </button>
          </form>
        </Modal>
      )}

      {/* ---------- Modal: meus contratos ---------- */}
      {mostrarLista && (
        <Modal onClose={() => setMostrarLista(false)} titulo="Meus contratos" largo>
          {carregandoLista && <p className="text-sm text-slate-500">Carregando…</p>}
          {listaErro && <p className="text-sm text-rose-600">{listaErro}</p>}
          {!carregandoLista && !listaErro && lista.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum documento salvo ainda.</p>
          )}
          {lista.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {lista.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
                        {c.cliente_nome || '(sem nome)'}
                        <BadgeStatus status={c.status} />
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.tipo === 'contrato' ? 'Contrato' : 'Proposta'}
                        {' · '}
                        {c.com_mensalidade ? 'com mensalidade' : 'sem mensalidade'}
                        {c.total_inicial != null && ` · ${formatBRL(c.total_inicial)}`}
                        {' · '}
                        {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => abrirContrato(c.id)} className={btnGhost}>
                        Abrir
                      </button>
                      <button
                        onClick={() => excluirContrato(c.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {c.tipo === 'contrato' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {c.status !== 'enviado' && c.status !== 'assinado' && (
                        <button
                          onClick={() => enviarAssinatura(c)}
                          disabled={c._enviando}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {c._enviando ? 'Enviando…' : '📲 Enviar p/ assinatura'}
                        </button>
                      )}
                      {c.status === 'enviado' && (
                        <>
                          <button
                            onClick={() => atualizarStatus(c)}
                            disabled={c._checando}
                            className={btnGhost}
                          >
                            {c._checando ? 'Checando…' : 'Atualizar status'}
                          </button>
                          {c.assinatura_url && (
                            <a
                              href={c.assinatura_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 underline"
                            >
                              link de assinatura
                            </a>
                          )}
                        </>
                      )}
                      {c.status === 'assinado' && c.assinatura_url && (
                        <a
                          href={c.assinatura_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          ✓ Ver PDF assinado
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  )
}

function BadgeStatus({ status }) {
  if (status === 'assinado')
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        Assinado
      </span>
    )
  if (status === 'enviado')
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        Aguardando
      </span>
    )
  return null
}

function Modal({ titulo, children, onClose, largo }) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${largo ? 'max-w-lg' : 'max-w-sm'} rounded-2xl bg-white p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* =========================================================================
   Visualização da PROPOSTA
   ========================================================================= */
function LogoDoc() {
  return (
    <div className="mb-6 flex items-center justify-center gap-3 border-b border-slate-200 pb-4">
      {MARCA.logo && (
        <img src={MARCA.logo} alt="" className="h-14 w-auto" />
      )}
      <div className="text-left leading-tight">
        <p className="text-2xl font-bold text-[#0a47a4]">{MARCA.nomeNegocio}</p>
        <p className="text-xs text-slate-500">{MARCA.slogan}</p>
      </div>
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
