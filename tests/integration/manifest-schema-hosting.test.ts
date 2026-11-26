/** @vitest-environment node */

import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import Ajv2020 from 'ajv/dist/2020'
import { describe, expect, it } from 'vitest'

// ADR 0006 (GHO-217): the manifest schemas are identified by v1 URLs on the
// docs site because `@ghostvue/core`, which carries the package copies, is
// never published. The docs site serves `docs/public/` verbatim, so the bytes
// a client fetches from each `$id` are exactly the files checked here. Live
// resolution on https://ghostvue.dev is verified after each docs deploy.

const repositoryRoot = process.cwd()

const COMPONENT_SCHEMA_ID =
  'https://ghostvue.dev/schemas/v1/manifest.schema.json'
const COLLECTION_SCHEMA_ID =
  'https://ghostvue.dev/schemas/v1/manifest-collection.schema.json'

/** Canonical schema and every copy that must stay byte-identical to it. */
const schemaCopies = [
  {
    id: COMPONENT_SCHEMA_ID,
    canonical: 'schemas/component-manifest.schema.json',
    copies: [
      'packages/core/manifest.schema.json',
      'docs/public/schemas/v1/manifest.schema.json',
    ],
  },
  {
    id: COLLECTION_SCHEMA_ID,
    canonical: 'schemas/component-manifest-collection.schema.json',
    copies: [
      'packages/core/manifest-collection.schema.json',
      'docs/public/schemas/v1/manifest-collection.schema.json',
    ],
  },
] as const

async function readBytes(path: string): Promise<Buffer> {
  return readFile(join(repositoryRoot, path))
}

function parseObject(bytes: Buffer): Record<string, unknown> {
  const value: unknown = JSON.parse(bytes.toString('utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a JSON object')
  }
  return value as Record<string, unknown>
}

describe('hosted manifest schema URLs', () => {
  it.each(schemaCopies)(
    '$canonical carries $id and every copy is byte-identical',
    async ({ id, canonical, copies }) => {
      const source = await readBytes(canonical)
      expect(parseObject(source)['$id']).toBe(id)
      for (const copy of copies) {
        const bytes = await readBytes(copy)
        expect(bytes.equals(source), `${copy} differs from ${canonical}`).toBe(
          true,
        )
      }
    },
  )

  it.each(schemaCopies)(
    'serves $id from the docs public directory',
    async ({ id }) => {
      const url = new URL(id)
      expect(url.origin).toBe('https://ghostvue.dev')
      // VitePress copies `docs/public/<path>` to `/<path>` unchanged.
      const served = join(repositoryRoot, 'docs/public', url.pathname)
      expect((await stat(served)).isFile()).toBe(true)
    },
  )

  it('keeps distinct ids and resolves the collection $ref to the component schema', async () => {
    const component = parseObject(
      await readBytes('schemas/component-manifest.schema.json'),
    )
    const collection = parseObject(
      await readBytes('schemas/component-manifest-collection.schema.json'),
    )
    expect(component['$id']).not.toBe(collection['$id'])

    const properties = collection.properties as {
      components: { items: { $ref: string } }
    }
    expect(properties.components.items.$ref).toBe(COMPONENT_SCHEMA_ID)

    // Ajv resolves `$ref` by `$id` only, so compiling the collection against
    // the registered component schema proves the reference targets it.
    const ajv = new Ajv2020({ allErrors: true, strict: true })
    ajv.addSchema(component)
    expect(() => ajv.compile(collection)).not.toThrow()
    expect(ajv.getSchema(COMPONENT_SCHEMA_ID)).toBeDefined()
  })

  it('leaves no reference to the retired unpkg @ghostvue/core URLs', async () => {
    for (const { canonical, copies } of schemaCopies) {
      for (const path of [canonical, ...copies]) {
        expect((await readBytes(path)).toString('utf8'), path).not.toContain(
          'unpkg.com/@ghostvue/core',
        )
      }
    }
  })
})
