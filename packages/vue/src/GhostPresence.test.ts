import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GhostPresenceSlotProps } from './ghost-presence'
import GhostPortal from './GhostPortal.vue'
import GhostPresence from './GhostPresence.vue'

const pendingExits: (() => void)[] = []

beforeEach(() => {
  // One controllable exit transition on any `.surface` element.
  HTMLElement.prototype.getAnimations = function getAnimations(
    this: HTMLElement,
  ) {
    if (!this.matches('.surface')) {
      return []
    }
    let finish!: () => void
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    pendingExits.push(finish)
    return [
      {
        effect: {
          target: this,
          pseudoElement: null,
          getComputedTiming: () => ({
            endTime: 120,
            localTime: 0,
            iterations: 1,
          }),
          getTiming: () => ({}),
        },
        finished,
        playState: 'running',
        playbackRate: 1,
      } as unknown as Animation,
    ]
  }
})

afterEach(() => {
  pendingExits.length = 0
  Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

async function finishExits(): Promise<void> {
  for (const finish of pendingExits.splice(0)) {
    finish()
  }
  await flushPromises()
}

describe('GhostPresence', () => {
  it('decorates a single root, merges the consumer ref, and emits exitComplete once', async () => {
    const present = ref(false)
    const consumerRef = ref<HTMLElement | null>(null)
    const onExitComplete = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPresence,
              { present: present.value, onExitComplete },
              {
                default: () =>
                  h(
                    'aside',
                    {
                      class: 'surface',
                      ref: consumerRef,
                      style: { color: 'red' },
                    },
                    'Panel',
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    expect(wrapper.find('.surface').exists()).toBe(false)

    present.value = true
    await nextTick()
    const surface = wrapper.get('.surface').element
    expect(consumerRef.value).toBe(surface)
    expect(surface.getAttribute('data-state')).toBe('open')
    expect(surface.hasAttribute('inert')).toBe(false)

    present.value = false
    await nextTick()
    expect(wrapper.get('.surface').element).toBe(surface)
    expect(surface.getAttribute('data-state')).toBe('closed')
    expect(surface.hasAttribute('inert')).toBe(true)
    expect((surface as HTMLElement).style.pointerEvents).toBe('none')
    expect((surface as HTMLElement).style.color).toBe('red')

    await finishExits()
    expect(wrapper.find('.surface').exists()).toBe(false)
    expect(onExitComplete).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('preserves consumer inert, pointer-events and data-state across a reopen', async () => {
    const present = ref(true)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPresence,
              { present: present.value },
              {
                default: () =>
                  h('div', {
                    class: 'surface',
                    inert: true,
                    'data-state': 'custom',
                    style: { pointerEvents: 'auto' },
                  }),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    const surface = wrapper.get('.surface').element as HTMLElement
    expect(surface.getAttribute('data-state')).toBe('custom')

    present.value = false
    await nextTick()
    expect(surface.style.pointerEvents).toBe('none')

    present.value = true
    await nextTick()
    expect(wrapper.get('.surface').element).toBe(surface)
    expect(surface.hasAttribute('inert')).toBe(true)
    expect(surface.style.pointerEvents).toBe('auto')
    await finishExits()
    expect(wrapper.find('.surface').exists()).toBe(true)
    wrapper.unmount()
  })

  it('exposes slot props and waits on a manually bound surface inside GhostPortal', async () => {
    const present = ref(true)
    const seen: GhostPresenceSlotProps[] = []
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostPortal, null, () =>
              h(
                GhostPresence,
                { present: present.value },
                {
                  default: (props: GhostPresenceSlotProps) => {
                    seen.push(props)
                    return [
                      h('div', { class: 'scrim', 'data-state': props.state }),
                      h('div', {
                        class: 'surface',
                        ref: props.setElement,
                        'data-state': props.state,
                        inert: props.exiting || undefined,
                      }),
                    ]
                  },
                },
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    expect(seen.at(-1)).toMatchObject({
      present: true,
      phase: 'open',
      state: 'open',
      exiting: false,
    })

    present.value = false
    await nextTick()
    expect(seen.at(-1)).toMatchObject({
      present: false,
      phase: 'exiting',
      state: 'closed',
      exiting: true,
    })
    const surface = document.querySelector('.surface')
    expect(surface?.parentElement).toBe(document.body)
    expect(surface?.hasAttribute('inert')).toBe(true)

    await finishExits()
    expect(document.querySelector('.surface')).toBeNull()
    expect(document.querySelector('.scrim')).toBeNull()
    wrapper.unmount()
  })

  it('warns with GHOST014 once and unmounts immediately when a fragment binds no surface', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const present = ref(true)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPresence,
              { present: present.value },
              {
                default: () => [
                  h('div', { class: 'surface' }),
                  h('div', { class: 'second' }),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    present.value = false
    await nextTick()
    expect(document.querySelector('.surface')).toBeNull()
    present.value = true
    await nextTick()
    present.value = false
    await nextTick()
    const calls = warn.mock.calls.filter((call) =>
      String(call[0]).includes('GHOST014'),
    )
    expect(calls).toHaveLength(1)
    wrapper.unmount()
  })

  it('emits exitComplete only after the departing node is disconnected', async () => {
    const present = ref(true)
    const observed: { connected: boolean; inDocument: boolean }[] = []
    let surface: Element | null = null
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPresence,
              {
                present: present.value,
                // A synchronous listener, as a consumer would write it.
                onExitComplete: () => {
                  observed.push({
                    connected: surface?.isConnected ?? false,
                    inDocument: document.querySelector('.surface') !== null,
                  })
                },
              },
              { default: () => h('div', { class: 'surface' }) },
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    surface = wrapper.get('.surface').element
    present.value = false
    await nextTick()
    expect(surface.isConnected).toBe(true)

    await finishExits()
    expect(observed).toEqual([{ connected: false, inDocument: false }])
    wrapper.unmount()
  })

  it('does not emit exitComplete when a reopen interrupts the exit', async () => {
    const present = ref(true)
    const onExitComplete = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPresence,
              { present: present.value, onExitComplete },
              { default: () => h('div', { class: 'surface' }) },
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    const surface = wrapper.get('.surface').element
    present.value = false
    await nextTick()
    present.value = true
    await nextTick()
    // The stale exit settles after the reopen; it must stay silent.
    await finishExits()
    expect(onExitComplete).not.toHaveBeenCalled()
    expect(wrapper.get('.surface').element).toBe(surface)
    expect(surface.getAttribute('data-state')).toBe('open')
    wrapper.unmount()
  })

  it('unmounts at once when disabled and on owner unmount without emitting', async () => {
    const present = ref(true)
    const disabled = ref(true)
    const visible = ref(true)
    const onExitComplete = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            visible.value
              ? h(
                  GhostPresence,
                  {
                    present: present.value,
                    disabled: disabled.value,
                    onExitComplete,
                  },
                  { default: () => h('div', { class: 'surface' }) },
                )
              : null
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    present.value = false
    await nextTick()
    expect(wrapper.find('.surface').exists()).toBe(false)
    expect(onExitComplete).not.toHaveBeenCalled()

    disabled.value = false
    present.value = true
    await nextTick()
    present.value = false
    await nextTick()
    expect(wrapper.find('.surface').exists()).toBe(true)
    visible.value = false
    await nextTick()
    await finishExits()
    expect(document.querySelector('.surface')).toBeNull()
    expect(onExitComplete).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('renders on the server without browser globals and hydrates without mismatch', async () => {
    const App = defineComponent({
      setup() {
        return () =>
          h('main', [
            h(GhostPresence, { present: true }, () =>
              h('p', { class: 'surface' }, 'Open'),
            ),
            h(GhostPresence, { present: false }, () =>
              h('p', { class: 'hidden' }, 'Closed'),
            ),
          ])
      },
    })
    const html = await renderToString(createSSRApp(App))
    expect(html).toContain('<p class="surface" data-state="open">Open</p>')
    expect(html).not.toContain('Closed')
    expect(html).not.toContain('inert')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    createSSRApp(App).mount(container)
    expect(
      warn.mock.calls.some((call) => String(call[0]).includes('mismatch')),
    ).toBe(false)
  })
})
