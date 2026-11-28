import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

import { generateDocsCorpusPages } from '../mcp-asset-sources.js'
import { execPackageManagerSync } from '../package-manager.js'
import { ensureWorkspaceBuilt } from '../workspace-build-lock.js'

const PROTOCOL_VERSION = '2025-06-18'

/**
 * Loads the GhostVue docs corpus from the built `@ghostvue/mcp` asset bundle
 * when available, or generates it in-process from `docs/` + `apps/docs/` via
 * `generateDocsCorpusPages`.
 *
 * @param {string} repositoryRoot
 * @returns {Promise<readonly import('./mcp-client.d.ts').DocsCorpusPage[]>}
 */
export async function loadDocsCorpus(repositoryRoot) {
  const bundledPagesPath = join(
    repositoryRoot,
    'packages',
    'mcp',
    'dist',
    'assets',
    'docs',
    'pages.json',
  )
  if (existsSync(bundledPagesPath)) {
    const raw = JSON.parse(await readFile(bundledPagesPath, 'utf8'))
    if (Array.isArray(raw)) {
      return raw
    }
    if (raw && Array.isArray(raw.pages)) {
      return raw.pages
    }
  }
  const pages = await generateDocsCorpusPages(repositoryRoot)
  return pages.map((page) => ({
    title: page.title,
    link: page.link,
    section: page.section,
    ...(page.description !== undefined
      ? { description: page.description }
      : {}),
    body: page.body,
  }))
}

/**
 * Simple deterministic token-overlap search over the docs corpus for the
 * `docs-only` comparison condition (no MCP manifests/examples/tokens tools).
 *
 * @param {readonly import('./mcp-client.d.ts').DocsCorpusPage[]} pages
 * @param {string} query
 * @param {number} limit
 */
function searchDocsCorpus(pages, query, limit) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
  if (terms.length === 0) {
    return []
  }

  const scored = []
  for (const page of pages) {
    const titleLower = page.title.toLowerCase()
    const descLower = (page.description ?? '').toLowerCase()
    const bodyLower = page.body.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3
      if (descLower.includes(term)) score += 2
      if (bodyLower.includes(term)) score += 1
    }
    if (score > 0) {
      const firstHit = terms
        .map((term) => bodyLower.indexOf(term))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0]
      const start = firstHit !== undefined ? Math.max(0, firstHit - 80) : 0
      const snippet = page.body
        .slice(start, start + 280)
        .replace(/\s+/g, ' ')
        .trim()
      scored.push({
        title: page.title,
        link: page.link,
        section: page.section,
        score,
        snippet,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score || a.link.localeCompare(b.link))
  return scored.slice(0, limit)
}

/**
 * Docs-only baseline environment: exposes `docs_search` and `docs_read` over
 * GhostVue's published Markdown/llms corpus, with NO MCP manifest, example, or
 * token tools.
 *
 * @param {string} repositoryRoot
 * @returns {Promise<import('./mcp-client.d.ts').EvalToolEnvironment>}
 */
export async function createDocsOnlyToolEnvironment(repositoryRoot) {
  const pages = await loadDocsCorpus(repositoryRoot)
  const byLink = new Map(pages.map((page) => [page.link, page]))

  /** @type {readonly import('./mcp-client.d.ts').EvalToolDefinition[]} */
  const tools = [
    {
      name: 'docs_search',
      description:
        'Search GhostVue published documentation pages by keywords (title, description, body).',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Whitespace-separated keywords.',
          },
          limit: { type: 'number', description: 'Maximum hits (1-15).' },
        },
        required: ['query'],
      },
    },
    {
      name: 'docs_read',
      description:
        'Read one GhostVue documentation page by its link path (e.g. /components/button).',
      inputSchema: {
        type: 'object',
        properties: {
          link: {
            type: 'string',
            description: 'Docs page link returned by docs_search.',
          },
        },
        required: ['link'],
      },
    },
  ]

  return {
    tools,
    mcpStamp: null,
    docsCorpusPageCount: pages.length,
    async callTool(name, args) {
      if (name === 'docs_search') {
        const query = typeof args.query === 'string' ? args.query : ''
        const rawLimit = typeof args.limit === 'number' ? args.limit : 8
        const limit = Math.max(1, Math.min(15, Math.floor(rawLimit)))
        if (query.trim() === '') {
          return {
            ok: false,
            content: JSON.stringify({
              code: 'INVALID_INPUT',
              message: 'query must not be empty',
            }),
            error: 'query must not be empty',
          }
        }
        const hits = searchDocsCorpus(pages, query, limit)
        return {
          ok: true,
          content: JSON.stringify({ hits }),
        }
      }

      if (name === 'docs_read') {
        const link = typeof args.link === 'string' ? args.link : ''
        const page = byLink.get(link)
        if (!page) {
          return {
            ok: false,
            content: JSON.stringify({
              code: 'NOT_FOUND',
              message: `Unknown docs link: ${link}`,
            }),
            error: `Unknown docs link: ${link}`,
          }
        }
        return {
          ok: true,
          content: JSON.stringify({
            title: page.title,
            link: page.link,
            section: page.section,
            body: page.body.slice(0, 12_000),
          }),
        }
      }

      return {
        ok: false,
        content: JSON.stringify({
          code: 'UNKNOWN_TOOL',
          message: `Tool ${name} is not available in docs-only mode`,
        }),
        error: `Tool ${name} is not available in docs-only mode`,
      }
    },
    async close() {
      // No external process in docs-only mode.
    },
  }
}

/**
 * Docs+MCP environment: spawns the real `@ghostvue/mcp` stdio binary and
 * exposes its five tools (`list_components`, `get_component`, `get_examples`,
 * `search_docs`, `get_tokens`), recording the server's pinned `ghostvue` stamp.
 *
 * @param {{
 *   repositoryRoot: string
 *   ensureBuilt?: boolean
 *   timeoutMs?: number
 * }} options
 * @returns {Promise<import('./mcp-client.d.ts').EvalToolEnvironment>}
 */
export async function createMcpToolEnvironment(options) {
  const { repositoryRoot, ensureBuilt = true, timeoutMs = 30_000 } = options
  const mcpDir = join(repositoryRoot, 'packages', 'mcp')
  const binPath = join(mcpDir, 'dist', 'bin.js')
  const bundlePath = join(mcpDir, 'dist', 'assets', 'bundle.json')

  if (!existsSync(binPath) || !existsSync(bundlePath)) {
    if (!ensureBuilt) {
      throw new Error(
        '@ghostvue/mcp is not built (missing packages/mcp/dist/bin.js or bundle.json). Run `pnpm build` first.',
      )
    }
    ensureWorkspaceBuilt({
      root: repositoryRoot,
      isBuilt: () => existsSync(binPath) && existsSync(bundlePath),
      build: () => {
        // The MCP bundle reads tokens emitted by the themes build.
        execPackageManagerSync(
          'pnpm',
          ['--filter', '@ghostvue/themes...', 'build'],
          {
            cwd: repositoryRoot,
            stdio: 'pipe',
          },
        )
        execPackageManagerSync('pnpm', ['--filter', '@ghostvue/mcp', 'build'], {
          cwd: repositoryRoot,
          stdio: 'pipe',
        })
      },
    })
  }

  const pages = await loadDocsCorpus(repositoryRoot)
  const child = spawn(process.execPath, [binPath], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })

  /** @type {Map<number, { resolve: (value: Record<string, unknown>) => void, reject: (error: Error) => void }>} */
  const pending = new Map()
  const failAll = (/** @type {Error} */ error) => {
    for (const entry of pending.values()) {
      entry.reject(error)
    }
    pending.clear()
  }

  child.on('error', failAll)
  child.on('close', (code) => {
    if (pending.size > 0) {
      failAll(
        new Error(
          `ghostvue-mcp exited unexpectedly with code ${String(code)}:\n${stderr}`,
        ),
      )
    }
  })

  createInterface({ input: child.stdout }).on('line', (line) => {
    if (!line.trim()) return
    /** @type {Record<string, unknown>} */
    let message
    try {
      message = JSON.parse(line)
    } catch {
      failAll(new Error(`ghostvue-mcp emitted invalid JSON on stdout: ${line}`))
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
        reject(
          new Error(`MCP ${method} timed out after ${String(timeoutMs)} ms`),
        )
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
  const unwrap = (response) => {
    if (response.error) {
      throw new Error(`MCP JSON-RPC error: ${JSON.stringify(response.error)}`)
    }
    return /** @type {Record<string, unknown>} */ (response.result)
  }

  try {
    unwrap(
      await request('initialize', {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'ghostvue-eval-harness', version: '1.0.0' },
      }),
    )
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    )

    const listed = unwrap(await request('tools/list'))
    const rawTools =
      /** @type {{ name: string, description?: string, inputSchema?: Record<string, unknown> }[]} */ (
        listed.tools ?? []
      )
    const tools = rawTools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? '',
      inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
    }))

    // Probe list_components once so we capture the live server stamp.
    const probe = unwrap(
      await request('tools/call', {
        name: 'list_components',
        arguments: { limit: 1 },
      }),
    )
    const structured = /** @type {Record<string, unknown> | undefined} */ (
      probe.structuredContent
    )
    const stampRaw = /** @type {Record<string, unknown> | undefined} */ (
      structured?.ghostvue
    )
    /** @type {import('./types.d.ts').McpStampMetadata | null} */
    const mcpStamp =
      stampRaw &&
      typeof stampRaw.version === 'string' &&
      typeof stampRaw.assetBundleId === 'string' &&
      typeof stampRaw.manifestSchemaId === 'string'
        ? {
            version: stampRaw.version,
            assetBundleId: stampRaw.assetBundleId,
            manifestSchemaId: stampRaw.manifestSchemaId,
            schemaVersion:
              typeof structured?.schemaVersion === 'string'
                ? structured.schemaVersion
                : '1.0.0',
          }
        : null

    return {
      tools,
      mcpStamp,
      docsCorpusPageCount: pages.length,
      async callTool(name, args) {
        const result = unwrap(
          await request('tools/call', {
            name,
            arguments: args,
          }),
        )
        const isError = result.isError === true
        const payload = result.structuredContent ?? result.content ?? {}
        const text =
          typeof payload === 'string' ? payload : JSON.stringify(payload)
        if (isError) {
          const textContent = Array.isArray(result.content)
            ? result.content
                .map((item) =>
                  item && typeof item === 'object' && 'text' in item
                    ? String(item.text)
                    : '',
                )
                .join('\n')
            : text
          return {
            ok: false,
            content: textContent,
            error: textContent,
          }
        }
        return {
          ok: true,
          content: text,
        }
      },
      async close() {
        child.stdin.end()
        const exited = new Promise((resolve) => {
          if (child.exitCode !== null) resolve(undefined)
          else child.once('exit', resolve)
        })
        const timer = setTimeout(() => child.kill('SIGKILL'), 5_000)
        await exited
        clearTimeout(timer)
      },
    }
  } catch (error) {
    child.kill('SIGKILL')
    throw error
  }
}
