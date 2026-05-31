// -----------------------------------------------------------------------------
//  Login de usuário único (você). Uma senha (APP_PASSWORD) gera um cookie de
//  sessão assinado (JWT com SESSION_SECRET). Simples e seguro para 1 usuário.
// -----------------------------------------------------------------------------
import { SignJWT, jwtVerify } from 'jose'
import { timingSafeEqual } from 'node:crypto'

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET não configurada no servidor.')
  return new TextEncoder().encode(s)
}

// Comparação de senha resistente a timing attacks.
export function senhaConfere(enviada) {
  const esperada = process.env.APP_PASSWORD || ''
  if (!esperada) return false
  const a = Buffer.from(String(enviada))
  const b = Buffer.from(esperada)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function criarSessao() {
  return await new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verificarSessao(req) {
  const cookie = req.headers?.cookie || ''
  const m = cookie.match(/(?:^|;\s*)sessao=([^;]+)/)
  if (!m) return false
  try {
    await jwtVerify(decodeURIComponent(m[1]), secret())
    return true
  } catch {
    return false
  }
}

export function cookieSessao(token) {
  return [
    `sessao=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 30}`,
  ].join('; ')
}

export function cookieLogout() {
  return 'sessao=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}
