import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostInput from './GhostInput.vue'
import type { GhostInputExposed, GhostInputType } from './ghost-input'

describe('GhostInput', () => {
  it('renders a native text input with empty value by default', () => {
    const wrapper = mount(GhostInput)
    const root = wrapper.get('input')

    expect(root.element.type).toBe('text')
    expect(root.element.value).toBe('')
    expect(root.classes()).toContain('ghost-input')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('data-state')).toBeUndefined()
  })

  it('seeds uncontrolled value from defaultValue', async () => {
    const wrapper = mount(GhostInput, {
      props: { defaultValue: 'reports' },
    })
    const input = wrapper.get('input')

    expect(input.element.value).toBe('reports')

    await input.setValue('forecast')

    expect(input.element.value).toBe('forecast')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['forecast'])
  })

  it('keeps a controlled empty string distinct from uncontrolled', () => {
    const wrapper = mount(GhostInput, {
      props: { modelValue: '' },
    })

    expect(wrapper.get('input').element.value).toBe('')
  })

  it('emits update:modelValue and follows the parent on the next prop write', async () => {
    const wrapper = mount(GhostInput, {
      props: { modelValue: 'alpha' },
    })
    const input = wrapper.get('input')

    await input.setValue('beta')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['beta'])
    await wrapper.setProps({ modelValue: 'beta' })
    expect(input.element.value).toBe('beta')
  })

  it('restores a controlled field after a tick when the parent ignores the emit', async () => {
    const wrapper = mount(GhostInput, {
      attachTo: document.body,
      props: { modelValue: 'locked' },
    })
    const input = wrapper.get('input')

    await input.setValue('next')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['next'])
    expect(input.element.value).toBe('locked')
    wrapper.unmount()
  })

  it('keeps the caret when inserting in the middle of a v-model value', async () => {
    const Host = defineComponent({
      setup() {
        const text = ref('hello')
        return () =>
          h(GhostInput, {
            modelValue: text.value,
            'onUpdate:modelValue': (value: string) => {
              text.value = value
            },
          })
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    const input = wrapper.get('input').element

    input.focus()
    input.value = 'hexllo'
    input.setSelectionRange(3, 3)
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()

    expect(input.value).toBe('hexllo')
    expect(input.selectionStart).toBe(3)
    expect(input.selectionEnd).toBe(3)
    wrapper.unmount()
  })

  it('ignores later defaultValue changes after setup', async () => {
    const wrapper = mount(GhostInput, {
      props: { defaultValue: 'one' },
    })

    await wrapper.setProps({ defaultValue: 'two' })

    expect(wrapper.get('input').element.value).toBe('one')
  })

  it('forwards native attributes and listeners to the input', async () => {
    const onInput = vi.fn()
    const wrapper = mount(GhostInput, {
      attrs: {
        'aria-describedby': 'search-help',
        autocomplete: 'off',
        class: 'filter',
        id: 'global-search',
        name: 'q',
        onInput,
        placeholder: 'Search reports',
      },
    })
    const input = wrapper.get('input')

    await input.setValue('q3')

    expect(input.attributes('aria-describedby')).toBe('search-help')
    expect(input.attributes('autocomplete')).toBe('off')
    expect(input.attributes('id')).toBe('global-search')
    expect(input.attributes('name')).toBe('q')
    expect(input.attributes('placeholder')).toBe('Search reports')
    expect(input.classes()).toContain('ghost-input')
    expect(input.classes()).toContain('filter')
    expect(onInput).toHaveBeenCalledOnce()
  })

  it('applies native disabled semantics and skips model writes', () => {
    const wrapper = mount(GhostInput, {
      props: { disabled: true, defaultValue: 'locked' },
    })
    const input = wrapper.get('input')

    expect(input.attributes()).toHaveProperty('disabled')
    expect(input.attributes('data-state')).toBe('disabled')

    const event = new Event('input', { bubbles: true })
    Object.defineProperty(event, 'target', { value: input.element })
    input.element.value = 'nope'
    input.element.dispatchEvent(event)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps readonly inputs focusable and submitted', () => {
    const wrapper = mount(GhostInput, {
      attachTo: document.body,
      props: { readonly: true, defaultValue: 'frozen' },
    })
    const input = wrapper.get('input')
    const exposed = wrapper.vm as unknown as GhostInputExposed

    expect(input.attributes()).toHaveProperty('readonly')
    expect(input.attributes('data-state')).toBe('readonly')
    expect(input.attributes()).not.toHaveProperty('disabled')

    exposed.focus()
    expect(document.activeElement).toBe(input.element)
    wrapper.unmount()
  })

  it('exposes invalid as aria-invalid without writing aria-invalid false', () => {
    const wrapper = mount(GhostInput, {
      props: { invalid: true },
    })
    const input = wrapper.get('input')

    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('data-state')).toBe('invalid')
  })

  it('sets native required without a data-state', () => {
    const wrapper = mount(GhostInput, {
      props: { required: true },
    })
    const input = wrapper.get('input')

    expect(input.attributes()).toHaveProperty('required')
    expect(input.attributes('data-state')).toBeUndefined()
  })

  it('prefers invalid data-state when disabled and readonly also apply', () => {
    const wrapper = mount(GhostInput, {
      props: { disabled: true, invalid: true, readonly: true },
    })
    const input = wrapper.get('input')

    expect(input.attributes()).toHaveProperty('disabled')
    expect(input.attributes()).toHaveProperty('readonly')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('data-state')).toBe('invalid')
  })

  it.each<GhostInputType>([
    'text',
    'search',
    'email',
    'password',
    'tel',
    'url',
  ])('renders type %s', (type) => {
    const wrapper = mount(GhostInput, { props: { type } })
    expect(wrapper.get('input').element.type).toBe(type)
  })

  it('includes a named enabled value in form submission', () => {
    const wrapper = mount({
      setup() {
        return () =>
          h('form', [h(GhostInput, { defaultValue: 'reports', name: 'q' })])
      },
    })
    const form = wrapper.get('form').element as HTMLFormElement
    const data = new FormData(form)

    expect(data.get('q')).toBe('reports')
  })

  it('omits a named disabled value from form submission', () => {
    const wrapper = mount({
      setup() {
        return () =>
          h('form', [
            h(GhostInput, {
              defaultValue: 'secret',
              disabled: true,
              name: 'q',
            }),
          ])
      },
    })
    const form = wrapper.get('form').element as HTMLFormElement

    expect(new FormData(form).get('q')).toBeNull()
  })

  it('restores the uncontrolled seed when the owner form resets', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [h(GhostInput, { defaultValue: 'start', name: 'q' })])
        },
      },
      { attachTo: document.body },
    )
    const input = wrapper.get('input')

    await input.setValue('typed')
    wrapper.get('form').element.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('start')
    wrapper.unmount()
  })

  it('keeps an edited uncontrolled value when form reset is canceled', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [h(GhostInput, { defaultValue: 'seed', name: 'q' })])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    form.addEventListener('reset', (event) => {
      event.preventDefault()
    })

    await input.setValue('edited')
    const emitsBefore = wrapper
      .findComponent(GhostInput)
      .emitted('update:modelValue')?.length

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('edited')
    expect(
      wrapper.findComponent(GhostInput).emitted('update:modelValue')?.length,
    ).toBe(emitsBefore)
    wrapper.unmount()
  })

  it('keeps an edited uncontrolled value when a later document listener cancels', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [h(GhostInput, { defaultValue: 'seed', name: 'q' })])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    function cancelOnDocument(event: Event) {
      event.preventDefault()
    }
    document.addEventListener('reset', cancelOnDocument)

    try {
      await input.setValue('edited')
      const emitsBefore = wrapper
        .findComponent(GhostInput)
        .emitted('update:modelValue')?.length

      form.reset()
      await Promise.resolve()
      await nextTick()

      expect(input.element.value).toBe('edited')
      expect(
        wrapper.findComponent(GhostInput).emitted('update:modelValue')?.length,
      ).toBe(emitsBefore)
    } finally {
      document.removeEventListener('reset', cancelOnDocument)
      wrapper.unmount()
    }
  })

  it('reconciles the DOM when a controlled parent ignores reset updates', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostInput, {
                modelValue: 'seed',
                defaultValue: 'seed',
                name: 'q',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    expect(input.element.value).toBe('seed')

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('seed')
    wrapper.unmount()
  })

  it('emits the captured defaultValue on reset when controlled', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostInput, {
                modelValue: 'Alice',
                name: 'q',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    expect(input.element.value).toBe('Alice')

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(
      wrapper.findComponent(GhostInput).emitted('update:modelValue'),
    ).toEqual([['']])
    wrapper.unmount()
  })

  it('does not emit on reset when the controlled value already matches the default', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostInput, {
                modelValue: '',
                defaultValue: '',
                name: 'q',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(
      wrapper.findComponent(GhostInput).emitted('update:modelValue'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('reconciles the DOM to the parent when a controlled reset emit is ignored', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostInput, {
                modelValue: 'Alice',
                name: 'q',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const input = wrapper.get('input')

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('Alice')
    wrapper.unmount()
  })

  it('resets an input associated with an external form via the form attribute', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('div', [
              h('form', { id: 'external-form' }),
              h(GhostInput, {
                form: 'external-form',
                defaultValue: 'mount',
                name: 'q',
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = document.getElementById('external-form') as HTMLFormElement
    const input = wrapper.get('input')

    await input.setValue('live')
    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(input.element.value).toBe('mount')
    wrapper.unmount()
  })

  it('exposes the native element and focus controls', () => {
    const wrapper = mount(GhostInput, { attachTo: document.body })
    const exposed = wrapper.vm as unknown as GhostInputExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('input').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('renders deterministic native markup during SSR', async () => {
    const html = await renderToString(
      h(GhostInput, {
        defaultValue: 'q3',
        disabled: true,
        invalid: true,
        required: true,
        type: 'search',
      }),
    )

    expect(html).toContain('class="ghost-input"')
    expect(html).toContain('type="search"')
    expect(html).toContain('value="q3"')
    expect(html).toContain('disabled')
    expect(html).toContain('required')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('data-state="invalid"')
  })
})
