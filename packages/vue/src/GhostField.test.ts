import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import GhostCheckbox from './GhostCheckbox.vue'
import GhostField from './GhostField.vue'
import GhostFieldControl from './GhostFieldControl.vue'
import GhostFieldDescription from './GhostFieldDescription.vue'
import GhostFieldError from './GhostFieldError.vue'
import GhostFieldLabel from './GhostFieldLabel.vue'
import GhostInput from './GhostInput.vue'

function mountInputField(options?: {
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  error?: string
  description?: string
}) {
  return mount(
    defineComponent({
      setup() {
        const value = ref('')
        return () =>
          h(
            GhostField,
            {
              invalid: options?.invalid ?? false,
              disabled: options?.disabled ?? false,
              required: options?.required ?? false,
            },
            () => [
              h(GhostFieldLabel, {}, () => 'Workspace name'),
              options?.description
                ? h(GhostFieldDescription, {}, () => options.description ?? '')
                : null,
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, { ...field, modelValue: value.value }),
              }),
              options?.error
                ? h(GhostFieldError, {}, () => options.error ?? '')
                : null,
            ],
          )
      },
    }),
  )
}

describe('GhostField', () => {
  it('wires label for, control id, and describedby', () => {
    const wrapper = mountInputField({
      description: 'Shown on invoices.',
    })
    const input = wrapper.get('input')
    const label = wrapper.get('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-describedby')).toContain(
      wrapper.get('[data-part="description"]').attributes('id'),
    )
    wrapper.unmount()
  })

  it('includes error id in aria-describedby when invalid', async () => {
    const wrapper = mountInputField({
      invalid: true,
      error: 'Enter at least three characters.',
    })
    await nextTick()
    await nextTick()
    const input = wrapper.get('input')
    const error = wrapper.get('[data-part="error"]')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain(
      error.attributes('id'),
    )
    expect(error.text()).toBe('Enter at least three characters.')
    wrapper.unmount()
  })

  it('omits empty error from the accessibility tree', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(GhostFieldLabel, {}, () => 'Title'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
              h(GhostFieldError),
            ])
        },
      }),
    )
    expect(wrapper.find('[data-part="error"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('propagates disabled and required to the control', () => {
    const wrapper = mountInputField({ disabled: true, required: true })
    const input = wrapper.get('input')
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.attributes('required')).toBeDefined()
    expect(wrapper.get('.ghost-field').attributes('data-state')).toBe(
      'disabled',
    )
    wrapper.unmount()
  })

  it('prefers invalid data-state over disabled', () => {
    const wrapper = mountInputField({ disabled: true, invalid: true })
    expect(wrapper.get('.ghost-field').attributes('data-state')).toBe('invalid')
    wrapper.unmount()
  })

  it('associates a wrapping label with a checkbox', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(
                GhostFieldLabel,
                { associate: 'wrap' },
                {
                  default: () => [
                    h(GhostFieldControl, null, {
                      default: (field: Record<string, unknown>) =>
                        h(GhostCheckbox, field),
                    }),
                    ' Email me digest summaries',
                  ],
                },
              ),
            ])
        },
      }),
    )
    const label = wrapper.get('label')
    expect(label.attributes('for')).toBeUndefined()
    expect(label.find('input[type="checkbox"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('honors a custom control id on the root', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { id: 'custom-filter-id' }, () => [
              h(GhostFieldLabel, {}, () => 'Filter'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )
    expect(wrapper.get('input').attributes('id')).toBe('custom-filter-id')
    expect(wrapper.get('label').attributes('for')).toBe('custom-filter-id')
    wrapper.unmount()
  })

  it('shows a required marker on the label', () => {
    const wrapper = mountInputField({ required: true })
    expect(wrapper.get('[data-part="required-indicator"]').text()).toContain(
      '*',
    )
    wrapper.unmount()
  })

  it('renders deterministic SSR markup without a mounted root ref', () => {
    const wrapper = mount(GhostField, {
      slots: { default: 'Child' },
    })
    expect(wrapper.get('.ghost-field').attributes('data-ghost-field')).toBe('')
    expect(wrapper.get('.ghost-field').attributes('data-part')).toBe('root')
    wrapper.unmount()
  })
})
