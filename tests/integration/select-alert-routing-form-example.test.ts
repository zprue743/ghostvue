import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AlertRoutingForm from '../../examples/select/alert-routing-form.vue'

/*
 * select/alert-routing-form is the Select page's themed form workflow. These
 * checks cover the native form contract the preview teaches: named values in
 * FormData, the required owner failing checkValidity() and marking its
 * trigger invalid, keyboard selection, and native reset to default values.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(AlertRoutingForm, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
})

function triggerLabelled(name: string): HTMLButtonElement {
  const label = [...document.querySelectorAll('label')].find((candidate) =>
    candidate.textContent.trim().startsWith(name),
  )
  const id = label?.getAttribute('for')
  const trigger = id ? document.getElementById(id) : null
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error(`No trigger labelled ${name}`)
  }
  return trigger
}

function option(name: string): HTMLElement {
  const match = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((candidate) => candidate.textContent.trim() === name)
  if (!match) throw new Error(`No option ${name}`)
  return match
}

async function choose(trigger: HTMLButtonElement, name: string) {
  trigger.click()
  await flushPromises()
  option(name).click()
  await flushPromises()
}

async function submit(wrapper: ReturnType<typeof mountExample>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function submittedRows(wrapper: ReturnType<typeof mountExample>): string[] {
  return wrapper
    .findAll('.routing__entry')
    .map((row) =>
      [
        row.get('dt').text(),
        row.get('dd code').text(),
        row.get('.routing__entry-label').text(),
      ].join(' '),
    )
}

describe('select/alert-routing-form example', () => {
  it('starts on its default values with an empty required owner', async () => {
    mountExample()
    await flushPromises()

    expect(triggerLabelled('Minimum severity').textContent.trim()).toBe(
      'High and above',
    )
    expect(triggerLabelled('Notify by').textContent.trim()).toBe(
      'Post to #incidents',
    )
    const owner = triggerLabelled('Escalation owner')
    expect(owner.textContent.trim()).toBe('Choose an owner')
    expect(owner.getAttribute('aria-required')).toBe('true')
    expect(owner.getAttribute('aria-invalid')).toBeNull()
  })

  it('blocks submit through native validation and focuses the owner', async () => {
    const wrapper = mountExample()
    await flushPromises()
    const owner = triggerLabelled('Escalation owner')

    expect(wrapper.get('form').element.checkValidity()).toBe(false)
    await submit(wrapper)
    expect(owner.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(owner)
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Choose who gets escalations.',
    )
    expect(wrapper.find('.routing__submitted').exists()).toBe(false)

    await choose(owner, 'Payments on-call')
    expect(owner.getAttribute('aria-invalid')).toBeNull()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('selects with the keyboard and shows the submitted form data', async () => {
    const wrapper = mountExample()
    await flushPromises()
    const severity = triggerLabelled('Minimum severity')

    severity.focus()
    severity.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    await flushPromises()
    // Opening focuses the selected option; move down once and commit.
    expect(document.activeElement?.textContent.trim()).toBe('High and above')
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    await flushPromises()
    expect(document.activeElement?.textContent.trim()).toBe('Every alert')
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    expect(severity.textContent.trim()).toBe('Every alert')

    await choose(triggerLabelled('Escalation owner'), 'Support leads')
    await submit(wrapper)

    expect(
      Object.fromEntries(new FormData(wrapper.get('form').element)),
    ).toEqual({ severity: 'all', channel: 'slack', escalation: 'support' })
    expect(submittedRows(wrapper)).toEqual([
      'severity all Every alert',
      'channel slack Post to #incidents',
      'escalation support Support leads',
    ])
    expect(wrapper.get('[role="status"]').text()).toBe('Alert routing saved.')
  })

  it('native reset restores the default values and clears the output', async () => {
    const wrapper = mountExample()
    await flushPromises()

    await choose(triggerLabelled('Notify by'), 'Email the team list')
    await choose(triggerLabelled('Escalation owner'), 'Platform on-call')
    await submit(wrapper)
    expect(submittedRows(wrapper)).toHaveLength(3)

    wrapper.get('form').element.reset()
    await flushPromises()
    expect(triggerLabelled('Notify by').textContent.trim()).toBe(
      'Post to #incidents',
    )
    expect(triggerLabelled('Escalation owner').textContent.trim()).toBe(
      'Choose an owner',
    )
    expect(wrapper.find('.routing__submitted').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Form reset to the saved defaults.',
    )
  })
})
