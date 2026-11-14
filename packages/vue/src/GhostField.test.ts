import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

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

  it('renders deterministic SSR markup without a mounted root ref', () => {
    const wrapper = mount(GhostField, {
      slots: { default: 'Child' },
    })
    expect(wrapper.get('.ghost-field').attributes('data-ghost-field')).toBe('')
    expect(wrapper.get('.ghost-field').attributes('data-part')).toBe('root')
    wrapper.unmount()
  })

  function buildInvalidFieldTree(order: 'error-before-control' | 'canonical') {
    const label = h(GhostFieldLabel, {}, () => 'Name')
    const error = h(GhostFieldError, {}, () => 'Required')
    const control = h(GhostFieldControl, null, {
      default: (field: Record<string, unknown>) =>
        h('input', { type: 'text', ...field }),
    })
    const children =
      order === 'canonical' ? [label, control, error] : [label, error, control]
    return () => h(GhostField, { invalid: true }, () => children)
  }

  function expectVisibleErrorSsrMarkup(html: string) {
    const errorTagPattern = /<[^>]+data-part="error"[^>]*>/
    const errorTag = errorTagPattern.exec(html)?.[0] ?? ''
    expect(html).toContain('data-part="error"')
    expect(html).toContain('role="alert"')
    expect(errorTag).not.toContain('hidden')
    expect(html).toContain('Required')
    expect(html).toContain('aria-invalid="true"')
    return errorTag
  }

  it('exposes non-empty GhostFieldError during SSR when error renders before control', async () => {
    const Comp = defineComponent({
      setup() {
        return buildInvalidFieldTree('error-before-control')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    const errorTag = expectVisibleErrorSsrMarkup(html)
    const errorId = /\bid="([^"]+)"/.exec(errorTag)?.[1]
    const controlDescribedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1]

    expect(errorId).toBeDefined()
    expect(controlDescribedBy).toBeUndefined()
  })

  it('exposes non-empty GhostFieldError during SSR in canonical child order', async () => {
    const Comp = defineComponent({
      setup() {
        return buildInvalidFieldTree('canonical')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expectVisibleErrorSsrMarkup(html)
    expect(html).not.toContain('aria-describedby')
  })

  it('keeps empty GhostFieldError hidden during SSR', async () => {
    const Comp = defineComponent({
      setup() {
        return () =>
          h(GhostField, null, () => [
            h(GhostFieldLabel, {}, () => 'Name'),
            h(GhostFieldControl, null, {
              default: (field: Record<string, unknown>) =>
                h('input', { type: 'text', ...field }),
            }),
            h(GhostFieldError),
          ])
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toMatch(/data-part="error"[^>]*hidden/)
    expect(html).not.toMatch(/data-part="error"[^>]*role="alert"/)
    expect(html).not.toContain('aria-describedby')
  })

  it.each(['error-before-control', 'canonical'] as const)(
    'hydrates GhostFieldError in %s order without console warnings',
    async (order) => {
      const Comp = defineComponent({
        setup() {
          return buildInvalidFieldTree(order)
        },
      })

      const html = await renderToString(createSSRApp(Comp))
      const container = document.createElement('div')
      container.innerHTML = html
      document.body.append(container)

      const output: string[] = []
      const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
        output.push(args.map(String).join(' '))
      })
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation((...args) => {
          output.push(args.map(String).join(' '))
        })

      createSSRApp(Comp).mount(container)

      const errorEl = container.querySelector('[data-part="error"]')
      expect(errorEl?.getAttribute('role')).toBe('alert')
      expect(errorEl?.hasAttribute('hidden')).toBe(false)
      expect(output).toEqual([])

      warn.mockRestore()
      errorSpy.mockRestore()
      container.remove()
    },
  )
})
