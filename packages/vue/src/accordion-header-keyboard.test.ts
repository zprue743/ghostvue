import { describe, expect, it } from 'vitest'

import {
  getDirectAccordionTriggers,
  handleAccordionHeaderKeydown,
  isDirectAccordionTrigger,
} from './accordion-header-keyboard'

function accordionDom(): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('data-ghost-accordion', '')
  root.innerHTML = `
    <div class="ghost-accordion-item" data-part="item">
      <h3 data-part="header">
        <button type="button" data-part="trigger" id="outer-a">A</button>
      </h3>
      <div data-part="content">
        <a href="#nested" id="panel-link">Inside</a>
        <div data-ghost-accordion>
          <div data-part="item">
            <h3 data-part="header">
              <button type="button" data-part="trigger" id="inner-nested">N</button>
            </h3>
          </div>
        </div>
      </div>
    </div>
    <div class="ghost-accordion-item" data-part="item">
      <h3 data-part="header">
        <button type="button" data-part="trigger" id="outer-b">B</button>
      </h3>
    </div>
  `
  document.body.appendChild(root)
  return root
}

describe('accordion-header-keyboard', () => {
  it('returns only direct triggers, not nested accordion headers', () => {
    const root = accordionDom()
    const ids = getDirectAccordionTriggers(root).map((el) => el.id)
    expect(ids).toEqual(['outer-a', 'outer-b'])
    root.remove()
  })

  it('moves focus among direct triggers on arrow keys', () => {
    const root = accordionDom()
    const a = root.querySelector('#outer-a') as HTMLButtonElement
    const b = root.querySelector('#outer-b') as HTMLButtonElement
    a.focus()
    handleAccordionHeaderKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      root,
    )
    expect(document.activeElement).toBe(b)
    root.remove()
  })

  it('ignores keydown when focus is on a nested trigger', () => {
    const root = accordionDom()
    const nested = root.querySelector('#inner-nested') as HTMLButtonElement
    nested.focus()
    handleAccordionHeaderKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      root,
    )
    expect(document.activeElement).toBe(nested)
    root.remove()
  })

  it('recognizes direct triggers only', () => {
    const root = accordionDom()
    const a = root.querySelector('#outer-a')
    const nested = root.querySelector('#inner-nested')
    expect(isDirectAccordionTrigger(root, a)).toBe(true)
    expect(isDirectAccordionTrigger(root, nested)).toBe(false)
    root.remove()
  })
})