import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  docsDescription,
  docsSidebar,
  docsTitle,
} from '../../apps/docs/.vitepress/docs-nav'
import {
  generateLlmsDocuments,
  resolveDocsPagePath,
  toPlainMarkdown,
  writeLlmsTxtFiles,
} from '../../apps/docs/.vitepress/generate-llms-txt'

const docsRoot = resolve(process.cwd(), 'docs')

function sidebarPages(): { title: string; link: string }[] {
  return docsSidebar.flatMap((group) =>
    group.items.flatMap((item) =>
      item.link ? [{ title: item.text, link: item.link }] : [],
    ),
  )
}

describe('llms.txt generation', () => {
  const tempDirs: string[] = []

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

  it('writes both files into the docs output directory', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'slop-llms-'))
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
})
