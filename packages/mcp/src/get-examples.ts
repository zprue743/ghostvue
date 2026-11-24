import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import * as z from 'zod'

import { GhostvueToolError } from './errors.js'
import { packageStampSources } from './identity.js'
import { defineTool, type GhostvueTool } from './tool.js'

/**
 * Bundled example catalog (GHO-17 plan §4): `examples/registry.ts` metadata as
 * `{ "examples": [{ id, title, description, layer, sourcePath }] }`, written
 * by the asset bundler in registry order.
 */
export const exampleCatalogFile = 'examples/catalog.json'

/**
 * Bundled copies of `examples/<id>.vue`. The bundler guarantees one source
 * per catalog id and one catalog id per source.
 */
const exampleSourcesDirectory = 'examples/sources/'

/** Default and maximum page size (GHO-17 plan §5.3). */
const defaultLimit = 50
const maxLimit = 100

const exampleLayerSchema = z.enum(['headless', 'themed'])

/**
 * Catalog ids become file paths under `examples/sources/`, so every segment
 * must start with a letter or digit. That rules out `..`, empty segments, and
 * absolute paths even if a corrupted bundle carried them. Client input is
 * never turned into a path: ids are only looked up in the parsed catalog.
 */
const bundledIdPattern = /^[A-Za-z0-9][\w.-]*(?:\/[A-Za-z0-9][\w.-]*)+$/

/**
 * Shape the tool relies on in the bundled catalog. Loose objects let the
 * bundler add fields later without breaking older servers.
 */
const catalogFileSchema = z.looseObject({
  examples: z.array(
    z.looseObject({
      id: z.string().regex(bundledIdPattern),
      title: z.string(),
      description: z.string(),
      layer: exampleLayerSchema,
      sourcePath: z.string(),
    }),
  ),
})

type CatalogExample = z.output<typeof catalogFileSchema>['examples'][number]

const exampleEntrySchema = z.strictObject({
  id: z.string().describe('Example id, e.g. button/basic.'),
  title: z.string(),
  description: z.string(),
  layer: exampleLayerSchema,
  sourcePath: z
    .string()
    .describe('Repository path of the example, examples/<id>.vue.'),
  source: z
    .string()
    .optional()
    .describe(
      'Full .vue single-file component source. Omitted when includeSource is false and on catalog pages listed without id or component.',
    ),
})

/**
 * Loads and checks the catalog at most once per process. A rejected load is
 * not cached, so a transient read failure does not poison every later call.
 */
function catalogLoader(
  assetsDirectory: URL,
): () => Promise<readonly CatalogExample[]> {
  let pending: Promise<readonly CatalogExample[]> | undefined
  return () => {
    pending ??= readCatalog(new URL(exampleCatalogFile, assetsDirectory)).catch(
      (error: unknown) => {
        pending = undefined
        throw error
      },
    )
    return pending
  }
}

async function readCatalog(file: URL): Promise<readonly CatalogExample[]> {
  // A missing or unreadable file propagates as a plain error, which the tool
  // wrapper logs in full and reports as a sanitized INTERNAL error.
  const json: unknown = JSON.parse(await readFile(file, 'utf8'))
  const parsed = catalogFileSchema.safeParse(json)
  // Bundled JSON that fails its shape is a release bug (§10). Messages reach
  // the client, so they name the bundled file, never a host path.
  if (!parsed.success) {
    throw invalidCatalog(z.prettifyError(parsed.error))
  }
  const seen = new Set<string>()
  for (const example of parsed.data.examples) {
    if (seen.has(example.id)) {
      throw invalidCatalog(`example ${example.id} is listed more than once.`)
    }
    seen.add(example.id)
    // `sourcePath` is the §3.3 identity clients see; it must name the same
    // file the server reads, or a client would be told the wrong path.
    if (example.sourcePath !== sourcePathOf(example.id)) {
      throw invalidCatalog(
        `example ${example.id} has sourcePath ${example.sourcePath}, expected ${sourcePathOf(example.id)}.`,
      )
    }
  }
  return parsed.data.examples
}

function invalidCatalog(detail: string): GhostvueToolError {
  return new GhostvueToolError(
    'MANIFEST_INVALID',
    `Bundled ${exampleCatalogFile} does not match the example catalog shape: ${detail}`,
  )
}

/** §3.3: the repository path an example id names. */
function sourcePathOf(id: string): string {
  return `examples/${id}.vue`
}

/**
 * Cursors are opaque to clients (§5.3, "like `list_components`") but carry
 * an offset plus a fingerprint of the filters and bundle that produced them.
 * A cursor replayed with other filters, or against another bundle, would
 * silently skip or repeat rows, so it is rejected as `INVALID_INPUT` instead.
 * `includeSource` and `limit` are not part of the fingerprint: changing them
 * between pages does not change which rows exist or their order.
 */
const cursorSchema = z.strictObject({
  offset: z.int().min(1),
  key: z.string(),
})

function cursorKey(filters: unknown, assetBundleId: string): string {
  return createHash('sha256')
    .update(JSON.stringify([assetBundleId, filters]))
    .digest('base64url')
    .slice(0, 22)
}

function encodeCursor(offset: number, key: string): string {
  return Buffer.from(JSON.stringify({ offset, key }), 'utf8').toString(
    'base64url',
  )
}

function decodeCursor(cursor: string, key: string, total: number): number {
  const reject = (): never => {
    throw new GhostvueToolError(
      'INVALID_INPUT',
      'Invalid arguments: cursor: not a nextCursor from a get_examples call with the same id, component, and layer against this server. Omit cursor to start from the first page.',
    )
  }
  let json: unknown
  try {
    json = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    return reject()
  }
  const parsed = cursorSchema.safeParse(json)
  if (!parsed.success || parsed.data.key !== key) return reject()
  if (parsed.data.offset >= total) return reject()
  return parsed.data.offset
}

/** Options for {@link createGetExamplesTool}. */
export interface GetExamplesToolOptions {
  /** Directory holding `examples/catalog.json`, with a trailing slash. */
  readonly assetsDirectory: URL
}

/**
 * Builds the `get_examples` tool (GHO-17 plan §5.3, decision M2) over the
 * example catalog and sources in `assetsDirectory`.
 *
 * Query modes:
 * - `id`: the one example with that id, or `NOT_FOUND`.
 * - `component`: every example whose id starts with `component/`, in catalog
 *   order. No match is an empty page, not an error.
 * - neither: a metadata-only catalog page; `source` is never included, so a
 *   client cannot pull every `.vue` file in one call.
 *
 * `id` and `component` are mutually exclusive. `layer` filters every mode.
 * Results are paged with `limit` and `cursor` / `nextCursor`. Example SFCs
 * are read as text and never executed.
 */
export function createGetExamplesTool(
  options: GetExamplesToolOptions,
): GhostvueTool {
  const { assetsDirectory } = options
  const loadCatalog = catalogLoader(assetsDirectory)

  async function readSource(example: CatalogExample): Promise<string> {
    // The id passed the bundled-id pattern, so this URL stays inside the
    // sources directory.
    return readFile(
      new URL(`${exampleSourcesDirectory}${example.id}.vue`, assetsDirectory),
      'utf8',
    )
  }

  return defineTool({
    name: 'get_examples',
    title: 'Get examples',
    description:
      'Read GhostVue executable examples (examples/registry.ts). Pass `id` (e.g. button/basic) for one example or `component` (e.g. button) for every example under `component/`, with .vue source unless includeSource is false. With neither, list catalog metadata only (no source), paged with cursor/nextCursor.',
    input: {
      id: z
        .string()
        .min(1)
        .optional()
        .describe('Single example id, e.g. button/basic.'),
      component: z
        .string()
        // A bare kebab segment: the server appends `/`, so `button/` or a
        // full id would otherwise silently match nothing.
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Must be a kebab-case example directory, e.g. button',
        )
        .optional()
        .describe(
          'Kebab-case example family, e.g. button for every id starting button/. This is the examples/ directory name, not the manifest family (ghost-button).',
        ),
      layer: exampleLayerSchema
        .optional()
        .describe('Only examples of this registry layer. Default: both.'),
      includeSource: z
        .boolean()
        .default(true)
        .describe(
          'When false, omit source. Ignored without id or component: catalog pages never include source.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(maxLimit)
        .default(defaultLimit)
        .describe(
          `Maximum examples per page (1–${String(maxLimit)}). Default ${String(defaultLimit)}.`,
        ),
      cursor: z
        .string()
        .min(1)
        .optional()
        .describe('Opaque nextCursor from a previous response.'),
    },
    output: {
      examples: z.array(exampleEntrySchema),
      nextCursor: z
        .string()
        .nullable()
        .describe('Pass as cursor for the next page; null on the last page.'),
    },
    handler: async (input, context) => {
      const { id, component, layer } = input
      if (id !== undefined && component !== undefined) {
        throw new GhostvueToolError(
          'INVALID_INPUT',
          'Invalid arguments: pass either id or component, not both.',
        )
      }

      const catalog = await loadCatalog()
      let matches: readonly CatalogExample[]
      if (id !== undefined) {
        const example = catalog.find((entry) => entry.id === id)
        if (example === undefined) {
          throw new GhostvueToolError('NOT_FOUND', `No example with id ${id}.`)
        }
        // A layer filter on an exact id is an assertion about that example,
        // so a mismatch is reported like an unknown id rather than as an
        // empty page the client could mistake for success (as get_tokens
        // does for `name` + `tier`).
        if (layer !== undefined && example.layer !== layer) {
          throw new GhostvueToolError(
            'NOT_FOUND',
            `No ${layer} example with id ${id}; it is a ${example.layer} example.`,
          )
        }
        matches = [example]
      } else {
        const start = component === undefined ? undefined : `${component}/`
        matches = catalog.filter(
          (entry) =>
            (start === undefined || entry.id.startsWith(start)) &&
            (layer === undefined || entry.layer === layer),
        )
      }

      const key = cursorKey(
        [id ?? null, component ?? null, layer ?? null],
        context.stamp.assetBundleId,
      )
      const offset =
        input.cursor === undefined
          ? 0
          : decodeCursor(input.cursor, key, matches.length)
      const page = matches.slice(offset, offset + input.limit)
      const end = offset + page.length

      // M2: source is fetched by id or component only; catalog pages stay
      // small whatever includeSource says.
      const withSource =
        input.includeSource && (id !== undefined || component !== undefined)
      // At most `maxLimit` small text files per call; reading them fresh
      // keeps memory flat instead of caching every source for the process.
      const examples = await Promise.all(
        page.map(async (example) => ({
          id: example.id,
          title: example.title,
          description: example.description,
          layer: example.layer,
          sourcePath: example.sourcePath,
          ...(withSource ? { source: await readSource(example) } : {}),
        })),
      )

      const scope =
        id !== undefined
          ? `example ${id}`
          : component !== undefined
            ? `examples under ${component}/`
            : 'catalog examples (metadata only)'
      return {
        structuredContent: {
          examples,
          nextCursor: end < matches.length ? encodeCursor(end, key) : null,
        },
        summary: `${String(page.length)} of ${String(matches.length)} ${scope}${withSource ? ' with source' : ''}.`,
      }
    },
  })
}

/** `get_examples` over the package's own bundled `dist/assets/examples/`. */
export const getExamplesTool: GhostvueTool = createGetExamplesTool({
  assetsDirectory: packageStampSources().assetsDirectory,
})
