import { verificarSessao } from '../lib/auth.js'

export default async function handler(req, res) {
  // Não vaza se está ou não configurado — só diz se a sessão é válida.
  let autenticado = false
  try {
    autenticado = await verificarSessao(req)
  } catch {
    autenticado = false
  }
  res.status(200).json({ autenticado })
}
