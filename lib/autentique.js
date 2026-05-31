// -----------------------------------------------------------------------------
//  Integração com a Autentique (assinatura digital + envio por WhatsApp).
//  API GraphQL: https://api.autentique.com.br/v2/graphql
//  Token na variável de ambiente AUTENTIQUE_TOKEN (painel da Autentique → API).
// -----------------------------------------------------------------------------
const ENDPOINT = 'https://api.autentique.com.br/v2/graphql'

function token() {
  const t = process.env.AUTENTIQUE_TOKEN
  if (!t) throw new Error('AUTENTIQUE_TOKEN não configurada no servidor.')
  return t
}

// Cria o documento, adiciona o signatário e dispara o WhatsApp automaticamente.
// Retorna { id, link } — id do documento e link de assinatura do cliente.
export async function criarDocumento({ nome, pdfBytes, signerNome, telefone }) {
  const query = `
    mutation CreateDoc($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
      createDocument(document: $document, signers: $signers, file: $file) {
        id
        name
        signatures { public_id name link { short_link } }
      }
    }`

  const variables = {
    document: { name: nome },
    signers: [
      {
        name: signerNome || 'Cliente',
        phone: telefone,
        action: 'SIGN',
        delivery_method: 'DELIVERY_METHOD_WHATSAPP',
      },
    ],
    file: null,
  }

  // GraphQL multipart request (spec jaydenseric): operations + map + arquivo.
  const form = new FormData()
  form.append('operations', JSON.stringify({ query, variables }))
  form.append('map', JSON.stringify({ 0: ['variables.file'] }))
  form.append('0', new Blob([pdfBytes], { type: 'application/pdf' }), 'contrato.pdf')

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  })
  const data = await r.json().catch(() => ({}))
  if (data.errors?.length) throw new Error(data.errors[0]?.message || 'Erro na Autentique.')
  const doc = data?.data?.createDocument
  if (!doc?.id) throw new Error('A Autentique não retornou o documento.')
  return { id: doc.id, link: doc.signatures?.[0]?.link?.short_link || null }
}

// Consulta o status. Retorna { assinado, signedUrl }.
export async function consultarDocumento(id) {
  const query = `
    query Doc($id: UUID!) {
      document(id: $id) {
        id
        files { signed }
        signatures { name signed { created_at } }
      }
    }`

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id } }),
  })
  const data = await r.json().catch(() => ({}))
  if (data.errors?.length) throw new Error(data.errors[0]?.message || 'Erro na Autentique.')
  const doc = data?.data?.document
  const assinaturas = doc?.signatures || []
  const assinado = assinaturas.length > 0 && assinaturas.every((s) => s.signed?.created_at)
  return { assinado, signedUrl: doc?.files?.signed || null }
}
