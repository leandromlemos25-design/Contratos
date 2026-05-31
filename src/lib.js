// -----------------------------------------------------------------------------
//  Utilidades: moeda BR, data por extenso e o "motor" do template do contrato.
// -----------------------------------------------------------------------------

// Converte o que o usuário digitou (ex.: "1.500,90", "1500.90", "R$ 1500")
// em número. Retorna 0 quando vazio/ inválido.
export function parseMoeda(input) {
  if (input === null || input === undefined) return 0
  if (typeof input === 'number') return isFinite(input) ? input : 0
  let s = String(input).trim()
  if (!s) return 0
  s = s.replace(/[^\d.,-]/g, '') // tira "R$", espaços, etc.
  if (s.includes(',')) {
    // formato BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}

const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Número -> "R$ 1.500,90"
export function formatBRL(n) {
  return fmtBRL.format(Number(n) || 0)
}

// Data atual por extenso: "30 de maio de 2026"
export function dataPorExtenso(date = new Date()) {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`
}

// Decide se há mensalidade. Em branco, "0", "0,00" etc. => sem recorrência.
export function temMensalidade(valorMensalidadeRaw) {
  return parseMoeda(valorMensalidadeRaw) > 0
}

// "Motor" simples de template:
//  1) Resolve blocos condicionais {{#MENSALIDADE}}...{{/MENSALIDADE}} e
//     {{#SEM_MENSALIDADE}}...{{/SEM_MENSALIDADE}}.
//  2) Substitui as variáveis {{CHAVE}} pelo valor do mapa.
export function renderTemplate(base, vars, comMensalidade) {
  let out = base

  const mantemBloco = (texto, tag, manter) => {
    const re = new RegExp(`{{#${tag}}}([\\s\\S]*?){{/${tag}}}`, 'g')
    return texto.replace(re, (_, conteudo) => (manter ? conteudo : ''))
  }

  out = mantemBloco(out, 'MENSALIDADE', comMensalidade)
  out = mantemBloco(out, 'SEM_MENSALIDADE', !comMensalidade)

  out = out.replace(/{{\s*([A-Z_]+)\s*}}/g, (m, chave) =>
    chave in vars ? vars[chave] : m,
  )

  // Limpa linhas em branco triplas eventualmente deixadas pelos blocos.
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}
