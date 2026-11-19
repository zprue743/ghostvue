import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type Component } from 'vue'

import {
  DEMO_LOAD_TIMEOUT_MS,
  DEMO_LOADING_DELAY_MS,
  defineDemoPreview,
} from '../../apps/docs/.vitepress/theme/demo-preview-async'
import DemoPreview from '../../apps/docs/.vitepress/theme/DemoPreview.vue'

const Demo = defineComponent({
  setup: () => () => h('button', { class: 'demo-root' }, 'Live demo'),
})

/**
 * A dynamic `import()` resolves to a namespace object; Vue only unwraps
 * `default` from objects that look like one, so fake loaders must too.
 */
function esModule(component: Component): { default: Component } {
  const namespace = { __esModule: true, default: component }
  return namespace
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function mountFrame(
  canvas: Component = Demo,
  options: { withSource?: boolean; withControls?: boolean } = {},
) {
  const { withSource = true, withControls = false } = options
  return mount(DemoPreview, {
    props: {
      title: 'Themed',
      layer: 'headless',
      description: 'Recipe chrome on a native button.',
    },
    attrs: { 'data-example-id': 'button/themed' },
    slots: {
      default: () => h(canvas),
      actions: () => h('button', { type: 'button' }, 'Copy'),
      ...(withSource
        ? { source: () => h('pre', { class: 'probe-source' }, '<template />') }
        : {}),
      ...(withControls ? { controls: () => h('label', null, 'Size') } : {}),
    },
    attachTo: document.body,
  })
}

describe('DemoPreview frame', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders title, layer badge, description, toolbar and canvas, and forwards the id adapter attribute', () => {
    const wrapper = mountFrame()
    const figure = wrapper.get('figure')

    expect(figure.attributes('data-example-id')).toBe('button/themed')
    expect(figure.attributes('data-example-layer')).toBe('headless')
    expect(wrapper.get('.ghost-example__title').text()).toBe('Themed')
    expect(wrapper.get('.ghost-example__badge').text()).toBe('Headless')
    expect(wrapper.get('.ghost-example__description').text()).toBe(
      'Recipe chrome on a native button.',
    )
    const toolbar = wrapper.get('[role="group"][aria-label="Themed actions"]')
    expect(toolbar.findAll('button').map((b) => b.text())).toEqual([
      'Code',
      'Copy',
    ])
    expect(
      wrapper.get('[data-testid="ghost-example-preview"] .demo-root').text(),
    ).toBe('Live demo')
    // No controls slot, no empty controls band.
    expect(wrapper.find('.ghost-example__controls').exists()).toBe(false)
  })

  it('omits the badge for themed examples and renders optional controls as a named group', () => {
    const wrapper = mount(DemoPreview, {
      props: { title: 'Sizes', layer: 'themed' },
      slots: {
        default: () => h(Demo),
        controls: () => h('label', null, 'Size'),
      },
    })
    expect(wrapper.find('.ghost-example__badge').exists()).toBe(false)
    expect(wrapper.find('.ghost-example__description').exists()).toBe(false)
    const controls = wrapper.get('.ghost-example__controls')
    expect(controls.attributes('role')).toBe('group')
    expect(controls.attributes('aria-label')).toBe('Sizes controls')
    // Controls sit between the header and the canvas.
    const parts = wrapper
      .get('figure')
      .element.querySelectorAll(
        ':scope > .ghost-example__header, :scope > .ghost-example__controls, :scope > .ghost-example__preview',
      )
    expect([...parts].map((el) => el.className)).toEqual([
      'ghost-example__header',
      'ghost-example__controls',
      'ghost-example__preview',
    ])
    // Without source or actions there is no toolbar to tab through.
    expect(wrapper.find('.ghost-example__toolbar').exists()).toBe(false)
  })

  it('keeps source collapsed by default and toggles it without remounting the demo', async () => {
    const wrapper = mountFrame()
    const toggle = wrapper.get('button[aria-label="Themed source code"]')
    const region = wrapper.get('[data-testid="ghost-example-source"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe(region.attributes('id'))
    expect(region.attributes('role')).toBe('region')
    expect(region.attributes('aria-label')).toBe('Themed source')
    expect(region.isVisible()).toBe(false)

    const demoNode = wrapper.get('.demo-root').element
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(region.isVisible()).toBe(true)
    expect(toggle.text()).toBe('Code')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(region.isVisible()).toBe(false)
    expect(wrapper.get('.demo-root').element).toBe(demoNode)
  })

  it('gives each frame in one app its own source region id', () => {
    // Docs pages render every example in a single app, so ids come from one
    // `useId` sequence; two frames must never share an aria-controls target.
    const host = document.createElement('div')
    document.body.append(host)
    const frame = (title: string) =>
      h(DemoPreview, { title }, { default: () => h(Demo), source: () => 'src' })
    const app = createApp({ render: () => [frame('One'), frame('Two')] })
    app.mount(host)

    const regions = [
      ...host.querySelectorAll('[data-testid="ghost-example-source"]'),
    ].map((el) => el.id)
    const targets = [...host.querySelectorAll('[aria-controls]')].map((el) =>
      el.getAttribute('aria-controls'),
    )
    expect(regions).toHaveLength(2)
    expect(new Set(regions).size).toBe(2)
    expect(targets).toEqual(regions)
    app.unmount()
  })

  it('renders no source toggle or region without a source slot', () => {
    const wrapper = mountFrame(Demo, { withSource: false })
    expect(wrapper.find('[aria-expanded]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ghost-example-source"]').exists()).toBe(
      false,
    )
  })
})

describe('DemoPreview lazy canvas states', () => {
  beforeEach(() => {
    // Fake only timeouts: `flushPromises` drains through `setImmediate`.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('explains a slow load, then swaps in the demo', async () => {
    const chunk = deferred<{ default: Component }>()
    const wrapper = mountFrame(defineDemoPreview(() => chunk.promise))
    const stage = () => wrapper.get('.ghost-example__stage')

    // Fast chunks resolve inside the delay without flashing a placeholder.
    expect(stage().find('[role="status"]').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(DEMO_LOADING_DELAY_MS)
    const status = stage().get('[role="status"]')
    expect(status.attributes('data-state')).toBe('loading')
    expect(status.text()).toBe('Loading example…')

    chunk.resolve(esModule(Demo))
    await flushPromises()
    expect(stage().find('[role="status"]').exists()).toBe(false)
    expect(stage().get('.demo-root').text()).toBe('Live demo')
  })

  it('replaces loading with a reload action when the chunk fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined)
    const error = vi.spyOn(console, 'error').mockReturnValue(undefined)
    const chunk = deferred<{ default: Component }>()
    const wrapper = mountFrame(defineDemoPreview(() => chunk.promise))

    await vi.advanceTimersByTimeAsync(DEMO_LOADING_DELAY_MS)
    chunk.reject(new Error('Failed to fetch dynamically imported module'))
    await flushPromises()

    const status = wrapper.get('.ghost-example__stage [role="status"]')
    expect(status.attributes('data-state')).toBe('error')
    expect(status.text()).toContain('This example could not load')

    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    await status.get('button').trigger('click')
    expect(reload).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
    warn.mockRestore()
    error.mockRestore()
  })

  it('shows the failure state when a chunk stalls past the timeout', async () => {
    // Never settled: the timeout alone must surface the failure.
    const stalled = deferred<{ default: Component }>()
    const error = vi.spyOn(console, 'error').mockReturnValue(undefined)
    const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined)
    const wrapper = mountFrame(defineDemoPreview(() => stalled.promise))

    await vi.advanceTimersByTimeAsync(DEMO_LOAD_TIMEOUT_MS)
    await flushPromises()
    expect(
      wrapper
        .get('.ghost-example__stage [role="status"]')
        .attributes('data-state'),
    ).toBe('error')
    error.mockRestore()
    warn.mockRestore()
  })
})
