import { readFile } from 'node:fs/promises'

import * as z from 'zod'

import { type GhostvueStamp } from './contract.js'

/**
 * Bundle identity file, written by the offline asset bundler (GHO-226) next
 * to the other bundled assets. It holds the `assetBundleId` hash the bundler
 * computes over every bundled byte; the server only reads it.
 */
export const assetBundleIdentityFile = 'bundle.json'

/** Bundled copy of `@ghostvue/core/manifest.schema.json` (GHO-17 plan §4). */
export const manifestSchemaFile = 'manifest.schema.json'

/**
 * `$id` of the component manifest schema this server speaks (ADR 0006). It is
 * hosted at this URL on the docs site because `@ghostvue/core`, which carries
 * the source copy, is never published. The bundled schema must carry exactly
 * this `$id`, so the `manifestSchemaId` stamp cannot drift from the URL that
 * clients resolve.
 */
export const manifestSchemaId =
  'https://ghostvue.dev/schemas/v1/manifest.schema.json'

/** Where the identity of a server process comes from. */
export interface StampSources {
  /** Directory holding the bundled assets, with a trailing slash. */
  readonly assetsDirectory: URL
  /** The `@ghostvue/mcp` `package.json` that names the served version. */
  readonly packageJson: URL
}

/**
 * The package's own asset bundle and `package.json`.
 *
 * Both resolve relative to this module, so the published server reads only
 * from its install directory (`dist/assets/` and the package root) and never
 * from the working directory, the environment, or arguments (GHO-17 plan §2).
 */
export function packageStampSources(): StampSources {
  return {
    assetsDirectory: new URL('./assets/', import.meta.url),
    packageJson: new URL('../package.json', import.meta.url),
  }
}

/** The bundle or package metadata is missing or malformed. */
export class AssetBundleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AssetBundleError'
  }
}

const packageJsonSchema = z.looseObject({ version: z.string().min(1) })

const bundleIdentitySchema = z.looseObject({
  assetBundleId: z.string().regex(/^sha256:[0-9a-f]{64}$/),
})

const manifestSchemaIdSchema = z.looseObject({
  $id: z.literal(manifestSchemaId),
})

async function readJson<Output>(
  file: URL,
  schema: z.ZodType<Output>,
  label: string,
): Promise<Output> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    throw new AssetBundleError(
      `Cannot read ${label} at ${file.pathname}. Build @ghostvue/mcp so its asset bundle exists.`,
      { cause: error },
    )
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    throw new AssetBundleError(`${label} at ${file.pathname} is not JSON.`, {
      cause: error,
    })
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new AssetBundleError(
      `${label} at ${file.pathname} is invalid: ${z.prettifyError(parsed.error)}`,
    )
  }
  return parsed.data
}

function fulfilled<Value>(result: PromiseSettledResult<Value>): Value {
  if (result.status === 'rejected') throw result.reason
  return result.value
}

/**
 * Reads the {@link GhostvueStamp} once at startup. A server that cannot
 * identify its bundle must not answer tool calls, so any failure is an
 * {@link AssetBundleError} the caller reports before serving.
 */
export async function loadGhostvueStamp(
  sources: StampSources,
): Promise<GhostvueStamp> {
  // allSettled + declared-order rejection keeps the diagnostic stable when
  // several files are missing; Promise.all would surface whichever read
  // happened to fail first.
  const results = await Promise.allSettled([
    readJson(
      sources.packageJson,
      packageJsonSchema,
      '@ghostvue/mcp package.json',
    ),
    readJson(
      new URL(assetBundleIdentityFile, sources.assetsDirectory),
      bundleIdentitySchema,
      'Asset bundle identity',
    ),
    readJson(
      new URL(manifestSchemaFile, sources.assetsDirectory),
      manifestSchemaIdSchema,
      'Bundled manifest schema',
    ),
  ])
  const [packageJson, bundle, manifestSchema] = [
    fulfilled(results[0]),
    fulfilled(results[1]),
    fulfilled(results[2]),
  ]
  return {
    version: packageJson.version,
    assetBundleId: bundle.assetBundleId,
    manifestSchemaId: manifestSchema.$id,
  }
}
