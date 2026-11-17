import { existsSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { UserConfig } from 'vitepress'

type VitePressPluginOption = NonNullable<
  NonNullable<UserConfig['vite']>['plugins']
>[number]

export interface DemoCssLayersPlugin {
  name: string
  enforce: 'pre' | 'post'
  transform?: (code: string, id: string) => { code: string; map: null } | null
  generateBundle?: (
    options: unknown,
    bundle: Record<
      string,
      { type: string; fileName: string; source: string | Uint8Array }
    >,
  ) => void
}

export const DEMO_CSS_LAYER_ORDER = [
  'ghostvue-vitepress',
  'ghostvue-demo-reset',
  'ghostvue-theme',
] as const

export const DEMO_CSS_LAYER_PRELUDE = `@layer ${DEMO_CSS_LAYER_ORDER.join(', ')};`

export const VITEPRESS_LAYER_SPECIFIERS = [
  'vitepress/dist/client/theme-default/styles/base.css',
  'vitepress/dist/client/theme-default/styles/components/vp-doc.css',
] as const

const UNSUPPORTED_UPSTREAM_AT_RULE = /@(charset|import|namespace|layer)\b/i

function defaultResolve(specifier: string): string {
  const require = createRequire(import.meta.url)
  return require.resolve(specifier)
}

export function normalizeModulePath(rawId: string): string {
  const queryIndex = rawId.indexOf('?')
  const rawPath = queryIndex === -1 ? rawId : rawId.slice(0, queryIndex)
  let normalized = rawPath.replace(/\\/g, '/')

  if (normalized.startsWith('/@fs/')) {
    const rest = normalized.slice('/@fs/'.length)
    normalized = /^[A-Za-z]:\//.test(rest) ? rest : `/${rest}`
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    normalized = `${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`
  }

  return normalized
}

export function resolveVitePressLayerTargets(
  resolve: (specifier: string) => string = defaultResolve,
): ReadonlySet<string> {
  const targets = new Set<string>()

  for (const specifier of VITEPRESS_LAYER_SPECIFIERS) {
    let resolved: string
    try {
      resolved = resolve(specifier)
    } catch (error) {
      throw new Error(
        `[demo-css-layers] Failed to resolve VitePress stylesheet "${specifier}".`,
        { cause: error },
      )
    }

    if (!existsSync(resolved)) {
      throw new Error(
        `[demo-css-layers] Resolved VitePress stylesheet "${specifier}" does not exist at "${resolved}".`,
      )
    }

    targets.add(normalizeModulePath(resolved))
    targets.add(normalizeModulePath(realpathSync(resolved)))
  }

  return targets
}

export function isVitePressLayerTarget(
  id: string,
  targets: ReadonlySet<string>,
): boolean {
  const queryIndex = id.indexOf('?')
  if (queryIndex !== -1) {
    const params = new URLSearchParams(id.slice(queryIndex + 1))
    if (params.has('raw') || params.has('url')) {
      return false
    }
  }

  return targets.has(normalizeModulePath(id))
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

export function wrapVitePressCssLayer(
  code: string,
  sourceLabel = 'VitePress stylesheet',
): string {
  const stripped = stripCssComments(code)

  if (/(?:^|[\s;{}])@layer\s+ghostvue-vitepress\b/.test(stripped)) {
    return code
  }

  const unsupported = UNSUPPORTED_UPSTREAM_AT_RULE.exec(stripped)
  if (unsupported) {
    const ruleName = (unsupported[1] ?? 'unknown').toLowerCase()
    throw new Error(
      `[demo-css-layers] Unsupported upstream CSS at-rule "@${ruleName}" in ${sourceLabel}; cannot safely wrap in @layer ghostvue-vitepress.`,
    )
  }

  return `${DEMO_CSS_LAYER_PRELUDE}\n\n@layer ghostvue-vitepress {\n${code}\n}\n`
}

export function ensureCssBundleLayerPrelude(css: string): string {
  if (!css.includes('ghostvue-vitepress') && !css.includes('ghostvue-theme')) {
    return css
  }

  const trimmed = css.trimStart()
  if (
    /^@layer\s+ghostvue-vitepress\s*,\s*ghostvue-demo-reset\s*,\s*ghostvue-theme\s*;/.test(
      trimmed,
    )
  ) {
    return css
  }

  const charsetMatch = /^(@charset\s+[^;]+;\s*)/i.exec(css)
  if (charsetMatch?.[1]) {
    const charset = charsetMatch[1]
    return `${charset}${DEMO_CSS_LAYER_PRELUDE}\n${css.slice(charset.length)}`
  }

  return `${DEMO_CSS_LAYER_PRELUDE}\n${css}`
}

export function demoCssLayersPlugin(
  targets: ReadonlySet<string> = resolveVitePressLayerTargets(),
): DemoCssLayersPlugin[] & VitePressPluginOption {
  const plugins: DemoCssLayersPlugin[] = [
    {
      name: 'ghost-demo-css-layers',
      enforce: 'pre',
      transform(code, id) {
        if (!isVitePressLayerTarget(id, targets)) {
          return null
        }

        const wrapped = wrapVitePressCssLayer(code, id)
        if (wrapped === code) {
          return null
        }

        return {
          code: wrapped,
          map: null,
        }
      },
    },
    {
      name: 'ghost-demo-css-layers-prelude',
      enforce: 'post',
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type !== 'asset' || !output.fileName.endsWith('.css')) {
            continue
          }
          const raw =
            typeof output.source === 'string'
              ? output.source
              : Buffer.from(output.source).toString('utf8')
          const next = ensureCssBundleLayerPrelude(raw)
          if (next !== raw) {
            output.source =
              typeof output.source === 'string'
                ? next
                : Buffer.from(next, 'utf8')
          }
        }
      },
    },
  ]

  return plugins as DemoCssLayersPlugin[] & VitePressPluginOption
}
