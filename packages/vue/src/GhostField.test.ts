import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostCheckbox from './GhostCheckbox.vue'
import GhostField from './GhostField.vue'
import GhostFieldControl from './GhostFieldControl.vue'
import GhostFieldDescription from './GhostFieldDescription.vue'
import GhostFieldError from './GhostFieldError.vue'
import GhostFieldLabel from './GhostFieldLabel.vue'
import GhostInput from './GhostInput.vue'

function mountWithNoVueWarnings(
  component: ReturnType<typeof defineComponent>,
): { wrapper: VueWrapper; warnings: string[] } {
  const warnings: string[] = []
  const wrapper = mount(component, {
    global: {
      config: {
        warnHandler: (message: string) => {
          warnings.push(message)
        },
      },
    },
  })
  return { wrapper, warnings }
}

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
              options?.error !== undefined
                ? h(GhostFieldError, {}, () => options.error ?? '')
                : null,
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, { ...field, modelValue: value.value }),
              }),
            ],
          )
      },
    }),
  )
}

describe('GhostField', () => {
  it('wires label for, control id, and describedby', async () => {
    const wrapper = mountInputField({
      description: 'Shown on invoices.',
    })
    await flushPromises()
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
    await flushPromises()
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
    const error = wrapper.get('[data-part="error"]')
    expect(error.attributes('hidden')).toBeDefined()
    expect(error.attributes('role')).toBeUndefined()
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('toggles reactive error text in aria-describedby', async () => {
    const errorMessage = ref('')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
              h(GhostFieldError, {}, () => errorMessage.value),
            ])
        },
      }),
    )

    const input = () => wrapper.get('input')
    await nextTick()
    expect(input().attributes('aria-describedby')).toBeUndefined()
    expect(
      wrapper.get('[data-part="error"]').attributes('hidden'),
    ).toBeDefined()

    errorMessage.value = 'Too short'
    await nextTick()
    const errorId = wrapper.get('[data-part="error"]').attributes('id')
    expect(
      wrapper.get('[data-part="error"]').attributes('hidden'),
    ).toBeUndefined()
    expect(input().attributes('aria-describedby')).toBe(errorId)

    errorMessage.value = ''
    await nextTick()
    expect(
      wrapper.get('[data-part="error"]').attributes('hidden'),
    ).toBeDefined()
    expect(input().attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('toggles GhostFieldError with v-if', async () => {
    const showError = ref(false)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
              showError.value ? h(GhostFieldError, {}, () => 'Required') : null,
            ])
        },
      }),
    )

    const input = () => wrapper.get('input')
    await nextTick()
    expect(wrapper.find('[data-part="error"]').exists()).toBe(false)
    expect(input().attributes('aria-describedby')).toBeUndefined()

    showError.value = true
    await flushPromises()
    const errorId = wrapper.get('[data-part="error"]').attributes('id')
    expect(input().attributes('aria-describedby')).toBe(errorId)

    showError.value = false
    await nextTick()
    expect(wrapper.find('[data-part="error"]').exists()).toBe(false)
    expect(input().attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('includes description in aria-describedby only when visible', async () => {
    const hint = ref('')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, null, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldDescription, {}, () => hint.value),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await nextTick()
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()

    hint.value = 'Visible on receipts'
    await nextTick()
    const descriptionId = wrapper
      .get('[data-part="description"]')
      .attributes('id')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(
      descriptionId,
    )

    hint.value = ''
    await nextTick()
    expect(
      wrapper.get('[data-part="description"]').attributes('hidden'),
    ).toBeDefined()
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits no Vue warnings when error text changes', async () => {
    const errorMessage = ref('')
    const { wrapper, warnings } = mountWithNoVueWarnings(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
              h(GhostFieldError, {}, () => errorMessage.value),
            ])
        },
      }),
    )

    errorMessage.value = 'Too short'
    await nextTick()
    errorMessage.value = ''
    await nextTick()
    wrapper.unmount()
    expect(warnings).toEqual([])
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

  it('toggles error role and aria-describedby from a template parent', async () => {
    const wrapper = mount(
      defineComponent({
        components: {
          GhostField,
          GhostFieldControl,
          GhostFieldError,
          GhostFieldLabel,
        },
        template: `
          <GhostField :invalid="true">
            <GhostFieldLabel>Name</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <input type="text" v-bind="field" data-test="control" />
            </GhostFieldControl>
            <GhostFieldError v-if="showError">{{ message }}</GhostFieldError>
          </GhostField>
        `,
        setup() {
          const message = ref('')
          const showError = ref(true)
          return { message, showError }
        },
      }),
    )

    const error = () => wrapper.get('[data-part="error"]')
    const input = () => wrapper.get('[data-test="control"]')

    expect(error().attributes('hidden')).toBeDefined()
    expect(error().attributes('role')).toBeUndefined()
    expect(input().attributes('aria-describedby')).toBeUndefined()

    wrapper.vm.message = 'Required'
    await flushPromises()
    const errorId = error().attributes('id')
    expect(error().attributes('role')).toBe('alert')
    expect(error().attributes('hidden')).toBeUndefined()
    expect(input().attributes('aria-describedby')).toBe(errorId)

    wrapper.vm.message = ''
    await flushPromises()
    expect(error().attributes('hidden')).toBeDefined()
    expect(error().attributes('role')).toBeUndefined()
    expect(input().attributes('aria-describedby')).toBeUndefined()

    wrapper.vm.showError = false
    await nextTick()
    expect(wrapper.find('[data-part="error"]').exists()).toBe(false)
    expect(input().attributes('aria-describedby')).toBeUndefined()

    wrapper.vm.showError = true
    wrapper.vm.message = 'Required'
    await flushPromises()
    expect(error().attributes('role')).toBe('alert')
    expect(input().attributes('aria-describedby')).toBe(errorId)

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

  it('uses custom description and error ids in aria-describedby', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Email'),
              h(
                GhostFieldDescription,
                { id: 'custom-hint' },
                () => 'Work email only.',
              ),
              h(
                GhostFieldError,
                { id: 'custom-error' },
                () => 'Enter a valid email.',
              ),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    const input = wrapper.get('input')
    const description = wrapper.get('[data-part="description"]')
    const error = wrapper.get('[data-part="error"]')

    expect(description.attributes('id')).toBe('custom-hint')
    expect(error.attributes('id')).toBe('custom-error')
    expect(input.attributes('aria-describedby')).toBe(
      'custom-hint custom-error',
    )
    wrapper.unmount()
  })

  it('supports mixed custom and generated description/error ids', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Email'),
              h(
                GhostFieldDescription,
                { id: 'custom-hint' },
                () => 'Work email only.',
              ),
              h(GhostFieldError, {}, () => 'Enter a valid email.'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    const input = wrapper.get('input')
    const errorId = wrapper.get('[data-part="error"]').attributes('id') ?? ''

    expect(errorId).toMatch(/^ghost-field-error-/)
    expect(input.attributes('aria-describedby')).toBe(`custom-hint ${errorId}`)
    wrapper.unmount()
  })

  it('updates aria-describedby dynamically when custom ids change or fall back', async () => {
    const hintId = ref<string | undefined>('custom-hint')
    const errorId = ref<string | undefined>('custom-error')

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Username'),
              h(
                GhostFieldDescription,
                { id: hintId.value },
                () => 'Lowercase letters only.',
              ),
              h(GhostFieldError, { id: errorId.value }, () => 'Already taken.'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    const input = () => wrapper.get('input')
    const description = () => wrapper.get('[data-part="description"]')
    const error = () => wrapper.get('[data-part="error"]')

    expect(input().attributes('aria-describedby')).toBe(
      'custom-hint custom-error',
    )

    hintId.value = 'updated-hint'
    await flushPromises()
    expect(description().attributes('id')).toBe('updated-hint')
    expect(input().attributes('aria-describedby')).toBe(
      'updated-hint custom-error',
    )

    hintId.value = undefined
    errorId.value = ''
    await flushPromises()
    const fallbackHintId = description().attributes('id') ?? ''
    const fallbackErrorId = error().attributes('id') ?? ''
    expect(fallbackHintId).toMatch(/^ghost-field-description-/)
    expect(fallbackErrorId).toMatch(/^ghost-field-error-/)
    expect(input().attributes('aria-describedby')).toBe(
      `${fallbackHintId} ${fallbackErrorId}`,
    )
    wrapper.unmount()
  })

  it('clears custom ids from aria-describedby on unmount', async () => {
    const showDescription = ref(true)
    const showError = ref(true)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Token'),
              showDescription.value
                ? h(GhostFieldDescription, { id: 'custom-hint' }, () => 'Hint')
                : null,
              showError.value
                ? h(GhostFieldError, { id: 'custom-error' }, () => 'Error')
                : null,
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    const input = () => wrapper.get('input')
    expect(input().attributes('aria-describedby')).toBe(
      'custom-hint custom-error',
    )

    showError.value = false
    await flushPromises()
    expect(input().attributes('aria-describedby')).toBe('custom-hint')

    showDescription.value = false
    await flushPromises()
    expect(input().attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it('inspects content when GhostFieldDescription and GhostFieldError use component hosts', async () => {
    const CustomDescription = defineComponent({
      setup(_props, { attrs, slots }) {
        return () => h('p', attrs, slots['default']?.())
      },
    })
    const CustomError = defineComponent({
      setup(_props, { attrs, slots }) {
        return () => h('span', attrs, slots['default']?.())
      },
    })

    const errorMessage = ref('Required field')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(
                GhostFieldDescription,
                { as: CustomDescription },
                () => 'Helpful hint',
              ),
              h(GhostFieldError, { as: CustomError }, () => errorMessage.value),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    const input = () => wrapper.get('input')
    const description = () => wrapper.get('[data-part="description"]')
    const error = () => wrapper.get('[data-part="error"]')

    const descriptionId = description().attributes('id') ?? ''
    const errorId = error().attributes('id') ?? ''
    expect(description().attributes('hidden')).toBeUndefined()
    expect(error().attributes('hidden')).toBeUndefined()
    expect(descriptionId).not.toBe('')
    expect(errorId).not.toBe('')
    expect(input().attributes('aria-describedby')).toBe(
      `${descriptionId} ${errorId}`,
    )

    errorMessage.value = ''
    await flushPromises()
    expect(error().attributes('hidden')).toBeDefined()
    expect(input().attributes('aria-describedby')).toBe(
      description().attributes('id'),
    )
    wrapper.unmount()
  })

  it('handles component hosts that render non-element nodes without throwing', async () => {
    const TextOnlyHost = defineComponent({
      inheritAttrs: false,
      setup(_props, { slots }) {
        return () => slots['default']?.()
      },
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldLabel, {}, () => 'Name'),
              h(GhostFieldDescription, { as: TextOnlyHost }, () => 'Text hint'),
              h(GhostFieldError, { as: TextOnlyHost }, () => 'Text error'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostInput, field),
              }),
            ])
        },
      }),
    )

    await flushPromises()
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })
})
