import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import {
  DEMO_COPY_STATUS_MS,
  copyToClipboard,
  describePreviewWidth,
  resolvePreviewWidth,
} from '../../apps/docs/.vitepress/theme/demo-preview-controls'
import { enhanceMarkdownCodeFences } from '../../apps/docs/.vitepress/theme/enhance-code-fences'
import DemoPreview from '../../apps/docs/.vitepress/theme/DemoPreview.vue'

const SOURCE = '<template>\n  <button>Live demo</button>\n</template>'

const Demo = defineComponent({
  setup: () => () => h('input', { class: 'demo-root', 'aria-label': 'Name' }),
})

function mountFrame() {
  return mount(DemoPreview, {
    props: { title: 'Themed', sourceText: SOURCE },
    slots: {
      default: () => h(Demo),
      source: () =>
        h('div', { class: 'language-vue' }, [
          h('pre', { tabindex: 0 }, [h('code', null, SOURCE)]),
        ]),
    },
    attachTo: document.body,
  })
}

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

function removeClipboard(): void {
  Reflect.deleteProperty(navigator, 'clipboard')
}

describe('preview width maths', () => {
  it('fills the canvas on auto and caps a request at the available width', () => {
    expect(resolvePreviewWidth('auto', 700)).toBeUndefined()
    expect(resolvePreviewWidth(480, 700)).toBe(480)
    expect(resolvePreviewWidth(768, 700)).toBe(700)
    // Not measured yet (SSR): report the request; CSS min() caps it.
    expect(resolvePreviewWidth(768, undefined)).toBe(768)
  })

  it('reports the applied size and names the cap', () => {
    expect(describePreviewWidth('auto', 700)).toBe('Auto: 700 px')
    expect(describePreviewWidth('auto', undefined)).toBe(
      'Auto (fills the canvas)',
    )
    expect(describePreviewWidth(480, 700)).toBe('480 px')
    expect(describePreviewWidth(768, 700)).toBe(
      '700 px (capped from 768 px to fit)',
    )
  })
})

describe('copyToClipboard', () => {
  afterEach(removeClipboard)

  it('resolves false without a Clipboard API instead of throwing', async () => {
    removeClipboard()
    expect('clipboard' in navigator).toBe(false)
    await expect(copyToClipboard('x')).resolves.toBe(false)
  })

  it('resolves false when the write is rejected', async () => {
    stubClipboard(() => Promise.reject(new DOMException('denied')))
    await expect(copyToClipboard('x')).resolves.toBe(false)
  })

  it('writes the text and resolves true', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    stubClipboard(writeText)
    await expect(copyToClipboard('x')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('x')
  })
})

describe('DemoPreview copy', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    removeClipboard()
    document.body.innerHTML = ''
  })

  it('copies the original source and announces success in a live region that then clears', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    stubClipboard(writeText)
    const wrapper = mountFrame()
    const status = wrapper.get('[role="status"]')
    const copy = wrapper.get('button[aria-label="Copy Themed source"]')
    expect(status.text()).toBe('')

    await copy.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(`${SOURCE}\n`)
    expect(status.text()).toBe('Copied')
    expect(status.attributes('data-state')).toBe('copied')
    expect(copy.attributes('aria-label')).toBe('Copy Themed source')
    expect(copy.attributes('data-copied')).toBe('')
    expect(copy.find('.ghost-copy-icon__copy').exists()).toBe(true)
    expect(copy.find('.ghost-copy-icon__check').exists()).toBe(true)

    // A second copy restarts the timer instead of letting the first clear it.
    await vi.advanceTimersByTimeAsync(DEMO_COPY_STATUS_MS - 500)
    await copy.trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(DEMO_COPY_STATUS_MS - 500)
    expect(status.text()).toBe('Copied')
    expect(copy.attributes('data-copied')).toBe('')
    await vi.advanceTimersByTimeAsync(500)
    expect(status.text()).toBe('')
    expect(copy.attributes('data-copied')).toBeUndefined()
  })

  it('reports failure, opens the source and selects it when no clipboard exists', async () => {
    removeClipboard()
    const wrapper = mountFrame()
    const toggle = wrapper.get('button[aria-label="Themed source code"]')
    const region = wrapper.get('[data-testid="ghost-example-source"]')
    expect(region.isVisible()).toBe(false)

    await wrapper
      .get('button[aria-label="Copy Themed source"]')
      .trigger('click')
    await flushPromises()

    const status = wrapper.get('[role="status"]')
    expect(status.attributes('data-state')).toBe('failed')
    expect(status.text()).toContain('Copy failed')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(region.isVisible()).toBe(true)
    expect(String(window.getSelection())).toBe(SOURCE)
    // Failure stays until the next attempt rather than timing out unseen.
    await vi.advanceTimersByTimeAsync(DEMO_COPY_STATUS_MS * 2)
    expect(status.attributes('data-state')).toBe('failed')
  })

  it('hides Copy and its status without sourceText', () => {
    const wrapper = mount(DemoPreview, {
      props: { title: 'Themed' },
      slots: { default: () => h(Demo) },
    })
    expect(wrapper.find('.ghost-example__copy').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})

describe('DemoPreview preview width', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is a collapsed disclosure over a named fieldset with presets, a labelled range and a report', async () => {
    const wrapper = mountFrame()
    const toggle = wrapper.get('button[aria-label="Themed preview width"]')
    const band = wrapper.get('[data-testid="ghost-example-width"]')

    expect(band.element.tagName).toBe('FIELDSET')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe(band.attributes('id'))
    expect(band.isVisible()).toBe(false)

    const legendId = band.get('legend').attributes('id')
    expect(band.get('legend').text()).toBe('Preview width')
    expect(band.attributes('aria-labelledby')).toBe(legendId)
    const range = band.get('input[type="range"]')
    expect(range.attributes('aria-labelledby')).toBe(legendId)
    const reportId = band
      .get('[data-testid="ghost-example-width-report"]')
      .attributes('id')
    expect(range.attributes('aria-describedby')).toBe(reportId)

    const radios = band.findAll('input[type="radio"]')
    expect(
      radios.map((radio) => radio.element.parentElement?.textContent.trim()),
    ).toEqual(['Auto', '320', '480', '768'])
    expect(new Set(radios.map((radio) => radio.attributes('name'))).size).toBe(
      1,
    )

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(band.isVisible()).toBe(true)
  })

  it('applies a preset or range width to the query container without remounting the demo', async () => {
    const wrapper = mountFrame()
    const viewport = wrapper.get('[data-testid="ghost-example-viewport"]')
    const demo = wrapper.get('.demo-root').element
    expect(viewport.attributes('data-constrained')).toBeUndefined()

    const radios = wrapper.findAll('input[type="radio"]')
    await radios[2]?.setValue(true)
    expect(viewport.attributes('data-constrained')).toBe('')
    expect(viewport.attributes('style')).toContain(
      '--_demo-preview-width: 480px',
    )
    expect(
      wrapper.get('[data-testid="ghost-example-width-report"]').text(),
    ).toBe('480 px')

    const range = wrapper.get('input[type="range"]')
    await range.setValue('333')
    expect(viewport.attributes('style')).toContain(
      '--_demo-preview-width: 333px',
    )
    expect(range.attributes('aria-valuetext')).toBe('333 pixels')
    expect(
      radios.some(
        (radio) =>
          radio.element instanceof HTMLInputElement && radio.element.checked,
      ),
    ).toBe(false)

    await radios[0]?.setValue(true)
    expect(viewport.attributes('data-constrained')).toBeUndefined()
    expect(wrapper.get('.demo-root').element).toBe(demo)
  })

  it('moves focus to the toggle when a collapsing region holds it', async () => {
    const wrapper = mountFrame()
    const sourceToggle = wrapper.get('button[aria-label="Themed source code"]')
    await sourceToggle.trigger('click')
    const pre = wrapper.get('[data-testid="ghost-example-source"] pre')
    if (pre.element instanceof HTMLElement) pre.element.focus()
    expect(document.activeElement).toBe(pre.element)
    // `trigger` does not move focus, like a pointer click in Safari.
    await sourceToggle.trigger('click')
    expect(document.activeElement).toBe(sourceToggle.element)

    const widthToggle = wrapper.get('button[aria-label="Themed preview width"]')
    await widthToggle.trigger('click')
    wrapper.get<HTMLInputElement>('input[type="radio"]').element.focus()
    await widthToggle.trigger('click')
    expect(document.activeElement).toBe(widthToggle.element)

    // Focus elsewhere is left alone.
    await sourceToggle.trigger('click')
    const demo = wrapper.get<HTMLInputElement>('.demo-root').element
    demo.focus()
    await sourceToggle.trigger('click')
    expect(document.activeElement).toBe(demo)
  })
})

describe('enhanceMarkdownCodeFences', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    removeClipboard()
    document.body.innerHTML = ''
  })

  it('hydrates standalone fences with SVG icons and status, skipping DemoPreview source', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    stubClipboard(writeText)

    document.body.innerHTML = `
      <div class="vp-doc">
        <div class="language-bash">
          <button title="Copy Code" class="copy"></button>
          <span class="lang">bash</span>
          <pre><code>$ pnpm install\n</code></pre>
        </div>
        <div class="ghost-example__source">
          <div class="language-vue">
            <button title="Copy Code" class="copy"></button>
            <span class="lang">vue</span>
            <pre><code>&lt;template /&gt;</code></pre>
          </div>
        </div>
      </div>
    `

    enhanceMarkdownCodeFences()

    const standaloneBtn = document.querySelector<HTMLButtonElement>(
      '.vp-doc > .language-bash > button.copy',
    )
    const demoSourceBtn = document.querySelector<HTMLButtonElement>(
      '.ghost-example__source button.copy',
    )
    expect(standaloneBtn?.getAttribute('aria-label')).toBe('Copy bash code')
    expect(
      standaloneBtn?.querySelector('.ghost-copy-icon__copy'),
    ).not.toBeNull()
    expect(
      standaloneBtn?.querySelector('.ghost-copy-icon__check'),
    ).not.toBeNull()
    expect(demoSourceBtn?.dataset.ghostEnhanced).toBeUndefined()

    standaloneBtn?.click()
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('pnpm install')
    expect(standaloneBtn?.classList.contains('copied')).toBe(true)
    const status = document.querySelector(
      '.vp-doc > .language-bash > [role="status"]',
    )
    expect(status?.textContent).toBe('Copied')

    await vi.advanceTimersByTimeAsync(DEMO_COPY_STATUS_MS)
    expect(standaloneBtn?.classList.contains('copied')).toBe(false)
    expect(status?.textContent).toBe('')
  })

  it('selects fence code and announces failure when clipboard is unavailable', async () => {
    removeClipboard()

    document.body.innerHTML = `
      <div class="vp-doc">
        <div class="language-ts">
          <button title="Copy Code" class="copy"></button>
          <span class="lang">ts</span>
          <pre><code>const x = 1</code></pre>
        </div>
      </div>
    `

    enhanceMarkdownCodeFences()
    const btn = document.querySelector<HTMLButtonElement>(
      '.vp-doc > .language-ts > button.copy',
    )
    btn?.click()
    await flushPromises()

    const status = document.querySelector(
      '.vp-doc > .language-ts > [role="status"]',
    )
    expect(status?.getAttribute('data-state')).toBe('failed')
    expect(status?.textContent).toContain('Copy failed')
    expect(String(window.getSelection())).toBe('const x = 1')
  })
})
