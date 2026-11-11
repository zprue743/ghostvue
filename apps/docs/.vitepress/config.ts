import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitepress'

import { docsDescription, docsSidebar, docsTitle } from './docs-nav'
import { writeLlmsTxtFiles } from './generate-llms-txt'
import {
  applyDocsThemeHost,
  restoreDocsThemeScript,
} from './theme/restore-theme'

function themeCss(name: string): string {
  return fileURLToPath(
    new URL(`../../../packages/themes/src/${name}`, import.meta.url),
  )
}

export default defineConfig({
  // Canonical markdown lives in /docs; this app is only the VitePress wrapper.
  srcDir: '../../docs',
  title: docsTitle,
  description: docsDescription,
  cleanUrls: true,
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
        // Visual token pages import the source stylesheet, not a built dist.
        '@slop-ui/themes/default.css': themeCss('default.css'),
        '@slop-ui/themes/calm.css': themeCss('generated/calm.css'),
        '@slop-ui/themes/vibrant.css': themeCss('generated/vibrant.css'),
        '@slop-ui/themes/mono.css': themeCss('generated/mono.css'),
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
