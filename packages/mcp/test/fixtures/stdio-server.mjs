/**
 * Child-process entry for the stdio smoke test: the real CLI over real
 * process stdio, serving one fixture tool from fixture assets until the asset
 * bundler (GHO-226) produces a package bundle.
 */
import * as z from 'zod'

import { runCli } from '../../src/cli.js'
import { defineTool } from '../../src/tool.js'

const fixtureTool = defineTool({
  name: 'fixture_lookup',
  title: 'Fixture lookup',
  description: 'Returns a greeting for a known name.',
  input: { name: z.string().min(1) },
  output: { greeting: z.string() },
  handler: ({ name }) => ({
    structuredContent: { greeting: `Hello, ${name}` },
    summary: `Greeted ${name}.`,
  }),
})

process.exitCode = await runCli({
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  tools: [fixtureTool],
  sources: {
    assetsDirectory: new URL('./assets/', import.meta.url),
    packageJson: new URL('../../package.json', import.meta.url),
  },
})
