import { describe, expect, it } from 'vitest'

import { findTypeaheadMatch } from './typeahead-match'

const items = ['Alpha', 'Apple', 'Banana', 'New folder', 'New file']
const text = (item: string) => item

describe('findTypeaheadMatch', () => {
  it('moves forward from the active item on single characters and wraps', () => {
    expect(findTypeaheadMatch(items, 'a', 'Alpha', text)).toBe('Apple')
    expect(findTypeaheadMatch(items, 'a', 'Apple', text)).toBe('Alpha')
    expect(findTypeaheadMatch(items, 'b', undefined, text)).toBe('Banana')
  })

  it('keeps the active item while a longer prefix still matches it', () => {
    expect(findTypeaheadMatch(items, 'new f', 'New folder', text)).toBe(
      'New folder',
    )
    expect(findTypeaheadMatch(items, 'new fi', 'New folder', text)).toBe(
      'New file',
    )
  })

  it('cycles repeated characters and reports misses', () => {
    expect(findTypeaheadMatch(items, 'aa', 'Alpha', text)).toBe('Apple')
    expect(findTypeaheadMatch(items, 'zz', undefined, text)).toBeUndefined()
    expect(findTypeaheadMatch(items, 'xy', undefined, text)).toBeUndefined()
    expect(findTypeaheadMatch(items, '  ', undefined, text)).toBeUndefined()
    expect(findTypeaheadMatch([], 'a', undefined, text)).toBeUndefined()
  })
})
