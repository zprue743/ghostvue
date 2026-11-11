import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitepress'

import { docsDescription, docsSidebar, docsTitle } from './docs-nav'
import { writeLlmsTxtFiles } from './generate-llms-txt'

export default defineConfig({
  // Canonical markdown lives in /docs; this app is only the VitePress wrapper.
  srcDir: '../../docs',
  title: docsTitle,
  description: docsDescription,
  cleanUrls: true,
  vite: {
    resolve: {
      alias: {
        // Visual token pages import the source stylesheet, not a built dist.
        '@slop-ui/themes/default.css': fileURLToPath(
          new URL('../../../packages/themes/src/default.css', import.meta.url),
        ),
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
