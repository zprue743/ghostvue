/**
 * Reads the copy-paste snippets in the consumer AI agents guide
 * (`docs/tooling/ai-agents.md`, GHO-48) so tests and
 * `scripts/check-ai-agents-guide.mjs` can hold them to the real packages.
 *
 * The guide is the source of truth: these helpers parse what a reader would
 * copy, rather than keeping a second list of expected snippets that could
 * drift from the page.
 */
import { join, relative, sep } from 'node:path'

/** Repository-relative path of the guide. */
export const AI_AGENTS_GUIDE_PATH = 'docs/tooling/ai-agents.md'

/**
 * Placeholder for the clone directory in the "before the npm release"
 * snippet. Checks substitute the real repository root for it.
 */
export const CHECKOUT_PLACEHOLDER = '/absolute/path/to/ghostvue'

/** Server key every host snippet registers. */
const SERVER_KEY = 'ghostvue'

/**
 * Fenced code blocks in document order, each with the nearest heading above
 * it so failures can name the host section. Only backtick fences are used in
 * docs, and the guide never nests them.
 *
 * @param {string} markdown
 * @returns {{ lang: string, body: string, heading: string }[]}
 */
export function extractFences(markdown) {
  /** @type {{ lang: string, body: string, heading: string }[]} */
  const fences = []
  let heading = ''
  /** @type {{ lang: string, lines: string[], heading: string } | undefined} */
  let open
  for (const line of markdown.split(/\r?\n/)) {
    if (open) {
      if (/^```\s*$/.test(line)) {
        fences.push({
          lang: open.lang,
          body: open.lines.join('\n'),
          heading: open.heading,
        })
        open = undefined
      } else {
        open.lines.push(line)
      }
      continue
    }
    const fence = /^```(\S*)/.exec(line)
    if (fence) {
      open = { lang: fence[1] ?? '', lines: [], heading }
      continue
    }
    const title = /^#{1,6}\s+(.+?)\s*$/.exec(line)
    if (title?.[1]) heading = title[1]
  }
  if (open) throw new Error(`Unclosed code fence under "${open.heading}"`)
  return fences
}

/**
 * Every MCP launch the guide tells a reader to configure: JSON host configs
 * (`mcpServers` or VS Code's `servers`), Codex's TOML table, and the
 * `claude mcp add` command.
 *
 * @param {string} markdown
 * @returns {{ host: string, format: 'json' | 'toml' | 'cli', command: string, args: string[] }[]}
 */
export function extractMcpLaunchSnippets(markdown) {
  /** @type {{ host: string, format: 'json' | 'toml' | 'cli', command: string, args: string[] }[]} */
  const snippets = []
  for (const fence of extractFences(markdown)) {
    if (fence.lang === 'json') {
      /** @type {unknown} */
      const parsed = JSON.parse(fence.body)
      const entry = serverEntry(parsed)
      if (!entry) continue
      snippets.push({ host: fence.heading, format: 'json', ...entry })
    } else if (fence.lang === 'toml') {
      const table = new RegExp(
        String.raw`^\[mcp_servers\.${SERVER_KEY}\]\n((?:(?!\[).*\n?)*)`,
        'm',
      ).exec(fence.body)
      if (!table?.[1]) continue
      const command = /^command\s*=\s*("(?:[^"\\]|\\.)*")\s*$/m.exec(table[1])
      // TOML basic strings and arrays of them are valid JSON in this shape.
      const args = /^args\s*=\s*(\[.*\])\s*$/m.exec(table[1])
      if (!command?.[1]) {
        throw new Error(`TOML snippet under "${fence.heading}" has no command`)
      }
      snippets.push({
        host: fence.heading,
        format: 'toml',
        command: stringOrThrow(JSON.parse(command[1]), fence.heading),
        args: stringArrayOrThrow(
          args?.[1] ? JSON.parse(args[1]) : [],
          fence.heading,
        ),
      })
    } else if (fence.lang === 'bash') {
      for (const line of fence.body.split('\n')) {
        const added = new RegExp(
          String.raw`^claude mcp add ${SERVER_KEY} -- (.+)$`,
        ).exec(line.trim())
        if (!added?.[1]) continue
        const [command = '', ...args] = added[1].split(/\s+/)
        snippets.push({ host: fence.heading, format: 'cli', command, args })
      }
    }
  }
  return snippets
}

/**
 * @param {unknown} config
 * @returns {{ command: string, args: string[] } | undefined}
 */
function serverEntry(config) {
  if (typeof config !== 'object' || config === null) return undefined
  const servers =
    Reflect.get(config, 'mcpServers') ?? Reflect.get(config, 'servers')
  if (typeof servers !== 'object' || servers === null) return undefined
  const entry = Reflect.get(servers, SERVER_KEY)
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(`MCP config has no "${SERVER_KEY}" server`)
  }
  const type = Reflect.get(entry, 'type')
  if (type !== undefined && type !== 'stdio') {
    throw new Error(`"${SERVER_KEY}" must use stdio, not ${String(type)}`)
  }
  return {
    command: stringOrThrow(Reflect.get(entry, 'command'), SERVER_KEY),
    args: stringArrayOrThrow(Reflect.get(entry, 'args') ?? [], SERVER_KEY),
  }
}

/**
 * @param {unknown} value
 * @param {string} where
 * @returns {string}
 */
function stringOrThrow(value, where) {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${where}: expected a command string`)
  }
  return value
}

/**
 * @param {unknown} value
 * @param {string} where
 * @returns {string[]}
 */
function stringArrayOrThrow(value, where) {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`${where}: expected args to be an array of strings`)
  }
  return value
}

/**
 * Maps a launch snippet to the bin file it would run, or throws when the
 * snippet names a package, bin, or path that `@ghostvue/mcp` does not ship.
 *
 * Accepted shapes are the three the guide documents: `npx -y -p
 * <name>@<x.y.z> <bin>`, the installed `<bin>` with no args, and `node
 * <checkout>/<bin path>`. `npx` cannot be run as written before the package
 * is on npm, so its check is that `npx` would resolve to this bin.
 *
 * @param {{ command: string, args: readonly string[] }} snippet
 * @param {{ name: string, bin: Record<string, string>, packageDirectory: string, repositoryRoot: string }} pkg
 * @returns {{ binName: string, binPath: string, pinnedVersion?: string }}
 */
export function resolveMcpLaunch(snippet, pkg) {
  const binEntry = (/** @type {string | undefined} */ name) => {
    const target = name === undefined ? undefined : pkg.bin[name]
    if (name === undefined || target === undefined) {
      throw new Error(
        `"${String(name)}" is not a ${pkg.name} bin (${Object.keys(pkg.bin).join(', ')})`,
      )
    }
    return { binName: name, binPath: join(pkg.packageDirectory, target) }
  }
  const { command, args } = snippet

  if (command === 'npx') {
    const [yes, flag, spec, name, ...rest] = args
    const pinned = spec?.startsWith(`${pkg.name}@`)
      ? spec.slice(pkg.name.length + 1)
      : undefined
    if (yes !== '-y' || flag !== '-p' || rest.length > 0) {
      throw new Error(
        `npx args must be -y -p ${pkg.name}@<version> <bin>; got ${args.join(' ')}`,
      )
    }
    if (!pinned || !/^\d+\.\d+\.\d+$/.test(pinned)) {
      throw new Error(`npx must pin ${pkg.name}@<x.y.z>; got ${String(spec)}`)
    }
    return { ...binEntry(name), pinnedVersion: pinned }
  }

  if (command === 'node') {
    const [path, ...rest] = args
    const prefix = `${CHECKOUT_PLACEHOLDER}/`
    if (!path?.startsWith(prefix) || rest.length > 0) {
      throw new Error(`node args must be one path under ${prefix}`)
    }
    const relativePath = path.slice(prefix.length)
    for (const name of Object.keys(pkg.bin)) {
      const resolved = binEntry(name)
      const expected = relative(pkg.repositoryRoot, resolved.binPath)
        .split(sep)
        .join('/')
      if (relativePath === expected) return resolved
    }
    throw new Error(`${relativePath} is not a ${pkg.name} bin file`)
  }

  if (args.length > 0) {
    throw new Error(`installed bin "${command}" takes no args`)
  }
  return binEntry(command)
}

/**
 * MCP tool names the guide mentions, in prose, tables, prompts, or the
 * AGENTS.md block. GhostVue tools are all `list_*`, `get_*`, or `search_*`.
 *
 * @param {string} markdown
 * @returns {string[]}
 */
export function mentionedMcpToolNames(markdown) {
  return [
    ...new Set(markdown.match(/\b(?:list|get|search)_[a-z]+(?:_[a-z]+)*\b/g)),
  ].sort()
}

/**
 * ESLint rule ids (`ghostvue/<rule>`) the guide mentions. The lookbehind
 * skips package names such as `@ghostvue/vue` and path segments.
 *
 * @param {string} markdown
 * @returns {string[]}
 */
export function mentionedEslintRuleIds(markdown) {
  return [
    ...new Set(markdown.match(/(?<![@/\w])ghostvue\/[a-z][a-z-]*[a-z]/g)),
  ].sort()
}
