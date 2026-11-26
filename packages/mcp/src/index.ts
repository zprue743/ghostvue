/**
 * Public entry point for `@ghostvue/mcp`.
 *
 * The package is consumed through its `ghostvue-mcp` stdio bin; these exports
 * are the server plumbing the discovery tools (GHO-228 to GHO-231) build on.
 * The full contract is docs/plans/gho-17-mcp-first-release.md.
 */
export { binName, builtInTools, runCli, type CliOptions } from './cli.js'
export {
  ghostvueStampSchema,
  toolContractSchemaVersion,
  type GhostvueStamp,
} from './contract.js'
export {
  GhostvueToolError,
  toolErrorCodes,
  type ToolErrorCode,
  type ToolErrorEnvelope,
} from './errors.js'
export {
  createGetExamplesTool,
  exampleCatalogFile,
  getExamplesTool,
  type GetExamplesToolOptions,
} from './get-examples.js'
export {
  createGetTokensTool,
  getTokensTool,
  tokenCatalogFile,
  type GetTokensToolOptions,
} from './get-tokens.js'
export {
  AssetBundleError,
  assetBundleIdentityFile,
  loadGhostvueStamp,
  manifestSchemaFile,
  manifestSchemaId,
  packageStampSources,
  type StampSources,
} from './identity.js'
export {
  createSearchDocsTool,
  docsPagesFile,
  searchDocsTool,
  type SearchDocsToolOptions,
} from './search-docs.js'
export {
  createGhostvueServer,
  serverName,
  serveStdio,
  type GhostvueServerOptions,
  type StdioServeOptions,
} from './server.js'
export {
  defineTool,
  type DiagnosticLog,
  type GhostvueTool,
  type ToolContext,
  type ToolDefinition,
  type ToolSuccess,
} from './tool.js'
