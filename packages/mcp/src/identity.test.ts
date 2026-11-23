/** @vitest-environment node */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  AssetBundleError,
  loadGhostvueStamp,
  packageStampSources,
} from './identity.js'

const fixtureAssets = new URL('../test/fixtures/assets/', import.meta.url)
const packageJson = new URL('../package.json', import.meta.url)
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

/** Writes a throwaway asset bundle with the given files. */
async function assetsWith(files: Record<string, string>): Promise<URL> {
  const directory = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-assets-'))
  temporaryDirectories.push(directory)
  await Promise.all(
    Object.entries(files).map(([name, text]) =>
      writeFile(join(directory, name), text),
    ),
  )
  return pathToFileURL(`${directory}/`)
}

const validSchema = JSON.stringify({
  $id: 'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
})
const validBundle = JSON.stringify({
  assetBundleId: `sha256:${'c'.repeat(64)}`,
})

describe('loadGhostvueStamp', () => {
  it('reads version, assetBundleId, and manifestSchemaId', async () => {
    await expect(
      loadGhostvueStamp({ assetsDirectory: fixtureAssets, packageJson }),
    ).resolves.toEqual({
      version: '0.0.0',
      assetBundleId: `sha256:${'0'.repeat(64)}`,
      manifestSchemaId:
        'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
    })
  })

  it('resolves default sources inside the package, not the working directory', () => {
    const sources = packageStampSources()
    const packageRoot = new URL('../', import.meta.url).href

    expect(sources.packageJson.href).toBe(`${packageRoot}package.json`)
    expect(sources.assetsDirectory.href.startsWith(packageRoot)).toBe(true)
    expect(sources.assetsDirectory.href.endsWith('/assets/')).toBe(true)
  })

  it('fails when the bundle has not been built', async () => {
    const assetsDirectory = await assetsWith({
      'manifest.schema.json': validSchema,
    })

    await expect(
      loadGhostvueStamp({ assetsDirectory, packageJson }),
    ).rejects.toThrow(
      /Cannot read Asset bundle identity .*Build @ghostvue\/mcp/,
    )
  })

  it.each([
    ['bundle.json', '{', /is not JSON/],
    ['bundle.json', '{"assetBundleId":"md5:abc"}', /is invalid/],
    [
      'manifest.schema.json',
      '{"title":"no id"}',
      /Bundled manifest schema .* is invalid/,
    ],
  ])('rejects a malformed %s', async (file, text, message) => {
    const assetsDirectory = await assetsWith({
      'bundle.json': validBundle,
      'manifest.schema.json': validSchema,
      [file]: text,
    })

    const load = loadGhostvueStamp({ assetsDirectory, packageJson })

    await expect(load).rejects.toBeInstanceOf(AssetBundleError)
    await expect(load).rejects.toThrow(message)
  })
})
