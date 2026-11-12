import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitepress'

import { docsDescription, docsSidebar, docsTitle } from './docs-nav'
import { writeLlmsTxtFiles } from './generate-llms-txt'
import {
  applyDocsThemeHost,
  restoreDocsThemeScript,
} from './theme/restore-theme'

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
  rewrites: {
    // Sidebar links to `/adr/`; VitePress would otherwise emit README.html.
    // Leave docs/adr/README.md in place so GitHub still renders the index.
    'adr/README.md': 'adr/index.md',
  },
  // Restore a persisted theme before paint; first paint dogfoods calm (ADR 0008).
  head: [['script', { id: 'slop-docs-theme-restore' }, restoreDocsThemeScript]],
  transformHtml(code) {
    return applyDocsThemeHost(code)
  },
  vite: {
    plugins: [
      {
        name: 'slop-docs-theme-host',
        transformIndexHtml(html) {
          return applyDocsThemeHost(html)
        },
      },
    ],
    resolve: {
      alias: {
        // Browser CI builds docs without `pnpm build`, so resolve workspace
        // packages to source. CSS aliases must stay above `@slop-ui/themes`
        // because Vite prefix-matches the package name.
        '@slop-ui/themes/default.css': packageSrc('themes/src/default.css'),
        '@slop-ui/themes/calm.css': packageSrc('themes/src/generated/calm.css'),
        '@slop-ui/themes/vibrant.css': packageSrc(
          'themes/src/generated/vibrant.css',
        ),
        '@slop-ui/themes/mono.css': packageSrc('themes/src/generated/mono.css'),
        '@slop-ui/themes': packageSrc('themes/src/index.ts'),
        '@slop-ui/vue': packageSrc('vue/src/index.ts'),
      },
    },
  },
  themeConfig: {
    nav: [
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Standards', link: '/standards/code-style' },
      { text: 'Contributing', link: '/contributing/workflow' },
    ],
    sidebar: docsSidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/zprue743/slop-ui' },
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
