import type {
  DocsCorpusPage,
  ExampleCatalogEntry,
} from '../../../../scripts/lib/mcp-asset-sources.js'

export const ASSET_BUNDLE_ALGORITHM: 'sha256'
export const ASSET_BUNDLE_FORMAT: string
export const ASSET_BUNDLE_METADATA_FILE: 'bundle.json'

export interface CollectAssetBundleOptions {
  /** Workspace root that holds `packages/`, `schemas/`, and `examples/`. */
  repositoryRoot: string
  /** Docs corpus pages from the shared `generateLlmsDocuments`. */
  loadDocsPages: () => Promise<readonly DocsCorpusPage[]>
  /** Example metadata from `examples/registry.ts`, in registry order. */
  loadExampleCatalog: () => Promise<readonly ExampleCatalogEntry[]>
}

/** Contents of `dist/assets/bundle.json`. */
export interface AssetBundleMetadata {
  format: string
  algorithm: 'sha256'
  assetBundleId: string
  fileCount: number
}

export interface AssetBundleCheck {
  /** True when `dist/assets` matches what the current sources produce. */
  fresh: boolean
  expectedId: string
  actualId?: string
  recordedId?: string
  problems: string[]
}

export function collectAssetBundle(
  options: CollectAssetBundleOptions,
): Promise<Map<string, Buffer>>

export function computeAssetBundleId(
  files: ReadonlyMap<string, Uint8Array>,
): string

export function writeAssetBundle(
  assetsDir: string,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<AssetBundleMetadata>

export function readAssetBundle(assetsDir: string): Promise<
  | {
      files: Map<string, Buffer>
      metadata: Partial<AssetBundleMetadata> | undefined
    }
  | undefined
>

export function checkAssetBundle(
  expected: ReadonlyMap<string, Uint8Array>,
  assetsDir: string,
): Promise<AssetBundleCheck>
