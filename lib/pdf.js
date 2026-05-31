// -----------------------------------------------------------------------------
//  Gera um PDF A4 a partir do texto do contrato (cabeçalho com logo SmartFlux,
//  quebra de linha automática e paginação). Usado para a plataforma de assinatura.
// -----------------------------------------------------------------------------
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { LOGO_S_BASE64 } from './logo-data.js'

const AZUL = rgb(0.04, 0.28, 0.64) // mesmo tom do "SmartFlux" na tela
const PRETO = rgb(0.12, 0.12, 0.12)
const CINZA = rgb(0.45, 0.45, 0.5)

// Mantém só caracteres que a fonte padrão (WinAnsi) consegue desenhar.
function limpar(s) {
  return String(s).replace(/[^\x00-\xFF–—‘’“”†‡•…‰€]/g, '?')
}

function carregarLogo() {
  try {
    return Buffer.from(LOGO_S_BASE64, 'base64')
  } catch {
    return null
  }
}

export async function gerarPdfContrato(texto) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const size = 10.5
  const lh = size * 1.45
  const margin = 56
  const pageW = 595.28
  const pageH = 841.89
  const maxW = pageW - margin * 2

  // Embute a logo (transparente) uma vez.
  let logoImg = null
  const logoBytes = carregarLogo()
  if (logoBytes) {
    try {
      logoImg = await pdf.embedPng(logoBytes)
    } catch {}
  }

  let page = pdf.addPage([pageW, pageH])
  let y = pageH - margin

  // Cabeçalho com a marca (só na primeira página).
  function desenharCabecalho() {
    const topo = pageH - margin
    let xTexto = margin
    if (logoImg) {
      const logoH = 36
      const logoW = (logoImg.width / logoImg.height) * logoH
      page.drawImage(logoImg, {
        x: margin,
        y: topo - logoH,
        width: logoW,
        height: logoH,
      })
      xTexto = margin + logoW + 10
    }
    page.drawText('SmartFlux', {
      x: xTexto,
      y: topo - 18,
      size: 18,
      font: fontBold,
      color: AZUL,
    })
    page.drawText('Automação inteligente para empresas', {
      x: xTexto,
      y: topo - 32,
      size: 9,
      font,
      color: CINZA,
    })
    // Linha separadora
    page.drawLine({
      start: { x: margin, y: topo - 44 },
      end: { x: pageW - margin, y: topo - 44 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.9),
    })
    y = topo - 60
  }

  desenharCabecalho()

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

  for (const raw of limpar(texto).split('\n')) {
    quebrar(raw)
  }

  return await pdf.save()
}
