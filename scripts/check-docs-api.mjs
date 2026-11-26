/**
 * Writes or checks the generated API tables in hand-written docs (issue #324):
 * component props/events/slots from `*.manifest.json`, and the MCP tool list
 * in `docs/tooling/mcp-server.md` from `packages/mcp/src`.
 *
 *   pnpm docs:api         # check; part of `pnpm verify:static`
 *   pnpm docs:api:write   # regenerate every docs-api block
 */
import { fileURLToPath } from 'node:url'

import { syncDocsApi } from './lib/docs-api.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const writeMode = process.argv.includes('--write')

const result = await syncDocsApi({ repositoryRoot, write: writeMode })

if (result.violations.length > 0) {
  console.error(result.violations.join('\n'))
  if (!writeMode) {
    console.error('\nRegenerate docs API tables with: pnpm docs:api:write')
  }
  process.exitCode = 1
} else if (writeMode) {
  const count = result.written.length
  console.log(
    count === 0
      ? `Docs API tables already current (${String(result.checked.length)} pages).`
      : `Wrote ${String(count)} docs page${count === 1 ? '' : 's'}.`,
  )
} else {
  console.log(
    `Docs API tables match manifests and MCP tools (${String(result.checked.length)} pages).`,
  )
}
