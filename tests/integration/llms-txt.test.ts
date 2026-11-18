import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { writeComponentReferences } from '../../scripts/lib/component-reference.js'

import {
  docsDescription,
  docsSidebar,
  docsTitle,
} from '../../apps/docs/.vitepress/docs-nav'
import type { LlmsSidebarItem } from '../../apps/docs/.vitepress/generate-llms-txt'
import {
  expandExampleTags,
  generateLlmsDocuments,
  resolveDocsPagePath,
  toPlainMarkdown,
  writeLlmsTxtFiles,
} from '../../apps/docs/.vitepress/generate-llms-txt'

const docsRoot = resolve(process.cwd(), 'docs')

function collectSidebarLinks(
  items: readonly LlmsSidebarItem[],
): { title: string; link: string }[] {
  return items.flatMap((item) => {
    const links = item.link ? [{ title: item.text, link: item.link }] : []
    const nested = item.items ? collectSidebarLinks(item.items) : []
    return [...links, ...nested]
  })
}

function sidebarPages(): { title: string; link: string }[] {
  return docsSidebar.flatMap((group) => collectSidebarLinks(group.items))
}

describe('llms.txt generation', () => {
  const tempDirs: string[] = []

  beforeAll(async () => {
    // API reference pages are generated at docs build time; materialize them
    // so sidebar links resolve the same way in unit/integration shards.
    await writeComponentReferences(process.cwd())
  })

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    )
  })

  it('indexes every sidebar page, resolves links, and keeps each page H1 in the full dump', async () => {
    const expected = sidebarPages()
    const first = await generateLlmsDocuments({
      docsRoot,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })
    const second = await generateLlmsDocuments({
      docsRoot,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })

    expect(expected.length).toBeGreaterThan(0)
    expect(first.llmsTxt).toBe(second.llmsTxt)
    expect(first.llmsFullTxt).toBe(second.llmsFullTxt)
    expect(first.llmsTxt.startsWith(`# ${docsTitle}\n`)).toBe(true)
    expect(first.llmsTxt).toContain(`> ${docsDescription}`)
    expect(first.llmsTxt).toContain('/llms-full.txt')

    for (const page of expected) {
      expect(first.llmsTxt).toContain(`[${page.title}](${page.link})`)

      const sourcePath = await resolveDocsPagePath(docsRoot, page.link)
      const markdown = await readFile(sourcePath, 'utf8')
      const heading = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim()
      if (heading) {
        expect(first.llmsFullTxt).toContain(`# ${heading}`)
      }
    }

    const listedLinks = [
      ...first.llmsTxt.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm),
    ]
    expect(listedLinks.length).toBeGreaterThanOrEqual(expected.length)

    for (const match of listedLinks) {
      const href = match[2]
      if (!href || href === '/llms-full.txt' || /^https?:/i.test(href)) {
        continue
      }

      const sourcePath = await resolveDocsPagePath(docsRoot, href)
      expect(sourcePath.endsWith('.md')).toBe(true)
    }
  })

  it('lists the ESLint plugin page so agents can discover the usage rules', async () => {
    const { llmsTxt, llmsFullTxt } = await generateLlmsDocuments({
      docsRoot,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })

    expect(llmsTxt).toContain('- [ESLint plugin](/tooling/eslint-plugin)')
    expect(llmsFullTxt).toContain('Source: docs/tooling/eslint-plugin.md')
    expect(llmsFullTxt).toContain('## no-undeclared-v-model')
  })

  it('writes both files into the docs output directory', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'ghost-llms-'))
    tempDirs.push(outDir)

    const documents = await writeLlmsTxtFiles({
      docsRoot,
      outDir,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })

    expect(await readFile(join(outDir, 'llms.txt'), 'utf8')).toBe(
      documents.llmsTxt,
    )
    expect(await readFile(join(outDir, 'llms-full.txt'), 'utf8')).toBe(
      documents.llmsFullTxt,
    )
  })

  it('strips VitePress-only syntax outside code fences', () => {
    const plain = toPlainMarkdown(`---
layout: doc
tagline: unused
---

# Title

<script setup lang="ts">
const hidden = true
</script>

::: warning Careful
Do not ignore this.
:::

\`\`\`md
::: tip
kept fence
:::
\`\`\`
`)

    expect(plain).not.toContain('layout: doc')
    expect(plain).not.toContain('<script')
    expect(plain).not.toContain('const hidden')
    expect(plain).toContain('> Careful')
    expect(plain).toContain('> Do not ignore this.')
    expect(plain).not.toMatch(/^::: warning/m)
    expect(plain).toContain('```md\n::: tip\nkept fence\n:::\n```')
  })

  it('inlines executable example source in place of Example tags', async () => {
    const expanded = await expandExampleTags(
      'Intro\n\n<GhostExample id="button/basic" />\n',
      process.cwd(),
    )

    expect(expanded).not.toContain('<GhostExample')
    expect(expanded).toContain('```vue')
    expect(expanded).toContain("import { GhostButton } from '@ghostvue/vue'")
  })

  it('emits one source fence per host and no wrapper or snippet syntax', async () => {
    const basic = (
      await readFile(
        resolve(process.cwd(), 'examples/button/basic.vue'),
        'utf8',
      )
    ).replace(/\n+$/, '')
    const fence = `\`\`\`vue\n${basic}\n\`\`\``
    const authored = [
      // Self-closing tag, legacy sibling snippet, and expanded slot form all
      // collapse to the same single fence.
      '<GhostExample id="button/basic" />',
      '<GhostExample id="button/basic" />\n\n<<< @/../examples/button/basic.vue',
      '<GhostExample id="button/basic">\n\n<<< @/../examples/button/basic.vue\n\n</GhostExample>',
    ]

    for (const tag of authored) {
      const expanded = await expandExampleTags(
        `Intro\n\n${tag}\n\nOutro\n`,
        process.cwd(),
      )

      expect(expanded).toBe(`Intro\n\n${fence}\n\nOutro\n`)
    }
  })

  it('keeps quoted GhostExample illustrations inside fences verbatim', async () => {
    const quoted = '```md\n<GhostExample id="button/basic" />\n```\n'
    const expanded = await expandExampleTags(
      `${quoted}\n<GhostExample id="button/basic" />\n`,
      process.cwd(),
    )

    expect(expanded.startsWith(quoted)).toBe(true)
    expect(expanded.match(/^```vue$/gm)).toHaveLength(1)
  })

  it('keeps llms-full free of host syntax with unique sources per page', async () => {
    const { pages, llmsFullTxt } = await generateLlmsDocuments({
      docsRoot,
      title: docsTitle,
      description: docsDescription,
      sidebar: docsSidebar,
    })

    // Quoted `<GhostExample … />` illustrations in contributor docs are
    // legitimate prose; the expanded host form never is.
    expect(llmsFullTxt).not.toContain('</GhostExample>')
    expect(llmsFullTxt).not.toMatch(/<GhostExample\s+id=["'][^"']+["']\s*>/)
    expect(llmsFullTxt).not.toContain('<<< @/../examples/')

    const button = pages.find((page) => page.link === '/components/button')
    expect(button).toBeDefined()
    const themed = (
      await readFile(
        resolve(process.cwd(), 'examples/button/themed.vue'),
        'utf8',
      )
    ).replace(/\n+$/, '')
    expect(button?.body.split(themed)).toHaveLength(2)
  })
})
