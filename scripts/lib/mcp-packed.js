/**
 * Release-readiness checks for the packed `@ghostvue/mcp` tarball (GHO-232,
 * GHO-17 plan §4, §7, §9).
 *
 * The checks run against what a consumer would install, not the workspace:
 * the tarball `pnpm pack` produces, installed with production dependencies
 * only into a scratch project outside the monorepo.
 */
import { spawn } from 'node:child_process'
import { lstat, readdir, realpath } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { join, sep } from 'node:path'

import Ajv from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'

/**
 * Installed-size budget for production `node_modules`, excluding the bundled
 * GhostVue data in `dist/assets/` (GHO-17 plan §7, approved by Zac Nov 22,
 * 2026). The 2026-11-22 measurement was ~16.6 MiB.
 */
export const MCP_INSTALL_SIZE_BUDGET_BYTES = 18 * 1024 * 1024

/** Tools `ghostvue-mcp` must register, sorted (GHO-17 plan §5). */
export const MCP_TOOL_NAMES = Object.freeze([
  'get_component',
  'get_examples',
  'get_tokens',
  'list_components',
  'search_docs',
])

/**
 * npm always packs these root files whatever `files` says, so they are the
 * only allowed entries outside `dist/`.
 */
const alwaysPackedFile =
  /^package\/(package\.json|README(\.md)?|LICEN[SC]E(\.md)?)$/i

/** Entries the server cannot start without. */
const requiredEntries = [
  'package/package.json',
  'package/dist/bin.js',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/assets/bundle.json',
]

/**
 * Check `tar -tzf` entries against plan §4: published contents are `dist/`
 * only (plus the files npm always includes).
 *
 * @param {readonly string[]} entries Tarball paths, e.g. `package/dist/bin.js`.
 * @returns {string[]} Problems; empty when the contents are allowed.
 */
export function publishedContentProblems(entries) {
  /** @type {string[]} */
  const problems = []
  const files = entries.filter((entry) => !entry.endsWith('/'))
  for (const entry of files) {
    if (entry.startsWith('package/dist/') || alwaysPackedFile.test(entry)) {
      continue
    }
    problems.push(`${entry} is outside dist/`)
  }
  const present = new Set(files)
  for (const entry of requiredEntries) {
    if (!present.has(entry)) problems.push(`${entry} is missing`)
  }
  return problems
}

/**
 * Apparent size of a directory tree in bytes, matching GNU `du -sb`
 * (coreutils 9.x): every file and symlink counts its own `lstat` size, a
 * hard-linked inode counts once, and directories count 0, because their
 * block size depends on the file system rather than on what is installed.
 * Symlinks are not followed, so pnpm's `.pnpm` virtual store is measured once
 * rather than once per link.
 *
 * @param {string} directory
 * @param {{ exclude?: readonly string[] }} [options] Real paths whose subtrees
 *   are skipped entirely.
 * @returns {Promise<number>}
 */
export async function apparentSize(directory, options = {}) {
  const excluded = await Promise.all(
    (options.exclude ?? []).map((path) => realpath(path).catch(() => path)),
  )
  /** @type {Set<string>} */
  const seenInodes = new Set()
  let total = 0

  /** @param {string} path */
  async function visit(path) {
    if (excluded.some((root) => path === root || path.startsWith(root + sep))) {
      return
    }
    const stats = await lstat(path)
    const inode = `${String(stats.dev)}:${String(stats.ino)}`
    if (seenInodes.has(inode)) return
    seenInodes.add(inode)
    if (!stats.isDirectory()) {
      total += stats.size
      return
    }
    for (const entry of await readdir(path)) {
      await visit(join(path, entry))
    }
  }

  await visit(await realpath(directory))
  return total
}

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

/**
 * @param {{ totalBytes: number, assetBytes: number, budgetBytes?: number }} measurement
 * @returns {{ gatedBytes: number, budgetBytes: number, withinBudget: boolean }}
 */
export function evaluateInstallSize(measurement) {
  const budgetBytes = measurement.budgetBytes ?? MCP_INSTALL_SIZE_BUDGET_BYTES
  const gatedBytes = measurement.totalBytes - measurement.assetBytes
  return { gatedBytes, budgetBytes, withinBudget: gatedBytes <= budgetBytes }
}

/**
 * Markdown for the CI job summary.
 *
 * @param {{ totalBytes: number, assetBytes: number, packageCount: number, budgetBytes?: number }} measurement
 * @returns {string}
 */
export function renderInstallSizeReport(measurement) {
  const { gatedBytes, budgetBytes, withinBudget } =
    evaluateInstallSize(measurement)
  const row = (label, bytes) =>
    `| ${label} | ${String(bytes)} | ${formatMiB(bytes)} |`
  return [
    '## `@ghostvue/mcp` installed size',
    '',
    `Packed tarball installed with \`pnpm install --prod\` into a scratch project (${String(measurement.packageCount)} packages). Sizes are apparent bytes, as \`du -sb\` reports them.`,
    '',
    '| Measurement | Bytes | Size |',
    '| --- | ---: | ---: |',
    row('Production `node_modules`', measurement.totalBytes),
    row('Bundled `dist/assets/` (not gated)', measurement.assetBytes),
    row('**Gated size**', gatedBytes),
    row('Budget (GHO-17 plan §7)', budgetBytes),
    '',
    withinBudget
      ? `Within budget (${formatMiB(budgetBytes - gatedBytes)} headroom).`
      : `**Over budget by ${formatMiB(gatedBytes - budgetBytes)}.**`,
    '',
  ].join('\n')
}

/**
 * One call per tool, built from earlier answers so the smoke test uses ids
 * the bundle really contains.
 *
 * @param {(name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>} call
 */
async function callEveryTool(call) {
  const listed = await call('list_components', { limit: 1 })
  const items = /** @type {{ name: string, exampleIds: string[] }[]} */ (
    listed.items
  )
  const [first] = items
  if (!first) throw new Error('list_components returned no components')
  await call('get_component', { name: first.name })
  const [exampleId] = first.exampleIds
  await call(
    'get_examples',
    exampleId ? { id: exampleId } : { includeSource: false, limit: 1 },
  )
  const docs = await call('search_docs', { query: 'button', limit: 1 })
  if (!Array.isArray(docs.hits) || docs.hits.length === 0) {
    throw new Error('search_docs returned no hits for "button"')
  }
  const tokens = await call('get_tokens', {})
  const catalog = /** @type {{ tokenCount?: number } | undefined} */ (
    tokens.catalog
  )
  if (!catalog?.tokenCount) {
    throw new Error('get_tokens reported an empty token catalog')
  }
}

/**
 * Start an MCP stdio server, list its tools, and call each one, as an MCP
 * host would. Every tool result must be a success whose `structuredContent`
 * matches the tool's declared `outputSchema` and carries the expected
 * `assetBundleId`, and, when `manifestSchemaId` is given, a stamp that names
 * that manifest schema `$id` (the hosted URL clients resolve, ADR 0006).
 *
 * @param {{
 *   command: string
 *   args?: readonly string[]
 *   cwd: string
 *   env?: NodeJS.ProcessEnv
 *   assetBundleId: string
 *   manifestSchemaId?: string
 *   timeoutMs?: number
 * }} options
 * @returns {Promise<{ tools: string[], calls: string[] }>}
 */
export async function runMcpStdioSmoke(options) {
  const timeoutMs = options.timeoutMs ?? 30_000
  const child = spawn(options.command, [...(options.args ?? [])], {
    cwd: options.cwd,
    env: options.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => (stderr += chunk))

  /** @type {Map<number, { resolve: (value: Record<string, unknown>) => void, reject: (error: Error) => void }>} */
  const pending = new Map()
  const failAll = (/** @type {Error} */ error) => {
    for (const { reject } of pending.values()) reject(error)
    pending.clear()
  }
  child.on('error', failAll)
  child.on('close', (code) => {
    failAll(
      new Error(`ghostvue-mcp exited with ${String(code)} early:\n${stderr}`),
    )
  })
  createInterface({ input: child.stdout }).on('line', (line) => {
    /** @type {Record<string, unknown>} */
    let message
    try {
      message = JSON.parse(line)
    } catch {
      // stdout must carry JSON-RPC frames only; anything else is a bug.
      failAll(
        new Error(`ghostvue-mcp wrote a non-JSON line to stdout: ${line}`),
      )
      return
    }
    const id = message.id
    if (typeof id !== 'number') return
    pending.get(id)?.resolve(message)
    pending.delete(id)
  })

  let nextId = 1
  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   * @returns {Promise<Record<string, unknown>>}
   */
  const request = (method, params) => {
    const id = nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`${method} timed out after ${String(timeoutMs)} ms`))
      }, timeoutMs)
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`,
      )
    })
  }
  /** @param {Record<string, unknown>} response */
  const resultOf = (response) => {
    if (response.error) {
      throw new Error(`JSON-RPC error: ${JSON.stringify(response.error)}`)
    }
    return /** @type {Record<string, unknown>} */ (response.result)
  }

  try {
    const initialized = resultOf(
      await request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'ghostvue-mcp-packed-smoke', version: '0.0.0' },
      }),
    )
    const serverInfo = /** @type {{ name?: string }} */ (initialized.serverInfo)
    if (serverInfo?.name !== 'ghostvue') {
      throw new Error(`Unexpected serverInfo: ${JSON.stringify(serverInfo)}`)
    }
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    )

    const listed = resultOf(await request('tools/list'))
    const tools = /** @type {{ name: string, outputSchema?: object }[]} */ (
      listed.tools
    )
    const names = tools.map((tool) => tool.name).sort()
    if (JSON.stringify(names) !== JSON.stringify(MCP_TOOL_NAMES)) {
      throw new Error(
        `Expected tools ${MCP_TOOL_NAMES.join(', ')}; got ${names.join(', ')}`,
      )
    }

    // Same check an MCP client SDK applies: structuredContent must satisfy
    // the tool's declared outputSchema, in the draft that schema names.
    const draft07 = new Ajv({ strict: false, allErrors: true })
    const draft2020 = new Ajv2020({ strict: false, allErrors: true })
    const validators = new Map(
      tools.map((tool) => {
        const schema = /** @type {{ $schema?: string }} */ (
          tool.outputSchema ?? {}
        )
        const ajv = schema.$schema?.includes('draft-07') ? draft07 : draft2020
        return [tool.name, { ajv, validate: ajv.compile(schema) }]
      }),
    )
    /** @type {string[]} */
    const calls = []

    await callEveryTool(async (name, args) => {
      const result = resultOf(
        await request('tools/call', { name, arguments: args }),
      )
      if (result.isError) {
        throw new Error(`${name} failed: ${JSON.stringify(result.content)}`)
      }
      const structured = /** @type {Record<string, unknown>} */ (
        result.structuredContent
      )
      const validator = validators.get(name)
      if (!structured || !validator?.validate(structured)) {
        throw new Error(
          `${name} structuredContent does not match its outputSchema: ${validator?.ajv.errorsText(validator.validate.errors) ?? 'no schema'}`,
        )
      }
      const stamp =
        /** @type {{ assetBundleId?: string, manifestSchemaId?: string }} */ (
          structured.ghostvue
        )
      if (stamp?.assetBundleId !== options.assetBundleId) {
        throw new Error(
          `${name} reported assetBundleId ${String(stamp?.assetBundleId)}, expected ${options.assetBundleId}`,
        )
      }
      if (
        options.manifestSchemaId !== undefined &&
        stamp?.manifestSchemaId !== options.manifestSchemaId
      ) {
        throw new Error(
          `${name} reported manifestSchemaId ${String(stamp?.manifestSchemaId)}, expected ${options.manifestSchemaId}`,
        )
      }
      calls.push(name)
      return structured
    })

    return { tools: names, calls }
  } finally {
    child.stdin.end()
    // The server exits when stdin closes; kill only if it hangs.
    const exited = new Promise((resolve) => {
      if (child.exitCode !== null) resolve(undefined)
      else child.once('exit', resolve)
    })
    const timer = setTimeout(() => child.kill('SIGKILL'), 5_000)
    await exited
    clearTimeout(timer)
  }
}
