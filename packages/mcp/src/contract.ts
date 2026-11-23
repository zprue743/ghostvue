import * as z from 'zod'

/**
 * Version of the GhostVue MCP tool output contract (GHO-17 plan §3.1 and §5).
 *
 * Every successful `structuredContent` payload carries it as top-level
 * `schemaVersion`. It versions the tool I/O shapes, not the component manifest
 * schema (manifests carry their own `schemaVersion`).
 */
export const toolContractSchemaVersion = '1.0.0'

/**
 * Identity of the running server and the asset bundle it serves
 * (GHO-17 plan §3.1). Every successful tool payload repeats it as `ghostvue` so
 * a client can tell which release answered without a separate request.
 */
export interface GhostvueStamp {
  /** Semver of the `@ghostvue/mcp` package that is serving the request. */
  readonly version: string
  /** Deterministic hash over every bundled asset byte, e.g. `sha256:…`. */
  readonly assetBundleId: string
  /** `$id` of the bundled component manifest JSON Schema (ADR 0006). */
  readonly manifestSchemaId: string
}

/** Zod form of {@link GhostvueStamp}, embedded in every tool `outputSchema`. */
export const ghostvueStampSchema = z.strictObject({
  version: z.string().min(1),
  assetBundleId: z.string().min(1),
  manifestSchemaId: z.string().min(1),
})
