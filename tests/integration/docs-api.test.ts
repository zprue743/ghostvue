/** @vitest-environment node */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { builtInTools } from '../../packages/mcp/src/cli.js'
import { toolContractSchemaVersion } from '../../packages/mcp/src/contract.js'
import {
  beginMarker,
  endMarker,
  extractMcpTools,
  extractToolContractSchemaVersion,
  findGeneratedBlocks,
  findHandwrittenApiTables,
  MCP_CONTRACT_PATH,
  MCP_SOURCE_DIRECTORY,
  renderComponentApi,
  renderMcpTools,
  syncDocsApi,
  type DocsApiManifest,
} from '../../scripts/lib/docs-api.js'

// Issue #324: hand-written docs pages embed API tables generated from the
// component manifests and the MCP tool definitions; `pnpm docs:api` fails
// when they drift and `pnpm docs:api:write` regenerates them.

const headless: DocsApiManifest = {
  name: 'GhostWidget',
  package: '@ghostvue/vue',
  props: [
    {
      name: 'size',
      type: "'sm' | 'md'",
      default: 'md',
      required: false,
      description: 'Control size; see `data-size`.',
      deprecated: false,
    },
    {
      name: 'label',
      type: 'string',
      required: true,
      description: 'Accessible <name>.',
      deprecated: false,
    },
    {
      name: 'legacy',
      type: 'boolean',
      default: false,
      required: false,
      description: 'Old switch.',
      deprecated: true,
    },
  ],
  events: [
    { name: 'change', payloadType: 'string', description: 'New value.' },
  ],
  slots: [
    {
      name: 'default',
      props: [{ name: 'open', type: 'boolean', description: 'Open state.' }],
      description: 'Content.',
    },
  ],
}

const themed: DocsApiManifest = {
  ...headless,
  package: '@ghostvue/themes',
  props: [
    ...headless.props,
    {
      name: 'tone',
      type: "'accent' | 'danger'",
      default: 'accent',
      required: false,
      description: 'Color intent.',
      deprecated: false,
    },
  ],
}

describe('renderComponentApi', () => {
  it('renders props, events, and slots as Markdown tables with escaped pipes', () => {
    const markdown = renderComponentApi(headless, {
      sourcePath: 'packages/vue/manifests/ghost-widget.manifest.json',
    })
    expect(markdown).toContain(
      '<!-- Source: packages/vue/manifests/ghost-widget.manifest.json.',
    )
    expect(markdown).toContain(
      "| `size` | `'sm' \\| 'md'` | `\"md\"` | Control size; see `data-size`. |",
    )
    expect(markdown).toContain(
      '| `label` | `string` | Required | Accessible &lt;name&gt;. |',
    )
    expect(markdown).toContain('**Deprecated.** Old switch.')
    expect(markdown).toContain('| `change` | `string` | New value. |')
    expect(markdown).toContain('| `default` | `open: boolean` | Content. |')
  })

  it('falls back to entity escaping for Vue interpolation and stray backticks', () => {
    const markdown = renderComponentApi(
      {
        ...headless,
        props: [
          {
            name: 'label',
            type: 'string',
            default: '`Row ${id}`',
            required: false,
            description: 'Shows {{ label }} and an odd ` tick.',
            deprecated: false,
          },
        ],
        events: [],
        slots: [],
      },
      { sourcePath: 'x.json' },
    )
    expect(markdown).not.toContain('{{')
    expect(markdown).toContain('&#123;&#123; label &#125;&#125;')
    expect(markdown).toContain('<code>"&#96;Row')
  })

  it('lists only what a themed wrapper adds to its headless pair', () => {
    const markdown = renderComponentApi(themed, {
      sourcePath: 'packages/themes/manifests/ghost-widget.manifest.json',
      headless,
    })
    expect(markdown).toContain(
      '`@ghostvue/themes` adds these to the headless `GhostWidget` API',
    )
    expect(markdown).toContain('| `tone` |')
    expect(markdown).not.toContain('| `size` |')
    expect(markdown).not.toContain('| Event |')
    expect(markdown).not.toContain('| Slot |')

    expect(
      renderComponentApi(headless, { sourcePath: 'x.json', headless }),
    ).toContain('adds no props, events, or slots')
  })

  it('says so when a manifest declares nothing', () => {
    expect(
      renderComponentApi(
        { ...headless, props: [], events: [], slots: [] },
        { sourcePath: 'x.json' },
      ),
    ).toContain('No props, events, or slots.')
  })
})

describe('MCP tool extraction', () => {
  it('matches the tools the server actually registers', async () => {
    const root = process.cwd()
    const files = [
      'components.ts',
      'get-examples.ts',
      'get-tokens.ts',
      'search-docs.ts',
    ]
    const tools = (
      await Promise.all(
        files.map(async (file) =>
          extractMcpTools(
            await readFile(join(root, MCP_SOURCE_DIRECTORY, file), 'utf8'),
            file,
          ),
        ),
      )
    ).flat()

    expect(tools.map((tool) => tool.name).sort()).toEqual(
      builtInTools.map((tool) => tool.name).sort(),
    )
    for (const tool of builtInTools) {
      const extracted = tools.find(({ name }) => name === tool.name)
      expect(extracted?.title).toBe(tool.descriptor.title)
      expect(extracted?.description).toBe(tool.descriptor.description)
      expect(
        [...(extracted?.inputs ?? []), 'expectedGhostvueVersion'].sort(),
      ).toEqual(
        Object.keys(tool.descriptor.inputSchema.properties ?? {}).sort(),
      )
    }

    expect(
      extractToolContractSchemaVersion(
        await readFile(join(root, MCP_CONTRACT_PATH), 'utf8'),
      ),
    ).toBe(toolContractSchemaVersion)
  })

  it('rejects descriptors it cannot document statically', () => {
    expect(() =>
      extractMcpTools(
        "defineTool({ name: 'x', title, description: 'd', input: {} })",
        'tool.ts',
      ),
    ).toThrow('tool.ts:1: defineTool title must be a string literal')
    expect(() =>
      extractMcpTools(
        "defineTool({ name: 'x', title: 't', description: 'd', input })",
        'tool.ts',
      ),
    ).toThrow('defineTool input must be an object literal')
  })

  it('renders tools sorted by name with the shared version input', () => {
    const markdown = renderMcpTools(
      [
        { name: 'search_x', title: 'Search', description: 'S.', inputs: [] },
        {
          name: 'get_x',
          title: 'Get',
          description: 'G.',
          inputs: ['id', 'limit'],
        },
      ],
      { schemaVersion: '9.9.9' },
    )
    expect(markdown.indexOf('`get_x`')).toBeLessThan(
      markdown.indexOf('`search_x`'),
    )
    expect(markdown).toContain('| `get_x` | Get | `id`, `limit` | G. |')
    expect(markdown).toContain('| `search_x` | Search | — | S. |')
    expect(markdown).toContain('`expectedGhostvueVersion`')
    expect(markdown).toContain('`schemaVersion` `9.9.9`')
  })
})

describe('generated block parsing', () => {
  it('reports unpaired, nested, and duplicated markers', () => {
    const source = [
      beginMarker('vue/a'),
      beginMarker('vue/b'),
      endMarker('vue/a'),
      endMarker('vue/c'),
      beginMarker('vue/a'),
      endMarker('vue/a'),
      beginMarker('vue/d'),
    ].join('\n')
    expect(findGeneratedBlocks(source, 'page.md').violations).toEqual([
      'page.md: docs-api:vue/b begins before docs-api:vue/a ends',
      'page.md: docs-api:vue/c end has no matching begin',
      'page.md: docs-api:vue/a appears more than once',
      'page.md: docs-api:vue/d begin has no end',
    ])
  })

  it('flags hand-written API tables outside generated blocks only', () => {
    const source = [
      '| Prop | Type | Default | Description |',
      '',
      beginMarker('vue/a'),
      '| Prop | Type | Default | Description |',
      endMarker('vue/a'),
      '',
      '```md',
      '| Slot | Description |',
      '```',
      '| Event | Payload | Description |',
      '| Prop (provider) | Default | Contract |',
    ].join('\n')
    const { blocks } = findGeneratedBlocks(source, 'page.md')
    expect(findHandwrittenApiTables(source, blocks, 'page.md')).toEqual([
      expect.stringMatching(/^page\.md:1: hand-written API table/),
      expect.stringMatching(/^page\.md:10: hand-written API table/),
    ])
  })
})

describe('syncDocsApi', () => {
  let root: string

  const put = async (path: string, content: string) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }

  const widgetPage = (vueBody: string, themesBody: string) =>
    [
      '# GhostWidget',
      '',
      '## API',
      '',
      beginMarker('vue/ghost-widget'),
      vueBody,
      endMarker('vue/ghost-widget'),
      '',
      beginMarker('themes/ghost-widget'),
      themesBody,
      endMarker('themes/ghost-widget'),
      '',
    ].join('\n')

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ghostvue-docs-api-'))
    await put(
      'packages/vue/manifests/ghost-widget.manifest.json',
      JSON.stringify(headless),
    )
    await put(
      'packages/themes/manifests/ghost-widget.manifest.json',
      JSON.stringify(themed),
    )
    await put('docs/components/widget.md', widgetPage('stale', 'stale'))
    await put('docs/components/widget-spec.md', '# Spec\n')
    await put('docs/components/index.md', '# Components\n')
    await put(
      'packages/mcp/src/contract.ts',
      "export const toolContractSchemaVersion = '1.0.0'\n",
    )
    await put(
      'packages/mcp/src/thing.ts',
      "export const t = defineTool({ name: 'get_thing', title: 'Get thing', description: 'Gets it.', input: { id: z.string() } })\n",
    )
    await put(
      'packages/mcp/src/thing.test.ts',
      "defineTool({ name: 'test_only', title: 'T', description: 'T', input: {} })\n",
    )
    await put(
      'docs/tooling/mcp-server.md',
      `# MCP\n\n${beginMarker('mcp-tools')}\n${endMarker('mcp-tools')}\n`,
    )
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('fails the check on stale tables, then writes them so the check passes', async () => {
    const stale = await syncDocsApi({ repositoryRoot: root, write: false })
    expect(stale.violations).toEqual([
      'docs/components/widget.md: generated API tables are stale',
      'docs/tooling/mcp-server.md: generated API tables are stale',
    ])

    const written = await syncDocsApi({ repositoryRoot: root, write: true })
    expect(written.violations).toEqual([])
    expect(written.written).toEqual([
      'docs/components/widget.md',
      'docs/tooling/mcp-server.md',
    ])

    const page = await readFile(join(root, 'docs/components/widget.md'), 'utf8')
    expect(page).toMatch(/\| `label` +\| `string` +\| Required/)
    expect(page).toMatch(/\| `tone` +\|/)
    expect(page).not.toContain('stale')
    const mcp = await readFile(join(root, 'docs/tooling/mcp-server.md'), 'utf8')
    expect(mcp).toContain('`get_thing`')
    expect(mcp).not.toContain('test_only')

    const clean = await syncDocsApi({ repositoryRoot: root, write: false })
    expect(clean.violations).toEqual([])
    expect(clean.checked).toHaveLength(2)

    // A renamed prop makes the committed table stale again.
    await put(
      'packages/vue/manifests/ghost-widget.manifest.json',
      JSON.stringify({
        ...headless,
        props: headless.props.map((prop) =>
          prop.name === 'label' ? { ...prop, name: 'text' } : prop,
        ),
      }),
    )
    expect(
      (await syncDocsApi({ repositoryRoot: root, write: false })).violations,
    ).toEqual(['docs/components/widget.md: generated API tables are stale'])
  })

  it('requires both component blocks and rejects unknown manifests and hand-written tables', async () => {
    await put(
      'docs/components/widget.md',
      [
        '# GhostWidget',
        '',
        beginMarker('vue/ghost-gone'),
        endMarker('vue/ghost-gone'),
        '',
        '| Prop | Type | Default | Description |',
        '| ---- | ---- | ------- | ----------- |',
        '',
      ].join('\n'),
    )
    const result = await syncDocsApi({ repositoryRoot: root, write: true })
    expect(result.violations).toEqual([
      `docs/components/widget.md: missing ${beginMarker('vue/ghost-widget')} … ${endMarker('vue/ghost-widget')} block`,
      `docs/components/widget.md: missing ${beginMarker('themes/ghost-widget')} … ${endMarker('themes/ghost-widget')} block`,
      'docs/components/widget.md: docs-api:vue/ghost-gone names no known manifest or tool list',
      'docs/components/widget.md:6: hand-written API table; replace it with a <!-- @generated docs-api:… --> block',
    ])
    expect(result.written).not.toContain('docs/components/widget.md')
  })

  it('keeps the repository docs in sync with manifests and MCP tools', async () => {
    const result = await syncDocsApi({
      repositoryRoot: process.cwd(),
      write: false,
    })
    expect(result.violations).toEqual([])
  })
})
