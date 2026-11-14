import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostSwitch from './GhostSwitch.vue'
import type { GhostSwitchExposed } from './ghost-switch'

describe('GhostSwitch', () => {
  it('renders native switch semantics and defaults to off', () => {
    const wrapper = mount(GhostSwitch, {
      attrs: { 'aria-label': 'Airplane mode' },
    })
    const button = wrapper.get('button')

    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('role')).toBe('switch')
    expect(button.attributes('aria-checked')).toBe('false')
    expect(button.classes()).toContain('ghost-switch')
    expect(button.attributes('data-part')).toBe('root')
    expect(button.attributes('data-state')).toBe('unchecked')
    expect(button.get('[data-part="track"]').attributes('aria-hidden')).toBe(
      'true',
    )
    expect(button.get('[data-part="thumb"]').element.tagName).toBe('SPAN')
  })

  it('forwards native attributes and listeners to the button', async () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostSwitch, {
      attrs: {
        'aria-describedby': 'digest-help',
        class: 'setting',
        id: 'digest',
        onClick,
      },
    })

    const button = wrapper.get('button')
    await button.trigger('click')

    expect(button.attributes('aria-describedby')).toBe('digest-help')
    expect(button.attributes('id')).toBe('digest')
    expect(button.classes()).toContain('ghost-switch')
    expect(button.classes()).toContain('setting')
    expect(onClick).toHaveBeenCalledOnce()
    expect(button.attributes('aria-checked')).toBe('true')
  })

  it('toggles uncontrolled state from the default slot name', async () => {
    const wrapper = mount(GhostSwitch, {
      slots: { default: 'Airplane mode' },
    })
    const button = wrapper.get('button')

    expect(button.text()).toBe('Airplane mode')
    await button.trigger('click')
    expect(button.attributes('aria-checked')).toBe('true')
    expect(button.attributes('data-state')).toBe('checked')
    await button.trigger('click')
    expect(button.attributes('aria-checked')).toBe('false')
  })

  it('supports controlled v-model', async () => {
    const model = ref(false)
    const wrapper = mount({
      setup() {
        return () =>
          h(GhostSwitch, {
            'aria-label': 'Airplane mode',
            modelValue: model.value,
            'onUpdate:modelValue': (next: boolean) => {
              model.value = next
            },
          })
      },
    })

    await wrapper.get('button').trigger('click')
    expect(model.value).toBe(true)
    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')

    model.value = false
    await nextTick()
    expect(wrapper.get('button').attributes('aria-checked')).toBe('false')
  })

  it('starts uncontrolled switches at defaultValue', () => {
    const wrapper = mount(GhostSwitch, {
      attrs: { 'aria-label': 'Airplane mode' },
      props: { defaultValue: true },
    })

    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')
  })

  it('prevents activation while disabled and does not submit', () => {
    const onClick = vi.fn()
    const wrapper = mount({
      setup() {
        return () =>
          h('form', [
            h(GhostSwitch, {
              'aria-label': 'Airplane mode',
              disabled: true,
              name: 'air',
              defaultValue: true,
              onClick,
            }),
          ])
      },
    })
    const button = wrapper.get('button')
    button.element.click()

    expect(button.attributes()).toHaveProperty('disabled')
    expect(onClick).not.toHaveBeenCalled()
    expect(
      new FormData(wrapper.get('form').element as HTMLFormElement).get('air'),
    ).toBeNull()
  })

  it('keeps readonly switches focusable without toggling', async () => {
    const wrapper = mount(GhostSwitch, {
      attachTo: document.body,
      attrs: { 'aria-label': 'Airplane mode' },
      props: { readonly: true, defaultValue: true, name: 'air' },
    })
    const button = wrapper.get('button')

    button.element.focus()
    await button.trigger('click')

    expect(button.attributes()).not.toHaveProperty('disabled')
    expect(button.attributes('aria-readonly')).toBe('true')
    expect(button.attributes('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(button.element)
    expect(wrapper.get('input').attributes('name')).toBe('air')
    wrapper.unmount()
  })

  it('skips the toggle when a click listener prevents default', async () => {
    const wrapper = mount(GhostSwitch, {
      attrs: {
        'aria-label': 'Airplane mode',
        onClick: (event: MouseEvent) => {
          event.preventDefault()
        },
      },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-checked')).toBe('false')
  })

  it('submits name=value while on and omits it while off', async () => {
    const wrapper = mount({
      setup() {
        return () =>
          h('form', [
            h(GhostSwitch, {
              'aria-label': 'Daily digest',
              name: 'digest',
              value: 'daily',
              defaultValue: true,
            }),
          ])
      },
    })
    const form = wrapper.get('form').element as HTMLFormElement

    expect(new FormData(form).get('digest')).toBe('daily')
    await wrapper.get('button').trigger('click')
    expect(new FormData(form).get('digest')).toBeNull()
  })

  it('associates the button with its owner form', () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSwitch, { 'aria-label': 'Alerts', name: 'alerts' }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const button = wrapper.get('button').element as HTMLButtonElement

    expect(button.form).toBe(form)
    wrapper.unmount()
  })

  it('restores the mounted default on native form reset', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSwitch, {
                'aria-label': 'Daily digest',
                name: 'digest',
                defaultValue: true,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-checked')).toBe('false')

    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')
    expect(new FormData(form).get('digest')).toBe('on')
    wrapper.unmount()
  })

  it('keeps an on switch when form reset is canceled', async () => {
    const wrapper = mount(
      {
        setup() {
          return () =>
            h('form', [
              h(GhostSwitch, {
                'aria-label': 'Daily digest',
                name: 'digest',
                defaultValue: false,
              }),
            ])
        },
      },
      { attachTo: document.body },
    )
    const form = wrapper.get('form').element as HTMLFormElement
    const switchCmp = wrapper.findComponent(GhostSwitch)

    form.addEventListener('reset', (event) => {
      event.preventDefault()
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')

    const emitsBefore = switchCmp.emitted('update:modelValue')?.length
    form.reset()
    await Promise.resolve()
    await nextTick()

    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')
    expect(switchCmp.emitted('update:modelValue')?.length).toBe(emitsBefore)
    wrapper.unmount()
  })

  it('exposes the native element, checked state, and focus controls', async () => {
    const wrapper = mount(GhostSwitch, {
      attachTo: document.body,
      attrs: { 'aria-label': 'Airplane mode' },
    })
    const exposed = wrapper.vm as unknown as GhostSwitchExposed

    expect(exposed.checked).toBe(false)
    exposed.toggle()
    expect(exposed.checked).toBe(true)
    await nextTick()
    expect(wrapper.get('button').attributes('aria-checked')).toBe('true')

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('button').element)
    expect(document.activeElement).toBe(exposed.element)

    exposed.blur()
    expect(document.activeElement).not.toBe(exposed.element)
    wrapper.unmount()
  })

  it('renders deterministic switch markup during SSR', async () => {
    const html = await renderToString(
      h(GhostSwitch, {
        'aria-label': 'Airplane mode',
        disabled: true,
        name: 'air',
        defaultValue: true,
      }),
    )

    expect(html).toContain('class="ghost-switch"')
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('data-state="checked"')
    expect(html).toContain('disabled')
    expect(html).toContain('type="hidden"')
    expect(html).not.toContain('name="air"')
  })
})
