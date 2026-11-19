import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NotificationPreferences from '../../examples/checkbox/notification-preferences.vue'

type Wrapper = VueWrapper<InstanceType<typeof NotificationPreferences>>

function checkboxNamed(wrapper: Wrapper, name: string): HTMLInputElement {
  const label = wrapper
    .findAll('label')
    .find((candidate) => candidate.text() === name)
  if (!label) throw new Error(`No label named ${name}`)
  const id = label.attributes('for')
  if (!id) throw new Error(`Label ${name} is not associated`)
  const input = wrapper.find(`input[id="${id}"]`)
  if (!input.exists()) throw new Error(`No checkbox for ${name}`)
  return input.element as HTMLInputElement
}

async function mountPreferences(): Promise<Wrapper> {
  const wrapper = mount(NotificationPreferences, { attachTo: document.body })
  // Field descriptions register after mount.
  await flushPromises()
  return wrapper
}

async function toggle(input: HTMLInputElement): Promise<void> {
  input.click()
  await flushPromises()
}

describe('checkbox/notification-preferences example', () => {
  it('labels every option and links its description', async () => {
    const wrapper = await mountPreferences()
    const inputs = wrapper.findAll('input[type="checkbox"]')
    expect(inputs).toHaveLength(6)
    for (const input of inputs) {
      const id = input.attributes('id') ?? ''
      expect(id).not.toBe('')
      expect(wrapper.find(`label[for="${id}"]`).exists()).toBe(true)
      const describedBy = input.attributes('aria-describedby') ?? ''
      expect(describedBy).not.toBe('')
      expect(wrapper.find(`[id="${describedBy}"]`).text()).not.toBe('')
      // Field slot props must not leak a raw `invalid` attribute.
      expect(input.attributes('invalid')).toBeUndefined()
    }
    wrapper.unmount()
  })

  it('starts with a mixed select-all derived from its children', async () => {
    const wrapper = await mountPreferences()
    const all = checkboxNamed(wrapper, 'All project activity')
    expect(all.indeterminate).toBe(true)
    expect(all.checked).toBe(false)
    expect(all.dataset['state']).toBe('indeterminate')
    expect(wrapper.text()).toContain('2 of 3 on')

    expect(checkboxNamed(wrapper, 'Comments and mentions').checked).toBe(true)
    expect(checkboxNamed(wrapper, 'Task assignments').checked).toBe(true)
    expect(checkboxNamed(wrapper, 'Weekly digest').checked).toBe(false)
    wrapper.unmount()
  })

  it('select-all sets every child, and children resolve the mixed state', async () => {
    const wrapper = await mountPreferences()
    const all = checkboxNamed(wrapper, 'All project activity')
    const digest = checkboxNamed(wrapper, 'Weekly digest')

    // Native activation of a mixed box checks it; every child follows.
    await toggle(all)
    expect(all.checked).toBe(true)
    expect(all.indeterminate).toBe(false)
    expect(digest.checked).toBe(true)
    expect(wrapper.text()).toContain('3 of 3 on')

    await toggle(all)
    expect(all.checked).toBe(false)
    expect(checkboxNamed(wrapper, 'Comments and mentions').checked).toBe(false)
    expect(wrapper.text()).toContain('0 of 3 on')

    await toggle(digest)
    expect(all.indeterminate).toBe(true)
    expect(all.dataset['state']).toBe('indeterminate')
    wrapper.unmount()
  })

  it('keeps the required security alert checked and disabled', async () => {
    const wrapper = await mountPreferences()
    const security = checkboxNamed(wrapper, 'Security alerts')
    expect(security.checked).toBe(true)
    expect(security.disabled).toBe(true)
    expect(
      wrapper
        .findAll('[data-part="root"][data-state="disabled"]')
        .some((field) => field.text().includes('Security alerts')),
    ).toBe(true)
    wrapper.unmount()
  })

  it('submits only enabled, checked options and restores defaults', async () => {
    const wrapper = await mountPreferences()
    const form = wrapper.get('form').element
    const billing = checkboxNamed(wrapper, 'Billing receipts')
    await toggle(billing)

    expect(new FormData(form).getAll('notifications')).toEqual([
      'mentions',
      'assignments',
      'billing',
    ])

    const status = wrapper.get('[role="status"]')
    await wrapper.get('form').trigger('submit')
    expect(status.text()).toBe('Preferences saved.')

    // A change after saving clears the stale confirmation.
    await toggle(checkboxNamed(wrapper, 'Weekly digest'))
    expect(status.text()).toBe('')

    const restore = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Restore defaults')
    await restore?.trigger('click')
    await flushPromises()
    expect(billing.checked).toBe(false)
    expect(checkboxNamed(wrapper, 'Weekly digest').checked).toBe(false)
    expect(checkboxNamed(wrapper, 'All project activity').indeterminate).toBe(
      true,
    )
    wrapper.unmount()
  })
})
