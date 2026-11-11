import { afterEach, describe, expect, it } from 'vitest'

import { getTabbableElements } from './get-tabbable-elements'

const fixtures: HTMLElement[] = []

afterEach(() => {
  for (const node of fixtures) {
    node.remove()
  }
  fixtures.length = 0
})

function mountRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  fixtures.push(root)
  return root
}

describe('getTabbableElements', () => {
  it('returns naturally tabbable descendants in document order', () => {
    const root = mountRoot(`
      <a href="#one">One</a>
      <button type="button">Two</button>
      <input>
    `)

    expect(getTabbableElements(root).map((el) => el.tagName)).toEqual([
      'A',
      'BUTTON',
      'INPUT',
    ])
  })

  it('includes the root when the root itself is tabbable', () => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Root'
    document.body.append(button)
    fixtures.push(button)

    expect(getTabbableElements(button)).toEqual([button])
  })

  it('excludes disabled controls and hidden inputs', () => {
    const root = mountRoot(`
      <button type="button" disabled>Disabled</button>
      <input disabled>
      <input type="hidden">
      <button type="button">Live</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Live',
    ])
  })

  it('excludes elements with a negative tabindex from the tab sequence', () => {
    const root = mountRoot(`
      <button type="button" tabindex="-1">Skip</button>
      <button type="button">Keep</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Keep',
    ])
  })

  it('excludes hidden, inert, and aria-hidden subtrees', () => {
    const root = mountRoot(`
      <button type="button" hidden>Hidden</button>
      <div inert><button type="button">Inert</button></div>
      <div aria-hidden="true"><button type="button">Aria</button></div>
      <button type="button" style="display: none">Display</button>
      <button type="button" style="visibility: hidden">Visibility</button>
      <button type="button">Visible</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Visible',
    ])
  })

  it('places positive tabindex elements before the rest of the sequence', () => {
    const root = mountRoot(`
      <button type="button" data-id="zero">Zero</button>
      <button type="button" tabindex="2" data-id="two">Two</button>
      <button type="button" tabindex="1" data-id="one">One</button>
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'one',
      'two',
      'zero',
    ])
  })

  it('includes contenteditable hosts and skips aria-disabled controls', () => {
    const root = mountRoot(`
      <div contenteditable="true">Edit</div>
      <button type="button" aria-disabled="true">Busy</button>
      <a>No href</a>
    `)

    expect(getTabbableElements(root).map((el) => el.tagName)).toEqual(['DIV'])
  })
})
