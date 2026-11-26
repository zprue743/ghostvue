/**
 * Token host for the `/examples.html` route.
 *
 * The examples route must render a demo the way the docs canvas does, so
 * visual baselines and axe scans see the same headless/themed boundary:
 *
 * - `<html>` carries token values only (`data-ghost-theme`, optional
 *   `data-ghost-density`, `data-ghost-mode`). It never carries the
 *   `.ghost-theme` class, because recipes match `.ghost-theme .ghost-*` and a
 *   global class would theme every headless example. Themed examples opt in
 *   per instance through their own `.ghost-themed-scope` wrapper.
 * - With no query, the host matches the docs first paint: the `default`
 *   theme, unset density (comfortable), light mode.
 *
 * `?theme=`, `?density=`, and `?mode=` select another token host, for example
 * `?id=button/themed&theme=default&density=comfortable&mode=dark`. Unknown
 * values fall back to the docs defaults instead of writing an attribute no
 * stylesheet matches.
 */

/** Flagships shipped by `@ghostvue/themes` (mirrors its `themeNames`). */
export const EXAMPLES_HOST_THEMES = [
  'default',
  'calm',
  'vibrant',
  'mono',
] as const
export const EXAMPLES_HOST_DENSITIES = [
  'compact',
  'comfortable',
  'spacious',
] as const
export const EXAMPLES_HOST_MODES = ['light', 'dark'] as const

export type ExamplesHostTheme = (typeof EXAMPLES_HOST_THEMES)[number]
export type ExamplesHostDensity = (typeof EXAMPLES_HOST_DENSITIES)[number]
export type ExamplesHostMode = (typeof EXAMPLES_HOST_MODES)[number]

export interface ExamplesHost {
  theme: ExamplesHostTheme
  /** `undefined` leaves `data-ghost-density` unset, as the docs site does. */
  density: ExamplesHostDensity | undefined
  mode: ExamplesHostMode
}

/** Docs first-paint host (`DOCS_DEFAULT_THEME`, no density attribute). */
export const EXAMPLES_HOST_DEFAULT: ExamplesHost = {
  theme: 'default',
  density: undefined,
  mode: 'light',
}

function pick<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | undefined {
  return allowed.find((candidate) => candidate === value)
}

/** Resolves the token host from a `location.search` string. */
export function resolveExamplesHost(search: string): ExamplesHost {
  const params = new URLSearchParams(search)
  return {
    theme:
      pick(EXAMPLES_HOST_THEMES, params.get('theme')) ??
      EXAMPLES_HOST_DEFAULT.theme,
    density: pick(EXAMPLES_HOST_DENSITIES, params.get('density')),
    mode:
      pick(EXAMPLES_HOST_MODES, params.get('mode')) ??
      EXAMPLES_HOST_DEFAULT.mode,
  }
}

/**
 * Writes the host attributes on `root`. Density is removed rather than left
 * stale so an unset density really is unset.
 */
export function applyExamplesHost(root: HTMLElement, host: ExamplesHost): void {
  root.setAttribute('data-ghost-theme', host.theme)
  root.setAttribute('data-ghost-mode', host.mode)
  if (host.density) {
    root.setAttribute('data-ghost-density', host.density)
  } else {
    root.removeAttribute('data-ghost-density')
  }
}
