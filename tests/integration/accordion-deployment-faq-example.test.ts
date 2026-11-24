import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import DeploymentFaq from '../../examples/accordion/deployment-faq.vue'
import { COLLAPSIBLE_CLOSE_FALLBACK_MS } from '../../packages/vue/src/use-collapsible-content-hidden'

const sectionTitles = [
  'Zero-downtime rollback window',
  'Regional failover sequencing',
  'Audit log retention & export',
]

function buttonNamed(wrapper: ReturnType<typeof mount>, name: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === name)
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

describe('accordion/deployment-faq example', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides every content part after Collapse all, not just its height', async () => {
    const wrapper = mount(DeploymentFaq, { attachTo: document.body })

    await buttonNamed(wrapper, 'Expand all').trigger('click')
    await nextTick()
    const contents = wrapper.findAll('[data-part="content"]')
    expect(contents).toHaveLength(sectionTitles.length)
    for (const content of contents) {
      expect(content.attributes('data-state')).toBe('open')
      expect(content.attributes('hidden')).toBeUndefined()
    }

    await buttonNamed(wrapper, 'Collapse all').trigger('click')
    await nextTick()
    await nextTick()
    // Themed panels keep `hidden` off while the close transition runs; the
    // transitionend fallback timer then commits the closed state.
    vi.advanceTimersByTime(COLLAPSIBLE_CLOSE_FALLBACK_MS)
    await nextTick()

    for (const title of sectionTitles) {
      expect(buttonNamed(wrapper, title).attributes('aria-expanded')).toBe(
        'false',
      )
    }
    for (const content of wrapper.findAll('[data-part="content"]')) {
      expect(content.attributes('data-state')).toBe('closed')
      // `hidden` removes the panel and its text from rendering, the
      // accessibility tree, and sequential focus navigation.
      expect((content.element as HTMLElement).hidden).toBe(true)
      expect(content.isVisible()).toBe(false)
      expect(content.attributes('tabindex')).toBeUndefined()
      expect(
        content.element.querySelector(
          'a[href], button, input, select, textarea, [tabindex]',
        ),
      ).toBeNull()
    }

    wrapper.unmount()
  })
})

describe('ghost-collapsible.css closed panels', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'packages/themes/src/ghost-collapsible.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')

  it('restores display: none for hidden panels after the shell display rule', () => {
    // Every themed rule uses zero-specificity `:where()`, so source order
    // decides; author `display: grid` would otherwise beat the UA `[hidden]`.
    const shellDisplay = css.indexOf('display: grid')
    const hiddenRule =
      /\.ghost-collapsible-content\[data-themed\]\[hidden\]\s*\)\s*\{\s*display:\s*none;/.exec(
        css,
      )
    expect(shellDisplay).toBeGreaterThan(-1)
    expect(hiddenRule).not.toBeNull()
    expect(hiddenRule?.index ?? -1).toBeGreaterThan(shellDisplay)
  })

  it('drops the animation shell block padding while closed so 0fr reaches zero', () => {
    expect(css).toMatch(
      /\.ghost-collapsible-content\[data-themed\]\[data-state='closed'\]\s*>\s*\[data-part='content-inner'\]\s*\)\s*\{\s*padding-block:\s*0;/,
    )
  })
})
