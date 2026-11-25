export const MCP_INSTALL_SIZE_BUDGET_BYTES: number
export const MCP_TOOL_NAMES: readonly string[]

export function publishedContentProblems(entries: readonly string[]): string[]

export function apparentSize(
  directory: string,
  options?: { exclude?: readonly string[] },
): Promise<number>

export function formatMiB(bytes: number): string

export interface InstallSizeMeasurement {
  totalBytes: number
  assetBytes: number
  budgetBytes?: number
}

export function evaluateInstallSize(measurement: InstallSizeMeasurement): {
  gatedBytes: number
  budgetBytes: number
  withinBudget: boolean
}

export function renderInstallSizeReport(
  measurement: InstallSizeMeasurement & { packageCount: number },
): string

export function runMcpStdioSmoke(options: {
  command: string
  args?: readonly string[]
  cwd: string
  env?: NodeJS.ProcessEnv
  assetBundleId: string
  timeoutMs?: number
}): Promise<{ tools: string[]; calls: string[] }>
