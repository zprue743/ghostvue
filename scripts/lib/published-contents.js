/**
 * Checks on the file list a publishable package's tarball would contain
 * (#347). `pnpm published-exports` feeds it the paths `npm pack --dry-run`
 * reports, so `files`, `.npmignore`, and npm's always-included files are
 * applied exactly as they would be on publish.
 */
import { posix } from 'node:path'

/**
 * Compiled tests import dev-only tools (`vitest`, `@vue/test-utils`) that a
 * consumer never installs, so any test artifact in a tarball is a build
 * config leak: `foo.test.js`, `foo.spec.d.ts`, `foo.test.js.map`, or anything
 * under a `__tests__/` directory.
 */
const testFile = /(^|\/)__tests__\/|(^|\/)[^/]+\.(test|spec)\.[^/]+$/

/** npm packs a root README whatever `files` says; its npm page renders it. */
const rootReadme = /^README(\.md|\.markdown|\.txt)?$/i

/**
 * Problems with a package's packed file list.
 *
 * - No test files (see {@link testFile}).
 * - A root README, so the npm page is not blank.
 * - Every `.map` file either embeds all of its sources (`sourcesContent`) or
 *   names sources that are themselves in the tarball. A map that points at
 *   `src/` files the package does not ship only produces broken links in
 *   consumer debuggers.
 *
 * @param {{
 *   name: string
 *   files: readonly string[]
 *   readText: (path: string) => string
 * }} pack `files` are paths relative to the package root, as
 *   `npm pack --dry-run --json` reports them; `readText` reads one of them.
 * @returns {string[]} Problems; empty when the contents are acceptable.
 */
export function packedContentProblems({ name, files, readText }) {
  /** @type {string[]} */
  const problems = []
  const present = new Set(files)

  for (const file of files) {
    if (testFile.test(file)) {
      problems.push(`${name} tarball includes test file ${file}`)
    }
  }

  if (!files.some((file) => rootReadme.test(file))) {
    problems.push(`${name} tarball has no README`)
  }

  for (const file of files.filter((path) => path.endsWith('.map'))) {
    for (const source of missingMapSources(file, readText(file), present)) {
      problems.push(
        `${name} source map ${file} points at ${source}, which the tarball does not include`,
      )
    }
  }

  return problems
}

/**
 * Sources a map references but neither embeds nor ships.
 *
 * @param {string} mapPath
 * @param {string} text
 * @param {ReadonlySet<string>} present
 * @returns {string[]} Package-relative paths (or the raw entry when it is not
 *   a relative path, such as a `webpack://` URL).
 */
function missingMapSources(mapPath, text, present) {
  /** @type {{ sources?: unknown, sourcesContent?: unknown, sourceRoot?: unknown }} */
  let map
  try {
    map = JSON.parse(text)
  } catch {
    return [`(unparseable map)`]
  }
  const sources = Array.isArray(map.sources) ? map.sources : []
  const contents = Array.isArray(map.sourcesContent) ? map.sourcesContent : []
  const sourceRoot = typeof map.sourceRoot === 'string' ? map.sourceRoot : ''
  const mapDirectory = posix.dirname(mapPath)

  /** @type {string[]} */
  const missing = []
  sources.forEach((source, index) => {
    if (typeof contents[index] === 'string') return
    const entry = String(source)
    // Only relative references can resolve inside the tarball.
    if (/^[a-z][a-z\d+.-]*:/i.test(entry) || entry.startsWith('/')) {
      missing.push(entry)
      return
    }
    const resolved = posix.normalize(
      posix.join(mapDirectory, sourceRoot, entry),
    )
    if (!present.has(resolved)) missing.push(resolved)
  })
  return missing
}
