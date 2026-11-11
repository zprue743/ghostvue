import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import { useSlId } from './use-sl-id'

function mountComposable<Value>(setup: () => Value) {
  let result!: Value
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
  )
  return { result, wrapper }
}

describe('useSlId', () => {
  it('generates a namespaced id when no override is provided', () => {
    const { result, wrapper } = mountComposable(() => useSlId())

    expect(result.value).toMatch(/^slop-v-/)
    wrapper.unmount()
  })

  it('applies an optional prefix to the generated id', () => {
    const { result, wrapper } = mountComposable(() => useSlId('slop-checkbox'))

    expect(result.value).toMatch(/^slop-checkbox-v-/)
    wrapper.unmount()
  })

  it('uses a consumer-supplied id instead of generating one', () => {
    const { result, wrapper } = mountComposable(() =>
      useSlId('slop-checkbox', 'email'),
    )

    expect(result.value).toBe('email')
    wrapper.unmount()
  })

  it('treats an empty override as missing so a generated id is used', () => {
    const { result, wrapper } = mountComposable(() => useSlId('field', ''))

    expect(result.value).toMatch(/^field-v-/)
    expect(result.value).not.toBe('')
    wrapper.unmount()
  })

  it('tracks a reactive override', async () => {
    const override = ref<string | undefined>(undefined)
    const { result, wrapper } = mountComposable(() =>
      useSlId('field', () => override.value),
    )

    const generated = result.value
    expect(generated).toMatch(/^field-v-/)

    override.value = 'user-id'
    await nextTick()
    expect(result.value).toBe('user-id')

    override.value = undefined
    await nextTick()
    expect(result.value).toBe(generated)

    wrapper.unmount()
  })

  it('allocates a distinct id per call in the same component', () => {
    const { result, wrapper } = mountComposable(() => ({
      first: useSlId('field'),
      second: useSlId('field'),
    }))

    expect(result.first.value).not.toBe(result.second.value)
    wrapper.unmount()
  })

  it('allocates a distinct id per component instance', () => {
    const Child = defineComponent({
      setup() {
        const id = useSlId('item')
        return () => h('span', { id: id.value })
      },
    })
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [h(Child), h(Child)])
        },
      }),
    )

    const ids = wrapper.findAll('span').map((node) => node.attributes('id'))
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    wrapper.unmount()
  })

  it('matches generated ids between server render and client hydration', async () => {
    const Comp = defineComponent({
      setup() {
        const first = useSlId('field')
        const second = useSlId('field')
        return () =>
          h('div', [
            h('label', { for: first.value }, 'A'),
            h('input', { id: first.value }),
            h('label', { for: second.value }, 'B'),
            h('input', { id: second.value }),
          ])
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    const serverIds = [...html.matchAll(/id="([^"]+)"/g)].map(
      (match) => match[1],
    )

    expect(serverIds).toEqual([
      expect.stringMatching(/^field-v-/),
      expect.stringMatching(/^field-v-/),
    ])
    expect(serverIds[0]).not.toBe(serverIds[1])

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)

    const output: string[] = []
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      output.push(args.map(String).join(' '))
    })
    const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
      output.push(args.map(String).join(' '))
    })

    createSSRApp(Comp).mount(container)

    const clientIds = [...container.querySelectorAll('input')].map(
      (el) => el.id,
    )
    expect(clientIds).toEqual(serverIds)
    expect(output.join('\n')).not.toMatch(/hydrat/i)

    warn.mockRestore()
    error.mockRestore()
    container.remove()
  })

  it('uses the same consumer override on the server and after hydration', async () => {
    const Comp = defineComponent({
      setup() {
        const id = useSlId('field', 'email')
        return () => h('input', { id: id.value })
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('id="email"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    createSSRApp(Comp).mount(container)

    expect(container.querySelector('input')?.id).toBe('email')
    container.remove()
  })
})
