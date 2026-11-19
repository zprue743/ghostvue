export const COLLECTION_SCHEMA_VERSION: string
export const COLLECTION_EXPORT: './manifest.json'
export const COLLECTION_EXPORT_TARGET: './dist/manifest.json'
export const WORKSPACE_COLLECTION_PATH: string

export interface CollectionPackageSpec {
  directory: string
  name: string
}

export interface CollectionPackageIdentity {
  name: string
  version: string
}

export interface ManifestCollection {
  schemaVersion: string
  scope: 'package' | 'workspace'
  packages: CollectionPackageIdentity[]
  components: Record<string, unknown>[]
}

export interface ManifestCollectionEntry {
  file: string
  manifest: Record<string, unknown>
}

export interface BuiltCollection {
  violations: string[]
  collection: ManifestCollection
}

export function compareComponentIdentity(
  left: { package?: unknown; name?: unknown },
  right: { package?: unknown; name?: unknown },
): number
export function serializeCollection(collection: unknown): string
export function listManifestPackages<T extends CollectionPackageSpec>(
  repositoryRoot: string,
  packages?: readonly T[],
): Promise<T[]>
export function buildManifestCollection(input: {
  scope: 'package' | 'workspace'
  packages: CollectionPackageIdentity[]
  entries: ManifestCollectionEntry[]
}): BuiltCollection
export function buildPackageCollection(
  repositoryRoot: string,
  pkg: CollectionPackageSpec,
): Promise<BuiltCollection>
export function buildWorkspaceCollection(
  repositoryRoot: string,
  packages?: readonly CollectionPackageSpec[],
): Promise<BuiltCollection>
export function createCollectionValidator(
  repositoryRoot: string,
): Promise<(collection: unknown, label: string) => string[]>
export function packageCollectionPath(
  repositoryRoot: string,
  pkg: CollectionPackageSpec,
): string
export function writePackageCollection(
  repositoryRoot: string,
  pkg: CollectionPackageSpec,
): Promise<string[]>
export function writeWorkspaceCollection(
  repositoryRoot: string,
  packages?: readonly CollectionPackageSpec[],
): Promise<string[]>
export function checkBuiltCollections(
  repositoryRoot: string,
  packages?: readonly CollectionPackageSpec[],
): Promise<string[]>
