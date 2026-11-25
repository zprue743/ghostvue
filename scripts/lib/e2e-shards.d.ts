export const DEFAULT_TEST_MS: number

export interface ListedTest {
  project: string
  file: string
}

export interface ReportTest extends ListedTest {
  durationMs: number
  status: string | undefined
}

export interface ShardUnit {
  key: string
  project: string
  file: string
  tests: number
  estimatedMs: number
}

export interface Shard {
  units: ShardUnit[]
  estimatedMs: number
  tests: number
}

export function unitKey(project: string, file: string): string

export function collectReportTests(report: unknown): ReportTest[]

export function buildTimingTable(report: unknown): Record<string, number>

export function buildUnits(
  tests: ListedTest[],
  timings: Record<string, number>,
): ShardUnit[]

export function planShards(units: ShardUnit[], total: number): Shard[]

export function parseShardArg(value: string): {
  current: number
  total: number
}

export function formatTestList(shard: Shard): string
