import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import { waitForFormResetDeferral } from './form-reset'
import GhostNumberInput from './GhostNumberInput.vue'
import type { GhostNumberInputExposed } from './ghost-number-input'

describe('GhostNumberInput', () => {
  it('renders a spinbutton with increment and decrement controls', () => {
    const wrapper = mount(GhostNumberInput)
    expect(wrapper.get('[role="spinbutton"]').attributes('data-part')).toBe(
      'input',
    )
    expect(wrapper.find('[data-part="decrement"]').exists()).toBe(true)
    expect(wrapper.find('[data-part="increment"]').exists()).toBe(true)
    expect(wrapper.attributes('data-part')).toBe('root')
    expect(wrapper.classes()).toContain('ghost-number-input')
  })

  it('emits update:modelValue when increment is clicked', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { defaultValue: 2, min: 0, max: 10, step: 1 },
    })

    await wrapper.get('[data-part="increment"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])
  })

  it('clamps typed values on blur', async () => {
    const amount = ref(5)
    const Host = defineComponent({
      setup() {
        return () =>
          h(GhostNumberInput, {
            modelValue: amount.value,
            min: 0,
            max: 9,
            'onUpdate:modelValue': (value: number | null) => {
              amount.value = value ?? 0
            },
          })
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = '42'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    await nextTick()

    expect(amount.value).toBe(9)
    expect(input.value).toBe('9')
    wrapper.unmount()
  })

  it('steps with arrow keys', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 4, step: 2, min: 0, max: 10 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]')

    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])

    await wrapper.setProps({ modelValue: 6 })
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
    wrapper.unmount()
  })

  it('sets aria-valuemin, aria-valuemax, and aria-valuenow', () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 7, min: 1, max: 12 },
    })
    const input = wrapper.get('[role="spinbutton"]')

    expect(input.attributes('aria-valuemin')).toBe('1')
    expect(input.attributes('aria-valuemax')).toBe('12')
    expect(input.attributes('aria-valuenow')).toBe('7')
  })

  it('disables decrement at the minimum bound', () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 1, min: 1, max: 5 },
    })

    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get('[data-part="increment"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('applies data-state precedence for invalid over disabled', () => {
    const wrapper = mount(GhostNumberInput, {
      props: { invalid: true, disabled: true },
    })

    expect(wrapper.attributes('data-state')).toBe('invalid')
  })

  it('resets uncontrolled value after native form reset', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostNumberInput, { defaultValue: 3, min: 1, name: 'rows' }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    const hidden = wrapper.get('input[type="hidden"]')
      .element as HTMLInputElement

    input.value = '8'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    await nextTick()
    expect(input.value).toBe('8')

    wrapper.get('form').element.reset()
    await waitForFormResetDeferral()
    await nextTick()

    expect(input.value).toBe('3')
    expect(hidden.value).toBe('3')
    wrapper.unmount()
  })

  it('steps from a typed draft before ArrowUp commits it', async () => {
    const wrapper = mount(GhostNumberInput, {
      attachTo: document.body,
      props: { defaultValue: 25, step: 5, min: 0, max: 100 },
    })
    const input = wrapper.get('[role="spinbutton"]')

    await input.trigger('focus')
    await input.setValue('50')
    await input.trigger('keydown', { key: 'ArrowUp' })

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([55])
    expect((input.element as HTMLInputElement).value).toBe('55')
    wrapper.unmount()
  })

  it('steps from a typed draft under v-model before the parent re-renders', async () => {
    const model = ref<number | null>(25)
    const wrapper = mount(GhostNumberInput, {
      attachTo: document.body,
      props: {
        modelValue: model.value,
        step: 5,
        min: 0,
        max: 100,
        'onUpdate:modelValue': (next: number | null) => {
          model.value = next
        },
      },
    })
    const input = wrapper.get('[role="spinbutton"]')

    await input.trigger('focus')
    await input.setValue('50')
    await input.trigger('keydown', { key: 'ArrowUp' })

    expect(wrapper.emitted('update:modelValue')).toEqual([[50], [55]])
    wrapper.unmount()
  })

  it('reverts invalid blur text to the last committed value', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 12 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement

    input.focus()
    input.value = '12abc'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    await nextTick()

    expect(input.value).toBe('12')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('commits on Enter so a form submit sees the latest value', async () => {
    const amount = ref(10)
    const wrapper = mount(
      {
        setup() {
          return () =>
            h(
              'form',
              {
                onSubmit: (event: Event) => {
                  event.preventDefault()
                },
              },
              [
                h(GhostNumberInput, {
                  modelValue: amount.value,
                  name: 'qty',
                  step: 1,
                  'onUpdate:modelValue': (value: number | null) => {
                    amount.value = value ?? 0
                  },
                }),
                h('button', { type: 'submit' }, 'Go'),
              ],
            )
        },
      },
      { attachTo: document.body },
    )
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    const hidden = wrapper.get('input[type="hidden"]')
      .element as HTMLInputElement

    input.focus()
    input.value = '44'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await nextTick()

    expect(amount.value).toBe(44)
    expect(hidden.value).toBe('44')
    wrapper.unmount()
  })

  it('puts name on the hidden input and submits the machine value', () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 1234.5, name: 'amount', locale: 'de-DE' },
    })
    const spinbutton = wrapper.get('[role="spinbutton"]')
    const hidden = wrapper.get('input[type="hidden"]')

    expect(spinbutton.attributes('name')).toBeUndefined()
    expect(hidden.attributes('name')).toBe('amount')
    expect((hidden.element as HTMLInputElement).value).toBe('1234.5')
    expect((spinbutton.element as HTMLInputElement).value).toContain('1')
  })

  it('exposes focus and increment through the template ref', async () => {
    const component = ref<GhostNumberInputExposed | null>(null)
    const Host = defineComponent({
      setup() {
        return () =>
          h(GhostNumberInput, {
            ref: component,
            defaultValue: 2,
            min: 0,
            max: 20,
          })
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })

    component.value?.focus()
    expect(document.activeElement).toBe(
      wrapper.get('[role="spinbutton"]').element,
    )

    component.value?.increment()
    await nextTick()
    expect(component.value?.element?.value).toBe('3')
    wrapper.unmount()
  })

  it('ignores increment when readonly', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 4, readonly: true },
    })

    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('jumps to min and max with Home and End', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 5, min: 1, max: 9 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]')

    await input.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])

    await wrapper.setProps({ modelValue: 1 })
    await input.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([9])
    wrapper.unmount()
  })

  it('treats Home as a caret move when min is unset', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 1200.5, locale: 'en-US', max: 9999 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    input.focus()
    await nextTick()
    const before = input.value
    input.setSelectionRange(3, 3)

    const event = new KeyboardEvent('keydown', {
      key: 'Home',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(input.value).toBe(before)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('treats End as a caret move when max is unset', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 1200.5, locale: 'en-US', min: 0 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]').element as HTMLInputElement
    input.focus()
    await nextTick()
    const before = input.value
    input.setSelectionRange(3, 3)

    const event = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(input.value).toBe(before)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('steps ten times with PageUp and PageDown', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 0, step: 1, max: 100 },
      attachTo: document.body,
    })
    const input = wrapper.get('[role="spinbutton"]')

    await input.trigger('keydown', { key: 'PageUp' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])

    await wrapper.setProps({ modelValue: 10 })
    await input.trigger('keydown', { key: 'PageDown' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
    wrapper.unmount()
  })

  it('renders deterministically on the server', async () => {
    const html = await renderToString(
      h(GhostNumberInput, { defaultValue: 4, min: 0, max: 10 }),
    )
    expect(html).toContain('role="spinbutton"')
    expect(html).toContain('ghost-number-input')
  })
})
