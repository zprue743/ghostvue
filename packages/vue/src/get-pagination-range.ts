export interface GetPaginationRangeOptions {
  /** 1-based current page. */
  page: number
  /** Total pages (values below 1 are treated as 1). */
  pageCount: number
  /** Pages adjacent to the current page. Invalid values fall back to 1. */
  siblingCount?: number
  /** Pages always visible at the start and end. Invalid values fall back to 1. */
  boundaryCount?: number
}

export type GhostPaginationRangeEntry =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; placement: 'start' | 'end' }

function finiteInt(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback
  const floored = Math.floor(value)
  return floored < 0 ? fallback : floored
}

/**
 * Pure pagination range with ellipsis markers. Used by {@link useGhostPagination}
 * and covered by unit tests so ellipsis placement stays stable.
 */
export function getPaginationRange(
  options: GetPaginationRangeOptions,
): GhostPaginationRangeEntry[] {
  const pageCount = Math.max(1, finiteInt(options.pageCount, 1))
  const siblingCount = finiteInt(options.siblingCount, 1)
  const boundaryCount = finiteInt(options.boundaryCount, 1)
  const page = Math.min(pageCount, Math.max(1, finiteInt(options.page, 1) || 1))

  const compactThreshold = siblingCount * 2 + 3 + boundaryCount * 2
  if (pageCount <= compactThreshold) {
    const compact: GhostPaginationRangeEntry[] = []
    for (let index = 1; index <= pageCount; index++) {
      compact.push({ type: 'page', page: index })
    }
    return compact
  }

  const pages = new Set<number>()
  for (let i = 1; i <= Math.min(boundaryCount, pageCount); i++) {
    pages.add(i)
  }
  for (
    let i = Math.max(pageCount - boundaryCount + 1, 1);
    i <= pageCount;
    i++
  ) {
    pages.add(i)
  }
  for (let i = page - siblingCount; i <= page + siblingCount; i++) {
    if (i >= 1 && i <= pageCount) pages.add(i)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: GhostPaginationRangeEntry[] = []
  let ellipsisIndex = 0

  for (let index = 0; index < sorted.length; index++) {
    const value = sorted[index]
    if (value === undefined) continue
    const previous = sorted[index - 1]
    if (previous !== undefined && value - previous > 1) {
      const placement = ellipsisIndex === 0 ? 'start' : 'end'
      ellipsisIndex += 1
      result.push({ type: 'ellipsis', placement })
    }
    result.push({ type: 'page', page: value })
  }

  return result
}

/** @deprecated Use {@link GhostPaginationRangeEntry}. */
export type GhostPaginationItem = GhostPaginationRangeEntry
