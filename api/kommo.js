import { verificarSessao } from '../lib/auth.js'
import { buscarLead, kommoConfigurado } from '../lib/kommo.js'

// Extrai o ID numérico do lead (aceita ID puro ou URL do Kommo).
function extrairLeadId(entrada) {
  const s = String(entrada || '')
  const m = s.match(/(\d{3,})/g) // pega o maior bloco numérico (ID do lead)
  return m ? m[m.length - 1] : ''
}

export default async function handler(req, res) {
  if (!(await verificarSessao(req))) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  if (!kommoConfigurado()) {
    res.status(500).json({ error: 'Kommo não configurado (defina KOMMO_TOKEN na Vercel).' })
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }
  const leadId = extrairLeadId(req.query?.lead)
  if (!leadId) {
    res.status(400).json({ error: 'Informe o ID ou o link do lead.' })
    return
  }
  try {
    const dados = await buscarLead(leadId)
    res.status(200).json({ leadId, ...dados })
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Falha ao consultar o Kommo.' })
  }
}
