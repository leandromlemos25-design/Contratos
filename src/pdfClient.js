// -----------------------------------------------------------------------------
//  Gera e baixa um PDF A4 limpo (logo SmartFlux + texto), 100% no navegador.
//  Sem cabeçalho/rodapé do navegador (URL, data, nº de página).
//  O pdf-lib é importado sob demanda para não pesar o bundle inicial.
// -----------------------------------------------------------------------------
import { MARCA } from './templates.js'

let _logoCache // Uint8Array | null | undefined

async function carregarLogo() {
  if (_logoCache !== undefined) return _logoCache
  try {
    if (!MARCA.logo) return (_logoCache = null)
    const r = await fetch(MARCA.logo)
    if (!r.ok) return (_logoCache = null)
    _logoCache = new Uint8Array(await r.arrayBuffer())
  } catch {
    _logoCache = null
  }
  return _logoCache
}

// Fonte padrão (WinAnsi) não desenha tudo — troca o que não suporta.
function limpar(s) {
  return String(s).replace(/[^\x00-\xFF–—‘’“”†‡•…‰€]/g, '?')
}

function nomeSeguro(s) {
  return String(s || 'documento')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export async function baixarPdf(texto, nomeArquivo = 'documento') {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  const size = 10.5
  const lh = size * 1.45
  const margin = 56
  const pageW = 595.28
  const pageH = 841.89
  const maxW = pageW - margin * 2
  const PRETO = rgb(0.12, 0.12, 0.12)

  // Logo (opcional).
  let logoImg = null
  const logoBytes = await carregarLogo()
  if (logoBytes) {
    try {
      logoImg = MARCA.logo.endsWith('.png')
        ? await pdf.embedPng(logoBytes)
        : await pdf.embedJpg(logoBytes)
    } catch {
      logoImg = null
    }
  }

  let page = pdf.addPage([pageW, pageH])
  let y = pageH - margin

  // Cabeçalho com a logo (primeira página).
  if (logoImg) {
    const logoW = 200
    const logoH = (logoImg.height / logoImg.width) * logoW
    page.drawImage(logoImg, { x: (pageW - logoW) / 2, y: y - logoH, width: logoW, height: logoH })
    page.drawLine({
      start: { x: margin, y: y - logoH - 14 },
      end: { x: pageW - margin, y: y - logoH - 14 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.9),
    })
    y = y - logoH - 30
  }

  const novaPagina = () => {
    page = pdf.addPage([pageW, pageH])
    y = pageH - margin
  }
  const escrever = (linha) => {
    if (y < margin) novaPagina()
    page.drawText(linha, { x: margin, y: y - size, size, font, color: PRETO })
    y -= lh
  }
  const quebrar = (paragrafo) => {
    if (paragrafo === '') {
      y -= lh * 0.6
      return
    }
    const palavras = paragrafo.split(/\s+/)
    let linha = ''
    for (const p of palavras) {
      const teste = linha ? `${linha} ${p}` : p
      if (font.widthOfTextAtSize(teste, size) > maxW) {
        if (linha) escrever(linha)
        linha = p
      } else {
        linha = teste
      }
    }
    if (linha) escrever(linha)
  }

  for (const raw of limpar(texto).split('\n')) quebrar(raw)

  const bytes = await pdf.save()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeSeguro(nomeArquivo)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
