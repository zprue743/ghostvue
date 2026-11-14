import { describe, expect, it } from 'vitest'

import { useGhostRadioGroup } from './use-ghost-radio-group'

describe('useGhostRadioGroup', () => {
  it('applyFormReset restores the captured default seed', () => {
    const group = useGhostRadioGroup({ defaultValue: 'starter' })
    const input = document.createElement('input')
    group.registerItem('starter', false, () => input)
    group.registerItem('pro', false, () => null)

    group.select('pro')
    expect(group.selectedValue.value).toBe('pro')

    group.applyFormReset()
    expect(group.selectedValue.value).toBe('starter')
  })
})
