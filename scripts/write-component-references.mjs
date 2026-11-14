import { fileURLToPath } from 'node:url'

import { writeComponentReferences } from './lib/component-reference.js'

await writeComponentReferences(fileURLToPath(new URL('..', import.meta.url)))
