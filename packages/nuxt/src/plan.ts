/**
 * Pure resolution plan for the Nuxt module. Kept free of `@nuxt/kit` so the
 * headless-versus-themed rules are unit-testable without booting Nuxt.
 */
import {
  headlessComponentNames,
  headlessComposableNames,
  themedComponentNames,
} from './.registries/auto-imports.generated.js'

/** Package that headless components and composables import from. */
export const HEADLESS_PACKAGE = '@ghostvue/vue'
/** Optional package that themed wrappers and theme stylesheets come from. */
export const THEMES_PACKAGE = '@ghostvue/themes'

/**
 * Which layer auto-imported `Ghost*` component tags resolve to.
 *
 * - `'headless'` (default): every tag resolves to `@ghostvue/vue`. No CSS.
 * - `'themed'`: tags with a themed wrapper resolve to `@ghostvue/themes`
 *   (which loads its base stylesheet); the few headless-only utilities
 *   (`GhostPortal`, `GhostVisuallyHidden`, ...) keep resolving to
 *   `@ghostvue/vue`. Requires `@ghostvue/themes` to be installed.
 * - `false`: register no components; use named imports instead.
 */
export type GhostVueNuxtComponents = 'headless' | 'themed' | false

/**
 * Stylesheet exported by `@ghostvue/themes` as `@ghostvue/themes/<name>.css`.
 * `default`, `calm`, `vibrant`, and `mono` are full themes; `tokens` is the
 * token custom properties alone.
 */
export type GhostVueNuxtStylesheet =
  'default' | 'calm' | 'vibrant' | 'mono' | 'tokens'

/** Every accepted stylesheet name, in documentation order. */
export const ghostVueNuxtStylesheets: readonly GhostVueNuxtStylesheet[] = [
  'default',
  'calm',
  'vibrant',
  'mono',
  'tokens',
]

/** Options for the `ghostvue` key in `nuxt.config`. */
export interface GhostVueNuxtOptions {
  /**
   * Layer that auto-imported `Ghost*` components resolve to.
   *
   * @defaultValue `'headless'`
   */
  components?: GhostVueNuxtComponents
  /**
   * Auto-import the public `useGhost*` composables from `@ghostvue/vue`.
   * Lower-level helpers such as `useFocusScope` remain named imports.
   *
   * @defaultValue `true`
   */
  composables?: boolean
  /**
   * Theme stylesheets to add to `nuxt.options.css`. Nothing is injected by
   * default, so headless apps ship no GhostVue CSS. Requires
   * `@ghostvue/themes` when non-empty.
   *
   * @defaultValue `[]`
   */
  css?: readonly GhostVueNuxtStylesheet[]
}

/** One name the module registers, with the package it imports from. */
export interface GhostVueNuxtImport {
  readonly name: string
  readonly from: typeof HEADLESS_PACKAGE | typeof THEMES_PACKAGE
}

/** What the module registers for a given set of options. */
export interface GhostVueNuxtPlan {
  readonly components: readonly GhostVueNuxtImport[]
  readonly composables: readonly GhostVueNuxtImport[]
  /** Module specifiers appended to `nuxt.options.css`. */
  readonly css: readonly string[]
  /** True when the plan imports anything from `@ghostvue/themes`. */
  readonly requiresThemes: boolean
}

/**
 * Resolves options to the exact components, composables, and stylesheets to
 * register. Each component name appears once, so the headless and themed
 * layers never register competing definitions for the same tag.
 *
 * @throws TypeError for an unknown `components` mode or stylesheet name, so a
 * typo fails the build instead of silently shipping a different layer.
 */
export function planGhostVueNuxt(
  options: GhostVueNuxtOptions = {},
): GhostVueNuxtPlan {
  const mode = options.components ?? 'headless'
  // Runtime guard for untyped (JavaScript) nuxt.config files.
  const modes: readonly unknown[] = ['headless', 'themed', false]
  if (!modes.includes(mode)) {
    throw new TypeError(
      `[@ghostvue/nuxt] Unknown components mode ${JSON.stringify(mode)}. Use 'headless', 'themed', or false.`,
    )
  }

  const themed = new Set(themedComponentNames)
  // Themed mode covers the union so a future themed-only wrapper still
  // registers; today every themed name also exists headless.
  const names =
    mode === 'themed'
      ? [...new Set([...headlessComponentNames, ...themedComponentNames])]
      : headlessComponentNames
  const components: GhostVueNuxtImport[] =
    mode === false
      ? []
      : names.map((name) => ({
          name,
          from:
            mode === 'themed' && themed.has(name)
              ? THEMES_PACKAGE
              : HEADLESS_PACKAGE,
        }))

  const composables: GhostVueNuxtImport[] =
    options.composables === false
      ? []
      : headlessComposableNames.map((name) => ({
          name,
          from: HEADLESS_PACKAGE,
        }))

  const known = new Set<string>(ghostVueNuxtStylesheets)
  const css: string[] = []
  for (const sheet of options.css ?? []) {
    if (!known.has(sheet)) {
      throw new TypeError(
        `[@ghostvue/nuxt] Unknown stylesheet ${JSON.stringify(sheet)}. Use one of: ${ghostVueNuxtStylesheets.join(', ')}.`,
      )
    }
    const specifier = `${THEMES_PACKAGE}/${sheet}.css`
    if (!css.includes(specifier)) css.push(specifier)
  }

  return {
    components,
    composables,
    css,
    requiresThemes:
      css.length > 0 || components.some(({ from }) => from === THEMES_PACKAGE),
  }
}
