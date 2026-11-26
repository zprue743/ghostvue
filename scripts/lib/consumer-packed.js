/**
 * Judgements for the packed-tarball consumer smoke test (GHO-217,
 * `scripts/consumer-packed-smoke.mjs`). The script installs the packed
 * publishable packages into scratch projects outside the monorepo; these pure
 * helpers decide whether what those consumers produced is correct, so the
 * rules are unit-tested without packing or installing anything.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Third-party packages each consumer installs, and the workspace manifest that
 * pins each one. Reading the pins keeps the consumers on the versions the
 * workspace builds and tests with instead of a second hand-maintained list.
 */
const consumerPinSources = /** @type {const} */ ({
  vue: 'packages/vue/package.json',
  vite: 'packages/nuxt/package.json',
  '@vitejs/plugin-vue': 'package.json',
  jsdom: 'package.json',
  nuxt: 'packages/nuxt/package.json',
  eslint: 'packages/eslint-plugin/package.json',
  'vue-eslint-parser': 'packages/eslint-plugin/package.json',
})

/**
 * Exact versions for the consumers' third-party dependencies.
 *
 * @param {string} root Repository root.
 * @returns {Promise<Record<string, string>>}
 */
export async function consumerDependencyPins(root) {
  /** @type {Record<string, string>} */
  const pins = {}
  for (const [name, manifestPath] of Object.entries(consumerPinSources)) {
    const manifest = JSON.parse(
      await readFile(join(root, manifestPath), 'utf8'),
    )
    const version =
      manifest.devDependencies?.[name] ?? manifest.dependencies?.[name]
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(
        `${manifestPath} must pin ${name} to an exact version for the packed consumer smoke test`,
      )
    }
    pins[name] = version
  }
  return pins
}

/**
 * Themed components ship their styles in this cascade layer so consumer CSS
 * outside any layer wins without specificity fights (ADR 0004). Only a layer
 * block counts; an `@layer a, b;` order statement carries no styles.
 *
 * @param {string} css
 */
export function declaresThemeLayer(css) {
  return /@layer\s+ghostvue-theme\s*\{/.test(css)
}

/**
 * Recipe classes that only the base `@ghostvue/themes/default.css` defines,
 * one per themed wrapper family the Vite fixture renders. Flagship and token
 * stylesheets also open a `ghostvue-theme` layer, so the layer alone cannot
 * prove that the base stylesheet survived the consumer's production build.
 */
export const baseRecipeClasses = [
  'ghost-button',
  'ghost-field',
  'ghost-input',
  'ghost-toast',
]

/**
 * Judge the CSS a production build of the documented themed setup emitted:
 * the base recipes loaded by importing `@ghostvue/themes` (which bundlers drop
 * when the entry is wrongly declared side-effect free) plus the flagship
 * stylesheet the quick start imports explicitly.
 *
 * @param {string} css Every emitted stylesheet, concatenated.
 * @param {{ flagship: string }} options Theme named by the fixture's `data-ghost-theme`.
 * @returns {string[]}
 */
export function themedBuildCssProblems(css, { flagship }) {
  const problems = []
  if (!declaresThemeLayer(css)) {
    problems.push('no `@layer ghostvue-theme` block')
  }
  for (const name of baseRecipeClasses) {
    if (!new RegExp(`\\.${name}(?![\\w-])`).test(css)) {
      problems.push(
        `no \`.${name}\` recipe; the base stylesheet imported by \`@ghostvue/themes\` was dropped`,
      )
    }
  }
  if (!new RegExp(`\\[data-ghost-theme=['"]?${flagship}['"]?\\]`).test(css)) {
    problems.push(`no \`[data-ghost-theme=${flagship}]\` token host`)
  }
  return problems
}

/**
 * @typedef {{
 *   mounted?: boolean
 *   input?: { tag?: string | null, value?: string | null, label?: string | null }
 *   select?: { role?: string | null, value?: string | null, options?: string[] }
 *   dialog?: { open?: string[], afterClose?: string[] }
 *   drawer?: { open?: string[] }
 *   toast?: { shown?: boolean }
 *   errors?: string[]
 * }} MountObservation
 */

/**
 * Problems with what `vite-app/mount.mjs` observed after mounting the
 * production bundle.
 *
 * @param {MountObservation} result Parsed JSON printed by the mount runner.
 * @returns {string[]}
 */
export function viteAppMountProblems(result) {
  /** @type {string[]} */
  const problems = []
  /** @param {boolean} condition @param {string} message */
  const expect = (condition, message) => {
    if (!condition) problems.push(message)
  }
  expect(result.mounted === true, 'the app did not mount into #app')
  expect(result.input?.tag === 'INPUT', 'GhostInput did not render an <input>')
  expect(
    result.input?.value === 'Ada',
    `GhostInput v-model rendered ${JSON.stringify(result.input?.value)}, expected "Ada"`,
  )
  expect(
    result.input?.label === 'Workspace name',
    'GhostFieldLabel is not associated with the GhostInput control',
  )
  expect(
    result.select?.role === 'combobox',
    `GhostSelectTrigger role is ${JSON.stringify(result.select?.role)}, expected "combobox"`,
  )
  expect(
    result.select?.value === 'Europe',
    `GhostSelectValue shows ${JSON.stringify(result.select?.value)}, expected "Europe"`,
  )
  expect(
    JSON.stringify(result.select?.options) ===
      JSON.stringify(['Europe', 'United States']),
    'opening GhostSelect did not list both options',
  )
  expect(
    Array.isArray(result.dialog?.open) &&
      result.dialog.open.some((text) => text.includes('Smoke dialog')),
    'GhostDialogTrigger did not open a role="dialog" with its title',
  )
  expect(
    Array.isArray(result.dialog?.afterClose) &&
      !result.dialog.afterClose.some((text) => text.includes('Smoke dialog')),
    'GhostDialogClose did not close the dialog',
  )
  expect(
    Array.isArray(result.drawer?.open) &&
      result.drawer.open.some((text) => text.includes('Smoke drawer')),
    'GhostDrawerTrigger did not open a role="dialog" with its title',
  )
  expect(result.toast?.shown === true, 'useGhostToast().toast() showed nothing')
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    problems.push(`runtime errors: ${result.errors.join('; ')}`)
  }
  return problems
}

/**
 * Map of component name to the module Nuxt generated an auto-import for, read
 * from `.nuxt/components.d.ts`. Lazy variants are skipped.
 *
 * @param {string} declarations
 * @returns {Map<string, string>}
 */
export function nuxtComponentSources(declarations) {
  /** @type {Map<string, string>} */
  const sources = new Map()
  for (const [, name = '', from = ''] of declarations.matchAll(
    /^export const (\w+): typeof import\(["']([^"']+)["']\)\[['"]\w+['"]\]/gm,
  )) {
    sources.set(name, from)
  }
  return sources
}

/**
 * Map of composable name to the module Nuxt auto-imports it from, read from
 * `.nuxt/imports.d.ts` (`export { a, b } from 'module'` lines).
 *
 * @param {string} declarations
 * @returns {Map<string, string>}
 */
export function nuxtImportSources(declarations) {
  /** @type {Map<string, string>} */
  const sources = new Map()
  for (const [, names = '', from = ''] of declarations.matchAll(
    /^export \{([^}]*)\} from ['"]([^'"]+)['"]/gm,
  )) {
    for (const name of names.split(',')) {
      const local = name
        .trim()
        .split(/\s+as\s+/)
        .pop()
      if (local) sources.set(local, from)
    }
  }
  return sources
}

/**
 * Problems with the auto-imports one Nuxt variant generated.
 *
 * @param {{
 *   components: Map<string, string>
 *   imports: Map<string, string>
 *   componentPackage: string
 * }} generated
 * @returns {string[]}
 */
export function nuxtAutoImportProblems({
  components,
  imports,
  componentPackage,
}) {
  /** @type {string[]} */
  const problems = []
  for (const name of ['GhostButton', 'GhostDialog', 'GhostSelect']) {
    const from = components.get(name)
    if (from !== componentPackage) {
      problems.push(
        `<${name}> auto-imports from ${String(from)}, expected ${componentPackage}`,
      )
    }
  }
  for (const name of ['useGhostId', 'useGhostToast']) {
    const from = imports.get(name)
    if (from !== '@ghostvue/vue') {
      problems.push(
        `${name}() auto-imports from ${String(from)}, expected @ghostvue/vue`,
      )
    }
  }
  return problems
}

/**
 * Problems with the server-rendered page of the headless Nuxt build.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function nuxtPageProblems(html) {
  /** @type {string[]} */
  const problems = []
  const button = /<button\b[^>]*>(?:<!--\[-->)?Auto-imported/.exec(html)?.[0]
  if (!button) {
    problems.push('the auto-imported <GhostButton> did not server-render')
    return problems
  }
  if (!/\bdata-smoke-id="smoke-[^"]+"/.test(button)) {
    problems.push('the auto-imported useGhostId() did not run during SSR')
  }
  return problems
}

/**
 * Problems with `eslint --format json` results for the fixture's valid and
 * invalid SFCs.
 *
 * @param {{ filePath: string, messages: { ruleId: string | null, message: string }[] }[]} results
 * @returns {string[]}
 */
export function eslintConsumerProblems(results) {
  /** @type {string[]} */
  const problems = []
  const byFile = new Map(
    results.map((result) => [
      result.filePath.split(/[\\/]/).pop() ?? '',
      result.messages,
    ]),
  )
  const valid = byFile.get('Valid.vue')
  if (!valid) problems.push('ESLint did not lint Valid.vue')
  else if (valid.length > 0) {
    problems.push(
      `Valid.vue should pass, got: ${valid.map((m) => `${String(m.ruleId)}: ${m.message}`).join('; ')}`,
    )
  }
  const invalid = byFile.get('Invalid.vue')
  if (!invalid) {
    problems.push('ESLint did not lint Invalid.vue')
    return problems
  }
  const ruleIds = new Set(invalid.map((message) => message.ruleId))
  for (const rule of [
    'ghostvue/no-unknown-props',
    'ghostvue/no-unknown-slots',
    'ghostvue/no-undeclared-v-model',
  ]) {
    if (!ruleIds.has(rule))
      problems.push(`Invalid.vue was not flagged by ${rule}`)
  }
  const unexpected = invalid.filter(
    (message) => !message.ruleId?.startsWith('ghostvue/'),
  )
  if (unexpected.length > 0) {
    problems.push(
      `Invalid.vue has non-GhostVue problems: ${unexpected.map((m) => m.message).join('; ')}`,
    )
  }
  return problems
}
