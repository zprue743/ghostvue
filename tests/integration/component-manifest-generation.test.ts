import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildDerivedContract,
  createMetaChecker,
  eventPayloadType,
  extractComponentMeta,
  mergeManifest,
  normalizeType,
  parseDefaultValue,
  pascalToKebab,
  resetMetaCheckers,
  serializeManifest,
  syncRepositoryManifests,
  type DerivedContract,
} from '../../scripts/lib/component-manifests.js'

const repositoryRoot = process.cwd()
const fixtureRoot = join(
  repositoryRoot,
  'tests/fixtures/component-manifests/sfc',
)
const widgetPath = join(fixtureRoot, 'src/SlWidget.vue')
const fixtureTsconfig = join(fixtureRoot, 'tsconfig.json')

const prose = {
  schemaVersion: '1.0.0',
  source: 'handwritten',
  name: 'SlWidget',
  package: '@slop-ui/vue',
  status: 'beta',
  description: 'Hand-authored widget summary.',
  props: [
    {
      name: 'disabled',
      type: 'string',
      required: false,
      description: 'Hand-authored disabled prose.',
      deprecated: true,
    },
  ],
  models: [
    {
      prop: 'open',
      event: 'update:open',
      type: 'string',
      description: 'Hand-authored model prose.',
    },
  ],
  events: [
    {
      name: 'close',
      payloadType: 'number',
      description: 'Hand-authored close prose.',
    },
  ],
  slots: [
    {
      name: 'default',
      props: [
        {
          name: 'open',
          type: 'string',
          description: 'Hand-authored slot prop prose.',
        },
      ],
      description: 'Hand-authored default slot prose.',
    },
  ],
  exposed: [
    {
      name: 'element',
      kind: 'method',
      type: 'string',
      description: 'Hand-authored expose prose.',
    },
  ],
  styling: {
    parts: [{ name: 'root', description: 'Widget root.' }],
    states: [{ name: 'open', description: 'Expanded.' }],
    cssProperties: [
      {
        name: '--sl-widget-gap',
        description: 'Space between parts.',
      },
    ],
  },
  accessibility: {
    role: 'group',
    apgPattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
    keyboard: {
      Enter: 'Toggle open.',
    },
    requiredAriaAttributes: ['aria-expanded'],
  },
  examples: ['widget-basic'],
}

function parseJsonObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a JSON object')
  }
  return value
}

function asPropList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('expected a JSON array')
  }
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

async function fixturePackages(manifestsDir: string) {
  await mkdir(manifestsDir, { recursive: true })
  return [
    {
      directory: 'vue',
      name: '@slop-ui/vue' as const,
      srcDir: join(fixtureRoot, 'src'),
      manifestsDir,
      tsconfig: fixtureTsconfig,
    },
  ]
}

function derivedFromWidget() {
  const checker = createMetaChecker(fixtureTsconfig)
  const meta = extractComponentMeta(checker, widgetPath)
  return buildDerivedContract(meta, {
    name: 'SlWidget',
    packageName: '@slop-ui/vue',
  })
}

afterEach(() => {
  resetMetaCheckers()
})

describe('manifest derivation helpers', () => {
  it('converts Sl* names to kebab-case manifest filenames', () => {
    expect(pascalToKebab('SlButton')).toBe('sl-button')
    expect(pascalToKebab('SlVisuallyHidden')).toBe('sl-visually-hidden')
    expect(pascalToKebab('SlDialogTrigger')).toBe('sl-dialog-trigger')
  })

  it('normalizes vue-component-meta optional types and quote style', () => {
    expect(
      normalizeType('"button" | "submit" | undefined', { optional: true }),
    ).toBe("'button' | 'submit'")
    expect(
      normalizeType('(options?: FocusOptions | undefined) => void', {
        optional: true,
      }),
    ).toBe('(options?: FocusOptions) => void')
  })

  it('parses literal defaults into JSON schema values', () => {
    expect(parseDefaultValue('"button"')).toEqual({
      present: true,
      value: 'button',
    })
    expect(parseDefaultValue('false')).toEqual({ present: true, value: false })
    expect(parseDefaultValue('undefined')).toEqual({ present: false })
    expect(parseDefaultValue(undefined)).toEqual({ present: false })
  })

  it('maps emit tuples onto payload types', () => {
    expect(eventPayloadType('[]')).toBe('void')
    expect(eventPayloadType('[value: boolean]')).toBe('boolean')
    expect(eventPayloadType('[id: string, count: number]')).toBe(
      '[string, number]',
    )
  })
})

describe('vue-component-meta extraction', () => {
  it('extracts props, models, events, slots, and exposed members', () => {
    const { derived, violations } = derivedFromWidget()
    expect(violations).toEqual([])
    expect(derived.name).toBe('SlWidget')
    expect(derived.package).toBe('@slop-ui/vue')
    expect(derived.source).toBe('generated')

    expect(derived.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'disabled',
          type: 'boolean',
          default: false,
          required: false,
          deprecated: false,
        }),
        expect.objectContaining({
          name: 'variant',
          type: "'one' | 'two'",
          default: 'one',
          required: false,
        }),
        expect.objectContaining({
          name: 'count',
          type: 'number',
          required: true,
        }),
        expect.objectContaining({
          name: 'open',
          type: 'boolean',
          required: false,
        }),
      ]),
    )
    expect(derived.props.some((prop) => prop.name === 'class')).toBe(false)
    expect(derived.props.some((prop) => prop.name === 'key')).toBe(false)

    expect(derived.models).toEqual([
      expect.objectContaining({
        prop: 'open',
        event: 'update:open',
        type: 'boolean',
      }),
    ])
    expect(derived.events.map((event) => event.name).sort()).toEqual([
      'close',
      'select',
    ])
    expect(derived.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'close', payloadType: 'void' }),
        expect.objectContaining({ name: 'select', payloadType: 'string' }),
      ]),
    )

    const defaultSlot = derived.slots.find((slot) => slot.name === 'default')
    const iconSlot = derived.slots.find((slot) => slot.name === 'icon')
    expect(defaultSlot?.props).toEqual([
      expect.objectContaining({ name: 'open', type: 'boolean' }),
    ])
    expect(iconSlot?.props).toEqual([])

    expect(derived.exposed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'element',
          kind: 'property',
          type: 'HTMLDivElement | null',
        }),
        expect.objectContaining({
          name: 'focus',
          kind: 'method',
        }),
      ]),
    )
  })
})

describe('hand-authored field preservation', () => {
  it('keeps prose, styling, accessibility, and examples while refreshing types', () => {
    const { derived } = derivedFromWidget()
    const merged = mergeManifest(derived, prose)

    expect(merged.source).toBe('generated')
    expect(merged.status).toBe('beta')
    expect(merged.description).toBe('Hand-authored widget summary.')
    expect(merged.examples).toEqual(['widget-basic'])
    expect(merged.styling).toEqual(prose.styling)
    expect(merged.accessibility).toEqual(prose.accessibility)

    const disabled = merged.props.find((prop) => prop.name === 'disabled')
    expect(disabled).toMatchObject({
      type: 'boolean',
      default: false,
      deprecated: false,
      description: 'Hand-authored disabled prose.',
    })

    const openModel = merged.models.find((model) => model.prop === 'open')
    expect(openModel).toMatchObject({
      type: 'boolean',
      description: 'Hand-authored model prose.',
    })

    const close = merged.events.find((event) => event.name === 'close')
    expect(close).toMatchObject({
      payloadType: 'void',
      description: 'Hand-authored close prose.',
    })

    const defaultSlot = merged.slots.find((slot) => slot.name === 'default')
    expect(defaultSlot?.description).toBe('Hand-authored default slot prose.')
    expect(defaultSlot?.props).toEqual([
      expect.objectContaining({
        name: 'open',
        type: 'boolean',
        description: 'Hand-authored slot prop prose.',
      }),
    ])

    const element = merged.exposed.find((member) => member.name === 'element')
    expect(element).toMatchObject({
      kind: 'property',
      type: 'HTMLDivElement | null',
      description: 'Hand-authored expose prose.',
    })
  })

  it('uses JSDoc when a member has no existing prose', () => {
    const { derived } = derivedFromWidget()
    const merged = mergeManifest(derived, null)
    const disabled = merged.props.find((prop) => prop.name === 'disabled')
    expect(disabled?.description).toBe('Prevents activation.')
    expect(merged.description).toBe('Public SlWidget component.')
    expect(merged.status).toBe('experimental')
  })
})

describe('manifest sync check and write', () => {
  it('fails check when a generated manifest is stale versus the SFC', async () => {
    const manifestsDir = await mkdtemp(join(tmpdir(), 'slop-manifests-'))
    const packages = await fixturePackages(manifestsDir)

    const written = await syncRepositoryManifests({
      repositoryRoot,
      write: true,
      packages,
    })
    expect(written.ok).toBe(true)
    expect(written.written).toEqual([
      'packages/vue/manifests/sl-widget.manifest.json',
    ])

    const manifestPath = join(manifestsDir, 'sl-widget.manifest.json')
    const fresh = parseJsonObject(await readFile(manifestPath, 'utf8'))
    const staleProps = asPropList(fresh.props).map((prop) =>
      prop.name === 'count' ? { ...prop, type: 'string' } : prop,
    )
    await writeFile(
      manifestPath,
      serializeManifest({ ...fresh, props: staleProps }),
    )

    const check = await syncRepositoryManifests({
      repositoryRoot,
      write: false,
      packages,
    })
    expect(check.ok).toBe(false)
    expect(check.violations.some((item) => item.includes('stale'))).toBe(true)
  })

  it('rewrites machine fields without dropping later hand-authored edits', async () => {
    const manifestsDir = await mkdtemp(join(tmpdir(), 'slop-manifests-'))
    const packages = await fixturePackages(manifestsDir)

    await syncRepositoryManifests({
      repositoryRoot,
      write: true,
      packages,
    })

    const manifestPath = join(manifestsDir, 'sl-widget.manifest.json')
    const generated = parseJsonObject(await readFile(manifestPath, 'utf8'))
    generated.description = 'Edited after the first write.'
    generated.examples = ['widget-basic', 'widget-disabled']
    await writeFile(manifestPath, serializeManifest(generated))

    const again = await syncRepositoryManifests({
      repositoryRoot,
      write: true,
      packages,
    })
    expect(again.ok).toBe(true)

    const refreshed = parseJsonObject(await readFile(manifestPath, 'utf8'))
    expect(refreshed.description).toBe('Edited after the first write.')
    expect(refreshed.examples).toEqual(['widget-basic', 'widget-disabled'])
    expect(refreshed.source).toBe('generated')

    const check = await syncRepositoryManifests({
      repositoryRoot,
      write: false,
      packages,
    })
    expect(check.ok).toBe(true)
  })

  it('allows leftover handwritten manifests when no matching SFC exists', async () => {
    const manifestsDir = await mkdtemp(join(tmpdir(), 'slop-manifests-'))
    const packages = await fixturePackages(manifestsDir)
    await writeFile(
      join(manifestsDir, 'sl-button.manifest.json'),
      serializeManifest({
        ...prose,
        name: 'SlButton',
        source: 'handwritten',
        description: 'Legacy handwritten contract.',
      }),
    )

    const result = await syncRepositoryManifests({
      repositoryRoot,
      write: true,
      packages,
    })
    expect(result.ok).toBe(true)

    const leftover = parseJsonObject(
      await readFile(join(manifestsDir, 'sl-button.manifest.json'), 'utf8'),
    )
    expect(leftover.source).toBe('handwritten')
  })

  it('fails when a generated manifest has no matching SFC', async () => {
    const manifestsDir = await mkdtemp(join(tmpdir(), 'slop-manifests-'))
    const packages = [
      {
        directory: 'vue',
        name: '@slop-ui/vue' as const,
        srcDir: join(manifestsDir, 'empty-src'),
        manifestsDir,
        tsconfig: fixtureTsconfig,
      },
    ]
    await mkdir(join(manifestsDir, 'empty-src'), { recursive: true })
    await writeFile(
      join(manifestsDir, 'sl-gone.manifest.json'),
      serializeManifest({
        ...prose,
        name: 'SlGone',
        source: 'generated',
      }),
    )

    const result = await syncRepositoryManifests({
      repositoryRoot,
      write: false,
      packages,
    })
    expect(result.ok).toBe(false)
    expect(
      result.violations.some((item) => item.includes('no matching Sl*.vue')),
    ).toBe(true)
  })
})

describe('repository manifests check', () => {
  it('passes on the current repository (handwritten leftover, no Sl*.vue yet)', async () => {
    const result = await syncRepositoryManifests({
      repositoryRoot,
      write: false,
    })
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })
})

describe('mergeManifest derived contract', () => {
  it('serializes a stable JSON document', () => {
    const derived: DerivedContract = {
      schemaVersion: '1.0.0',
      source: 'generated',
      name: 'SlWidget',
      package: '@slop-ui/vue',
      description: '',
      props: [],
      models: [],
      events: [],
      slots: [],
      exposed: [],
    }
    const merged = mergeManifest(derived, prose)
    expect(serializeManifest(merged)).toContain('"source": "generated"')
  })
})
