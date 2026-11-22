import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

function countLines(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return text.split('\n').filter((line) => line.trim().length > 0).length
}

const ghostConsumer = path.join(root, '../src/views/InvoiceGhost.vue')
const primeConsumer = path.join(root, '../src/views/InvoicePrime.vue')
const ghostComposable = [
  'useGhostDataTable.ts',
  'defineDataTableColumns.ts',
  'filtering.ts',
  'sorting.ts',
  'GhostDataTable.vue',
].map((f) => path.join(root, '../src/ghostvue', f))

const report = {
  ghostConsumerNonBlankLines: countLines(ghostConsumer),
  primeConsumerNonBlankLines: countLines(primeConsumer),
  ghostPrototypeImplementationLines: ghostComposable.reduce((n, f) => n + countLines(f), 0),
  note:
    'Consumer LOC compares fixture screens only; Ghost total includes throwaway composable implementation inside prototypes/.',
}

console.log(JSON.stringify(report, null, 2))