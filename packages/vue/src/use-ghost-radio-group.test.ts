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

  it('does not auto-select when items register without a default', () => {
    const group = useGhostRadioGroup()
    group.registerItem('a', false, () => null)
    group.registerItem('b', false, () => null)
    expect(group.selectedValue.value).toBeUndefined()
  })

  it('clears uncontrolled selection when the selected item unregisters', () => {
    const group = useGhostRadioGroup({ defaultValue: 'b' })
    group.registerItem('a', false, () => null)
    group.registerItem('b', false, () => null)

    group.unregisterItem('b')
    expect(group.selectedValue.value).toBeUndefined()
  })

  it('does not emit when a controlled selected item unregisters', () => {
    const emitted: string[] = []
    const group = useGhostRadioGroup({
      modelValue: 'b',
      onValueChange: (value) => {
        emitted.push(value)
      },
    })
    group.registerItem('a', false, () => null)
    group.registerItem('b', false, () => null)

    group.unregisterItem('b')
    expect(group.selectedValue.value).toBe('b')
    expect(emitted).toEqual([])
  })
})
