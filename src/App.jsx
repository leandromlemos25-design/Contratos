import { useEffect, useMemo, useRef, useState } from 'react'
import { baixarPdf } from './pdfClient.js'
import {
  CONTRATADO,
  MARCA,
  CONTRATO_BASE,
  CONTRATO_PADROES,
  PROPOSTA_INTRO,
  PROPOSTA_ITENS,
} from './templates.js'
import {
  parseMoeda,
  formatBRL,
  dataPorExtenso,
  temMensalidade,
  renderTemplate,
  soDigitos,
  formatarCnpj,
  formatarCep,
  limparRazaoSocial,
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
  validadeProposta: '7 (sete) dias',
  // --- Extras só do contrato ---
  contratanteNome: '',
  contratanteDoc: '',
  contratanteEndereco: '',
  vigencia: '', // prazo de implantação
  formaPagamento: '',
  foroCidade: '',
  // Representante legal (PJ) — opcional
  repNome: '',
  repCargo: '',
  repDoc: '',
  // Kommo — ID do lead vinculado (para atualizar ao assinar)
  kommoLeadId: '',
  // Condições do contrato (padrões editáveis — fonte única em CONTRATO_PADROES)
  ...CONTRATO_PADROES,
}

export default function App() {
  const [form, setForm] = useState(FORM_INICIAL)
  const [doc, setDoc] = useState(null) // { tipo, com, ...dados } | null
  const [mostrarCamposContrato, setMostrarCamposContrato] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [baixandoPdf, setBaixandoPdf] = useState(false)
  const [erroGerar, setErroGerar] = useState('')
  const [melhorandoCampo, setMelhorandoCampo] = useState(null) // nome do campo em edição pela IA
  const [iaErro, setIaErro] = useState(null) // { campo, texto } | null
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjMsg, setCnpjMsg] = useState(null) // { texto, erro } | null
  const [importandoKommo, setImportandoKommo] = useState(false)
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
  const [enviandoId, setEnviandoId] = useState(null)
  const [checandoId, setChecandoId] = useState(null)

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

  // Define um campo direto (usado pelos botões de atalho/chips).
  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // ----- Cálculos derivados (ao vivo) -----
  const licenca = parseMoeda(form.valorLicenca)
  const implantacao = parseMoeda(form.valorImplantacao)
  const mensalidade = parseMoeda(form.valorMensalidade)
  const totalInicial = licenca + implantacao
  const com = temMensalidade(form.valorMensalidade)

  // Bloqueia gerar documento sem nenhum valor (licença, implantação e
  // mensalidade todos zerados/vazios). Retorna true se estiver tudo zero.
  function semValores() {
    if (totalInicial === 0 && mensalidade === 0) {
      setErroGerar('Informe ao menos um valor (licença, implantação ou mensalidade) antes de gerar.')
      return true
    }
    setErroGerar('')
    return false
  }

  // ----- Geração da PROPOSTA -----
  function gerarProposta() {
    if (semValores()) return
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
      formaPagamento: form.formaPagamento.trim(),
      prazoImplantacao: form.vigencia.trim(),
      validade: form.validadeProposta.trim(),
    })
    scrollParaDocumento()
  }

  // ----- Geração do CONTRATO -----
  function gerarContrato() {
    if (semValores()) return

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

    // Frase do representante legal (PJ) — string vazia quando não há representante,
    // assim o motor de template não precisa de bloco condicional novo.
    const repNome = form.repNome.trim()
    const repClausula = repNome
      ? `, neste ato representada por ${repNome}` +
        (form.repCargo.trim() ? `, ${form.repCargo.trim()}` : '') +
        (form.repDoc.trim() ? `, CPF nº ${form.repDoc.trim()}` : '')
      : ''

    const vars = {
      CONTRATANTE_NOME: form.contratanteNome.trim() || '[NOME / RAZÃO SOCIAL DO CONTRATANTE]',
      CONTRATANTE_DOC: form.contratanteDoc.trim() || '[CPF/CNPJ]',
      CONTRATANTE_ENDERECO: form.contratanteEndereco.trim() || '[ENDEREÇO COMPLETO]',
      CONTRATANTE_REP_CLAUSULA: repClausula,
      CONTRATADO_NOME: CONTRATADO.nome,
      CONTRATADO_DOC: CONTRATADO.documento,
      CONTRATADO_ENDERECO: CONTRATADO.endereco,
      VALOR_LICENCA: formatBRL(licenca),
      VALOR_IMPLANTACAO: formatBRL(implantacao),
      TOTAL_INICIAL: formatBRL(totalInicial),
      VALOR_MENSALIDADE: formatBRL(mensalidade),
      ESCOPO: form.escopoServico.trim() || '[ESCOPO DOS SERVIÇOS]',
      FORMA_PAGAMENTO: form.formaPagamento.trim() || '[FORMA DE PAGAMENTO]',
      DIAS_ATRASO: form.diasAtraso.trim() || CONTRATO_PADROES.diasAtraso,
      PRAZO_IMPLANTACAO: form.vigencia.trim() || '[PRAZO DE IMPLANTAÇÃO]',
      PRAZO_ACEITE: form.prazoAceite.trim() || CONTRATO_PADROES.prazoAceite,
      PERIODO_LICENCA: form.periodoLicenca.trim() || CONTRATO_PADROES.periodoLicenca,
      AVISO_PREVIO: form.avisoPrevio.trim() || CONTRATO_PADROES.avisoPrevio,
      PRAZO_SANAR: form.prazoSanar.trim() || CONTRATO_PADROES.prazoSanar,
      MULTA: form.multa.trim() || CONTRATO_PADROES.multa,
      GARANTIA_DEFEITOS: form.garantiaDefeitos.trim() || CONTRATO_PADROES.garantiaDefeitos,
      INDICE_REAJUSTE: form.indiceReajuste.trim() || CONTRATO_PADROES.indiceReajuste,
      JANELA_EXPORTACAO: form.janelaExportacao.trim() || CONTRATO_PADROES.janelaExportacao,
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

  // Baixa um PDF limpo (sem cabeçalho/rodapé do navegador), gerado pelo app.
  async function baixarPDF() {
    if (!doc || baixandoPdf) return
    setBaixandoPdf(true)
    try {
      const cliente =
        doc.tipo === 'contrato' ? form.contratanteNome : doc.cliente || form.cliente
      const nome = `${doc.tipo === 'contrato' ? 'Contrato' : 'Proposta'} - ${cliente || 'documento'}`
      await baixarPdf(textoPlano, nome)
    } catch {
      alert('Não foi possível gerar o PDF agora. Use o botão Imprimir como alternativa.')
    } finally {
      setBaixandoPdf(false)
    }
  }

  // Copia o link de assinatura para colar no WhatsApp/Kommo (envio pelo seu número).
  async function copiarLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      setListaErro('')
      alert('Link copiado! Cole na conversa do cliente (WhatsApp ou Kommo).')
    } catch {
      window.prompt('Copie o link de assinatura:', url)
    }
  }

  // ----- Importar dados do lead do Kommo -----
  async function importarKommo() {
    if (importandoKommo) return
    const entrada = window.prompt('ID ou link do lead no Kommo:', form.kommoLeadId || '')
    if (!entrada) return
    setImportandoKommo(true)
    setCnpjMsg(null)
    try {
      const r = await fetch(`/api/kommo?lead=${encodeURIComponent(entrada)}`, {
        credentials: 'same-origin',
      })
      const d = await r.json().catch(() => ({}))
      if (r.status === 401) {
        setAutenticado(false)
        setMostrarLogin(true)
        throw new Error('Faça login para importar do Kommo.')
      }
      if (!r.ok) throw new Error(d.error || 'Falha ao importar do Kommo.')
      setForm((f) => ({
        ...f,
        kommoLeadId: d.leadId || f.kommoLeadId,
        contratanteNome: d.nome || f.contratanteNome,
        contato: d.contato || f.contato,
        contratanteDoc: d.doc || f.contratanteDoc,
        contratanteEndereco: d.endereco || f.contratanteEndereco,
      }))
      setCnpjMsg({ texto: 'Dados importados do Kommo. Confira antes de gerar.', erro: false })
    } catch (e) {
      setCnpjMsg({ texto: e?.message || 'Falha ao importar do Kommo.', erro: true })
    } finally {
      setImportandoKommo(false)
    }
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

      // Para MEI a razão social vem como "<documento> NOME"; limpa o bloco
      // numérico. Se sobrar vazio, usa o nome fantasia.
      const nome =
        limparRazaoSocial(d.razao_social) || (d.nome_fantasia || '').trim() || d.razao_social || ''

      setForm((f) => ({
        ...f,
        contratanteDoc: formatarCnpj(digitos),
        contratanteNome: nome || f.contratanteNome,
        contratanteEndereco: endereco || f.contratanteEndereco,
      }))
      setCnpjMsg({
        texto: `Dados de "${nome}" preenchidos. Confira antes de gerar.`,
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
        kommoLeadId: form.kommoLeadId,
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
          formaPagamento: f.formaPagamento?.trim() || '',
          prazoImplantacao: f.vigencia?.trim() || '',
          validade: f.validadeProposta?.trim() || '',
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
    setEnviandoId(c.id)
    try {
      const r = await fetch('/api/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: c.id, telefone: tel }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha ao enviar.')
      atualizarItemLista(c.id, { status: 'enviado', assinatura_url: d.link })
    } catch (err) {
      setListaErro(err?.message || 'Falha ao enviar para assinatura.')
    } finally {
      setEnviandoId(null)
    }
  }

  async function atualizarStatus(c) {
    setListaErro('')
    setChecandoId(c.id)
    try {
      const r = await fetch(`/api/assinatura?id=${encodeURIComponent(c.id)}`, {
        credentials: 'same-origin',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha ao consultar.')
      atualizarItemLista(c.id, {
        status: d.status,
        assinatura_url: d.signedUrl || c.assinatura_url,
      })
    } catch (err) {
      setListaErro(err?.message || 'Falha ao consultar status.')
    } finally {
      setChecandoId(null)
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

  // ----- Melhorar a escrita de um campo com IA (observações, forma de pagamento…) -----
  async function melhorarCampo(campo) {
    const texto = (form[campo] || '').trim()
    if (!texto || melhorandoCampo) return
    setMelhorandoCampo(campo)
    setIaErro(null)
    try {
      const r = await fetch('/api/melhorar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ texto }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Falha ao melhorar o texto.')
      setForm((f) => ({ ...f, [campo]: data.texto }))
    } catch (e) {
      setIaErro({
        campo,
        texto:
          e?.message ||
          'Não foi possível melhorar agora. (A IA funciona no site publicado na Vercel e exige login.)',
      })
    } finally {
      setMelhorandoCampo(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ---------- Topo ---------- */}
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {MARCA.logo && (
              <img
                src={MARCA.logo}
                alt={MARCA.nomeNegocio}
                className="h-11 w-auto rounded-md"
              />
            )}
            <p className="hidden text-sm text-slate-500 sm:block">Proposta &amp; Contrato</p>
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
              <CardTitle>Dados e valores</CardTitle>
              <p className="-mt-3 mb-4 text-xs text-slate-500">
                Os valores abaixo são usados <strong>tanto na proposta quanto no contrato</strong> — preencha uma vez só.
              </p>
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
                      onClick={() => melhorarCampo('observacoes')}
                      disabled={melhorandoCampo === 'observacoes' || !form.observacoes.trim()}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {melhorandoCampo === 'observacoes' ? 'Melhorando…' : '✨ Melhorar com IA'}
                    </button>
                  </div>
                  <textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.observacoes} onChange={set('observacoes')} placeholder="Escopo, condições especiais, prazos combinados…" />
                  {iaErro?.campo === 'observacoes' && <p className="mt-1 text-xs text-rose-600">{iaErro.texto}</p>}
                </div>

                <Field label="Validade da proposta" hint="Aparece na seção Condições da proposta">
                  <input className={inputCls} value={form.validadeProposta} onChange={set('validadeProposta')} />
                </Field>
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
                  <button
                    type="button"
                    onClick={importarKommo}
                    disabled={importandoKommo}
                    className="flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importandoKommo ? 'Importando…' : '🔗 Importar dados do Kommo'}
                  </button>
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-600">
                      Representante legal (PJ) <span className="font-normal text-slate-400">— opcional, só para empresas</span>
                    </p>
                    <div className="grid gap-3">
                      <input className={inputCls} value={form.repNome} onChange={set('repNome')} placeholder="Nome do representante" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className={inputCls} value={form.repCargo} onChange={set('repCargo')} placeholder="Cargo (ex.: sócio-administrador)" />
                        <input className={inputCls} value={form.repDoc} onChange={set('repDoc')} placeholder="CPF do representante" />
                      </div>
                    </div>
                  </div>

                  <Field label="Escopo dos serviços">
                    <textarea className={`${inputCls} min-h-[70px] resize-y`} value={form.escopoServico} onChange={set('escopoServico')} placeholder="O que está incluído na implantação e nas automações" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Prazo de implantação">
                      <input className={inputCls} value={form.vigencia} onChange={set('vigencia')} placeholder="Ex.: 30 (trinta) dias úteis" />
                      <Chips options={OPCOES_PRAZO} value={form.vigencia} onPick={(v) => setCampo('vigencia', v)} />
                    </Field>
                    <Field label="Período inicial da licença">
                      <input className={inputCls} value={form.periodoLicenca} onChange={set('periodoLicenca')} />
                      <Chips options={OPCOES_LICENCA} value={form.periodoLicenca} onPick={(v) => setCampo('periodoLicenca', v)} />
                    </Field>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">Forma de pagamento</span>
                      <button
                        type="button"
                        onClick={() => melhorarCampo('formaPagamento')}
                        disabled={melhorandoCampo === 'formaPagamento' || !form.formaPagamento.trim()}
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {melhorandoCampo === 'formaPagamento' ? 'Melhorando…' : '✨ IA'}
                      </button>
                    </div>
                    <input className={inputCls} value={form.formaPagamento} onChange={set('formaPagamento')} placeholder="Ex.: 50% na assinatura e 50% na entrega, via PIX" />
                    {iaErro?.campo === 'formaPagamento' && <p className="mt-1 text-xs text-rose-600">{iaErro.texto}</p>}
                  </div>

                  <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600">
                      Condições jurídicas (já preenchidas — edite se quiser)
                    </summary>
                    <div className="mt-3 grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Prazo para aceite da entrega">
                          <input className={inputCls} value={form.prazoAceite} onChange={set('prazoAceite')} />
                        </Field>
                        <Field label="Dias de atraso p/ suspensão">
                          <input className={inputCls} value={form.diasAtraso} onChange={set('diasAtraso')} />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Aviso prévio de rescisão">
                          <input className={inputCls} value={form.avisoPrevio} onChange={set('avisoPrevio')} />
                        </Field>
                        <Field label="Prazo p/ sanar descumprimento">
                          <input className={inputCls} value={form.prazoSanar} onChange={set('prazoSanar')} />
                        </Field>
                      </div>
                      <Field label="Multa por descumprimento">
                        <input className={inputCls} value={form.multa} onChange={set('multa')} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Garantia de defeitos">
                          <input className={inputCls} value={form.garantiaDefeitos} onChange={set('garantiaDefeitos')} />
                        </Field>
                        <Field label="Índice de reajuste">
                          <input className={inputCls} value={form.indiceReajuste} onChange={set('indiceReajuste')} />
                        </Field>
                      </div>
                      <Field label="Janela para exportar dados (pós-rescisão)">
                        <input className={inputCls} value={form.janelaExportacao} onChange={set('janelaExportacao')} />
                      </Field>
                    </div>
                  </details>
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

            {erroGerar && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {erroGerar}
              </p>
            )}

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
                  <button onClick={baixarPDF} disabled={baixandoPdf} className={btnGhost}>
                    {baixandoPdf ? 'Gerando…' : '⬇️ Baixar PDF'}
                  </button>
                  <button onClick={imprimir} className={btnGhost}>
                    Imprimir
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
                          disabled={enviandoId === c.id}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {enviandoId === c.id ? 'Enviando…' : '📲 Enviar p/ assinatura'}
                        </button>
                      )}
                      {c.status === 'enviado' && (
                        <>
                          <button
                            onClick={() => atualizarStatus(c)}
                            disabled={checandoId === c.id}
                            className={btnGhost}
                          >
                            {checandoId === c.id ? 'Checando…' : 'Atualizar status'}
                          </button>
                          {c.assinatura_url && (
                            <>
                              <button onClick={() => copiarLink(c.assinatura_url)} className={btnGhost}>
                                Copiar link
                              </button>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                  `Olá! Segue o contrato para assinatura digital: ${c.assinatura_url}`,
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                              >
                                WhatsApp
                              </a>
                            </>
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

// Atalhos clicáveis que preenchem um campo com um valor pronto.
const OPCOES_PRAZO = [
  { label: '5 dias', valor: '5 (cinco) dias úteis' },
  { label: '10 dias', valor: '10 (dez) dias úteis' },
  { label: '15 dias', valor: '15 (quinze) dias úteis' },
  { label: '20 dias', valor: '20 (vinte) dias úteis' },
]
const OPCOES_LICENCA = [
  { label: '6 meses', valor: '6 (seis) meses' },
  { label: '12 meses', valor: '12 (doze) meses' },
]

function Chips({ options, value, onPick }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onPick(o.valor)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
            value === o.valor
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
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
  if (!MARCA.logo) return null
  return (
    <div className="mb-6 overflow-hidden rounded-xl">
      <img
        src={MARCA.logo}
        alt={`${MARCA.nomeNegocio} — ${MARCA.slogan}`}
        className="block w-full"
      />
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

      {/* Apresentação */}
      <div className="mb-6">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Apresentação
        </h3>
        <p className="text-sm leading-relaxed text-slate-700">{PROPOSTA_INTRO}</p>
      </div>

      {/* O que está incluído */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          O que está incluído
        </h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {PROPOSTA_ITENS.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-600">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
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

      {/* Condições */}
      {(doc.formaPagamento || doc.prazoImplantacao || doc.validade) && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Condições
          </h3>
          <ul className="space-y-1 text-sm text-slate-700">
            {doc.formaPagamento && (
              <li><strong>Forma de pagamento:</strong> {doc.formaPagamento}</li>
            )}
            {doc.prazoImplantacao && (
              <li><strong>Prazo de implantação:</strong> {doc.prazoImplantacao}</li>
            )}
            {doc.validade && (
              <li><strong>Validade desta proposta:</strong> {doc.validade}</li>
            )}
          </ul>
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
    'APRESENTAÇÃO',
    PROPOSTA_INTRO,
    '',
    'O QUE ESTÁ INCLUÍDO',
    ...PROPOSTA_ITENS.map((i) => `- ${i}`),
    '',
    'DETALHAMENTO DOS VALORES',
    `- Licença da plataforma: ${formatBRL(doc.licenca)}`,
    `- Implantação e configuração: ${formatBRL(doc.implantacao)}`,
    '',
    `INVESTIMENTO INICIAL: ${formatBRL(doc.totalInicial)}`,
    doc.com ? `ACOMPANHAMENTO MENSAL: ${formatBRL(doc.mensalidade)} / mês` : null,
  ]
  const cond = [
    doc.formaPagamento ? `- Forma de pagamento: ${doc.formaPagamento}` : null,
    doc.prazoImplantacao ? `- Prazo de implantação: ${doc.prazoImplantacao}` : null,
    doc.validade ? `- Validade desta proposta: ${doc.validade}` : null,
  ].filter(Boolean)
  if (cond.length) {
    linhas.push('', 'CONDIÇÕES', ...cond)
  }
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
