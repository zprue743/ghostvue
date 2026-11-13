import { describe, expect, it } from 'vitest'

import {
  flagshipThemes,
  themeNames,
} from '../../packages/themes/src/flagship-themes'

describe('flagshipThemes and themeNames', () => {
  it('exports the built-in flagship theme names in order', () => {
    expect(flagshipThemes).toEqual(['calm', 'vibrant', 'mono'])
  })

  it('prepends default to flagshipThemes in themeNames without duplicates', () => {
    expect(themeNames).toEqual(['default', 'calm', 'vibrant', 'mono'])
    expect(new Set(themeNames).size).toBe(themeNames.length)
  })
})
