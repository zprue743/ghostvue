#!/usr/bin/env node
/**
 * Runs the MCP host snippets in `docs/tooling/ai-agents.md` (GHO-48) against
 * the built `ghostvue-mcp`. Run after `pnpm build`:
 *
 *   pnpm agents-guide                          # part of `pnpm verify:build`
 *   node scripts/check-ai-agents-guide.mjs --ensure-built
 *
 * For every launch the guide documents (JSON host configs, Codex TOML, and
 * `claude mcp add`), it checks that the snippet names the real package and
 * bin, then starts that bin over stdio from an unrelated directory, as a host
 * would, and requires `initialize`, `tools/list` with exactly the five tools,
 * and one successful call to each. Every tool name the guide mentions must be
 * one the server lists, and every listed tool must be mentioned.
 *
 * `npx -y -p @ghostvue/mcp@<version>` cannot run before the npm release, so an
 * npx snippet is run as the bin npx would resolve to.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AI_AGENTS_GUIDE_PATH,
  extractMcpLaunchSnippets,
  mentionedMcpToolNames,
  resolveMcpLaunch,
} from './lib/ai-agents-guide.js'
import { runMcpStdioSmoke } from './lib/mcp-packed.js'
import { execPackageManagerSync } from './lib/package-manager.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageDirectory = join(root, 'packages', 'mcp')
const manifest = JSON.parse(
  await readFile(join(packageDirectory, 'package.json'), 'utf8'),
)
const guide = await readFile(join(root, AI_AGENTS_GUIDE_PATH), 'utf8')

const snippets = extractMcpLaunchSnippets(guide)
if (snippets.length === 0) {
  throw new Error(`${AI_AGENTS_GUIDE_PATH} has no MCP host snippets`)
}

/** @type {Map<string, string[]>} bin path -> hosts that launch it */
const launches = new Map()
const pinnedVersions = new Set()
for (const snippet of snippets) {
  let resolved
  try {
    resolved = resolveMcpLaunch(snippet, {
      name: manifest.name,
      bin: manifest.bin,
      packageDirectory,
      repositoryRoot: root,
    })
  } catch (error) {
    throw new Error(
      `${AI_AGENTS_GUIDE_PATH} "${snippet.host}" (${snippet.format}): ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
  if (resolved.pinnedVersion) pinnedVersions.add(resolved.pinnedVersion)
  const hosts = launches.get(resolved.binPath) ?? []
  hosts.push(`${snippet.host} (${snippet.format})`)
  launches.set(resolved.binPath, hosts)
}
// One version everywhere, so a reader who copies two snippets gets one server.
if (pinnedVersions.size > 1) {
  throw new Error(
    `${AI_AGENTS_GUIDE_PATH} pins several versions: ${[...pinnedVersions].join(', ')}`,
  )
}

const bundlePath = join(packageDirectory, 'dist', 'assets', 'bundle.json')
if (!existsSync(bundlePath)) {
  if (!process.argv.includes('--ensure-built')) {
    throw new Error('@ghostvue/mcp is not built. Run `pnpm build` first.')
  }
  execPackageManagerSync('pnpm', ['build'], { cwd: root, stdio: 'pipe' })
}
const { assetBundleId } = JSON.parse(await readFile(bundlePath, 'utf8'))

const mentioned = mentionedMcpToolNames(guide)
for (const [binPath, hosts] of launches) {
  // Hosts start servers from their own working directory, not the package.
  const smoke = await runMcpStdioSmoke({
    command: process.execPath,
    args: [binPath],
    cwd: tmpdir(),
    env: process.env,
    assetBundleId,
  })
  const unknown = mentioned.filter((name) => !smoke.tools.includes(name))
  const unmentioned = smoke.tools.filter((name) => !mentioned.includes(name))
  if (unknown.length > 0 || unmentioned.length > 0) {
    throw new Error(
      `${AI_AGENTS_GUIDE_PATH} tool names differ from the server: unknown ${unknown.join(', ') || 'none'}; not mentioned ${unmentioned.join(', ') || 'none'}`,
    )
  }
  console.log(
    `${snippets.length} guide snippets checked. Launched ${binPath.slice(root.length)} for ${hosts.join(', ')}: listed ${smoke.tools.join(', ')}; called ${smoke.calls.join(', ')}.`,
  )
}
