import { describe, expect, it } from 'vitest'

import { applyToggleGroupSelectionTabStops } from './sync-toggle-group-selection-tab-stops'

describe('applyToggleGroupSelectionTabStops', () => {
  it('assigns tabindex 0 to the selected value', () => {
    const root = document.createElement('div')
    root.className = 'ghost-toggle-group'
    const first = document.createElement('button')
    first.className = 'ghost-toggle-group-item'
    first.dataset['ghostToggleGroupValue'] = 'one'
    const second = document.createElement('button')
    second.className = 'ghost-toggle-group-item'
    second.dataset['ghostToggleGroupValue'] = 'two'
    root.append(first, second)
    applyToggleGroupSelectionTabStops(root, 'two')
    expect(first.tabIndex).toBe(-1)
    expect(second.tabIndex).toBe(0)
  })

  it('ignores items that belong to a nested toggle group', () => {
    const outer = document.createElement('div')
    outer.className = 'ghost-toggle-group'
    const outerItem = document.createElement('button')
    outerItem.className = 'ghost-toggle-group-item'
    outerItem.dataset['ghostToggleGroupValue'] = 'outer'

    const inner = document.createElement('div')
    inner.className = 'ghost-toggle-group'
    const innerItem = document.createElement('button')
    innerItem.className = 'ghost-toggle-group-item'
    innerItem.dataset['ghostToggleGroupValue'] = 'inner'

    outer.append(outerItem, inner)
    inner.append(innerItem)

    applyToggleGroupSelectionTabStops(outer, 'outer')
    expect(outerItem.tabIndex).toBe(0)
    expect(innerItem.tabIndex).toBe(-1)

    applyToggleGroupSelectionTabStops(inner, 'inner')
    expect(innerItem.tabIndex).toBe(0)
  })
})