interface CoverageMetric {
  covered: number
  total: number
}

type CoverageMetrics = Record<
  'lines' | 'statements' | 'functions' | 'branches',
  CoverageMetric
>

export function formatCoverageSummary(
  summary: Record<string, CoverageMetrics> & { total: CoverageMetrics },
  projectRoot: string,
): string
