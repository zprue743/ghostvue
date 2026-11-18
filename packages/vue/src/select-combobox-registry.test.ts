import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import type { UseGhostComboboxOptions } from './ghost-combobox'
import type { UseGhostSelectOptions } from './ghost-select'
import { useGhostCombobox } from './use-ghost-combobox'
import { useGhostSelect } from './use-ghost-select'

/*
 * GHO-176 regression suite: the Select / Combobox option registries no
 * longer copy an order array and two Maps per change, and Combobox no longer
 * rescans every option to announce a result count. These tests pin the
 * contract that the O(1) bookkeeping must keep: synchronous public state,
 * registration order semantics, reactive and cached labels, disabled
 * accounting in announcements, and per-option (not whole-list) invalidation.
 */

const hosts: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const host of hosts) {
    host.unmount()
  }
  hosts.length = 0
})

/** Runs a composable inside a component so `useId()` has an instance. */
function inHost<T>(setup: () => T): T {
  let result: T | undefined
  hosts.push(
    mount(
      defineComponent({
        setup() {
          result = setup()
          return () => null
        },
      }),
    ),
  )
  if (result === undefined) {
    throw new Error('composable did not run')
  }
  return result
}

const noElement = (): HTMLElement | null => null

function openCombobox(options: UseGhostComboboxOptions = {}) {
  const combobox = inHost(() =>
    useGhostCombobox({ defaultOpen: true, ...options }),
  )
  const register = (value: string, disabled = false, text = value): void => {
    combobox.registerOption(value, text, disabled, `id-${value}`, noElement)
  }
  return { combobox, register }
}

function createSelect(options: UseGhostSelectOptions = {}) {
  const select = inHost(() => useGhostSelect(options))
  const register = (value: string, disabled = false, text = value): void => {
    select.registerOption(value, text, disabled, noElement)
  }
  return { select, register }
}

describe('useGhostCombobox option registry', () => {
  it('updates order, count, text, and ids synchronously with registration order semantics', () => {
    const { combobox, register } = openCombobox()
    register('a')
    register('b')
    register('c')
    expect(combobox.optionOrder.value).toEqual(['a', 'b', 'c'])
    expect(combobox.optionCount.value).toBe(3)
    expect(combobox.getOptionId('b')).toBe('id-b')

    // Re-registering a mounted value keeps its slot; it does not append.
    register('a', false, 'Alpha')
    expect(combobox.optionOrder.value).toEqual(['a', 'b', 'c'])
    expect(combobox.getOptionText('a')).toBe('Alpha')

    // Unmount then remount appends, as a keyed remount registers anew.
    combobox.unregisterOption('a')
    expect(combobox.optionOrder.value).toEqual(['b', 'c'])
    expect(combobox.optionCount.value).toBe(2)
    expect(combobox.getOptionId('a')).toBeUndefined()
    register('a')
    expect(combobox.optionOrder.value).toEqual(['b', 'c', 'a'])

    // Unknown values are a no-op.
    combobox.unregisterOption('missing')
    expect(combobox.optionCount.value).toBe(3)
  })

  it('announces enabled result counts through register, disable toggles, replacement, and removal', () => {
    const { combobox, register } = openCombobox()
    register('a')
    register('b', true)
    register('c')
    expect(combobox.announceMessage.value).toBe('2 results available')

    combobox.setOptionDisabled('b', false)
    expect(combobox.announceMessage.value).toBe('3 results available')

    // Re-registering an existing value replaces its disabled state in place.
    register('c', true)
    expect(combobox.announceMessage.value).toBe('2 results available')
    expect(combobox.isOptionDisabled('c')).toBe(true)

    // Removing a disabled option does not change the enabled count.
    combobox.unregisterOption('c')
    expect(combobox.announceMessage.value).toBe('2 results available')
    combobox.unregisterOption('a')
    combobox.unregisterOption('b')
    expect(combobox.announceMessage.value).toBe('No results available')

    // A remounted option starts from its new disabled flag, not the old one.
    register('c')
    expect(combobox.announceMessage.value).toBe('1 results available')
  })

  it('reports zero results when the root is disabled', async () => {
    const { combobox, register } = openCombobox({ disabled: true })
    register('a')
    register('b')
    expect(combobox.isOptionDisabled('a')).toBe(true)
    expect(combobox.announceMessage.value).toBe('No results available')
    combobox.moveActiveFirst()
    expect(combobox.activeOptionValue.value).toBeUndefined()
    await nextTick()
  })

  it('keeps the cached label after unregistration and bumps labelVersion on text changes', () => {
    const { combobox, register } = openCombobox()
    register('a', false, 'Apple')
    const before = combobox.labelVersion.value
    combobox.setOptionTextValue('a', 'Apricot')
    expect(combobox.labelVersion.value).toBeGreaterThan(before)
    expect(combobox.getOptionText('a')).toBe('Apricot')
    combobox.unregisterOption('a')
    expect(combobox.getOptionText('a')).toBe('Apricot')
  })

  it('clears the active option when it unregisters', () => {
    const { combobox, register } = openCombobox()
    register('a')
    register('b')
    combobox.setActiveOptionByValue('b')
    expect(combobox.activeDescendantId.value).toBe('id-b')
    combobox.unregisterOption('b')
    expect(combobox.activeOptionValue.value).toBeUndefined()
    expect(combobox.activeDescendantId.value).toBeUndefined()
  })

  it("invalidates an option's own state only when that option changes", () => {
    const { combobox, register } = openCombobox()
    register('a', false, 'Apple')
    let evaluations = 0
    const optionState = computed(() => {
      evaluations += 1
      return `${String(combobox.isOptionDisabled('a'))}:${String(combobox.getOptionText('a'))}:${String(combobox.getOptionId('a'))}`
    })
    expect(optionState.value).toBe('false:Apple:id-a')
    expect(evaluations).toBe(1)

    for (let index = 0; index < 50; index += 1) {
      register(`sibling-${String(index)}`)
    }
    combobox.unregisterOption('sibling-0')
    combobox.setOptionDisabled('sibling-1', true)
    expect(optionState.value).toBe('false:Apple:id-a')
    expect(evaluations).toBe(1)

    combobox.setOptionDisabled('a', true)
    expect(optionState.value).toBe('true:Apple:id-a')
    expect(evaluations).toBe(2)
  })
})

describe('useGhostSelect option registry', () => {
  it('updates order and labels synchronously with registration order semantics', () => {
    const { select, register } = createSelect()
    register('a')
    register('b')
    register('b', false, 'Banana')
    expect(select.optionOrder.value).toEqual(['a', 'b'])
    expect(select.getOptionText('b')).toBe('Banana')
    select.unregisterOption('a')
    register('a')
    expect(select.optionOrder.value).toEqual(['b', 'a'])
    select.unregisterOption('b')
    expect(select.optionOrder.value).toEqual(['a'])
    expect(select.getOptionText('b')).toBe('Banana')
  })

  it('applies per-option and root disabled state', () => {
    const { select, register } = createSelect()
    register('a', true)
    expect(select.isOptionDisabled('a')).toBe(true)
    select.setOptionDisabled('a', false)
    expect(select.isOptionDisabled('a')).toBe(false)

    const { select: disabledRoot, register: registerDisabledRoot } =
      createSelect({ disabled: true })
    registerDisabledRoot('a')
    expect(disabledRoot.isOptionDisabled('a')).toBe(true)
  })

  it("invalidates an option's own state only when that option changes", () => {
    const { select, register } = createSelect()
    register('a', false, 'Apple')
    let evaluations = 0
    const optionState = computed(() => {
      evaluations += 1
      return `${String(select.isOptionDisabled('a'))}:${String(select.getOptionText('a'))}`
    })
    expect(optionState.value).toBe('false:Apple')

    for (let index = 0; index < 50; index += 1) {
      register(`sibling-${String(index)}`)
    }
    select.unregisterOption('sibling-0')
    expect(optionState.value).toBe('false:Apple')
    expect(evaluations).toBe(1)

    select.setOptionTextValue('a', 'Apricot')
    expect(optionState.value).toBe('false:Apricot')
    expect(evaluations).toBe(2)
  })
})
