import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import BillingPreferences from '../../examples/select/billing-preferences.vue'

/*
 * select/billing-preferences is the Select page hero. These checks cover the
 * outcomes a screenshot cannot: field wiring on each trigger, the placeholder
 * and required currency, the disabled option and disabled select, the short
 * trigger label from `textValue`, and the submitted values.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(BillingPreferences, { attachTo: document.body })
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
  ].find((candidate) => candidate.textContent.trim().startsWith(name))
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

describe('select/billing-preferences example', () => {
  it('renders labelled combobox triggers with selected values and a placeholder', async () => {
    mountExample()
    await flushPromises()

    const plan = triggerLabelled('Plan')
    expect(plan.getAttribute('role')).toBe('combobox')
    // textValue keeps the price line out of the trigger.
    expect(plan.textContent.trim()).toBe('Team')
    expect(plan.getAttribute('aria-describedby')).toBeTruthy()

    const currency = triggerLabelled('Invoice currency')
    expect(currency.textContent.trim()).toBe('Choose a currency')
    expect(
      currency.querySelector('[data-part="value"]')?.hasAttribute('data-state'),
    ).toBe(false)
    expect(currency.getAttribute('aria-required')).toBe('true')
    expect(currency.getAttribute('aria-invalid')).toBeNull()

    expect(triggerLabelled('Invoice delivery').textContent.trim()).toMatch(
      /^Email the PDF invoice to finance@/,
    )
    expect(triggerLabelled('Tax region').disabled).toBe(true)
  })

  it('lists Enterprise as a disabled option that cannot be selected', async () => {
    mountExample()
    await flushPromises()
    const plan = triggerLabelled('Plan')

    await choose(plan, 'Enterprise')
    const enterprise = option('Enterprise')
    expect(enterprise.getAttribute('aria-disabled')).toBe('true')
    expect(plan.textContent.trim()).toBe('Team')

    option('Business').click()
    await flushPromises()
    expect(plan.textContent.trim()).toBe('Business')
    expect(document.querySelector('[role="listbox"]:not([aria-hidden])')).toBe(
      null,
    )
  })

  it('blocks save without a currency and focuses its trigger', async () => {
    const wrapper = mountExample()
    await flushPromises()
    const currency = triggerLabelled('Invoice currency')

    await submit(wrapper)
    expect(currency.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(currency)
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Choose an invoice currency.',
    )
    expect(wrapper.get('[role="status"]').text()).toBe('')

    // Choosing a currency clears the error without another save.
    await choose(currency, 'Euro')
    expect(currency.getAttribute('aria-invalid')).toBeNull()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('saves the chosen preferences and submits each named value', async () => {
    const wrapper = mountExample()
    await flushPromises()

    await choose(triggerLabelled('Billing cycle'), 'Monthly')
    await choose(triggerLabelled('Invoice currency'), 'Euro')
    await submit(wrapper)

    expect(wrapper.get('[role="status"]').text()).toBe(
      'Preferences saved. Team plan, billed monthly in EUR.',
    )
    const data = new FormData(wrapper.get('form').element)
    expect(Object.fromEntries(data)).toEqual({
      plan: 'team',
      cycle: 'monthly',
      currency: 'eur',
      delivery: 'finance',
    })

    // Editing again clears the saved message.
    await choose(triggerLabelled('Plan'), 'Starter')
    expect(wrapper.get('[role="status"]').text()).toBe('')
  })
})
