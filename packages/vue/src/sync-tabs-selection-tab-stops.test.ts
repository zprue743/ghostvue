import { afterEach, describe, expect, it } from 'vitest'

import { applyTabsSelectionTabStops } from './sync-tabs-selection-tab-stops'

const fixtures: HTMLElement[] = []

afterEach(() => {
  for (const node of fixtures) {
    node.remove()
  }
  fixtures.length = 0
})

function mountTabList(html: string): HTMLElement {
  const list = document.createElement('div')
  list.setAttribute('role', 'tablist')
  list.innerHTML = html
  document.body.append(list)
  fixtures.push(list)
  return list
}

function tab(list: HTMLElement, index: number): HTMLButtonElement {
  const buttons = list.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  const element = buttons[index]
  if (element === undefined) {
    throw new Error('expected tab at index ' + String(index))
  }
  return element
}

describe('applyTabsSelectionTabStops', () => {
  it('assigns tabindex 0 to the selected enabled tab via isDisabledElement', () => {
    const list = mountTabList(`
      <button type="button" role="tab" data-ghost-tabs-value="one">One</button>
      <button type="button" role="tab" data-ghost-tabs-value="two" disabled>Two</button>
      <button type="button" role="tab" data-ghost-tabs-value="three">Three</button>
    `)

    applyTabsSelectionTabStops(list, 'one')

    expect(tab(list, 0).tabIndex).toBe(0)
    expect(tab(list, 1).tabIndex).toBe(-1)
    expect(tab(list, 2).tabIndex).toBe(-1)
  })

  it('falls back to the first focusable tab when the selected value is disabled', () => {
    const list = mountTabList(`
      <button type="button" role="tab" data-ghost-tabs-value="one">One</button>
      <button type="button" role="tab" data-ghost-tabs-value="two" disabled>Two</button>
      <button type="button" role="tab" data-ghost-tabs-value="three">Three</button>
    `)

    applyTabsSelectionTabStops(list, 'two')

    expect(tab(list, 0).tabIndex).toBe(0)
    expect(tab(list, 1).tabIndex).toBe(-1)
    expect(tab(list, 2).tabIndex).toBe(-1)
  })

  it('treats aria-disabled tabs as disabled for tab stops', () => {
    const list = mountTabList(`
      <button type="button" role="tab" data-ghost-tabs-value="one" aria-disabled="true">Busy</button>
      <button type="button" role="tab" data-ghost-tabs-value="two">Two</button>
    `)

    applyTabsSelectionTabStops(list, 'one')

    expect(tab(list, 0).tabIndex).toBe(-1)
    expect(tab(list, 1).tabIndex).toBe(0)
  })

  it('does not assign the tab stop to a tab inside a display:none subtree', () => {
    const list = mountTabList(`
      <div style="display: none">
        <button type="button" role="tab" data-ghost-tabs-value="one">Hidden</button>
      </div>
      <button type="button" role="tab" data-ghost-tabs-value="two">Visible</button>
    `)

    applyTabsSelectionTabStops(list, 'one')

    expect(tab(list, 0).tabIndex).toBe(-1)
    expect(tab(list, 1).tabIndex).toBe(0)
  })

  it('keeps one tab stop when every tab sits in a display:none subtree', () => {
    const list = mountTabList(`
      <div style="display: none">
        <button type="button" role="tab" data-ghost-tabs-value="one">One</button>
        <button type="button" role="tab" data-ghost-tabs-value="two">Two</button>
        <button type="button" role="tab" data-ghost-tabs-value="three">Three</button>
      </div>
    `)

    applyTabsSelectionTabStops(list, 'two')

    expect(tab(list, 0).tabIndex).toBe(-1)
    expect(tab(list, 1).tabIndex).toBe(0)
    expect(tab(list, 2).tabIndex).toBe(-1)
  })
})
