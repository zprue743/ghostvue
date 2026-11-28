/**
 * Prints where runnable examples sit across the component guides (issue #428):
 * per page, the ordered example ids, their layers and headings, and counts.
 * Read-only; it never writes to the checkout.
 *
 *   pnpm examples:inventory                         # every component guide
 *   pnpm examples:inventory data-table date-picker  # selected guides
 *   pnpm examples:inventory --json                  # machine-readable
 *
 * Exits 1 when an embed has no registry metadata, naming the page and id.
 */
import { fileURLToPath } from 'node:url'

import {
  formatExampleInventory,
  readExampleInventory,
} from './lib/example-inventory.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const json = args.includes('--json')
const pages = args.filter((arg) => !arg.startsWith('--'))

const inventory = await readExampleInventory({ repositoryRoot, pages })

process.stdout.write(
  json
    ? `${JSON.stringify(inventory, null, 2)}\n`
    : formatExampleInventory(inventory),
)

if (inventory.unresolved.length > 0) {
  console.error(
    [
      'Example embeds without registry metadata:',
      ...inventory.unresolved.map(
        (entry) => `  ${entry.page}: ${entry.id} (${entry.reason})`,
      ),
    ].join('\n'),
  )
  process.exitCode = 1
}
