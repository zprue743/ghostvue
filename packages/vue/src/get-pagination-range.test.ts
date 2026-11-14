import { describe, expect, it } from 'vitest'

import { getPaginationRange } from './get-pagination-range'

describe('getPaginationRange', () => {
  it('returns every page when the count is small', () => {
    expect(
      getPaginationRange({
        page: 2,
        pageCount: 5,
        siblingCount: 1,
        boundaryCount: 1,
      }),
    ).toEqual([
      { type: 'page', page: 1 },
      { type: 'page', page: 2 },
      { type: 'page', page: 3 },
      { type: 'page', page: 4 },
      { type: 'page', page: 5 },
    ])
  })

  it('inserts start and end ellipsis for large counts', () => {
    expect(
      getPaginationRange({
        page: 10,
        pageCount: 20,
        siblingCount: 1,
        boundaryCount: 1,
      }),
    ).toEqual([
      { type: 'page', page: 1 },
      { type: 'ellipsis', placement: 'start' },
      { type: 'page', page: 9 },
      { type: 'page', page: 10 },
      { type: 'page', page: 11 },
      { type: 'ellipsis', placement: 'end' },
      { type: 'page', page: 20 },
    ])
  })

  it('clamps invalid page counts and pages', () => {
    expect(getPaginationRange({ page: 0, pageCount: 0 })).toEqual([
      { type: 'page', page: 1 },
    ])
    expect(getPaginationRange({ page: 99, pageCount: 3 })).toEqual([
      { type: 'page', page: 1 },
      { type: 'page', page: 2 },
      { type: 'page', page: 3 },
    ])
  })

  it('falls back when sibling and boundary counts are invalid', () => {
    expect(
      getPaginationRange({
        page: 5,
        pageCount: 10,
        siblingCount: Number.NaN,
        boundaryCount: -2,
      }),
    ).toEqual(
      getPaginationRange({
        page: 5,
        pageCount: 10,
        siblingCount: 1,
        boundaryCount: 1,
      }),
    )
  })
})
