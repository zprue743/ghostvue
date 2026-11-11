/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  applyDocsThemeHost,
  DOCS_DEFAULT_THEME,
  DOCS_THEME_STORAGE_KEY,
  restoreDocsThemeScript,
} from '../../apps/docs/.vitepress/theme/restore-theme'

describe('docs theme host', () => {
  it('stamps calm and slop-theme onto a bare html tag', () => {
    expect(applyDocsThemeHost('<html lang="en-US">')).toBe(
      '<html class="slop-theme" data-sl-theme="calm" lang="en-US">',
    )
  })

  it('keeps an existing dark class from the appearance script', () => {
    expect(applyDocsThemeHost('<html lang="en-US" class="dark">')).toBe(
      '<html data-sl-theme="calm" lang="en-US" class="slop-theme dark">',
    )
  })

  it('restores a persisted theme from localStorage before paint', () => {
    expect(restoreDocsThemeScript).toContain('localStorage.getItem')
    expect(restoreDocsThemeScript).toContain(DOCS_THEME_STORAGE_KEY)
    expect(restoreDocsThemeScript).toContain('data-sl-theme')
    expect(restoreDocsThemeScript).toContain(DOCS_DEFAULT_THEME)
    expect(restoreDocsThemeScript).not.toContain('async')
    expect(restoreDocsThemeScript).not.toContain('defer')
  })
})
