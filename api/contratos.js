import { verificarSessao } from '../lib/auth.js'
import { getSql, ensureSchema } from '../lib/db.js'

const num = (v) => {
  const n = Number(v)
  return isFinite(n) ? n : null
}

export default async function handler(req, res) {
  if (!(await verificarSessao(req))) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, criado_em, tipo, com_mensalidade, cliente_nome, contato,
               total_inicial, valor_mensalidade, status, assinatura_url,
               assinatura_doc_id, assinado_em
        FROM contratos
        ORDER BY criado_em DESC
        LIMIT 300`
      res.status(200).json({ contratos: rows })
      return
    }

    if (req.method === 'POST') {
      const b = req.body ?? {}
      const f = b.form ?? {}
      const rows = await sql`
        INSERT INTO contratos
          (tipo, com_mensalidade, cliente_nome, contato, doc, endereco,
           valor_licenca, valor_implantacao, valor_mensalidade, total_inicial,
           observacoes, vigencia, forma_pagamento, foro, contrato_texto, form_json, status,
           kommo_lead_id)
        VALUES
          (${b.tipo || 'contrato'}, ${!!b.comMensalidade}, ${b.clienteNome || null}, ${b.contato || null},
           ${b.doc || null}, ${b.endereco || null},
           ${num(b.valorLicenca)}, ${num(b.valorImplantacao)}, ${num(b.valorMensalidade)}, ${num(b.totalInicial)},
           ${b.observacoes || null}, ${b.vigencia || null}, ${b.formaPagamento || null}, ${b.foro || null},
           ${b.contratoTexto || null}, ${JSON.stringify(f)}, ${b.status || 'salvo'},
           ${b.kommoLeadId || null})
        RETURNING id, criado_em`
      res.status(201).json({ contrato: rows[0] })
      return
    }

    res.status(405).json({ error: 'Método não permitido.' })
  } catch (e) {
    res.status(500).json({ error: 'Erro no banco: ' + (e?.message || 'desconhecido') })
  }
}
