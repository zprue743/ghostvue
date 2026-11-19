import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { type Component, h } from 'vue'

import {
  type DemoPlaygroundControlSpec,
  type DemoPlaygroundSpec,
  demoPlaygroundFor,
  demoPlaygroundIds,
  formatDemoPlaygroundBinding,
  summarizeDemoPlayground,
  withDemoPlaygroundValue,
} from '../../apps/docs/.vitepress/theme/demo-playgrounds'
import GhostExample from '../../apps/docs/.vitepress/theme/GhostExample.vue'
import { exampleLoader } from '../../examples/load'

const SOURCE_PROBE = 'original-source-probe'

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

function removeClipboard(): void {
  Reflect.deleteProperty(navigator, 'clipboard')
}

function playgroundOf(id: string): DemoPlaygroundSpec {
  const playground = demoPlaygroundFor(id)
  if (!playground) throw new Error(`No playground for ${id}`)
  return playground
}

function controlOf(
  playground: DemoPlaygroundSpec,
  prop: string,
): DemoPlaygroundControlSpec {
  const control = playground.controls.find((entry) => entry.prop === prop)
  if (!control) throw new Error(`No control for ${prop}`)
  return control
}

async function loadExample(id: string): Promise<Component> {
  const loader = exampleLoader(id)
  if (!loader) throw new Error(`No example ${id}`)
  return (await loader()).default
}

/** A value other than the declared default, to prove a control is wired. */
function otherValue(control: DemoPlaygroundControlSpec): string | boolean {
  if (control.kind === 'switch') return !control.default
  const other = control.options.find((option) => option !== control.default)
  if (other === undefined) throw new Error(`${control.prop} has one option`)
  return other
}

function defaultsOf(
  playground: DemoPlaygroundSpec,
): Record<string, string | boolean> {
  return Object.fromEntries(
    playground.controls.map((control) => [control.prop, control.default]),
  )
}

async function mountExample(id: string) {
  const wrapper = mount(GhostExample, {
    props: { id },
    slots: { default: () => h('pre', null, [h('code', null, SOURCE_PROBE)]) },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('demo playground helpers', () => {
  const button = playgroundOf('button/themed')
  const input = playgroundOf('input/search')

  it('summarizes only overrides, in control order', () => {
    expect(summarizeDemoPlayground(button, {})).toBe('')
    const overrides = withDemoPlaygroundValue(
      withDemoPlaygroundValue({}, controlOf(button, 'variant'), 'ghost'),
      controlOf(button, 'size'),
      'lg',
    )
    expect(summarizeDemoPlayground(button, overrides)).toBe(
      'size="lg", variant="ghost"',
    )
  })

  it('drops an override when the declared default is chosen again', () => {
    const size = controlOf(button, 'size')
    const changed = withDemoPlaygroundValue({}, size, 'lg')
    expect(changed).toEqual({ size: 'lg' })
    expect(withDemoPlaygroundValue(changed, size, 'md')).toEqual({})
  })

  it('emits a complete template binding with boolean attributes', () => {
    expect(formatDemoPlaygroundBinding(button, {})).toBe(
      '<GhostButton size="md" tone="danger" variant="outline" />',
    )
    expect(formatDemoPlaygroundBinding(input, {})).toBe(
      '<GhostInput size="md" />',
    )
    expect(
      formatDemoPlaygroundBinding(input, { invalid: true, size: 'sm' }),
    ).toBe('<GhostInput size="sm" invalid />')
  })

  it('is opt-in per example id', () => {
    expect(demoPlaygroundFor('button/basic')).toBeUndefined()
    expect(demoPlaygroundFor('toString')).toBeUndefined()
  })
})

describe.each(demoPlaygroundIds())('%s playground adapter', (id) => {
  const playground = playgroundOf(id)

  it('declares the defaults the example SFC renders on its own', async () => {
    const Example = await loadExample(id)
    const bare = mount(Example)
    const explicit = mount(Example, { props: defaultsOf(playground) })
    expect(explicit.html()).toBe(bare.html())
  })

  it.each(playground.controls.map((control) => [control.prop, control]))(
    'binds %s as a declared prop that changes the demo',
    async (_prop, control) => {
      const Example = await loadExample(id)
      const bare = mount(Example)
      const changed = mount(Example, {
        props: { [control.prop]: otherValue(control) },
      })
      // A declared prop, not fallthrough: the control cannot claim an
      // effect the example does not implement.
      const declared: unknown = changed.props()
      expect(declared).toHaveProperty(control.prop, otherValue(control))
      expect(changed.html()).not.toBe(bare.html())
    },
  )
})

describe('GhostExample props playground', () => {
  afterEach(() => {
    removeClipboard()
    document.body.innerHTML = ''
  })

  it('renders no controls for examples without an adapter', async () => {
    const wrapper = await mountExample('button/basic')
    expect(wrapper.find('[data-testid="ghost-playground"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="ghost-example-source-note"]').exists(),
    ).toBe(false)
  })

  it('offers labelled controls for exactly the adapter props', async () => {
    const wrapper = await mountExample('input/search')
    const group = wrapper.get('[role="group"][aria-label="Search controls"]')
    const select = group.get('select')
    expect(
      group.get(`label[for="${select.attributes('id') ?? ''}"]`).text(),
    ).toBe('Size')
    expect(select.findAll('option').map((option) => option.text())).toEqual([
      'sm',
      'md',
      'lg',
    ])
    const checkboxes = group.findAll('input[type="checkbox"]')
    expect(
      checkboxes.map((box) =>
        group.get(`label[for="${box.attributes('id') ?? ''}"]`).text(),
      ),
    ).toEqual(['Disabled', 'Invalid'])
  })

  it('applies overrides to the live demo without remounting it, and resets to declared defaults while keeping source and width state', async () => {
    const wrapper = await mountExample('button/themed')
    const demo = wrapper.get('[data-testid="ghost-example-preview"] button')
    const element = demo.element
    expect(demo.attributes('data-tone')).toBe('danger')
    expect(demo.attributes('data-variant')).toBe('outline')

    // Open the source and narrow the preview first; reset must keep both.
    await wrapper
      .get('button[aria-label="Themed source code"]')
      .trigger('click')
    await wrapper
      .get('button[aria-label="Themed preview width"]')
      .trigger('click')
    await wrapper.get('input[type="radio"][value="320"]').setValue(true)

    const selects = wrapper.findAll('[data-testid="ghost-playground"] select')
    const [size, tone] = selects
    if (!size || !tone) throw new Error('missing selects')
    await size.setValue('lg')
    await tone.setValue('neutral')

    const live = wrapper.get('[data-testid="ghost-example-preview"] button')
    expect(live.element).toBe(element)
    expect(live.attributes('data-size')).toBe('lg')
    expect(live.attributes('data-tone')).toBe('neutral')
    expect(wrapper.get('[data-testid="ghost-playground-summary"]').text()).toBe(
      'Overrides: size="lg", tone="neutral"',
    )

    // The source stays the original SFC and says so.
    const source = wrapper.get('[data-testid="ghost-example-source"]')
    expect(source.text()).toContain(SOURCE_PROBE)
    expect(
      source.get('[data-testid="ghost-example-source-note"]').text(),
    ).toContain('Original source')

    await wrapper
      .get('button[aria-label="Reset Themed settings"]')
      .trigger('click')

    const reset = wrapper.get('[data-testid="ghost-example-preview"] button')
    expect(reset.element).toBe(element)
    expect(reset.attributes('data-size')).toBeUndefined()
    expect(reset.attributes('data-tone')).toBe('danger')
    expect(reset.attributes('data-variant')).toBe('outline')
    expect(size.element).toBeInstanceOf(HTMLSelectElement)
    expect(
      size.element instanceof HTMLSelectElement && size.element.value,
    ).toBe('md')
    expect(wrapper.get('[data-testid="ghost-playground-summary"]').text()).toBe(
      'Overrides: none, showing the original example',
    )
    expect(source.isVisible()).toBe(true)
    expect(
      wrapper.get('[data-testid="ghost-example-viewport"]').attributes('style'),
    ).toContain('--_demo-preview-width: 320px')
  })

  it('applies boolean overrides as real props', async () => {
    const wrapper = await mountExample('input/search')
    const [disabled, invalid] = wrapper.findAll(
      '[data-testid="ghost-playground"] input[type="checkbox"]',
    )
    if (!disabled || !invalid) throw new Error('missing checkboxes')
    await disabled.setValue(true)
    await invalid.setValue(true)

    const field = wrapper.get(
      '[data-testid="ghost-example-preview"] input[type="search"]',
    )
    expect(field.attributes('disabled')).toBeDefined()
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('[data-testid="ghost-playground-summary"]').text()).toBe(
      'Overrides: disabled, invalid',
    )
  })

  it('copies a typed binding of the current settings and announces it', async () => {
    const writes: string[] = []
    stubClipboard((text) => {
      writes.push(text)
      return Promise.resolve()
    })
    const wrapper = await mountExample('input/search')
    await wrapper.get('[data-testid="ghost-playground"] select').setValue('lg')
    await wrapper
      .get('button[aria-label="Copy Search props binding"]')
      .trigger('click')
    await flushPromises()

    expect(writes).toEqual(['<GhostInput size="lg" />\n'])
    expect(wrapper.get('.ghost-playground__status').text()).toBe('Props copied')
  })

  it('shows and selects the binding when the clipboard is unavailable', async () => {
    removeClipboard()
    const wrapper = await mountExample('button/themed')
    await wrapper
      .get('button[aria-label="Copy Themed props binding"]')
      .trigger('click')
    await flushPromises()

    const status = wrapper.get('.ghost-playground__status')
    expect(status.attributes('data-state')).toBe('failed')
    expect(String(window.getSelection())).toBe(
      '<GhostButton size="md" tone="danger" variant="outline" />',
    )
  })
})
