import { describe, expect, it } from 'vitest'

import { useGhostToggleGroup } from './use-ghost-toggle-group'

describe('useGhostToggleGroup', () => {
  it('defaults multiple mode to an empty array', () => {
    const group = useGhostToggleGroup({ type: 'multiple' })
    expect(group.modelValue.value).toEqual([])
  })

  it('rejects toggling disabled registry entries', () => {
    const updates: unknown[] = []
    const group = useGhostToggleGroup({
      type: 'single',
      defaultValue: 'a',
      onValueChange: (value) => {
        updates.push(value)
      },
    })
    group.registerItem('a', false)
    group.registerItem('b', true)
    group.toggle('b')
    expect(updates).toHaveLength(0)
    expect(group.modelValue.value).toBe('a')
  })

  it('emits array order following registration order in multiple mode', () => {
    const updates: string[][] = []
    const group = useGhostToggleGroup({
      type: 'multiple',
      onValueChange: (value) => {
        if (Array.isArray(value)) {
          updates.push(value)
        }
      },
    })
    group.registerItem('b', false)
    group.registerItem('a', false)
    group.toggle('a')
    group.toggle('b')
    expect(updates.at(-1)).toEqual(['a', 'b'])
  })
})
