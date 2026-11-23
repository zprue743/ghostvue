import { readFile } from 'node:fs/promises'

import * as z from 'zod'

import { GhostvueToolError } from './errors.js'
import { packageStampSources } from './identity.js'
import { defineTool, type GhostvueTool } from './tool.js'

/**
 * Bundled token catalog: a byte-for-byte copy of the `@ghostvue/themes`
 * `./tokens.json` export (GHO-17 plan §3.5), written by the asset bundler.
 */
export const tokenCatalogFile = 'tokens.json'

/** Default and maximum page size for prefix queries (GHO-17 plan §8 M5). */
const defaultLimit = 100
const maxLimit = 2000

const tokenTierSchema = z.enum(['primitive', 'semantic'])

/**
 * Shape the tool relies on in the bundled catalog. Loose objects let the
 * themes pipeline add fields (`aliases`, `density`, `reducedMotion`, …)
 * without breaking the server; only the fields the tool serves are checked.
 * `value` maps every mode (`light`, `dark`) to a resolved CSS literal.
 * `cssVar` is optional because the themes build emits custom properties for
 * semantic tokens only; primitives are inlined into them and have no variable.
 */
const catalogFileSchema = z.looseObject({
  schemaVersion: z.string().min(1),
  theme: z.string().min(1),
  modes: z.array(z.string().min(1)),
  densities: z.array(z.string().min(1)),
  attributes: z.record(z.string(), z.string()),
  tokens: z.array(
    z.looseObject({
      name: z.string().min(1),
      type: z.string().min(1),
      tier: tokenTierSchema,
      cssVar: z.string().min(1).optional(),
      value: z.record(z.string(), z.string()),
    }),
  ),
})

type TokenCatalog = z.output<typeof catalogFileSchema>
type CatalogToken = TokenCatalog['tokens'][number]

const catalogHeaderSchema = z.strictObject({
  schemaVersion: z.string(),
  theme: z.string(),
  modes: z.array(z.string()),
  densities: z.array(z.string()),
  attributes: z.record(z.string(), z.string()),
  tokenCount: z
    .number()
    .int()
    .nonnegative()
    .describe('Number of tokens in the whole catalog.'),
})

const tokenEntrySchema = z.strictObject({
  name: z.string(),
  type: z.string(),
  tier: tokenTierSchema,
  cssVar: z
    .string()
    .optional()
    .describe(
      'CSS custom property, e.g. --ghost-action-primary-bg. Omitted for tokens the themes build does not emit as a variable (primitives).',
    ),
  value: z
    .record(z.string(), z.string())
    .optional()
    .describe('Resolved value per mode. Omitted when includeValues is false.'),
})

/**
 * Loads the catalog at most once per process. A rejected load is not cached,
 * so a transient read failure does not poison every later call.
 */
function catalogLoader(assetsDirectory: URL): () => Promise<TokenCatalog> {
  let pending: Promise<TokenCatalog> | undefined
  return () => {
    pending ??= readCatalog(new URL(tokenCatalogFile, assetsDirectory)).catch(
      (error: unknown) => {
        pending = undefined
        throw error
      },
    )
    return pending
  }
}

async function readCatalog(file: URL): Promise<TokenCatalog> {
  // A missing or unreadable file propagates as a plain error, which the tool
  // wrapper logs in full and reports as a sanitized INTERNAL error.
  const json: unknown = JSON.parse(await readFile(file, 'utf8'))
  const parsed = catalogFileSchema.safeParse(json)
  if (!parsed.success) {
    // Bundled JSON that fails its shape is a release bug (§10). The message
    // reaches the client, so it names the bundled file, never a host path.
    throw new GhostvueToolError(
      'MANIFEST_INVALID',
      `Bundled ${tokenCatalogFile} does not match the token catalog shape: ${z.prettifyError(parsed.error)}`,
    )
  }
  return parsed.data
}

function toEntry(token: CatalogToken, includeValues: boolean) {
  const { name, type, tier, cssVar } = token
  return {
    name,
    type,
    tier,
    ...(cssVar === undefined ? {} : { cssVar }),
    ...(includeValues ? { value: token.value } : {}),
  }
}

/** Options for {@link createGetTokensTool}. */
export interface GetTokensToolOptions {
  /** Directory holding `tokens.json`, with a trailing slash. */
  readonly assetsDirectory: URL
}

/**
 * Builds the `get_tokens` tool (GHO-17 plan §5.5) over the token catalog in
 * `assetsDirectory`.
 *
 * Query modes:
 * - `name`: the one token with that exact name, or `NOT_FOUND`.
 * - `prefix`: tokens whose name starts with `prefix.`, in catalog order,
 *   capped at `limit`; `matchCount` reports how many matched before the cap.
 * - neither: the catalog header only, so a client can learn modes, densities,
 *   and size without pulling every token (~160 KB).
 *
 * `name` and `prefix` are mutually exclusive.
 */
export function createGetTokensTool(
  options: GetTokensToolOptions,
): GhostvueTool {
  const loadCatalog = catalogLoader(options.assetsDirectory)

  return defineTool({
    name: 'get_tokens',
    title: 'Get design tokens',
    description:
      'Read the resolved GhostVue design-token catalog (@ghostvue/themes tokens.json). Pass `name` for one exact token or `prefix` for every token under `prefix.`; omit both for the catalog header (modes, densities, attributes, token count) only.',
    input: {
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Exact token name, e.g. action.primary.bg.'),
      prefix: z
        .string()
        .min(1)
        // `prefix` is a dotted path; the server appends the separator, so a
        // trailing dot would otherwise silently match nothing.
        .regex(/[^.]$/, 'Must not end with "."')
        .optional()
        .describe(
          'Return tokens whose name starts with `prefix.`, e.g. action.primary.',
        ),
      tier: tokenTierSchema
        .optional()
        .describe('Only tokens of this tier. Default: all tiers.'),
      includeValues: z
        .boolean()
        .default(true)
        .describe(
          'When false, omit per-mode values and return names, types, tiers, and CSS variables only.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(maxLimit)
        .default(defaultLimit)
        .describe(
          `Maximum tokens returned for a prefix query (1–${String(maxLimit)}). Default ${String(defaultLimit)}.`,
        ),
    },
    output: {
      catalog: catalogHeaderSchema,
      tokens: z
        .array(tokenEntrySchema)
        .optional()
        .describe('Matching tokens. Omitted for a header-only request.'),
      matchCount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Prefix queries only: tokens that matched before `limit` was applied.',
        ),
    },
    handler: async ({ name, prefix, tier, includeValues, limit }) => {
      if (name !== undefined && prefix !== undefined) {
        throw new GhostvueToolError(
          'INVALID_INPUT',
          'Invalid arguments: pass either name or prefix, not both.',
        )
      }

      const catalog = await loadCatalog()
      const header = {
        schemaVersion: catalog.schemaVersion,
        theme: catalog.theme,
        modes: catalog.modes,
        densities: catalog.densities,
        attributes: catalog.attributes,
        tokenCount: catalog.tokens.length,
      }

      if (name !== undefined) {
        const token = catalog.tokens.find((entry) => entry.name === name)
        if (token === undefined) {
          throw new GhostvueToolError('NOT_FOUND', `No token named ${name}.`)
        }
        // A tier filter on an exact name is an assertion about that token, so
        // a mismatch is reported like an unknown name rather than as an empty
        // list the client could mistake for success.
        if (tier !== undefined && token.tier !== tier) {
          throw new GhostvueToolError(
            'NOT_FOUND',
            `No ${tier} token named ${name}; it is a ${token.tier} token.`,
          )
        }
        return {
          structuredContent: {
            catalog: header,
            tokens: [toEntry(token, includeValues)],
          },
          summary: `Token ${name} (${token.tier} ${token.type}${token.cssVar === undefined ? '' : `, ${token.cssVar}`}).`,
        }
      }

      if (prefix !== undefined) {
        const start = `${prefix}.`
        const matches = catalog.tokens.filter(
          (entry) =>
            entry.name.startsWith(start) &&
            (tier === undefined || entry.tier === tier),
        )
        const tokens = matches
          .slice(0, limit)
          .map((entry) => toEntry(entry, includeValues))
        return {
          structuredContent: {
            catalog: header,
            tokens,
            matchCount: matches.length,
          },
          summary: `${String(tokens.length)} of ${String(matches.length)} tokens under ${start}`,
        }
      }

      return {
        structuredContent: { catalog: header },
        summary: `Token catalog ${catalog.theme}: ${String(header.tokenCount)} tokens. Pass name or prefix to read entries.`,
      }
    },
  })
}

/** `get_tokens` over the package's own bundled `dist/assets/tokens.json`. */
export const getTokensTool: GhostvueTool = createGetTokensTool({
  assetsDirectory: packageStampSources().assetsDirectory,
})
