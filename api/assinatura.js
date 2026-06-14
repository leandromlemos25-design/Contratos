import { verificarSessao } from '../lib/auth.js'
import { getSql, ensureSchema } from '../lib/db.js'
import { gerarPdfContrato } from '../lib/pdf.js'
import { criarDocumento, consultarDocumento } from '../lib/autentique.js'
import { atualizarLeadAssinado, kommoConfigurado } from '../lib/kommo.js'

// "(34) 99999-8888" -> "+5534999998888"
function normalizarTelefone(t) {
  let d = String(t || '').replace(/\D/g, '')
  if (d.startsWith('55')) d = d.slice(2)
  return '+55' + d
}

export default async function handler(req, res) {
  if (!(await verificarSessao(req))) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  try {
    await ensureSchema()
    const sql = getSql()

    // ---- Enviar para assinatura (WhatsApp) ----
    if (req.method === 'POST') {
      const { id, telefone } = req.body ?? {}
      if (!id || !telefone) {
        res.status(400).json({ error: 'id e telefone são obrigatórios.' })
        return
      }
      const rows = await sql`SELECT * FROM contratos WHERE id = ${id}`
      if (!rows.length) {
        res.status(404).json({ error: 'Contrato não encontrado.' })
        return
      }
      const c = rows[0]
      if (!c.contrato_texto) {
        res.status(400).json({ error: 'Este registro não tem texto de contrato para assinar.' })
        return
      }

      const pdf = await gerarPdfContrato(c.contrato_texto)
      const { id: docId, link } = await criarDocumento({
        nome: `Contrato - ${c.cliente_nome || 'cliente'}`,
        pdfBytes: pdf,
        signerNome: c.cliente_nome,
        telefone: normalizarTelefone(telefone),
      })

      await sql`
        UPDATE contratos
        SET assinatura_provider = 'autentique',
            assinatura_doc_id = ${docId},
            assinatura_url = ${link},
            status = 'enviado'
        WHERE id = ${id}`
      res.status(200).json({ ok: true, status: 'enviado', link })
      return
    }

    // ---- Atualizar status (consulta a Autentique) ----
    if (req.method === 'GET') {
      const id = req.query?.id
      if (!id) {
        res.status(400).json({ error: 'id obrigatório.' })
        return
      }
      const rows = await sql`SELECT assinatura_doc_id, kommo_lead_id, status FROM contratos WHERE id = ${id}`
      if (!rows.length || !rows[0].assinatura_doc_id) {
        res.status(400).json({ error: 'Este contrato ainda não foi enviado para assinatura.' })
        return
      }
      const info = await consultarDocumento(rows[0].assinatura_doc_id)
      if (info.assinado) {
        await sql`
          UPDATE contratos
          SET status = 'assinado',
              assinado_em = now(),
              assinatura_url = COALESCE(${info.signedUrl}, assinatura_url)
          WHERE id = ${id}`

        // Atualiza o lead no Kommo (na primeira vez que detecta a assinatura).
        // Falha aqui não pode quebrar a resposta de status da assinatura.
        if (rows[0].status !== 'assinado' && rows[0].kommo_lead_id && kommoConfigurado()) {
          try {
            await atualizarLeadAssinado(rows[0].kommo_lead_id, { pdfUrl: info.signedUrl })
          } catch (e) {
            console.error('Falha ao atualizar lead no Kommo:', e?.message)
          }
        }
      }
      res.status(200).json({
        status: info.assinado ? 'assinado' : 'enviado',
        signedUrl: info.signedUrl,
      })
      return
    }

    res.status(405).json({ error: 'Método não permitido.' })
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Falha na assinatura.' })
  }
}
