// -----------------------------------------------------------------------------
//  Integração com o Kommo (amoCRM) — API v4.
//  Subdomínio em KOMMO_SUBDOMAIN (padrão "smartflux"); token de longa duração
//  em KOMMO_TOKEN (integração privada do Kommo). Token fica só no servidor.
// -----------------------------------------------------------------------------
const SUBDOMINIO = process.env.KOMMO_SUBDOMAIN || 'smartflux'

function base() {
  return `https://${SUBDOMINIO}.kommo.com/api/v4`
}

function token() {
  const t = process.env.KOMMO_TOKEN
  if (!t) throw new Error('KOMMO_TOKEN não configurada no servidor.')
  return t
}

export function kommoConfigurado() {
  return !!process.env.KOMMO_TOKEN
}

async function api(path, opts = {}) {
  const r = await fetch(base() + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (r.status === 401 || r.status === 403) throw new Error('Token do Kommo inválido ou sem permissão.')
  if (r.status === 204) return null
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const detalhe =
      data?.['validation-errors']?.[0]?.errors?.[0]?.detail || data?.title || `Erro Kommo (${r.status}).`
    throw new Error(detalhe)
  }
  return data
}

// Valor de um campo personalizado pelo NOME (case-insensitive, "contém").
function campoPorNome(cfv, ...nomes) {
  if (!Array.isArray(cfv)) return ''
  for (const f of cfv) {
    const nome = (f.field_name || '').toLowerCase()
    if (nomes.some((n) => nome.includes(n))) {
      const v = f.values?.[0]?.value
      if (v) return String(v)
    }
  }
  return ''
}

// Valor de um campo padrão pelo CODE (ex.: PHONE, EMAIL).
function valorPorCode(cfv, code) {
  if (!Array.isArray(cfv)) return ''
  for (const f of cfv) {
    if (f.field_code === code) {
      const v = f.values?.[0]?.value
      if (v) return String(v)
    }
  }
  return ''
}

// Lê um lead e seus contatos/empresas e devolve dados prontos para o formulário.
export async function buscarLead(id) {
  const lead = await api(`/leads/${id}?with=contacts,companies`)
  const out = { nome: '', contato: '', doc: '', endereco: '' }

  out.doc = campoPorNome(lead.custom_fields_values, 'cnpj', 'cpf', 'documento')
  out.endereco = campoPorNome(lead.custom_fields_values, 'endereço', 'endereco')

  const contatos = lead._embedded?.contacts || []
  const contatoId = (contatos.find((c) => c.is_main) || contatos[0])?.id
  if (contatoId) {
    const c = await api(`/contacts/${contatoId}`)
    out.nome = c.name || out.nome
    const cfv = c.custom_fields_values
    const phone = valorPorCode(cfv, 'PHONE') || campoPorNome(cfv, 'whatsapp', 'telefone', 'phone')
    const email = valorPorCode(cfv, 'EMAIL') || campoPorNome(cfv, 'e-mail', 'email')
    out.contato = phone || email || out.contato
    out.doc = out.doc || campoPorNome(cfv, 'cnpj', 'cpf', 'documento')
    out.endereco = out.endereco || campoPorNome(cfv, 'endereço', 'endereco')
  }

  const empresaId = lead._embedded?.companies?.[0]?.id
  if (empresaId) {
    const emp = await api(`/companies/${empresaId}`)
    if (emp.name) out.nome = emp.name // empresa tem prioridade como CONTRATANTE
    out.doc = out.doc || campoPorNome(emp.custom_fields_values, 'cnpj', 'cpf', 'documento')
    out.endereco = out.endereco || campoPorNome(emp.custom_fields_values, 'endereço', 'endereco')
  }

  return out
}

// Resolve o ID de uma etapa pelo nome (em qualquer funil).
async function statusIdPorNome(nome) {
  const data = await api('/leads/pipelines')
  const alvo = nome.trim().toLowerCase()
  for (const p of data?._embedded?.pipelines || []) {
    for (const s of p._embedded?.statuses || []) {
      if ((s.name || '').trim().toLowerCase() === alvo) {
        return { statusId: s.id, pipelineId: p.id }
      }
    }
  }
  return null
}

// Ao assinar: adiciona uma nota no lead e (se configurado) move de etapa.
export async function atualizarLeadAssinado(leadId, { pdfUrl } = {}) {
  const texto = pdfUrl ? `✅ Contrato assinado. PDF: ${pdfUrl}` : '✅ Contrato assinado.'
  await api(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify([{ note_type: 'common', params: { text: texto } }]),
  })

  const idEtapa = process.env.KOMMO_STAGE_ASSINADO_ID
  const nomeEtapa = process.env.KOMMO_STAGE_ASSINADO
  if (idEtapa) {
    await api(`/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify({ status_id: Number(idEtapa) }) })
  } else if (nomeEtapa) {
    const r = await statusIdPorNome(nomeEtapa)
    if (r) {
      await api(`/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status_id: r.statusId, pipeline_id: r.pipelineId }),
      })
    }
  }
}
