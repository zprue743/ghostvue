/**
 * Judgements for the packed-tarball consumer smoke test (GHO-217,
 * `scripts/consumer-packed-smoke.mjs`). The script installs the packed
 * publishable packages into scratch projects outside the monorepo; these pure
 * helpers decide whether what those consumers produced is correct, so the
 * rules are unit-tested without packing or installing anything.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

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
    if (!hasClassRule(css, name)) {
      problems.push(
        `no \`.${name}\` recipe; the base stylesheet imported by \`@ghostvue/themes\` was dropped`,
      )
    }
  }
  if (!hasThemeHost(css, flagship)) {
    problems.push(`no \`[data-ghost-theme=${flagship}]\` token host`)
  }
  return problems
}

/**
 * Whether minified or formatted CSS has a rule for `.name` (not a longer
 * class that merely starts with it, such as `.ghost-input-group`).
 *
 * @param {string} css
 * @param {string} name Class name without the dot.
 */
function hasClassRule(css, name) {
  return new RegExp(`\\.${name}(?![\\w-])`).test(css)
}

/**
 * Whether the CSS hosts the named theme's tokens. Vite drops the quotes
 * around attribute values when it minifies.
 *
 * @param {string} css
 * @param {string} theme
 */
function hasThemeHost(css, theme) {
  return new RegExp(`\\[data-ghost-theme=['"]?${theme}['"]?\\]`).test(css)
}

/**
 * Judge the CSS a production build of the opt-in theme setup emitted (#386):
 * one flagship palette, `@ghostvue/themes/base.css`, and selected
 * `@ghostvue/themes/recipes/*.css` files, with components imported from
 * `@ghostvue/themes/components`. The selected recipes, the shared base, and
 * the palette must be present; recipes the app never imported and the
 * default palette must be absent, or the opt-in path saved nothing.
 *
 * @param {string} css Every emitted stylesheet, concatenated.
 * @param {{ flagship: string, recipes: string[], absentRecipes: string[] }} options
 *   Recipe class names without the dot (`ghost-button`).
 * @returns {string[]}
 */
export function optInBuildCssProblems(
  css,
  { flagship, recipes, absentRecipes },
) {
  const problems = []
  if (!declaresThemeLayer(css)) {
    problems.push('no `@layer ghostvue-theme` block')
  }
  // `.ghost-themed-scope` must not generate a box, or every themed wrapper
  // gains a layout wrapper; only base.css declares it.
  if (!/\.ghost-themed-scope\)?\s*\{\s*display\s*:\s*contents/.test(css)) {
    problems.push(
      'no `.ghost-themed-scope { display: contents }` rule; `@ghostvue/themes/base.css` was dropped',
    )
  }
  for (const name of recipes) {
    if (!hasClassRule(css, name)) {
      problems.push(`no \`.${name}\` recipe that the app imported`)
    }
  }
  for (const name of absentRecipes) {
    if (hasClassRule(css, name)) {
      problems.push(
        `unrelated \`.${name}\` recipe shipped; the all-in stylesheet leaked into the opt-in build`,
      )
    }
  }
  if (!hasThemeHost(css, flagship)) {
    problems.push(`no \`[data-ghost-theme=${flagship}]\` token host`)
  }
  if (hasThemeHost(css, 'default')) {
    problems.push(
      'default palette tokens shipped; the opt-in build should carry only the chosen flagship',
    )
  }
  return problems
}

/**
 * Transfer cost of the stylesheets one consumer page loads: minified bytes as
 * emitted, and gzip bytes per file (browsers fetch each stylesheet as its own
 * response), matching how `pnpm size` measures.
 *
 * @param {string[]} stylesheets Emitted CSS file contents.
 * @returns {{ files: number, minifiedBytes: number, gzipBytes: number }}
 */
export function cssTransferSize(stylesheets) {
  let minifiedBytes = 0
  let gzipBytes = 0
  for (const css of stylesheets) {
    minifiedBytes += Buffer.byteLength(css)
    gzipBytes += gzipSync(css, { level: 9 }).length
  }
  return { files: stylesheets.length, minifiedBytes, gzipBytes }
}

/**
 * @typedef {{ teleported: boolean, theme: string | null, themed: boolean }} PortalPlacement
 */

/**
 * @typedef {{
 *   mounted?: boolean
 *   input?: { tag?: string | null, value?: string | null, label?: string | null }
 *   button?: { tag?: string, text?: string } | null
 *   select?: { role?: string | null, value?: string | null, options?: string[] }
 *   dialog?: {
 *     open?: string[]
 *     afterClose?: string[]
 *     portals?: Record<'content' | 'overlay', PortalPlacement | null>
 *   }
 *   drawer?: { open?: string[] }
 *   toast?: { shown?: boolean }
 *   errors?: string[]
 * }} MountObservation
 */

/**
 * Mount and Field/Input checks both fixture pages share.
 *
 * @param {MountObservation} result
 * @returns {string[]}
 */
function fieldMountProblems(result) {
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
  return problems
}

/**
 * @param {MountObservation} result
 */
function runtimeErrorProblems(result) {
  return Array.isArray(result.errors) && result.errors.length > 0
    ? [`runtime errors: ${result.errors.join('; ')}`]
    : []
}

/** Palette both fixture pages name on `<html>`. */
const FIXTURE_PALETTE = 'calm'

/**
 * Dialog checks both fixture pages share: it opens and closes, and its
 * overlay and content teleport out of `#app` while still sitting under the
 * palette host. A portaled part outside every `data-ghost-theme` host gets
 * the dialog recipe but none of the tokens it reads (#386 review), so the
 * surface and scrim would paint with unset custom properties.
 *
 * @param {MountObservation} result
 * @returns {string[]}
 */
function dialogMountProblems(result) {
  /** @type {string[]} */
  const problems = []
  const opened =
    Array.isArray(result.dialog?.open) &&
    result.dialog.open.some((text) => text.includes('Smoke dialog'))
  if (!opened) {
    problems.push(
      'GhostDialogTrigger did not open a role="dialog" with its title',
    )
  } else {
    for (const part of /** @type {const} */ (['content', 'overlay'])) {
      const placement = result.dialog?.portals?.[part]
      if (!placement) {
        problems.push(`GhostDialog ${part} did not render`)
      } else if (!placement.teleported || !placement.themed) {
        problems.push(
          `GhostDialog ${part} was not a themed part teleported out of #app`,
        )
      } else if (placement.theme !== FIXTURE_PALETTE) {
        problems.push(
          `teleported GhostDialog ${part} sits under ${JSON.stringify(placement.theme)} instead of the ${FIXTURE_PALETTE} palette host, so its recipe has no tokens`,
        )
      }
    }
  }
  if (
    !Array.isArray(result.dialog?.afterClose) ||
    result.dialog.afterClose.some((text) => text.includes('Smoke dialog'))
  ) {
    problems.push('GhostDialogClose did not close the dialog')
  }
  return problems
}

/**
 * Problems with what `vite-app/mount.mjs` observed after mounting the opt-in
 * theme CSS page, which renders Field, Input, Button, and a portaled Dialog
 * imported from `@ghostvue/themes/components`.
 *
 * @param {MountObservation} result Parsed JSON printed by the mount runner.
 * @returns {string[]}
 */
export function viteOptInMountProblems(result) {
  const problems = fieldMountProblems(result)
  if (result.button?.tag !== 'BUTTON' || result.button.text !== 'Save') {
    problems.push('GhostButton from @ghostvue/themes/components did not render')
  }
  problems.push(...dialogMountProblems(result))
  return [...problems, ...runtimeErrorProblems(result)]
}

/**
 * Problems with what `vite-app/mount.mjs` observed after mounting the
 * production bundle.
 *
 * @param {MountObservation} result Parsed JSON printed by the mount runner.
 * @returns {string[]}
 */
export function viteAppMountProblems(result) {
  /** @type {string[]} */
  const problems = fieldMountProblems(result)
  /** @param {boolean} condition @param {string} message */
  const expect = (condition, message) => {
    if (!condition) problems.push(message)
  }
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
  problems.push(...dialogMountProblems(result))
  expect(
    Array.isArray(result.drawer?.open) &&
      result.drawer.open.some((text) => text.includes('Smoke drawer')),
    'GhostDrawerTrigger did not open a role="dialog" with its title',
  )
  expect(result.toast?.shown === true, 'useGhostToast().toast() showed nothing')
  return [...problems, ...runtimeErrorProblems(result)]
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
