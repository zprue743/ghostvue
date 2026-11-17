/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import {
  DEMO_CSS_LAYER_ORDER,
  DEMO_CSS_LAYER_PRELUDE,
  demoCssLayersPlugin,
  ensureCssBundleLayerPrelude,
  isVitePressLayerTarget,
  normalizeModulePath,
  resolveVitePressLayerTargets,
  VITEPRESS_LAYER_SPECIFIERS,
  wrapVitePressCssLayer,
} from '../../apps/docs/.vitepress/demo-css-layers'

function callTransform(
  plugins: ReturnType<typeof demoCssLayersPlugin>,
  code: string,
  id: string,
) {
  const plugin = plugins[0]
  if (!plugin || typeof plugin.transform !== 'function') {
    throw new Error(
      'Expected demoCssLayersPlugin[0].transform to be a function',
    )
  }
  return plugin.transform(code, id)
}

describe('demo-css-layers', () => {
  it('declares ghostvue-vitepress, ghostvue-demo-reset, ghostvue-theme in order', () => {
    expect(DEMO_CSS_LAYER_ORDER).toEqual([
      'ghostvue-vitepress',
      'ghostvue-demo-reset',
      'ghostvue-theme',
    ])
    expect(DEMO_CSS_LAYER_PRELUDE).toBe(
      '@layer ghostvue-vitepress, ghostvue-demo-reset, ghostvue-theme;',
    )
  })

  it('resolves installed VitePress base.css and components/vp-doc.css and wraps them cleanly', () => {
    const targets = resolveVitePressLayerTargets()
    const require = createRequire(import.meta.url)

    for (const specifier of VITEPRESS_LAYER_SPECIFIERS) {
      const resolved = require.resolve(specifier)
      expect(isVitePressLayerTarget(resolved, targets)).toBe(true)

      const rawCss = readFileSync(resolved, 'utf8')
      const wrapped = wrapVitePressCssLayer(rawCss, specifier)
      expect(
        wrapped.startsWith(
          `${DEMO_CSS_LAYER_PRELUDE}\n\n@layer ghostvue-vitepress {\n`,
        ),
      ).toBe(true)
      expect(wrapped.indexOf(DEMO_CSS_LAYER_PRELUDE)).toBeLessThan(
        wrapped.indexOf('@layer ghostvue-vitepress {'),
      )
      // Wrapping again is a no-op (never double-wraps).
      expect(wrapVitePressCssLayer(wrapped, specifier)).toBe(wrapped)
    }
  })

  it('fails clearly when VitePress target stylesheets are missing', () => {
    expect(() =>
      resolveVitePressLayerTargets(() => {
        throw new Error('Cannot find module')
      }),
    ).toThrow(/Failed to resolve VitePress stylesheet/)

    expect(() =>
      resolveVitePressLayerTargets(
        () => '/nonexistent/vitepress/styles/base.css',
      ),
    ).toThrow(/does not exist/)
  })

  it('covers dev-query variants and ignores non-CSS queries and unrelated files', () => {
    const posixTarget =
      '/repo/node_modules/vitepress/dist/client/theme-default/styles/base.css'
    const winTarget =
      'C:/repo/node_modules/vitepress/dist/client/theme-default/styles/components/vp-doc.css'
    const targets = new Set([
      normalizeModulePath(posixTarget),
      normalizeModulePath(winTarget),
    ])

    expect(isVitePressLayerTarget(posixTarget, targets)).toBe(true)
    expect(isVitePressLayerTarget(`${posixTarget}?direct`, targets)).toBe(true)
    expect(isVitePressLayerTarget(`${posixTarget}?inline`, targets)).toBe(true)
    expect(
      isVitePressLayerTarget(`${posixTarget}?used&t=1700000000`, targets),
    ).toBe(true)
    expect(isVitePressLayerTarget(`/@fs${posixTarget}?direct`, targets)).toBe(
      true,
    )

    expect(
      isVitePressLayerTarget(
        'c:\\repo\\node_modules\\vitepress\\dist\\client\\theme-default\\styles\\components\\vp-doc.css?t=123',
        targets,
      ),
    ).toBe(true)
    expect(isVitePressLayerTarget(`/@fs/${winTarget}?direct`, targets)).toBe(
      true,
    )

    expect(isVitePressLayerTarget(`${posixTarget}?raw`, targets)).toBe(false)
    expect(isVitePressLayerTarget(`${posixTarget}?url`, targets)).toBe(false)
    expect(
      isVitePressLayerTarget(
        '/repo/node_modules/vitepress/dist/client/theme-default/styles/vars.css',
        targets,
      ),
    ).toBe(false)
  })

  it('fails clearly on unsupported upstream CSS at-rules outside comments', () => {
    expect(() =>
      wrapVitePressCssLayer(
        '@import "./other.css";\na { color: red; }',
        'base.css',
      ),
    ).toThrow(/Unsupported upstream CSS at-rule "@import" in base\.css/)

    expect(() =>
      wrapVitePressCssLayer('@charset "UTF-8";\na { color: red; }', 'base.css'),
    ).toThrow(/Unsupported upstream CSS at-rule "@charset" in base\.css/)

    expect(() =>
      wrapVitePressCssLayer(
        '@namespace svg url(http://www.w3.org/2000/svg);',
        'vp-doc.css',
      ),
    ).toThrow(/Unsupported upstream CSS at-rule "@namespace" in vp-doc\.css/)

    expect(() =>
      wrapVitePressCssLayer('@layer vp-base { a { color: red; } }', 'base.css'),
    ).toThrow(/Unsupported upstream CSS at-rule "@layer" in base\.css/)

    // Comments mentioning @import / @layer do not trigger false positives.
    const commented = wrapVitePressCssLayer(
      '/* @import "./ignored.css"; @layer ignored */\nbutton { border: 0; }',
      'base.css',
    )
    expect(commented).toContain('@layer ghostvue-vitepress {')
  })

  it('plugin transforms target CSS once and skips non-targets', () => {
    const target =
      '/repo/node_modules/vitepress/dist/client/theme-default/styles/base.css'
    const plugins = demoCssLayersPlugin(new Set([normalizeModulePath(target)]))

    expect(plugins[0]?.enforce).toBe('pre')
    expect(plugins[1]?.enforce).toBe('post')
    expect(
      callTransform(plugins, 'button { border: 0; }', '/repo/vars.css'),
    ).toBeNull()
    expect(
      callTransform(plugins, 'export default ""', `${target}?raw`),
    ).toBeNull()

    const first = callTransform(
      plugins,
      'button { border: 0; }',
      `${target}?direct`,
    )
    expect(first).toEqual({
      code: `${DEMO_CSS_LAYER_PRELUDE}\n\n@layer ghostvue-vitepress {\nbutton { border: 0; }\n}\n`,
      map: null,
    })

    if (!first || typeof first !== 'object' || !('code' in first)) {
      throw new Error('Expected transformed result object')
    }
    expect(callTransform(plugins, first.code, target)).toBeNull()
  })

  it('prepends the layer order prelude to emitted CSS bundles before ghostvue-theme', () => {
    const bundleCss = '@layer ghostvue-theme{.ghost-button{color:red}}'
    const withPrelude = ensureCssBundleLayerPrelude(bundleCss)
    expect(withPrelude).toBe(`${DEMO_CSS_LAYER_PRELUDE}\n${bundleCss}`)
    // Idempotent when already present at the start.
    expect(ensureCssBundleLayerPrelude(withPrelude)).toBe(withPrelude)
    // Leaves unrelated CSS untouched.
    expect(ensureCssBundleLayerPrelude('body{margin:0}')).toBe('body{margin:0}')
  })
})
