import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

import { GhostCard } from '../../packages/themes/src'

const themesSrcDir = resolve(process.cwd(), 'packages/themes/src')
const tokensCssPath = join(themesSrcDir, 'generated', 'tokens.css')

/**
 * Runtime CSS custom properties set imperatively on elements rather than
 * emitted by the design-token compiler.
 */
const RUNTIME_GHOST_VARS = new Set([
  '--ghost-pointer-x',
  '--ghost-pointer-y',
  '--ghost-segmented-item-count',
  '--ghost-segmented-selected-index',
])

function collectEmittedTokens(): Set<string> {
  const css = readFileSync(tokensCssPath, 'utf8')
  const emitted = new Set<string>()
  for (const match of css.matchAll(/(--ghost-[a-z0-9-]+)\s*:/g)) {
    const token = match[1]
    if (token) {
      emitted.add(token)
    }
  }
  return emitted
}

describe('theme recipe token references', () => {
  it('resolves every var(--ghost-...) in theme recipes to an emitted token', () => {
    const emitted = collectEmittedTokens()
    expect(emitted.size).toBeGreaterThan(0)

    const cssFiles = readdirSync(themesSrcDir)
      .filter((name) => name.endsWith('.css'))
      .sort()
    expect(cssFiles.length).toBeGreaterThan(0)

    const unresolved: string[] = []
    for (const file of cssFiles) {
      const content = readFileSync(join(themesSrcDir, file), 'utf8')
      const lines = content.split(/\r?\n/)
      lines.forEach((line, index) => {
        for (const match of line.matchAll(/var\(\s*(--ghost-[a-z0-9-]+)/g)) {
          const token = match[1]
          if (token && !emitted.has(token) && !RUNTIME_GHOST_VARS.has(token)) {
            unresolved.push(`${file}:${String(index + 1)} -> ${token}`)
          }
        }
      })
    }

    expect(unresolved).toEqual([])
  })

  it('uses authored spacing tokens in GhostCard so padding and margins resolve', () => {
    const tokensCss = readFileSync(tokensCssPath, 'utf8')
    const cardCss = readFileSync(join(themesSrcDir, 'ghost-card.css'), 'utf8')

    expect(cardCss).toContain('var(--ghost-space-inset-md)')
    expect(cardCss).toContain('var(--ghost-space-stack-sm)')
    expect(cardCss).toContain('var(--ghost-space-stack-md)')
    expect(tokensCss).toMatch(/--ghost-space-inset-md:\s*[^;]+;/)
    expect(tokensCss).toMatch(/--ghost-space-stack-sm:\s*[^;]+;/)
    expect(tokensCss).toMatch(/--ghost-space-stack-md:\s*[^;]+;/)

    const wrapper = mount(GhostCard, {
      slots: {
        default: () => [
          h('div', { 'data-part': 'header' }, 'Header'),
          h('div', { 'data-part': 'content' }, 'Body'),
          h('div', { 'data-part': 'footer' }, 'Footer'),
        ],
      },
    })

    expect(wrapper.classes()).toContain('ghost-card')
    expect(wrapper.attributes('data-themed')).toBe('')
    wrapper.unmount()
  })
})
