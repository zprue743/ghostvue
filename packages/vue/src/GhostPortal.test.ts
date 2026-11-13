import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostPortal from './GhostPortal.vue'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  document.body.innerHTML = ''
})

describe('GhostPortal', () => {
  it('renders inline during SSR without touching document', async () => {
    const query = vi.spyOn(document, 'querySelector')
    const Comp = defineComponent({
      setup() {
        return () =>
          h(
            GhostPortal,
            { to: 'body', defer: true },
            { default: () => h('div', { 'data-testid': 'content' }, 'Hello') },
          )
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Hello')
    expect(query).not.toHaveBeenCalled()
    query.mockRestore()
  })

  it('teleports content to document.body by default after mount and cleans up on unmount', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h('div', { 'data-testid': 'host' }, [
              h(GhostPortal, null, {
                default: () =>
                  h('div', { 'data-testid': 'teleported' }, 'Portal Body'),
              }),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    await nextTick()

    const host = wrapper.get('[data-testid="host"]').element
    const teleported = document.body.querySelector('[data-testid="teleported"]')
    expect(teleported).not.toBeNull()
    expect(teleported?.textContent).toBe('Portal Body')
    expect(host.contains(teleported)).toBe(false)

    wrapper.unmount()
    expect(document.body.querySelector('[data-testid="teleported"]')).toBeNull()
  })

  it('supports custom selector targets, defer for later siblings, and reactive disabled', async () => {
    const disabled = ref(true)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h('div', { 'data-testid': 'host' }, [
              h(
                GhostPortal,
                {
                  to: '#late-portal-target',
                  disabled: disabled.value,
                  defer: true,
                },
                {
                  default: () =>
                    h('span', { 'data-testid': 'item' }, 'Deferred Item'),
                },
              ),
              h('div', { id: 'late-portal-target' }),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    await nextTick()
    const target = wrapper.get('#late-portal-target').element
    expect(target.querySelector('[data-testid="item"]')).toBeNull()
    expect(wrapper.get('[data-testid="host"]').element.textContent).toContain(
      'Deferred Item',
    )

    disabled.value = false
    await nextTick()
    await nextTick()
    expect(target.querySelector('[data-testid="item"]')?.textContent).toBe(
      'Deferred Item',
    )
  })

  it('renders inline without errors when to is null', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h('div', { 'data-testid': 'host' }, [
              h(
                GhostPortal,
                { to: null },
                {
                  default: () =>
                    h('span', { 'data-testid': 'inline' }, 'Inline fallback'),
                },
              ),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    await nextTick()
    expect(
      wrapper
        .get('[data-testid="host"]')
        .find('[data-testid="inline"]')
        .exists(),
    ).toBe(true)
  })
})
