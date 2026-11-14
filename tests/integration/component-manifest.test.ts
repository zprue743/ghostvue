import { glob, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import Ajv2020 from 'ajv/dist/2020'
import { describe, expect, it } from 'vitest'

import { validateManifestSchemas } from '../../scripts/lib/component-manifests.js'

const repositoryRoot = process.cwd()
const schemaPath = resolve(
  repositoryRoot,
  'schemas/component-manifest.schema.json',
)
const publishedSchemaPath = resolve(
  repositoryRoot,
  'packages/core/manifest.schema.json',
)
const invalidFixtureGlob = 'tests/fixtures/component-manifests/invalid/*.json'

async function readJsonObject(path: string): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object`)
  }
  return value
}

async function listFiles(pattern: string): Promise<string[]> {
  const files: string[] = []
  for await (const file of glob(pattern, {
    cwd: repositoryRoot,
    exclude: (name) => name === 'node_modules' || name === 'dist',
  })) {
    files.push(file)
  }
  return files.sort()
}

describe('component manifest schema', () => {
  it('compiles as JSON Schema 2020-12 and matches the published core export', async () => {
    const schema = await readJsonObject(schemaPath)
    const published = await readFile(publishedSchemaPath, 'utf8')
    const canonical = await readFile(schemaPath, 'utf8')

    expect(schema['$schema']).toBe(
      'https://json-schema.org/draft/2020-12/schema',
    )
    expect(published).toBe(canonical)

    const ajv = new Ajv2020({ allErrors: true, strict: true })
    expect(() => ajv.compile(schema)).not.toThrow()
  })

  it('accepts every repository *.manifest.json', async () => {
    const manifests = await listFiles('**/*.manifest.json')
    expect(manifests.length).toBeGreaterThan(0)
    expect(await validateManifestSchemas(repositoryRoot, manifests)).toEqual([])
  })

  it('rejects invalid fixtures that are not named *.manifest.json', async () => {
    const schema = await readJsonObject(schemaPath)
    const ajv = new Ajv2020({ allErrors: true, strict: true })
    const validate = ajv.compile(schema)
    const fixtures = await listFiles(invalidFixtureGlob)

    // Invalid samples live outside *.manifest.json so the repo-wide scan
    // cannot treat a deliberate failure case as a published component contract.
    expect(fixtures.length).toBeGreaterThanOrEqual(2)

    for (const relativePath of fixtures) {
      const fixture = await readJsonObject(
        resolve(repositoryRoot, relativePath),
      )
      expect(
        validate(fixture),
        `${relativePath} should fail schema validation`,
      ).toBe(false)
      expect(validate.errors?.length).toBeGreaterThan(0)
    }
  })
})
