import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitepress'

import {
  docsDescription,
  docsSidebar,
  docsSidebars,
  docsTitle,
} from './docs-nav'
import { buildSpecRewrites } from './spec-rewrites'
import {
  bindExampleSourceHtml,
  expandExampleSnippets,
} from './expand-example-snippets'
import { writeLlmsTxtFiles } from './generate-llms-txt'
import {
  applyDocsThemeHost,
  restoreDocsThemeScript,
} from './theme/restore-theme'
import { renderLocalSearchDocument } from './search-local'
import { DEMO_CSS_LAYER_PRELUDE, demoCssLayersPlugin } from './demo-css-layers'

function packageSrc(relative: string): string {
  return fileURLToPath(
    new URL(`../../../packages/${relative}`, import.meta.url),
  )
}

export default defineConfig({
  // Canonical markdown lives in /docs; this app is only the VitePress wrapper.
  srcDir: '../../docs',
  title: docsTitle,
  description: docsDescription,
  cleanUrls: true,
  // Vercel static hosting only strips `.html` when `apps/docs/vercel.json`
  // also sets `cleanUrls`. Keep the two flags together.
  rewrites: buildSpecRewrites(
    fileURLToPath(new URL('../../../docs', import.meta.url)),
  ),
  // Restore a persisted theme before paint; first paint boots into default (ADR 0008).
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    [
      'link',
      {
        rel: 'icon',
        href: '/icons/icon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    ['link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }],
    ['style', { id: 'ghost-demo-css-layers' }, DEMO_CSS_LAYER_PRELUDE],
    ['script', { id: 'ghost-docs-theme-restore' }, restoreDocsThemeScript],
  ],
  transformHtml(code) {
    return applyDocsThemeHost(code)
  },
  markdown: {
    config(md) {
      // Rewrite live `<GhostExample>` tags into a preview plus a `<<<` snippet
      // so Shiki (and the VP copy control) match ordinary docs fences.
      md.core.ruler.before('normalize', 'ghost-example-snippets', (state) => {
        state.src = expandExampleSnippets(state.src)
      })
      // Hand that snippet to the slot as one `v-html` string: Vue compiles
      // static markup in a component slot node by node, which made large
      // examples dominate the docs build's heap.
      bindExampleSourceHtml(md)
    },
  },
  vite: {
    plugins: [
      demoCssLayersPlugin(),
      {
        name: 'ghost-docs-theme-host',
        transformIndexHtml(html) {
          return applyDocsThemeHost(html)
        },
      },
    ],
    server: {
      fs: {
        // Example SFCs live at the repository root, outside apps/docs.
        allow: [fileURLToPath(new URL('../../..', import.meta.url))],
      },
    },
    resolve: {
      alias: {
        // Browser CI builds docs without `pnpm build`, so resolve workspace
        // packages to source. CSS aliases must stay above `@ghostvue/themes`
        // because Vite prefix-matches the package name.
        '@ghostvue/themes/default.css': packageSrc('themes/src/default.css'),
        '@ghostvue/themes/calm.css': packageSrc(
          'themes/src/generated/calm.css',
        ),
        '@ghostvue/themes/vibrant.css': packageSrc(
          'themes/src/generated/vibrant.css',
        ),
        '@ghostvue/themes/mono.css': packageSrc(
          'themes/src/generated/mono.css',
        ),
        '@ghostvue/themes': packageSrc('themes/src/index.ts'),
        '@ghostvue/vue': packageSrc('vue/src/index.ts'),
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        _render: renderLocalSearchDocument,
      },
    },
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      // Decorative: VPNavBarTitle already exposes the "GhostVue" text label.
      alt: '',
    },
    nav: [
      {
        text: 'Docs',
        link: '/getting-started',
        activeMatch:
          '^/(getting-started|auto-imports|philosophy|roadmap|reference/|warnings|tooling/)',
      },
      {
        text: 'Components',
        link: '/components/',
        activeMatch: '^/components/(?!.*-spec)',
      },
      {
        text: 'Theming',
        link: '/themes/default',
        activeMatch: '^/themes/',
      },
      {
        text: 'Examples',
        link: '/examples',
        activeMatch: '^/examples(?:/|$)',
      },
      {
        text: 'Contribute',
        link: '/contributing/workflow',
        activeMatch:
          '^/(contributing/|architecture/|standards/|agents/|adr/|specs/)',
      },
    ],
    sidebar: docsSidebars,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/zprue743/ghostvue' },
    ],
  },
  // Emit llmstxt.org files into the static output so they are served at
  // `/llms.txt` and `/llms-full.txt` without a runtime dependency.
  async buildEnd(siteConfig) {
    await writeLlmsTxtFiles({
      docsRoot: siteConfig.srcDir,
      outDir: siteConfig.outDir,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })
  },
})
