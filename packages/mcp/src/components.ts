import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'

import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js'
import * as z from 'zod'

import { GhostvueToolError } from './errors.js'
import { manifestSchemaFile } from './identity.js'
import { defineTool, type GhostvueTool } from './tool.js'

/**
 * Packages that ship component manifests (GHO-17 plan §3.2). The order is the
 * listing order inside a family: headless before its themed wrapper.
 */
export const componentPackages = ['@ghostvue/vue', '@ghostvue/themes'] as const

/** One of {@link componentPackages}. */
export type ComponentPackage = (typeof componentPackages)[number]

/**
 * Manifest `status` values. Mirrors the `status` enum in the bundled
 * `manifest.schema.json`; `components.test.ts` fails if the two drift.
 */
export const componentStatuses = [
  'experimental',
  'beta',
  'stable',
  'deprecated',
] as const

/** Bundle directory per package: `manifests/<directory>/<family>.manifest.json`. */
const manifestDirectories = {
  '@ghostvue/vue': 'vue',
  '@ghostvue/themes': 'themes',
} as const satisfies Record<ComponentPackage, string>

const manifestSuffix = '.manifest.json'

const componentPackageSchema = z.enum(componentPackages)

/** The paired manifest in the other package (§3.2 `relatedManifest`). */
const relatedManifestSchema = z.strictObject({
  package: componentPackageSchema,
  family: z.string().min(1),
  manifestPath: z.string().min(1),
})

/**
 * Fields the tools read from a manifest. It only runs after the manifest
 * passed the bundled JSON Schema, so it narrows types rather than enforcing
 * the contract; the loose object keeps every other manifest field for
 * `get_component`.
 */
const manifestFieldsSchema = z.looseObject({
  schemaVersion: z.string(),
  name: z.string(),
  package: componentPackageSchema,
  status: z.enum(componentStatuses),
  description: z.string(),
  examples: z.array(z.string()),
  spec: z.looseObject({ path: z.string(), status: z.string() }).optional(),
})

type ManifestFields = z.output<typeof manifestFieldsSchema>
type RelatedManifest = z.output<typeof relatedManifestSchema>

/** One bundled manifest file and what the server learned loading it. */
interface CatalogEntry {
  readonly family: string
  readonly package: ComponentPackage
  readonly manifestPath: string
  readonly relatedManifest: RelatedManifest | undefined
  /**
   * Manifest `name` when the file is JSON with a string `name`, even if the
   * rest is invalid, so a lookup can report `MANIFEST_INVALID` instead of
   * `NOT_FOUND` for a corrupt file.
   */
  readonly name: string | undefined
  /** The validated manifest, or why it was rejected. */
  readonly manifest:
    | { readonly valid: true; readonly fields: ManifestFields }
    | { readonly valid: false; readonly problem: string }
}

/** Every bundled manifest in listing order: family, then package order. */
interface ComponentCatalog {
  readonly entries: readonly CatalogEntry[]
}

function manifestPathFor(pkg: ComponentPackage, family: string): string {
  return `manifests/${manifestDirectories[pkg]}/${family}${manifestSuffix}`
}

function otherPackage(pkg: ComponentPackage): ComponentPackage {
  return pkg === '@ghostvue/vue' ? '@ghostvue/themes' : '@ghostvue/vue'
}

async function readFamilies(
  assetsDirectory: URL,
  pkg: ComponentPackage,
): Promise<string[]> {
  const names = await readdir(
    new URL(`manifests/${manifestDirectories[pkg]}/`, assetsDirectory),
  )
  return names
    .filter((name) => name.endsWith(manifestSuffix))
    .map((name) => name.slice(0, -manifestSuffix.length))
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

/**
 * Loads and validates every bundled manifest.
 *
 * Validation happens here, in the serving process, rather than trusting the
 * build: the plan (§5.2) requires the manifest to pass the bundled
 * `manifest.schema.json` with the same Ajv 2020 build and options CI uses
 * (`scripts/lib/component-manifests.js`), so a corrupt or hand-edited install
 * surfaces as `MANIFEST_INVALID` instead of being served. A failing manifest
 * is recorded per entry so one bad file does not hide the others from
 * `get_component`.
 *
 * Missing directories or an unreadable schema are not manifest problems:
 * they reject, and the tool reports a sanitized `INTERNAL` error.
 */
async function loadComponentCatalog(
  assetsDirectory: URL,
): Promise<ComponentCatalog> {
  const schemaText = await readFile(
    new URL(manifestSchemaFile, assetsDirectory),
    'utf8',
  )
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  // The bundled schema is a JSON Schema document, so `JSON.parse`'s `any` is
  // narrowed to an object here before Ajv compiles it.
  const schema = z.looseObject({}).parse(JSON.parse(schemaText))
  const validate = ajv.compile(schema)

  const familiesByPackage = new Map<ComponentPackage, Set<string>>()
  for (const pkg of componentPackages) {
    familiesByPackage.set(
      pkg,
      new Set(await readFamilies(assetsDirectory, pkg)),
    )
  }

  const entries: CatalogEntry[] = []
  for (const pkg of componentPackages) {
    const related = otherPackage(pkg)
    for (const family of familiesByPackage.get(pkg) ?? []) {
      const manifestPath = manifestPathFor(pkg, family)
      const text = await readFile(
        new URL(manifestPath, assetsDirectory),
        'utf8',
      )
      const parsed = parseJson(text)
      const name =
        parsed.ok &&
        typeof parsed.value === 'object' &&
        parsed.value !== null &&
        typeof Reflect.get(parsed.value, 'name') === 'string'
          ? String(Reflect.get(parsed.value, 'name'))
          : undefined

      entries.push({
        family,
        package: pkg,
        manifestPath,
        // §3.2: a themed wrapper and its headless component share the
        // filename stem (`family`), so pairing is by family, not by name.
        relatedManifest: familiesByPackage.get(related)?.has(family)
          ? {
              package: related,
              family,
              manifestPath: manifestPathFor(related, family),
            }
          : undefined,
        name,
        manifest: checkManifest(parsed, pkg, manifestPath, validate, ajv),
      })
    }
  }

  markDuplicateNames(entries)
  entries.sort(
    (a, b) =>
      compareCodeUnits(a.family, b.family) ||
      componentPackages.indexOf(a.package) -
        componentPackages.indexOf(b.package),
  )
  return { entries }
}

function checkManifest(
  parsed: { ok: true; value: unknown } | { ok: false },
  pkg: ComponentPackage,
  manifestPath: string,
  validate: ValidateFunction,
  ajv: Ajv2020,
): CatalogEntry['manifest'] {
  const invalid = (reason: string) => ({
    valid: false as const,
    problem: `Bundled manifest ${manifestPath} ${reason}`,
  })
  if (!parsed.ok) return invalid('is not valid JSON.')
  if (!validate(parsed.value)) {
    return invalid(
      `fails ${manifestSchemaFile}: ${ajv.errorsText(validate.errors)}`,
    )
  }
  const fields = manifestFieldsSchema.safeParse(parsed.value)
  if (!fields.success) {
    // Only reachable if the bundled schema loosens a field this server
    // relies on; still a bundle that this server cannot serve faithfully.
    return invalid(`does not match the fields this server reads.`)
  }
  // The directory decides `package` in identity (§3.2 `manifestPath`), so a
  // file whose own `package` disagrees would be listed under the wrong one.
  if (fields.data.package !== pkg) {
    return invalid(`declares package ${fields.data.package}.`)
  }
  return { valid: true, fields: fields.data }
}

/**
 * `get_component` looks a manifest up by `name` within one package, so two
 * files claiming the same name there would make the answer depend on file
 * order. Both are rejected instead.
 */
function markDuplicateNames(entries: CatalogEntry[]): void {
  const seen = new Map<string, number>()
  for (const entry of entries) {
    if (entry.name === undefined) continue
    const key = `${entry.package}\u0000${entry.name}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  entries.forEach((entry, index) => {
    if (entry.name === undefined) return
    if ((seen.get(`${entry.package}\u0000${entry.name}`) ?? 0) > 1) {
      entries[index] = {
        ...entry,
        manifest: {
          valid: false,
          problem: `Bundled manifest ${entry.manifestPath} shares the name ${entry.name} with another ${entry.package} manifest.`,
        },
      }
    }
  })
}

/** Locale-independent order, so listings are identical on every host. */
function compareCodeUnits(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

/**
 * Loads the catalog once per tool set and shares it between calls: the
 * bundle is immutable for the life of the process. A failed load is not
 * cached, so a transient read error does not poison later calls.
 */
function createCatalogLoader(
  assetsDirectory: URL,
): () => Promise<ComponentCatalog> {
  let pending: Promise<ComponentCatalog> | undefined
  return () => {
    pending ??= loadComponentCatalog(assetsDirectory).catch(
      (error: unknown) => {
        pending = undefined
        throw error
      },
    )
    return pending
  }
}

function requireValid(entry: CatalogEntry): ManifestFields {
  if (!entry.manifest.valid) {
    throw new GhostvueToolError('MANIFEST_INVALID', entry.manifest.problem)
  }
  return entry.manifest.fields
}

/**
 * `list_components` cursors are opaque to clients (§5.1) but carry an offset
 * plus a fingerprint of the filters and bundle that produced them. A cursor
 * replayed with other filters, or against another bundle, would silently skip
 * or repeat rows, so it is rejected as `INVALID_INPUT` instead.
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
      'Invalid arguments: cursor: not a nextCursor from a list_components call with the same package, status, and query against this server. Omit cursor to start from the first page.',
    )
  }
  const json = parseJson(Buffer.from(cursor, 'base64url').toString('utf8'))
  if (!json.ok) return reject()
  const parsed = cursorSchema.safeParse(json.value)
  if (!parsed.success || parsed.data.key !== key) return reject()
  if (parsed.data.offset >= total) return reject()
  return parsed.data.offset
}

const summarySchema = z.strictObject({
  name: z.string(),
  package: componentPackageSchema,
  family: z.string(),
  manifestPath: z.string(),
  relatedManifest: relatedManifestSchema.optional(),
  status: z.enum(componentStatuses),
  manifestSchemaVersion: z
    .string()
    .describe('The component manifest’s own schemaVersion.'),
  description: z.string(),
  exampleIds: z.array(z.string()),
  spec: z
    .strictObject({ path: z.string(), status: z.string() })
    .optional()
    .describe('Approved specification reference; omitted when absent.'),
})

/** Creates `list_components` and `get_component` over one asset bundle. */
export function createComponentTools(
  assetsDirectory: URL,
): readonly GhostvueTool[] {
  const loadCatalog = createCatalogLoader(assetsDirectory)

  const listComponents = defineTool({
    name: 'list_components',
    title: 'List components',
    description:
      'List GhostVue component manifests as summary rows with optional package, status, and text filters. Use get_component for a full manifest.',
    input: {
      package: z
        .enum([...componentPackages, 'all'])
        .default('all')
        .describe('Restrict to one origin package.'),
      status: z
        .array(z.enum(componentStatuses))
        .min(1)
        .optional()
        .describe('Only manifests with one of these statuses. Default: all.'),
      query: z
        .string()
        .optional()
        .describe(
          'Case-insensitive substring match on component name or description.',
        ),
      limit: z
        .int()
        .min(1)
        .max(500)
        .default(200)
        .describe('Max rows returned.'),
      cursor: z
        .string()
        .min(1)
        .optional()
        .describe('Opaque nextCursor from a previous response.'),
    },
    output: {
      items: z.array(summarySchema),
      nextCursor: z
        .string()
        .nullable()
        .describe('Pass as cursor for the next page; null on the last page.'),
      totalApprox: z
        .int()
        .min(0)
        .describe('Rows matching the filters across all pages.'),
    },
    handler: async (input, context) => {
      const catalog = await loadCatalog()
      const inScope = catalog.entries.filter(
        (entry) => input.package === 'all' || entry.package === input.package,
      )
      // Filtering by query needs every row's name and description, so a
      // corrupt manifest in scope fails the whole listing (§10).
      const rows = inScope.map((entry) => ({
        entry,
        fields: requireValid(entry),
      }))

      const statuses =
        input.status === undefined ? undefined : new Set(input.status)
      const needle = input.query?.toLowerCase()
      const matches = rows.filter(
        ({ fields }) =>
          (statuses === undefined || statuses.has(fields.status)) &&
          (needle === undefined ||
            fields.name.toLowerCase().includes(needle) ||
            fields.description.toLowerCase().includes(needle)),
      )

      const key = cursorKey(
        [
          input.package,
          statuses === undefined ? null : [...statuses].sort(),
          input.query ?? null,
        ],
        context.stamp.assetBundleId,
      )
      const offset =
        input.cursor === undefined
          ? 0
          : decodeCursor(input.cursor, key, matches.length)
      const page = matches.slice(offset, offset + input.limit)
      const end = offset + page.length

      return {
        structuredContent: {
          items: page.map(({ entry, fields }) => ({
            name: fields.name,
            package: entry.package,
            family: entry.family,
            manifestPath: entry.manifestPath,
            ...(entry.relatedManifest && {
              relatedManifest: entry.relatedManifest,
            }),
            status: fields.status,
            manifestSchemaVersion: fields.schemaVersion,
            description: fields.description,
            exampleIds: fields.examples,
            ...(fields.spec && {
              spec: { path: fields.spec.path, status: fields.spec.status },
            }),
          })),
          nextCursor: end < matches.length ? encodeCursor(end, key) : null,
          totalApprox: matches.length,
        },
        summary: `Listed ${String(page.length)} of ${String(matches.length)} matching components.`,
      }
    },
  })

  const getComponent = defineTool({
    name: 'get_component',
    title: 'Get component',
    description:
      'Return one full GhostVue component manifest, validated against the bundled manifest schema. Pass package "@ghostvue/themes" for the themed wrapper.',
    input: {
      name: z
        .string()
        .min(1)
        .describe('Component name from its manifest, e.g. GhostButton.'),
      package: componentPackageSchema
        .default('@ghostvue/vue')
        .describe('Manifest package; @ghostvue/themes for themed wrappers.'),
    },
    output: {
      family: z.string(),
      package: componentPackageSchema,
      relatedManifest: relatedManifestSchema.optional(),
      manifest: z
        .looseObject({
          schemaVersion: z.string(),
          name: z.string(),
          package: componentPackageSchema,
        })
        .describe(
          'The full component manifest; it conforms to the schema named by ghostvue.manifestSchemaId.',
        ),
    },
    handler: async (input) => {
      const catalog = await loadCatalog()
      const entry = catalog.entries.find(
        (candidate) =>
          candidate.package === input.package && candidate.name === input.name,
      )
      if (entry === undefined) {
        const elsewhere = catalog.entries.some(
          (candidate) =>
            candidate.package !== input.package &&
            candidate.name === input.name,
        )
        throw new GhostvueToolError(
          'NOT_FOUND',
          `No manifest for ${input.name} in ${input.package}${
            elsewhere ? `; it exists in ${otherPackage(input.package)}` : ''
          }.`,
        )
      }
      const manifest = requireValid(entry)
      return {
        structuredContent: {
          family: entry.family,
          package: entry.package,
          ...(entry.relatedManifest && {
            relatedManifest: entry.relatedManifest,
          }),
          manifest,
        },
        summary: `${manifest.name} (${entry.package}, ${manifest.status}).`,
      }
    },
  })

  return [listComponents, getComponent]
}
