import { senhaConfere, criarSessao, cookieSessao } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }
  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    res.status(500).json({ error: 'Login não configurado (defina APP_PASSWORD e SESSION_SECRET na Vercel).' })
    return
  }
  const { senha } = req.body ?? {}
  if (!senhaConfere(senha)) {
    res.status(401).json({ error: 'Senha incorreta.' })
    return
  }
  const token = await criarSessao()
  res.setHeader('Set-Cookie', cookieSessao(token))
  res.status(200).json({ ok: true })
}
