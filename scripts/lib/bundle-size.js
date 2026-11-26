import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { build } from 'vite'

import { expandExportTarget } from './published-contents.js'

/**
 * Packages whose built entries and component imports carry size budgets. Core
 * and shared are measured as package entries but expose no components.
 */
export const BUNDLE_SIZE_PACKAGES = [
  { directory: 'shared', name: '@ghostvue/shared', components: false },
  { directory: 'core', name: '@ghostvue/core', components: false },
  { directory: 'vue', name: '@ghostvue/vue', components: true },
  { directory: 'themes', name: '@ghostvue/themes', components: true },
]

/**
 * Specifiers a consumer bundle may leave as imports. Vue is a peer dependency:
 * bundling it into (or alongside) a component would ship a second runtime and
 * break `provide`/`inject` and reactivity identity, so it must stay external.
 * `@floating-ui/dom` and `@internationalized/date` are ordinary runtime
 * dependencies that consumers ship, so fixtures bundle them and their cost
 * counts against the budget of every import that needs them.
 */
export const ALLOWED_EXTERNALS = ['vue']

/** Budgets get 10% headroom over the measured gzip size, rounded up to 100 B. */
export const BUDGET_HEADROOM = 0.1
export const BUDGET_ROUNDING_BYTES = 100

const VUE_RUNTIME_MODULE =
  /[\\/]node_modules[\\/](?:\.pnpm[\\/].*?[\\/])?(?:vue|@vue[\\/][^\\/]+)[\\/]/

/**
 * @param {number} measuredGzipBytes
 * @returns {number}
 */
export function proposeBudget(measuredGzipBytes) {
  const withHeadroom = measuredGzipBytes * (1 + BUDGET_HEADROOM)
  return Math.max(
    BUDGET_ROUNDING_BYTES,
    Math.ceil(withHeadroom / BUDGET_ROUNDING_BYTES) * BUDGET_ROUNDING_BYTES,
  )
}

/**
 * Pick the file a bundler loads for an `exports` condition object. Mirrors
 * browser-bundler resolution (`import`, then `default`); `types` is ignored.
 *
 * @param {unknown} target
 * @returns {string | undefined}
 */
function pickImportTarget(target) {
  if (typeof target === 'string') return target
  if (target && typeof target === 'object' && !Array.isArray(target)) {
    const conditions = /** @type {Record<string, unknown>} */ (target)
    for (const condition of ['import', 'default']) {
      const picked = pickImportTarget(conditions[condition])
      if (picked) return picked
    }
  }
  return undefined
}

/**
 * List every JavaScript and CSS entry point declared in a package's `exports`
 * map, resolved to the built files in `dist`. JSON subpaths (token data and
 * schemas) are data assets for tooling rather than code a bundle ships, so they
 * are not budgeted.
 *
 * @param {string} repositoryRoot
 * @param {{ directory: string, name: string }} pkg
 */
export async function readPackageEntries(repositoryRoot, pkg) {
  const packageDir = resolve(repositoryRoot, 'packages', pkg.directory)
  const packageJson = JSON.parse(
    await readFile(join(packageDir, 'package.json'), 'utf8'),
  )
  const exportsMap =
    typeof packageJson.exports === 'string'
      ? { '.': packageJson.exports }
      : (packageJson.exports ?? {})

  /** @type {{ specifier: string, file: string, kind: 'js' | 'css' }[]} */
  const entries = []
  for (const [subpath, target] of Object.entries(exportsMap)) {
    const declaredFile = pickImportTarget(target)
    if (!declaredFile) continue
    const kind = declaredFile.endsWith('.css')
      ? 'css'
      : /\.[cm]?js$/.test(declaredFile)
        ? 'js'
        : undefined
    if (!kind) continue
    // A subpath pattern (`./recipes/*.css`) gets one fixture per built file,
    // so every importable recipe carries its own budget. A pattern with no
    // built match stays as one entry so the caller reports a missing build.
    const expanded = await expandExportTarget(packageDir, declaredFile)
    for (const { star, target: relativeFile } of expanded.length > 0
      ? expanded
      : [{ star: undefined, target: declaredFile }]) {
      const concreteSubpath =
        star === undefined ? subpath : subpath.replace('*', star)
      const specifier =
        concreteSubpath === '.'
          ? pkg.name
          : `${pkg.name}/${concreteSubpath.replace(/^\.\//, '')}`
      entries.push({ specifier, file: resolve(packageDir, relativeFile), kind })
    }
  }
  return entries
}

/**
 * Component export names for a package, taken from its committed manifests so
 * every documented component gets its own named-import fixture.
 *
 * @param {string} repositoryRoot
 * @param {{ directory: string }} pkg
 * @returns {Promise<string[]>}
 */
export async function readComponentNames(repositoryRoot, pkg) {
  const manifestsDir = resolve(
    repositoryRoot,
    'packages',
    pkg.directory,
    'manifests',
  )
  if (!existsSync(manifestsDir)) return []
  const files = (await readdir(manifestsDir)).filter((file) =>
    file.endsWith('.manifest.json'),
  )
  const names = await Promise.all(
    files.map(async (file) => {
      const manifest = JSON.parse(
        await readFile(join(manifestsDir, file), 'utf8'),
      )
      return /** @type {string} */ (manifest.name)
    }),
  )
  return names.sort()
}

/**
 * Build every size fixture: one per package entry and one named import per
 * component. Fixture ids double as keys in the budget file.
 *
 * @param {string} repositoryRoot
 * @param {typeof BUNDLE_SIZE_PACKAGES} [packages]
 */
export async function collectFixtures(
  repositoryRoot,
  packages = BUNDLE_SIZE_PACKAGES,
) {
  /** @type {Record<string, string>} */
  const aliases = {}
  /** @type {{ id: string, group: 'entry' | 'component', source: string }[]} */
  const fixtures = []

  for (const pkg of packages) {
    const entries = await readPackageEntries(repositoryRoot, pkg)
    for (const entry of entries) {
      aliases[entry.specifier] = entry.file
      fixtures.push({
        id: entry.specifier,
        group: 'entry',
        // `export *` keeps every export alive, so this is the whole-package
        // cost a consumer pays without tree-shaking.
        source:
          entry.kind === 'css'
            ? `import '${entry.specifier}'\n`
            : `export * from '${entry.specifier}'\n`,
      })
    }

    if (!pkg.components) continue
    // Manifests also document internal parts (for example
    // GhostSegmentedControlIndicator) that are deliberately not exported, so
    // only manifest names the built main entry really exports get a fixture.
    const mainEntry = entries.find((entry) => entry.specifier === pkg.name)
    if (!mainEntry) continue
    const { exports: publicExports } = await bundleFixture({
      source: `export * from '${pkg.name}'\n`,
      aliases,
    })
    const exported = new Set(publicExports)
    const componentNames = (
      await readComponentNames(repositoryRoot, pkg)
    ).filter((name) => exported.has(name))
    for (const name of componentNames) {
      fixtures.push({
        id: `${pkg.name}:${name}`,
        group: 'component',
        source: `export { ${name} } from '${pkg.name}'\n`,
      })
    }
  }

  return { aliases, fixtures }
}

/**
 * Exact-match aliases so `@ghostvue/themes` does not also rewrite
 * `@ghostvue/themes/define`.
 *
 * @param {Record<string, string>} aliases
 */
function toExactAliases(aliases) {
  return Object.entries(aliases).map(([specifier, file]) => ({
    find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`),
    replacement: file,
  }))
}

/**
 * Bundle one consumer fixture the way an application production build would
 * (minified, `NODE_ENV=production`, package `sideEffects` honored) and measure
 * the emitted JavaScript and CSS.
 *
 * Vite is already the library build tool, so this avoids a second bundler or
 * size-limit dependency. Only {@link ALLOWED_EXTERNALS} stay external; any other
 * import left in the output is reported so a misconfigured package cannot hide
 * code from its budget.
 *
 * @param {{ source: string, aliases: Record<string, string>, external?: string[] }} options
 */
export async function bundleFixture({
  source,
  aliases,
  external = ALLOWED_EXTERNALS,
}) {
  const dir = await mkdtemp(join(tmpdir(), 'ghostvue-size-'))
  try {
    const entry = join(dir, 'entry.js')
    await writeFile(entry, source)

    const result = await build({
      configFile: false,
      envFile: false,
      root: dir,
      mode: 'production',
      logLevel: 'silent',
      // Inline config stops Vite from searching parent directories for a
      // PostCSS config, keeping CSS measurements independent of the host.
      css: { postcss: {} },
      // Vite keeps an inherited NODE_ENV (Vitest sets `test`), which would keep
      // development-only diagnostics in the bundle. Fixtures always model a
      // consumer's production build.
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      resolve: { alias: toExactAliases(aliases) },
      build: {
        write: false,
        minify: true,
        // A single application-style entry; `exports-only` keeps the fixture's
        // re-exports alive so they cannot be tree-shaken away entirely.
        rollupOptions: {
          input: entry,
          preserveEntrySignatures: 'exports-only',
          external: (id) =>
            external.some((name) => id === name || id.startsWith(`${name}/`)),
        },
      },
    })

    const outputs = (Array.isArray(result) ? result : [result]).flatMap(
      (output) => ('output' in output ? output.output : []),
    )
    const emitted = new Set(outputs.map((file) => file.fileName))

    let js = ''
    let css = ''
    /** @type {Set<string>} */
    const externalImports = new Set()
    /** @type {Set<string>} */
    const bundledModules = new Set()
    /** @type {string[]} */
    const entryExports = []
    for (const file of outputs) {
      if (file.type === 'chunk') {
        if (file.isEntry) entryExports.push(...file.exports)
        js += file.code
        for (const id of [...file.imports, ...file.dynamicImports]) {
          if (!emitted.has(id)) externalImports.add(id)
        }
        for (const id of Object.keys(file.modules)) bundledModules.add(id)
      } else if (file.fileName.endsWith('.css')) {
        css +=
          typeof file.source === 'string'
            ? file.source
            : Buffer.from(file.source).toString('utf8')
      }
    }

    const minifiedBytes = Buffer.byteLength(js) + Buffer.byteLength(css)
    // Gzip JS and CSS separately: browsers fetch them as separate responses.
    const gzipBytes =
      (js ? gzipSync(js, { level: 9 }).length : 0) +
      (css ? gzipSync(css, { level: 9 }).length : 0)

    return {
      js,
      css,
      minifiedBytes,
      gzipBytes,
      exports: entryExports.sort(),
      externalImports: [...externalImports].sort(),
      bundledModules: [...bundledModules].sort(),
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Structural problems that make a size measurement untrustworthy, independent
 * of the numeric budget.
 *
 * @param {{ externalImports: string[], bundledModules: string[] }} measurement
 * @param {string[]} [allowedExternals]
 * @returns {string[]}
 */
export function findExternalViolations(
  measurement,
  allowedExternals = ALLOWED_EXTERNALS,
) {
  const problems = []
  for (const id of measurement.externalImports) {
    if (!allowedExternals.includes(id)) {
      problems.push(`unexpected external import "${id}"`)
    }
  }
  const vueModules = measurement.bundledModules.filter((id) =>
    VUE_RUNTIME_MODULE.test(id),
  )
  if (vueModules.length > 0) {
    problems.push(
      `bundles the Vue runtime instead of importing "vue" (${vueModules.length} module(s))`,
    )
  }
  return problems
}

/**
 * Compare measurements with committed budgets.
 *
 * @param {{ id: string, group: string, minifiedBytes: number, gzipBytes: number, problems: string[] }[]} results
 * @param {Record<string, number>} budgets
 */
export function evaluateBudgets(results, budgets) {
  const rows = results.map((result) => {
    const budget = budgets[result.id]
    /** @type {'ok' | 'over' | 'missing' | 'invalid'} */
    let status = 'ok'
    if (result.problems.length > 0) status = 'invalid'
    else if (budget === undefined) status = 'missing'
    else if (result.gzipBytes > budget) status = 'over'
    return { ...result, budget, status }
  })
  const measured = new Set(results.map((result) => result.id))
  const stale = Object.keys(budgets).filter((id) => !measured.has(id))
  const failed = rows.some((row) => row.status !== 'ok') || stale.length > 0
  return { rows, stale, failed }
}

/**
 * Budgets with headroom for every measured fixture, ordered like the fixtures.
 *
 * @param {{ id: string, gzipBytes: number }[]} results
 * @returns {Record<string, number>}
 */
export function proposeBudgets(results) {
  return Object.fromEntries(
    results.map((result) => [result.id, proposeBudget(result.gzipBytes)]),
  )
}

/** @param {number} bytes */
export function formatBytes(bytes) {
  if (bytes < 1000) return `${bytes} B`
  return `${(bytes / 1000).toFixed(2)} kB`
}

const STATUS_LABEL = {
  ok: 'ok',
  over: '**over budget**',
  missing: '**no budget**',
  invalid: '**invalid**',
}

/** @param {ReturnType<typeof evaluateBudgets>['rows'][number]} row */
function markdownRow(row) {
  const budget = row.budget === undefined ? '-' : formatBytes(row.budget)
  const usage =
    row.budget === undefined
      ? '-'
      : `${Math.round((row.gzipBytes / row.budget) * 100)}%`
  const status =
    row.problems.length > 0
      ? `${STATUS_LABEL.invalid}: ${row.problems.join('; ')}`
      : STATUS_LABEL[row.status]
  return `| \`${row.id}\` | ${formatBytes(row.minifiedBytes)} | ${formatBytes(row.gzipBytes)} | ${budget} | ${usage} | ${status} |`
}

const TABLE_HEADER = [
  '| Fixture | Minified | Gzip | Budget (gzip) | Used | Status |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
]

/**
 * Markdown summary used for the CI step summary and sticky PR comment.
 *
 * @param {ReturnType<typeof evaluateBudgets>} evaluation
 */
export function renderMarkdownReport(evaluation) {
  const entries = evaluation.rows.filter((row) => row.group === 'entry')
  const components = evaluation.rows.filter((row) => row.group === 'component')
  const attention = components.filter((row) => row.status !== 'ok')
  const lines = [
    '## Bundle size',
    '',
    evaluation.failed
      ? 'Bundle size check **failed**. Fix the regression, or run `pnpm size:write` and justify the new budgets in this PR.'
      : `All ${evaluation.rows.length} fixtures are within budget. Vue stays external in every fixture.`,
    '',
    '### Package entries',
    '',
    ...TABLE_HEADER,
    ...entries.map(markdownRow),
  ]
  if (attention.length > 0) {
    lines.push(
      '',
      '### Component imports needing attention',
      '',
      ...TABLE_HEADER,
      ...attention.map(markdownRow),
    )
  }
  if (evaluation.stale.length > 0) {
    lines.push(
      '',
      'Budgets without a fixture (remove with `pnpm size:write`):',
      '',
      ...evaluation.stale.map((id) => `- \`${id}\``),
    )
  }
  lines.push(
    '',
    `<details><summary>All ${components.length} single-component imports</summary>`,
    '',
    ...TABLE_HEADER,
    ...components.map(markdownRow),
    '',
    '</details>',
    '',
    'Each component fixture is `export { Component } from <package>` built as a minified production app bundle with only `vue` external. Budgets live in `scripts/bundle-size-budgets.json`.',
    '',
  )
  return lines.join('\n')
}
