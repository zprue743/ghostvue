/** @vitest-environment node */

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'

import { componentStatuses, createComponentTools } from './components.js'
import { ghostvueStampSchema, type GhostvueStamp } from './contract.js'
import { toolErrorCodes } from './errors.js'
import { createGhostvueServer } from './server.js'
import { type GhostvueTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'c'.repeat(64)}`,
  manifestSchemaId: 'https://ghostvue.dev/schemas/v1/manifest.schema.json',
}

const repositoryRoot = new URL('../../../', import.meta.url)
const fixtureManifests = new URL(
  '../test/fixtures/component-manifests/',
  import.meta.url,
)

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

/**
 * Lays out an asset directory the way the bundler does (`manifest.schema.json`
 * plus `manifests/{vue,themes}/`), using the real manifest schema so fixture
 * validation matches CI.
 */
async function assembleAssets(options: {
  vue: URL
  themes: URL
  extra?: Record<string, string> | undefined
}): Promise<URL> {
  const directory = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-components-'))
  temporaryDirectories.push(directory)
  await cp(
    fileURLToPath(
      new URL('packages/core/manifest.schema.json', repositoryRoot),
    ),
    join(directory, 'manifest.schema.json'),
  )
  await cp(fileURLToPath(options.vue), join(directory, 'manifests/vue'), {
    recursive: true,
  })
  await cp(fileURLToPath(options.themes), join(directory, 'manifests/themes'), {
    recursive: true,
  })
  for (const [path, text] of Object.entries(options.extra ?? {})) {
    await mkdir(join(directory, path, '..'), { recursive: true })
    await writeFile(join(directory, path), text)
  }
  return pathToFileURL(`${directory}/`)
}

function fixtureAssets(extra?: Record<string, string>) {
  return assembleAssets({
    vue: new URL('vue/', fixtureManifests),
    themes: new URL('themes/', fixtureManifests),
    extra,
  })
}

function toolNamed(tools: readonly GhostvueTool[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name)
  if (tool === undefined) throw new Error(`missing tool ${name}`)
  return tool
}

/** One tool set per bundle, so its catalog loads once like in the server. */
const toolSets = new Map<string, readonly GhostvueTool[]>()

async function call(assets: URL, name: string, args: unknown) {
  const logged: string[] = []
  let tools = toolSets.get(assets.href)
  if (tools === undefined) {
    tools = createComponentTools(assets)
    toolSets.set(assets.href, tools)
  }
  const tool = toolNamed(tools, name)
  const result = await tool.call(args, { stamp }, (line) => logged.push(line))
  return { result, logged }
}

const relatedSchema = z.strictObject({
  package: z.string(),
  family: z.string(),
  manifestPath: z.string(),
})

const listPayloadSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  ghostvue: ghostvueStampSchema,
  items: z.array(
    z.strictObject({
      name: z.string(),
      package: z.string(),
      family: z.string(),
      manifestPath: z.string(),
      relatedManifest: relatedSchema.optional(),
      status: z.string(),
      manifestSchemaVersion: z.string(),
      description: z.string(),
      exampleIds: z.array(z.string()),
      spec: z.strictObject({ path: z.string(), status: z.string() }).optional(),
    }),
  ),
  nextCursor: z.string().nullable(),
  totalApprox: z.number(),
})

const getPayloadSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  family: z.string(),
  package: z.string(),
  relatedManifest: relatedSchema.optional(),
  manifest: z.looseObject({ name: z.string(), package: z.string() }),
})

async function list(assets: URL, args: unknown = {}) {
  const { result } = await call(assets, 'list_components', args)
  expect(result.isError).toBeUndefined()
  return listPayloadSchema.parse(result.structuredContent)
}

async function get(assets: URL, args: unknown) {
  const { result } = await call(assets, 'get_component', args)
  expect(result.isError).toBeUndefined()
  return getPayloadSchema.parse(result.structuredContent)
}

function errorOf(result: CallToolResult) {
  expect(result.isError).toBe(true)
  const [first] = result.content
  const text = z
    .object({ type: z.literal('text'), text: z.string() })
    .parse(first)
  return z
    .object({
      code: z.enum(toolErrorCodes),
      message: z.string(),
      data: z.strictObject({
        tool: z.string(),
        ghostvueVersion: z.string(),
        schemaVersion: z.string(),
      }),
    })
    .parse(JSON.parse(text.text))
}

describe('list_components', () => {
  it('lists every manifest by family with vue before themes', async () => {
    const payload = await list(await fixtureAssets())

    expect(
      payload.items.map((item) => `${item.family} ${item.package}`),
    ).toEqual([
      'ghost-badge @ghostvue/vue',
      'ghost-badge @ghostvue/themes',
      'ghost-button @ghostvue/vue',
      'ghost-button @ghostvue/themes',
      'ghost-dialog @ghostvue/vue',
      'ghost-dialog @ghostvue/themes',
      'ghost-legacy-picker @ghostvue/vue',
      'ghost-select-value @ghostvue/vue',
    ])
    expect(payload.totalApprox).toBe(8)
    expect(payload.nextCursor).toBeNull()
    expect(payload.ghostvue).toEqual(stamp)
  })

  it('returns summary rows with identity, pairing, and spec', async () => {
    const payload = await list(await fixtureAssets(), { query: 'ghostbutton' })

    expect(payload.items).toEqual([
      {
        name: 'GhostButton',
        package: '@ghostvue/vue',
        family: 'ghost-button',
        manifestPath: 'manifests/vue/ghost-button.manifest.json',
        relatedManifest: {
          package: '@ghostvue/themes',
          family: 'ghost-button',
          manifestPath: 'manifests/themes/ghost-button.manifest.json',
        },
        status: 'experimental',
        manifestSchemaVersion: '1.0.0',
        description: 'Headless native action control.',
        exampleIds: ['button/basic', 'button/composable'],
        // `evidence` stays in the full manifest; summaries carry path + status.
        spec: { path: 'docs/components/button-spec.md', status: 'approved' },
      },
      {
        name: 'GhostButton',
        package: '@ghostvue/themes',
        family: 'ghost-button',
        manifestPath: 'manifests/themes/ghost-button.manifest.json',
        relatedManifest: {
          package: '@ghostvue/vue',
          family: 'ghost-button',
          manifestPath: 'manifests/vue/ghost-button.manifest.json',
        },
        status: 'experimental',
        manifestSchemaVersion: '1.0.0',
        description: 'Themed wrapper around headless GhostButton.',
        exampleIds: ['button/themed'],
        spec: { path: 'docs/components/button-spec.md', status: 'approved' },
      },
    ])
  })

  it('omits relatedManifest and spec when absent', async () => {
    const payload = await list(await fixtureAssets(), {
      query: 'GhostSelectValue',
    })

    expect(payload.items).toHaveLength(1)
    expect(Object.keys(payload.items[0] ?? {})).not.toContain('relatedManifest')
    expect(Object.keys(payload.items[0] ?? {})).not.toContain('spec')
  })

  it('filters by package', async () => {
    const themes = await list(await fixtureAssets(), {
      package: '@ghostvue/themes',
    })
    const vue = await list(await fixtureAssets(), { package: '@ghostvue/vue' })

    expect(themes.items.map((item) => item.name)).toEqual([
      'GhostBadge',
      'GhostButton',
      'GhostDialog',
    ])
    expect(vue.totalApprox).toBe(5)
    expect(new Set(vue.items.map((item) => item.package))).toEqual(
      new Set(['@ghostvue/vue']),
    )
  })

  it('filters by any of several statuses', async () => {
    const payload = await list(await fixtureAssets(), {
      package: '@ghostvue/vue',
      status: ['beta', 'deprecated'],
    })

    expect(payload.items.map((item) => item.name)).toEqual([
      'GhostDialog',
      'GhostLegacyPicker',
    ])
  })

  it('matches query case-insensitively on name or description', async () => {
    const assets = await fixtureAssets()

    const byName = await list(assets, { query: 'LEGACY' })
    const byDescription = await list(assets, { query: 'Traps FOCUS' })

    expect(byName.items.map((item) => item.name)).toEqual(['GhostLegacyPicker'])
    expect(byDescription.items.map((item) => item.family)).toEqual([
      'ghost-dialog',
    ])
    expect((await list(assets, { query: 'no-such-text' })).items).toEqual([])
  })

  it('pages with an opaque cursor until nextCursor is null', async () => {
    const assets = await fixtureAssets()
    const families: string[] = []
    let cursor: string | undefined
    let pages = 0

    do {
      const payload = await list(assets, {
        limit: 3,
        ...(cursor === undefined ? {} : { cursor }),
      })
      expect(payload.totalApprox).toBe(8)
      families.push(
        ...payload.items.map((item) => `${item.family} ${item.package}`),
      )
      cursor = payload.nextCursor ?? undefined
      pages += 1
    } while (cursor !== undefined)

    expect(pages).toBe(3)
    expect(families).toEqual(
      (await list(assets)).items.map(
        (item) => `${item.family} ${item.package}`,
      ),
    )
  })

  it('rejects a cursor replayed with different filters', async () => {
    const assets = await fixtureAssets()
    const first = await list(assets, { limit: 1 })
    expect(first.nextCursor).toEqual(expect.any(String))

    const { result } = await call(assets, 'list_components', {
      limit: 1,
      package: '@ghostvue/vue',
      cursor: first.nextCursor,
    })

    expect(errorOf(result).code).toBe('INVALID_INPUT')
  })

  it.each([
    [{ package: 'vue' }],
    [{ status: ['retired'] }],
    [{ status: [] }],
    [{ limit: 0 }],
    [{ limit: 501 }],
    [{ limit: 2.5 }],
    [{ cursor: 'not-a-cursor' }],
    [{ unknown: true }],
  ])('rejects %j as INVALID_INPUT', async (args) => {
    const { result } = await call(
      await fixtureAssets(),
      'list_components',
      args,
    )

    expect(errorOf(result)).toMatchObject({
      code: 'INVALID_INPUT',
      data: { tool: 'list_components' },
    })
  })

  it('accepts the limit bounds', async () => {
    const assets = await fixtureAssets()

    expect((await list(assets, { limit: 1 })).items).toHaveLength(1)
    expect((await list(assets, { limit: 500 })).items).toHaveLength(8)
  })

  it('fails with VERSION_MISMATCH before reading the bundle', async () => {
    const missing = pathToFileURL(join(tmpdir(), 'ghostvue-mcp-no-assets/'))
    const { result, logged } = await call(missing, 'list_components', {
      expectedGhostvueVersion: '9.9.9',
    })

    expect(errorOf(result).code).toBe('VERSION_MISMATCH')
    expect(logged).toEqual([])
  })

  it('fails with MANIFEST_INVALID when a manifest in scope is corrupt', async () => {
    const assets = await fixtureAssets({
      'manifests/themes/ghost-broken.manifest.json': '{ "name": "GhostBroken",',
    })

    const { result } = await call(assets, 'list_components', {})
    const vueOnly = await list(assets, { package: '@ghostvue/vue' })

    expect(errorOf(result)).toMatchObject({
      code: 'MANIFEST_INVALID',
      message:
        'Bundled manifest manifests/themes/ghost-broken.manifest.json is not valid JSON.',
    })
    expect(vueOnly.totalApprox).toBe(5)
  })
})

describe('get_component', () => {
  it('returns the headless manifest by default with its themed pair', async () => {
    const assets = await fixtureAssets()
    const payload = await get(assets, { name: 'GhostButton' })
    const source: unknown = JSON.parse(
      await readFile(
        new URL('vue/ghost-button.manifest.json', fixtureManifests),
        'utf8',
      ),
    )

    expect(payload).toMatchObject({
      family: 'ghost-button',
      package: '@ghostvue/vue',
      relatedManifest: {
        package: '@ghostvue/themes',
        family: 'ghost-button',
        manifestPath: 'manifests/themes/ghost-button.manifest.json',
      },
    })
    expect(payload.manifest).toEqual(source)
  })

  it('returns the themed manifest when package is @ghostvue/themes', async () => {
    const payload = await get(await fixtureAssets(), {
      name: 'GhostDialog',
      package: '@ghostvue/themes',
    })

    expect(payload.package).toBe('@ghostvue/themes')
    expect(payload.manifest.package).toBe('@ghostvue/themes')
    expect(payload.relatedManifest?.manifestPath).toBe(
      'manifests/vue/ghost-dialog.manifest.json',
    )
  })

  it('omits relatedManifest for an unpaired manifest', async () => {
    const payload = await get(await fixtureAssets(), {
      name: 'GhostLegacyPicker',
    })

    expect(payload.family).toBe('ghost-legacy-picker')
    expect(Object.keys(payload)).not.toContain('relatedManifest')
  })

  it('fails with NOT_FOUND for an unknown name', async () => {
    const { result } = await call(await fixtureAssets(), 'get_component', {
      name: 'GhostFoo',
    })

    expect(errorOf(result)).toEqual({
      code: 'NOT_FOUND',
      message: 'No manifest for GhostFoo in @ghostvue/vue.',
      data: {
        tool: 'get_component',
        ghostvueVersion: '0.1.0',
        schemaVersion: '1.0.0',
      },
    })
  })

  it('points to the other package when the name only exists there', async () => {
    const { result } = await call(await fixtureAssets(), 'get_component', {
      name: 'GhostSelectValue',
      package: '@ghostvue/themes',
    })

    expect(errorOf(result)).toMatchObject({
      code: 'NOT_FOUND',
      message:
        'No manifest for GhostSelectValue in @ghostvue/themes; it exists in @ghostvue/vue.',
    })
  })

  it.each([
    [{}],
    [{ name: '' }],
    [{ name: 'GhostButton', package: 'all' }],
    [{ name: 42 }],
  ])('rejects %j as INVALID_INPUT', async (args) => {
    const { result } = await call(await fixtureAssets(), 'get_component', args)

    expect(errorOf(result).code).toBe('INVALID_INPUT')
  })

  it('fails with VERSION_MISMATCH', async () => {
    const { result } = await call(await fixtureAssets(), 'get_component', {
      name: 'GhostButton',
      expectedGhostvueVersion: '0.0.1',
    })

    expect(errorOf(result).code).toBe('VERSION_MISMATCH')
  })

  it('fails with MANIFEST_INVALID when the manifest fails the bundled schema', async () => {
    const badge = z
      .looseObject({})
      .parse(
        JSON.parse(
          await readFile(
            new URL('vue/ghost-badge.manifest.json', fixtureManifests),
            'utf8',
          ),
        ),
      )
    const invalid = {
      ...badge,
      name: 'GhostBroken',
      status: 'retired',
    }
    const assets = await fixtureAssets({
      'manifests/vue/ghost-broken.manifest.json': JSON.stringify(invalid),
    })

    const { result } = await call(assets, 'get_component', {
      name: 'GhostBroken',
    })
    const healthy = await get(assets, { name: 'GhostBadge' })

    expect(errorOf(result)).toMatchObject({ code: 'MANIFEST_INVALID' })
    expect(errorOf(result).message).toMatch(
      /^Bundled manifest manifests\/vue\/ghost-broken\.manifest\.json fails manifest\.schema\.json: .*status/,
    )
    expect(healthy.manifest.name).toBe('GhostBadge')
  })

  it('rejects a manifest bundled under the wrong package', async () => {
    const themed = await readFile(
      new URL('themes/ghost-badge.manifest.json', fixtureManifests),
      'utf8',
    )
    const assets = await fixtureAssets({
      'manifests/vue/ghost-misfiled.manifest.json': themed.replace(
        'GhostBadge',
        'GhostMisfiled',
      ),
    })

    const { result } = await call(assets, 'get_component', {
      name: 'GhostMisfiled',
    })

    expect(errorOf(result)).toMatchObject({
      code: 'MANIFEST_INVALID',
      message:
        'Bundled manifest manifests/vue/ghost-misfiled.manifest.json declares package @ghostvue/themes.',
    })
  })

  it('rejects two manifests that claim the same name in one package', async () => {
    const badge = await readFile(
      new URL('vue/ghost-badge.manifest.json', fixtureManifests),
      'utf8',
    )
    const assets = await fixtureAssets({
      'manifests/vue/ghost-badge-copy.manifest.json': badge,
    })

    const { result } = await call(assets, 'get_component', {
      name: 'GhostBadge',
    })

    expect(errorOf(result).code).toBe('MANIFEST_INVALID')
    expect(errorOf(result).message).toContain('shares the name GhostBadge')
  })

  it('reports a missing bundle as a sanitized INTERNAL error', async () => {
    const missing = pathToFileURL(join(tmpdir(), 'ghostvue-mcp-no-assets/'))
    const { result, logged } = await call(missing, 'get_component', {
      name: 'GhostButton',
    })

    expect(errorOf(result).code).toBe('INTERNAL')
    expect(errorOf(result).message).not.toContain('ghostvue-mcp-no-assets')
    expect(logged.join('\n')).toContain('ENOENT')
  })
})

describe('component tools over MCP', () => {
  it('serve structuredContent that passes the advertised outputSchema', async () => {
    const tools = createComponentTools(await fixtureAssets())
    const server = createGhostvueServer({ stamp, tools, log: () => undefined })
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    try {
      const { tools: listed } = await client.listTools()
      // The SDK client validates structuredContent against each tool's
      // outputSchema and throws on a mismatch.
      const firstPage = await client.callTool({
        name: 'list_components',
        arguments: { limit: 2 },
      })
      const button = await client.callTool({
        name: 'get_component',
        arguments: { name: 'GhostButton' },
      })

      expect(listed.map((tool) => tool.name)).toEqual([
        'list_components',
        'get_component',
      ])
      expect(listed[0]?.inputSchema.properties).toHaveProperty('limit', {
        type: 'integer',
        minimum: 1,
        maximum: 500,
        default: 200,
        description: 'Max rows returned.',
      })
      expect(listed[1]?.inputSchema.required).toEqual(['name'])
      expect(firstPage.isError).toBeUndefined()
      expect(button.isError).toBeUndefined()
    } finally {
      await client.close()
    }
  })
})

describe('component manifest contract', () => {
  it('keeps the status filter enum equal to the manifest schema', async () => {
    const schema = z
      .object({
        properties: z.object({
          status: z.object({ enum: z.array(z.string()) }),
        }),
      })
      .parse(
        JSON.parse(
          await readFile(
            new URL('packages/core/manifest.schema.json', repositoryRoot),
            'utf8',
          ),
        ),
      )

    expect([...componentStatuses]).toEqual(schema.properties.status.enum)
  })

  it('serves every repository manifest and pairs every themed one', async () => {
    const assets = await assembleAssets({
      vue: new URL('packages/vue/manifests/', repositoryRoot),
      themes: new URL('packages/themes/manifests/', repositoryRoot),
    })

    const payload = await list(assets, { limit: 500 })
    const themed = payload.items.filter(
      (item) => item.package === '@ghostvue/themes',
    )

    expect(payload.nextCursor).toBeNull()
    expect(themed.length).toBeGreaterThan(0)
    for (const item of themed) {
      expect(item.relatedManifest, item.family).toEqual({
        package: '@ghostvue/vue',
        family: item.family,
        manifestPath: `manifests/vue/${item.family}.manifest.json`,
      })
    }
    for (const item of payload.items) {
      const component = await get(assets, {
        name: item.name,
        package: item.package,
      })
      expect(component.family).toBe(item.family)
    }
  })
})
