import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  formatGhostCodeMessage,
  logGhostCode,
  retiredGhostCodes,
  warnGhostDeprecation,
  GHOST_CODE_DOCS_URL,
  ghostCodes,
  type GhostCode,
} from './dev-codes'

const CODE_PATTERN = /^GHOST\d{3}$/

describe('ghost diagnostic codes', () => {
  it('assigns unique GHOST0xx keys that are never listed as retired', () => {
    const active = Object.keys(ghostCodes)
    const retired = Object.keys(retiredGhostCodes)
    const assigned = [...active, ...retired]

    expect(active.length).toBeGreaterThan(0)
    expect(new Set(assigned).size).toBe(assigned.length)
    for (const code of assigned) {
      expect(code).toMatch(CODE_PATTERN)
    }
  })

  it('formats the catalog message with a code prefix and docs URL', () => {
    expect(
      formatGhostCodeMessage('GHOST001', {
        from: 'controlled',
        to: 'uncontrolled',
      }),
    ).toBe(
      `[ghostvue GHOST001] A component switched from controlled to uncontrolled. Pass the value prop for the lifetime of the instance, or omit it and use default*. See ${GHOST_CODE_DOCS_URL}#ghost001`,
    )
  })

  it('leaves unknown placeholders in the message', () => {
    expect(formatGhostCodeMessage('GHOST001')).toContain('from {from} to {to}')
  })

  it('logs warnings through console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logGhostCode('GHOST001', { from: 'uncontrolled', to: 'controlled' })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      formatGhostCodeMessage('GHOST001', {
        from: 'uncontrolled',
        to: 'controlled',
      }),
    )
    warn.mockRestore()
  })

  it('narrows GhostCode to assigned catalog keys', () => {
    expectTypeOf<GhostCode>().toEqualTypeOf<
      'GHOST001' | 'GHOST002' | 'GHOST003' | 'GHOST004' | 'GHOST005'
    >()
  })

  it('reports deprecations with GHOST005 once per deprecated API', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const deprecation = {
      api: 'GhostFixture prop "size"',
      since: '0.4.0',
      removal: '0.5.0',
      migration: 'Use the themed wrapper size prop instead.',
    }

    warnGhostDeprecation(deprecation)
    warnGhostDeprecation(deprecation)
    warnGhostDeprecation({ ...deprecation, api: 'GhostFixture' })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenNthCalledWith(
      1,
      `[ghostvue GHOST005] GhostFixture prop "size" is deprecated since 0.4.0 and will be removed in 0.5.0. Use the themed wrapper size prop instead. See ${GHOST_CODE_DOCS_URL}#ghost005`,
    )
    expect(warn.mock.calls[1]?.[0]).toContain(
      '[ghostvue GHOST005] GhostFixture is deprecated',
    )
    warn.mockRestore()
  })
})
