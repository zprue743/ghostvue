import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostCheckbox from './GhostCheckbox.vue'
import type { GhostCheckboxExposed } from './ghost-checkbox'

describe('GhostCheckbox', () => {
  it('treats an omitted modelValue as uncontrolled', () => {
    const wrapper = mount(GhostCheckbox)

    expect(wrapper.props('modelValue')).toBeUndefined()
  })

  it('renders native checkbox semantics and defaults to unchecked', () => {
    const wrapper = mount(GhostCheckbox)
    const input = wrapper.get('input')

    expect(input.attributes('type')).toBe('checkbox')
    expect(input.classes()).toContain('ghost-checkbox')
    expect(input.attributes('data-part')).toBe('root')
    expect(input.attributes('data-state')).toBeUndefined()
    expect((input.element as HTMLInputElement).checked).toBe(false)
    expect((input.element as HTMLInputElement).indeterminate).toBe(false)
  })

  it('forwards native attributes and listeners to the input', async () => {
    const onChange = vi.fn()
    const wrapper = mount(GhostCheckbox, {
      attrs: {
        'aria-label': 'Select row',
        class: 'row-select',
        form: 'bulk-form',
        id: 'row-q3',
        name: 'selected',
        onChange,
        value: 'q3',
      },
    })

    const input = wrapper.get('input')
    await input.setValue(true)

    expect(input.attributes('aria-label')).toBe('Select row')
    expect(input.attributes('form')).toBe('bulk-form')
    expect(input.attributes('id')).toBe('row-q3')
    expect(input.attributes('name')).toBe('selected')
    expect(input.attributes('value')).toBe('q3')
    expect(input.classes()).toContain('ghost-checkbox')
    expect(input.classes()).toContain('row-select')
    expect(onChange).toHaveBeenCalledOnce()
    expect((input.element as HTMLInputElement).checked).toBe(true)
  })

  it('toggles uncontrolled state from pointer activation', async () => {
    const wrapper = mount(GhostCheckbox)
    const input = wrapper.get('input').element as HTMLInputElement

    // jsdom `click()` toggles `checked` without firing `change` on a `:checked` input.
    await wrapper.get('input').setValue(true)

    expect(input.checked).toBe(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(wrapper.get('input').attributes('data-state')).toBe('checked')
  })

  it('seeds uncontrolled state from defaultValue', () => {
    const wrapper = mount(GhostCheckbox, { props: { defaultValue: true } })
    const input = wrapper.get('input').element as HTMLInputElement

    expect(input.checked).toBe(true)
    expect(wrapper.get('input').attributes('data-state')).toBe('checked')
  })

  it('keeps a controlled model when the parent ignores the emit', async () => {
    const wrapper = mount(GhostCheckbox, {
      attachTo: document.body,
      props: { modelValue: false },
    })
    const input = wrapper.get('input').element as HTMLInputElement

    await wrapper.get('input').setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(input.checked).toBe(false)
    expect(wrapper.get('input').attributes('data-state')).toBeUndefined()
    wrapper.unmount()
  })

  it('follows a controlled v-model from the parent', async () => {
    const model = ref(false)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostCheckbox, {
              modelValue: model.value,
              'onUpdate:modelValue': (value: boolean) => {
                model.value = value
              },
            })
        },
      }),
    )

    await wrapper.get('input').setValue(true)

    expect(model.value).toBe(true)
    expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('keeps the native checked state equal to a v-model parent after nextTick', async () => {
    const Host = defineComponent({
      components: { GhostCheckbox },
      setup() {
        const accepted = ref(false)
        return { accepted }
      },
      template: '<GhostCheckbox v-model="accepted" />',
    })
    const wrapper = mount(Host, { attachTo: document.body })
    const input = wrapper.get('input').element as HTMLInputElement

    await wrapper.get('input').setValue(true)
    await nextTick()

    expect(wrapper.vm.accepted).toBe(true)
    expect(input.checked).toBe(wrapper.vm.accepted)
    wrapper.unmount()
  })

  it('applies mixed through the DOM property and data-state', async () => {
    const wrapper = mount(GhostCheckbox, {
      props: { indeterminate: true },
    })
    const input = wrapper.get('input').element as HTMLInputElement

    await nextTick()

    expect(input.indeterminate).toBe(true)
    expect(input.checked).toBe(false)
    expect(wrapper.get('input').attributes('data-state')).toBe('indeterminate')
  })

  it('keeps mixed data-state when checked and indeterminate overlap', async () => {
    const wrapper = mount(GhostCheckbox, {
      props: { modelValue: true, indeterminate: true },
    })
    const input = wrapper.get('input').element as HTMLInputElement

    await nextTick()

    expect(input.checked).toBe(true)
    expect(input.indeterminate).toBe(true)
    expect(wrapper.get('input').attributes('data-state')).toBe('indeterminate')
  })

  it('restores mixed after native click when the parent still passes it', async () => {
    const wrapper = mount(GhostCheckbox, {
      props: { indeterminate: true, modelValue: false },
    })
    const input = wrapper.get('input').element as HTMLInputElement

    await nextTick()
    await wrapper.get('input').setValue(true)
    await wrapper.setProps({ indeterminate: true, modelValue: false })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(input.indeterminate).toBe(true)
    expect(wrapper.get('input').attributes('data-state')).toBe('indeterminate')
  })

  it('restores native mixed when activation is rejected and props stay fixed', async () => {
    const wrapper = mount(GhostCheckbox, {
      attachTo: document.body,
      props: { indeterminate: true, modelValue: false },
    })
    const input = wrapper.get('input').element as HTMLInputElement

    await nextTick()
    expect(input.indeterminate).toBe(true)

    input.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(input.checked).toBe(false)
    expect(input.indeterminate).toBe(true)
    expect(wrapper.get('input').attributes('data-state')).toBe('indeterminate')
    wrapper.unmount()
  })

  it('prevents activation while disabled', () => {
    const onChange = vi.fn()
    const wrapper = mount(GhostCheckbox, {
      attrs: { onChange },
      props: { disabled: true },
    })
    const input = wrapper.get('input')

    input.element.click()

    expect(input.attributes()).toHaveProperty('disabled')
    expect((input.element as HTMLInputElement).checked).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('exposes the native element and focus controls', () => {
    const wrapper = mount(GhostCheckbox, { attachTo: document.body })
    const exposed = wrapper.vm as unknown as GhostCheckboxExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('input').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('participates in native form submission only when checked', async () => {
    const submitted = vi.fn()
    const wrapper = mount({
      setup() {
        return () =>
          h(
            'form',
            {
              onSubmit: (event: Event) => {
                event.preventDefault()
                submitted(new FormData(event.target as HTMLFormElement))
              },
            },
            [
              h(GhostCheckbox, { defaultValue: true, name: 'subscribe' }),
              h('button', { type: 'submit' }, 'Send'),
            ],
          )
      },
    })

    await wrapper.get('form').trigger('submit')

    expect(submitted).toHaveBeenCalledOnce()
    const data = submitted.mock.calls[0]?.[0] as FormData
    expect(data.get('subscribe')).toBe('on')
  })

  it('restores the mounted default on native form reset', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [h(GhostCheckbox, { defaultValue: true, name: 'agree' })])
        },
      },
      { attachTo: document.body },
    )
    const input = wrapper.get('input')

    await input.setValue(false)
    wrapper.get('form').element.reset()
    await Promise.resolve()
    await nextTick()

    expect((input.element as HTMLInputElement).checked).toBe(true)
    wrapper.unmount()
  })

  it('renders deterministic native markup during SSR', async () => {
    const html = await renderToString(
      h(GhostCheckbox, {
        disabled: true,
        indeterminate: true,
        modelValue: true,
      }),
    )

    expect(html).toContain('class="ghost-checkbox"')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked')
    expect(html).toContain('disabled')
    expect(html).toContain('data-state="indeterminate"')
    expect(html).not.toContain('indeterminate="')
  })
})
