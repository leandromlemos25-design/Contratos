import { verificarSessao } from '../lib/auth.js'
import { getSql, ensureSchema } from '../lib/db.js'

export default async function handler(req, res) {
  if (!(await verificarSessao(req))) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  const id = req.query?.id
  if (!id) {
    res.status(400).json({ error: 'Parâmetro "id" obrigatório.' })
    return
  }
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM contratos WHERE id = ${id}`
      if (!rows.length) {
        res.status(404).json({ error: 'Não encontrado.' })
        return
      }
      res.status(200).json({ contrato: rows[0] })
      return
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM contratos WHERE id = ${id}`
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Método não permitido.' })
  } catch (e) {
    res.status(500).json({ error: 'Erro no banco: ' + (e?.message || 'desconhecido') })
  }
}
