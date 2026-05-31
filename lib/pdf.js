// -----------------------------------------------------------------------------
//  Gera um PDF A4 a partir do texto do contrato (quebra de linha + paginação).
//  Usado para enviar o documento à plataforma de assinatura.
// -----------------------------------------------------------------------------
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Mantém só caracteres que a fonte padrão (WinAnsi) consegue desenhar.
function limpar(s) {
  return String(s).replace(
    /[^\x00-\xFF–—‘’“”†‡•…‰€]/g,
    '?',
  )
}

export async function gerarPdfContrato(texto) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  const size = 10.5
  const lh = size * 1.45
  const margin = 56
  const pageW = 595.28
  const pageH = 841.89
  const maxW = pageW - margin * 2

  let page = pdf.addPage([pageW, pageH])
  let y = pageH - margin

  const novaPagina = () => {
    page = pdf.addPage([pageW, pageH])
    y = pageH - margin
  }
  const escrever = (linha) => {
    if (y < margin) novaPagina()
    page.drawText(linha, { x: margin, y: y - size, size, font, color: rgb(0.12, 0.12, 0.12) })
    y -= lh
  }
  const quebrar = (paragrafo) => {
    if (paragrafo === '') {
      y -= lh * 0.6 // espaço entre parágrafos/cláusulas
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
