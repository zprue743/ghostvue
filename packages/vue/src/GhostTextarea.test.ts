import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostTextarea from './GhostTextarea.vue'
import type { GhostTextareaExposed } from './ghost-textarea'

describe('GhostTextarea', () => {
  it('renders a native textarea with library defaults', () => {
    const wrapper = mount(GhostTextarea)
    const root = wrapper.get('textarea')

    expect(root.element.tagName).toBe('TEXTAREA')
    expect(root.classes()).toContain('ghost-textarea')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('rows')).toBe('2')
    expect(root.element.style.getPropertyValue('--_ghost-textarea-rows')).toBe(
      '2',
    )
    expect(root.element.value).toBe('')
    expect(root.attributes()).not.toHaveProperty('disabled')
    expect(root.attributes('aria-invalid')).toBeUndefined()
  })

  it('updates an uncontrolled model from native input', async () => {
    const wrapper = mount(GhostTextarea, {
      props: { defaultValue: 'draft' },
    })
    const root = wrapper.get('textarea')

    expect(root.element.value).toBe('draft')
    await root.setValue('edited')

    expect(root.element.value).toBe('edited')
    expect(wrapper.emitted('update:modelValue')).toEqual([['edited']])
  })

  it('emits updates without writing through a controlled parent', async () => {
    const wrapper = mount(GhostTextarea, {
      props: { modelValue: 'locked' },
    })
    const root = wrapper.get('textarea')

    await root.setValue('next')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['next']])
    expect(root.element.value).toBe('locked')
  })

  it('keeps the caret when a v-model parent writes the emit back', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const notes = ref('abcd')
          return () =>
            h(GhostTextarea, {
              'aria-label': 'Notes',
              modelValue: notes.value,
              'onUpdate:modelValue': (value: string) => {
                notes.value = value
              },
            })
        },
      }),
      { attachTo: document.body },
    )
    const textarea = wrapper.get('textarea').element

    textarea.focus()
    textarea.setSelectionRange(2, 2)
    textarea.value = 'abxcd'
    textarea.setSelectionRange(3, 3)
    await wrapper.get('textarea').trigger('input')
    await nextTick()

    expect(textarea.value).toBe('abxcd')
    expect(textarea.selectionStart).toBe(3)
    expect(textarea.selectionEnd).toBe(3)
    wrapper.unmount()
  })

  it('forwards native attributes and listeners for Field wiring', async () => {
    const onFocus = vi.fn()
    const wrapper = mount(GhostTextarea, {
      attrs: {
        'aria-describedby': 'bio-hint',
        'aria-labelledby': 'bio-label',
        class: 'profile-bio',
        id: 'bio',
        maxlength: '80',
        name: 'bio',
        onFocus,
        placeholder: 'About you',
      },
    })
    const root = wrapper.get('textarea')
    await root.trigger('focus')

    expect(root.attributes('id')).toBe('bio')
    expect(root.attributes('name')).toBe('bio')
    expect(root.attributes('aria-describedby')).toBe('bio-hint')
    expect(root.attributes('aria-labelledby')).toBe('bio-label')
    expect(root.attributes('placeholder')).toBe('About you')
    expect(root.attributes('maxlength')).toBe('80')
    expect(root.classes()).toContain('ghost-textarea')
    expect(root.classes()).toContain('profile-bio')
    expect(onFocus).toHaveBeenCalledOnce()
  })

  it('applies native disabled, readonly, required, and invalid semantics', () => {
    const wrapper = mount(GhostTextarea, {
      props: {
        disabled: true,
        readonly: true,
        required: true,
        invalid: true,
      },
    })
    const root = wrapper.get('textarea')

    expect(root.attributes()).toHaveProperty('disabled')
    expect(root.attributes()).toHaveProperty('readonly')
    expect(root.attributes()).toHaveProperty('required')
    expect(root.attributes('aria-invalid')).toBe('true')
    expect(root.attributes('data-state')).toBe('disabled')
  })

  it('keeps invalid visible to CSS when the field is only readonly', () => {
    const wrapper = mount(GhostTextarea, {
      props: { readonly: true, invalid: true },
    })
    const root = wrapper.get('textarea')

    expect(root.attributes('data-state')).toBe('readonly')
    expect(root.attributes('aria-invalid')).toBe('true')
  })

  it('marks auto-resize without writing a measured height during SSR', async () => {
    const html = await renderToString(
      h(GhostTextarea, {
        autoResize: true,
        maxRows: 8,
        rows: 3,
        defaultValue: 'hello',
        invalid: true,
      }),
    )

    expect(html).toContain('class="ghost-textarea"')
    expect(html).toContain('rows="3"')
    expect(html).toContain('data-auto-resize')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('hello')
    expect(html).not.toContain('height:')
  })

  it('submits its native value with the surrounding form', async () => {
    const submitted = vi.fn()
    const wrapper = mount(
      {
        setup() {
          return () =>
            h(
              'form',
              {
                onSubmit: (event: Event) => {
                  event.preventDefault()
                  submitted(
                    new FormData(event.target as HTMLFormElement).get('notes'),
                  )
                },
              },
              [
                h(GhostTextarea, {
                  defaultValue: 'ship it',
                  name: 'notes',
                }),
                h('button', { type: 'submit' }, 'Save'),
              ],
            )
        },
      },
      { attachTo: document.body },
    )

    await wrapper.get('form').trigger('submit')

    expect(submitted).toHaveBeenCalledWith('ship it')
    wrapper.unmount()
  })

  it('exposes the native element and focus controls', () => {
    const wrapper = mount(GhostTextarea, {
      attachTo: document.body,
      attrs: { 'aria-label': 'Notes' },
    })
    const exposed = wrapper.vm as unknown as GhostTextareaExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('textarea').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('renders deterministic native markup during SSR', async () => {
    const html = await renderToString(
      h(GhostTextarea, {
        disabled: true,
        required: true,
        rows: 4,
        defaultValue: 'ssr',
      }),
    )

    expect(html).toContain('class="ghost-textarea"')
    expect(html).toContain('rows="4"')
    expect(html).toContain('disabled')
    expect(html).toContain('required')
    expect(html).toContain('ssr')
    expect(html).not.toContain('aria-invalid')
  })

  it('does not rewrite defaultValue after the uncontrolled field is edited', async () => {
    const wrapper = mount(GhostTextarea, {
      props: { defaultValue: 'one' },
    })

    await wrapper.get('textarea').setValue('two')
    await wrapper.setProps({ defaultValue: 'three' })

    expect(wrapper.get('textarea').element.value).toBe('two')
  })

  it('restores the uncontrolled seed when the owner form resets', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostTextarea, { defaultValue: 'start', name: 'notes' }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const textarea = wrapper.get('textarea')

    await textarea.setValue('typed')
    wrapper.get('form').element.reset()
    await Promise.resolve()
    await nextTick()

    expect(textarea.element.value).toBe('start')
    wrapper.unmount()
  })

  it('keeps an edited uncontrolled value when form reset is canceled', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostTextarea, { defaultValue: 'seed', name: 'notes' }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const textarea = wrapper.get('textarea')

    form.addEventListener('reset', (event) => {
      event.preventDefault()
    })

    await textarea.setValue('edited')
    const emitsBefore = wrapper
      .findComponent(GhostTextarea)
      .emitted('update:modelValue')?.length

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(textarea.element.value).toBe('edited')
    expect(
      wrapper.findComponent(GhostTextarea).emitted('update:modelValue')?.length,
    ).toBe(emitsBefore)
    wrapper.unmount()
  })

  it('reconciles the DOM when a controlled parent ignores reset updates', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostTextarea, {
                modelValue: 'seed',
                defaultValue: 'seed',
                name: 'notes',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const textarea = wrapper.get('textarea')

    expect(textarea.element.value).toBe('seed')

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(textarea.element.value).toBe('seed')
    wrapper.unmount()
  })
})
