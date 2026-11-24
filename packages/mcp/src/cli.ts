import { type Readable, type Writable } from 'node:stream'

import { createComponentTools } from './components.js'
import { type GhostvueStamp } from './contract.js'
import { getExamplesTool } from './get-examples.js'
import { getTokensTool } from './get-tokens.js'
import {
  AssetBundleError,
  loadGhostvueStamp,
  packageStampSources,
  type StampSources,
} from './identity.js'
import { searchDocsTool } from './search-docs.js'
import { serveStdio } from './server.js'
import { type GhostvueTool } from './tool.js'

/** Executable name declared in `package.json` `bin` (GHO-17 plan §2). */
export const binName = 'ghostvue-mcp'

/**
 * Tools the published bin serves, each reading the package's own asset
 * bundle (`dist/assets/`).
 */
export const builtInTools: readonly GhostvueTool[] = [
  ...createComponentTools(packageStampSources().assetsDirectory),
  getTokensTool,
  searchDocsTool,
  getExamplesTool,
]

/** Process streams and overrides for {@link runCli}. */
export interface CliOptions {
  readonly stdin: Readable
  readonly stdout: Writable
  readonly stderr: Writable
  /** Defaults to {@link builtInTools}. */
  readonly tools?: readonly GhostvueTool[]
  /** Defaults to the package's own bundle; tests pass fixture assets. */
  readonly sources?: StampSources
}

/**
 * Runs the `ghostvue-mcp` stdio server and resolves to the process exit code
 * once the client disconnects.
 *
 * Everything human-readable goes to stderr: stdout carries MCP JSON-RPC
 * frames only. A missing or malformed asset bundle exits non-zero before the
 * server answers `initialize`, so an MCP host reports a failed server instead
 * of serving unidentified data.
 */
export async function runCli(options: CliOptions): Promise<number> {
  const log = (line: string) => {
    options.stderr.write(`${binName}: ${line}\n`)
  }

  let stamp: GhostvueStamp
  try {
    stamp = await loadGhostvueStamp(options.sources ?? packageStampSources())
  } catch (error) {
    if (error instanceof AssetBundleError) {
      log(error.message)
      return 1
    }
    throw error
  }

  await serveStdio({
    stamp,
    tools: options.tools ?? builtInTools,
    log,
    stdin: options.stdin,
    stdout: options.stdout,
  })
  return 0
}
