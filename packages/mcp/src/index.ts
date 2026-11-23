/**
 * Public entry point for `@ghostvue/mcp`.
 *
 * This is the GHO-225 scaffold: it fixes the package boundary and the
 * `ghostvue-mcp` bin name before the stdio server lands. No MCP tools are
 * registered yet; see docs/plans/gho-17-mcp-first-release.md for the contract
 * that later issues implement.
 */

/** Executable name declared in `package.json` `bin` (GHO-17 plan §2). */
export const binName = 'ghostvue-mcp'

/** Minimal writable sink so the stub stays testable without real stdio. */
export interface TextSink {
  write(chunk: string): unknown
}

/**
 * Runs the `ghostvue-mcp` stub and returns the process exit code.
 *
 * The stub writes only to `stderr`: once the server exists, `stdout` carries
 * MCP JSON-RPC frames, and a host would treat any stray text there as a
 * protocol error. It exits non-zero so an MCP host reports a failed server
 * instead of waiting on a process that will never answer `initialize`.
 */
export function runStub(stderr: TextSink): number {
  stderr.write(
    `${binName}: the GhostVue MCP server is not implemented yet; no tools are registered.\n`,
  )
  return 1
}
