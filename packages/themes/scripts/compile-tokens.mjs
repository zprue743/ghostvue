import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { writeThemeTokenOutputs } from './lib/compile-tokens.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsPath = resolve(packageRoot, '../../docs/themes/tokens.md')

const { paths } = await writeThemeTokenOutputs({ packageRoot, docsPath })
console.log(`Wrote ${paths.css}`)
console.log(`Wrote ${paths.typescript}`)
console.log(`Wrote ${paths.manifest}`)
console.log(`Wrote ${paths.docs}`)
