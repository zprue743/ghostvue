import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  formatSlopCodeMessage,
  logSlopCode,
  retiredSlopCodes,
  SLOP_CODE_DOCS_URL,
  slopCodes,
  type SlopCode,
} from './dev-codes'

const CODE_PATTERN = /^SLOP\d{3}$/

describe('slop diagnostic codes', () => {
  it('assigns unique SLOP0xx keys that are never listed as retired', () => {
    const active = Object.keys(slopCodes)
    const retired = Object.keys(retiredSlopCodes)
    const assigned = [...active, ...retired]

    expect(active.length).toBeGreaterThan(0)
    expect(new Set(assigned).size).toBe(assigned.length)
    for (const code of assigned) {
      expect(code).toMatch(CODE_PATTERN)
    }
  })

  it('formats the catalog message with a code prefix and docs URL', () => {
    expect(
      formatSlopCodeMessage('SLOP001', {
        from: 'controlled',
        to: 'uncontrolled',
      }),
    ).toBe(
      `[slop-ui SLOP001] A component switched from controlled to uncontrolled. Pass the value prop for the lifetime of the instance, or omit it and use default*. See ${SLOP_CODE_DOCS_URL}#slop001`,
    )
  })

  it('leaves unknown placeholders in the message', () => {
    expect(formatSlopCodeMessage('SLOP001')).toContain('from {from} to {to}')
  })

  it('logs warnings through console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logSlopCode('SLOP001', { from: 'uncontrolled', to: 'controlled' })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      formatSlopCodeMessage('SLOP001', {
        from: 'uncontrolled',
        to: 'controlled',
      }),
    )
    warn.mockRestore()
  })

  it('narrows SlopCode to assigned catalog keys', () => {
    expectTypeOf<SlopCode>().toEqualTypeOf<'SLOP001'>()
  })
})
