import { afterEach, describe, expect, it } from 'vitest'

import {
  getFocusableElements,
  getTabbableElements,
  isDisabledElement,
  isFocusable,
} from './get-tabbable-elements'

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

  it('includes contenteditable hosts and aria-disabled loading controls', () => {
    const root = mountRoot(`
      <div contenteditable="true">Edit</div>
      <button type="button" aria-disabled="true">Busy</button>
      <a>No href</a>
    `)

    expect(getTabbableElements(root).map((el) => el.tagName)).toEqual([
      'DIV',
      'BUTTON',
    ])
  })

  it('keeps a visibility:visible child tabbable inside a visibility:hidden parent', () => {
    const root = mountRoot(`
      <div style="visibility: hidden">
        <button type="button" style="visibility: visible">Shown</button>
      </div>
      <button type="button">Plain</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Shown',
      'Plain',
    ])
  })

  it('excludes elements with inherited visibility:hidden when not overridden', () => {
    const root = mountRoot(`
      <div style="visibility: hidden">
        <button type="button">Hidden</button>
      </div>
      <button type="button">Plain</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Plain',
    ])
  })

  it('excludes descendants inside display:none ancestors such as v-show', () => {
    const root = mountRoot(`
      <div style="display: none"><button type="button">Hidden</button></div>
      <button type="button">Visible</button>
    `)

    expect(getTabbableElements(root).map((el) => el.textContent)).toEqual([
      'Visible',
    ])
  })

  it('treats aria-disabled as a roving skip signal without removing native focus', () => {
    const root = mountRoot(
      `<button type="button" aria-disabled="true">Busy</button>`,
    )
    const button = root.querySelector<HTMLButtonElement>('button')
    if (!button) {
      throw new Error('expected a button')
    }

    expect(isFocusable(button)).toBe(true)
    expect(getTabbableElements(root)).toHaveLength(1)
    expect(isDisabledElement(button)).toBe(true)
    expect(getFocusableElements(root)).toContain(button)
  })
})
