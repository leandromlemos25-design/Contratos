// -----------------------------------------------------------------------------
//  Gera lib/logo-data.js (base64 da logo) a partir do arquivo em public/.
//  Roda automaticamente no "prebuild" — assim o PDF enviado para assinatura
//  usa SEMPRE a mesma logo do site, sem precisar regenerar à mão.
//  Troque a logo: substitua o arquivo abaixo em public/ e rode o build.
// -----------------------------------------------------------------------------
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Fonte única da logo (deve bater com MARCA.logo em src/templates.js).
const ARQUIVO = 'logo-smartflux.jpg'
const FORMATO = ARQUIVO.endsWith('.png') ? 'png' : 'jpg'

const bytes = await readFile(join(raiz, 'public', ARQUIVO))
const base64 = bytes.toString('base64')

const conteudo =
  `// ARQUIVO GERADO AUTOMATICAMENTE por scripts/gen-logo.mjs — não edite à mão.\n` +
  `// Fonte: public/${ARQUIVO}\n` +
  `export const LOGO_BASE64 = ${JSON.stringify(base64)};\n` +
  `export const LOGO_FORMATO = ${JSON.stringify(FORMATO)};\n`

await writeFile(join(raiz, 'lib', 'logo-data.js'), conteudo)
console.log(`logo-data.js gerado a partir de public/${ARQUIVO} (${bytes.length} bytes, ${FORMATO})`)
