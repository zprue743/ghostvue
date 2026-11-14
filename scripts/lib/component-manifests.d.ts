export const CURRENT_SCHEMA_VERSION: string

export const MANIFEST_PACKAGES: readonly ManifestPackageSpec[]

export interface ManifestPackageSpec {
  directory: string
  name: string
  srcDir?: string
  manifestsDir?: string
  tsconfig?: string
}

export interface ParsedDefault {
  present: boolean
  value?: string | number | boolean | null
}

export interface DerivedProp {
  name: string
  type: string
  default?: string | number | boolean | null
  required: boolean
  description: string
  deprecated: boolean
}

export interface DerivedModel {
  prop: string
  event: string
  type: string
  description: string
}

export interface DerivedEvent {
  name: string
  payloadType: string
  description: string
}

export interface DerivedSlotProp {
  name: string
  type: string
  description: string
}

export interface DerivedSlot {
  name: string
  props: DerivedSlotProp[]
  description: string
}

export interface DerivedExposed {
  name: string
  kind: 'method' | 'property'
  type: string
  description: string
}

export interface DerivedContract {
  schemaVersion: string
  source: 'generated'
  name: string
  package: string
  description: string
  props: DerivedProp[]
  models: DerivedModel[]
  events: DerivedEvent[]
  slots: DerivedSlot[]
  exposed: DerivedExposed[]
}

export interface ComponentManifest extends DerivedContract {
  status: 'experimental' | 'beta' | 'stable' | 'deprecated'
  styling: unknown
  accessibility: unknown
  examples: unknown
}

export interface ResolvedManifestPackage {
  directory: string
  name: string
  srcDir: string
  manifestsDir: string
  tsconfig: string
}

export interface SyncResult {
  ok: boolean
  violations: string[]
  written: string[]
  checked: string[]
}

export function pascalToKebab(name: string): string
export function componentExamplePrefix(name: string): string
export function validateExampleManifests(
  repositoryRoot: string,
  componentNames?: string[],
): Promise<string[]>
export function serializeManifest(manifest: unknown): string
export function normalizeType(
  type: string,
  options?: { optional?: boolean },
): string
export function parseDefaultValue(raw: string | undefined | null): ParsedDefault
export function eventPayloadType(type: string): string
export function buildDerivedContract(
  meta: unknown,
  identity: { name: string; packageName: string },
): { violations: string[]; derived: DerivedContract }
export function mergeManifest(
  derived: DerivedContract,
  existing: unknown,
): ComponentManifest
export function resolveManifestPackage(
  repositoryRoot: string,
  spec: ManifestPackageSpec,
): ResolvedManifestPackage
export function createMetaChecker(tsconfigPath: string): unknown
export function resetMetaCheckers(): void
export function extractComponentMeta(
  checker: unknown,
  filePath: string,
): unknown
export function syncRepositoryManifests(options?: {
  repositoryRoot?: string
  write?: boolean
  packages?: ManifestPackageSpec[]
  componentNames?: string[]
}): Promise<SyncResult>

export function validateManifestSchemas(
  repositoryRoot: string,
  files: string[],
): Promise<string[]>
