// -----------------------------------------------------------------------------
//  Acesso ao banco Neon (Postgres serverless). Usado pelas funções em /api.
//  A string de conexão fica na variável de ambiente DATABASE_URL (Vercel/Neon).
// -----------------------------------------------------------------------------
import { neon } from '@neondatabase/serverless'

let _sql

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada no servidor.')
  }
  if (!_sql) _sql = neon(process.env.DATABASE_URL)
  return _sql
}

let _ensured = false

// Cria a tabela na primeira vez (idempotente — não precisa de migração manual).
export async function ensureSchema() {
  if (_ensured) return
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS contratos (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      criado_em          timestamptz NOT NULL DEFAULT now(),
      tipo               text NOT NULL DEFAULT 'contrato',
      com_mensalidade    boolean NOT NULL DEFAULT false,
      cliente_nome       text,
      contato            text,
      doc                text,
      endereco           text,
      valor_licenca      numeric,
      valor_implantacao  numeric,
      valor_mensalidade  numeric,
      total_inicial      numeric,
      observacoes        text,
      vigencia           text,
      forma_pagamento    text,
      foro               text,
      contrato_texto     text,
      form_json          jsonb,
      status             text NOT NULL DEFAULT 'salvo',
      assinatura_provider text,
      assinatura_doc_id  text,
      assinatura_url     text,
      assinado_em        timestamptz
    )
  `
  _ensured = true
}
