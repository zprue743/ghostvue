/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

// GHO-48: start the built `ghostvue-mcp` the way each MCP host snippet in
// docs/tooling/ai-agents.md does. CI runs the same script in `verify-build`
// (`pnpm verify:build`), so this file is listed in
// ciBuildCoveredIntegrationTestFiles.
describe('AI agents guide MCP snippets over stdio', () => {
  it('start the real server, which lists and answers every tool the guide names', () => {
    const output = execFileSync(
      'node',
      ['scripts/check-ai-agents-guide.mjs', '--ensure-built'],
      { cwd: root, encoding: 'utf8' },
    )
    expect(output).toMatch(/\d+ guide snippets checked/)
    expect(output).toContain(
      'listed get_component, get_examples, get_tokens, list_components, search_docs',
    )
    expect(output).toContain(
      'called list_components, get_component, get_examples, search_docs, get_tokens',
    )
  }, 300_000)
})
