import { generatedComponentIndex } from './.registries/component-index.generated.js'

/** Package specifiers whose component exports the rules can resolve. */
export type GhostComponentPackage = '@ghostvue/vue' | '@ghostvue/themes'

/**
 * Statically checkable usage contract for one component export, derived from
 * its manifest. Names are the manifest's camelCase prop names, v-model prop
 * names, and slot names.
 */
export interface GhostComponentContract {
  readonly props: readonly string[]
  readonly models: readonly string[]
  /**
   * `null` when slot names come from consumer data (for example one slot per
   * DataTable column id), so they cannot be checked statically.
   */
  readonly slots: readonly string[] | null
  /** Page under `docs/components/` (without `.md`) that documents the component. */
  readonly docs: string
}

type ComponentIndex = Readonly<
  Record<
    GhostComponentPackage,
    Readonly<Record<string, GhostComponentContract>>
  >
>

// Assignment (not an assertion) makes the compiler check the generated literal
// against the contract shape, so a generator change cannot silently drift.
const componentIndex: ComponentIndex = generatedComponentIndex

const DOCS_BASE_URL =
  'https://github.com/zprue743/ghostvue/blob/master/docs/components/'

/** True when `source` is an import specifier the rules resolve components from. */
export function isGhostComponentPackage(
  source: string,
): source is GhostComponentPackage {
  return Object.hasOwn(componentIndex, source)
}

/**
 * Contract for `exportName` from `packageName`, or `undefined` when that export
 * has no manifest (helpers, unexported parts, themed sub-parts without their own
 * manifest). Callers must treat `undefined` as "no evidence" and stay silent.
 */
export function lookupComponentContract(
  packageName: GhostComponentPackage,
  exportName: string,
): GhostComponentContract | undefined {
  const components = componentIndex[packageName]
  return Object.hasOwn(components, exportName)
    ? components[exportName]
    : undefined
}

/** Public docs URL for a contract, used in diagnostics. */
export function componentDocsUrl(contract: GhostComponentContract): string {
  return `${DOCS_BASE_URL}${contract.docs}.md`
}
