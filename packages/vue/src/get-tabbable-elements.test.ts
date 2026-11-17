import { afterEach, describe, expect, it, vi } from 'vitest'

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

  it('returns only the checked radio for a named native radio group', () => {
    const root = mountRoot(`
      <button type="button" data-id="before">Before</button>
      <input type="radio" name="choice" value="a" data-id="r-a">
      <input type="radio" name="choice" value="b" data-id="r-b" checked>
      <input type="radio" name="choice" value="c" data-id="r-c">
      <button type="button" data-id="after">After</button>
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'before',
      'r-b',
      'after',
    ])
  })

  it('returns one tab stop per named radio group and keeps first when all are unchecked', () => {
    const root = mountRoot(`
      <input type="radio" name="g1" value="1" data-id="g1-1">
      <input type="radio" name="g1" value="2" data-id="g1-2">
      <input type="radio" name="g2" value="1" data-id="g2-1">
      <input type="radio" name="g2" value="2" data-id="g2-2" checked>
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'g1-1',
      'g2-2',
    ])
  })

  it('falls back to the first tabbable radio when the checked radio is disabled, hidden, or tabindex="-1"', () => {
    const root = mountRoot(`
      <input type="radio" name="dis" value="1" data-id="dis-1" checked disabled>
      <input type="radio" name="dis" value="2" data-id="dis-2">
      <fieldset disabled>
        <input type="radio" name="fs" value="1" data-id="fs-1" checked>
      </fieldset>
      <input type="radio" name="fs" value="2" data-id="fs-2">
      <input type="radio" name="hid" value="1" data-id="hid-1" checked hidden>
      <input type="radio" name="hid" value="2" data-id="hid-2">
      <input type="radio" name="neg" value="1" data-id="neg-1" checked tabindex="-1">
      <input type="radio" name="neg" value="2" data-id="neg-2">
      <input type="radio" name="all-dis" value="1" disabled>
      <input type="radio" name="all-dis" value="2" disabled>
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'dis-2',
      'fs-2',
      'hid-2',
      'neg-2',
    ])
  })

  it('keeps each unnamed native radio as its own tab stop', () => {
    const root = mountRoot(`
      <input type="radio" data-id="u1" checked>
      <input type="radio" data-id="u2">
      <input type="radio" name="" data-id="u3">
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'u1',
      'u2',
      'u3',
    ])
  })

  it('scopes named radio groups by form ownership', () => {
    const root = mountRoot(`
      <form id="form-a">
        <input type="radio" name="tier" value="1" data-id="a1" checked>
        <input type="radio" name="tier" value="2" data-id="a2">
      </form>
      <form id="form-b">
        <input type="radio" name="tier" value="1" data-id="b1">
        <input type="radio" name="tier" value="2" data-id="b2" checked>
      </form>
      <input type="radio" name="tier" value="3" form="form-a" data-id="a3-ext">
      <input type="radio" name="tier" value="1" data-id="unowned-1">
      <input type="radio" name="tier" value="2" data-id="unowned-2">
    `)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'a1',
      'b2',
      'unowned-1',
    ])
  })

  it('respects a checked tabbable radio in the same form outside the query root unless inert', () => {
    const wrapper = mountRoot(`
      <form id="shared-form">
        <input type="radio" name="mode" value="ext" data-id="ext" checked>
        <div data-id="subroot">
          <input type="radio" name="mode" value="in1" data-id="in1">
          <button type="button" data-id="btn">Action</button>
        </div>
      </form>
    `)
    const subroot = wrapper.querySelector<HTMLElement>('[data-id="subroot"]')
    const ext = wrapper.querySelector<HTMLInputElement>('[data-id="ext"]')
    if (!subroot || !ext) {
      throw new Error('expected subroot and external radio')
    }

    expect(getTabbableElements(subroot).map((el) => el.dataset['id'])).toEqual([
      'btn',
    ])

    ext.setAttribute('inert', '')
    expect(getTabbableElements(subroot).map((el) => el.dataset['id'])).toEqual([
      'in1',
      'btn',
    ])
  })

  it('does not traverse nested open shadow roots from light DOM, while querying a ShadowRoot directly works', () => {
    const root = mountRoot(
      `<button type="button" data-id="light">Light</button>`,
    )
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const shadowBtn = document.createElement('button')
    shadowBtn.type = 'button'
    shadowBtn.dataset['id'] = 'shadow'
    shadowBtn.textContent = 'Shadow'
    shadow.append(shadowBtn)
    root.append(host)

    expect(getTabbableElements(root).map((el) => el.dataset['id'])).toEqual([
      'light',
    ])
    expect(getTabbableElements(shadow).map((el) => el.dataset['id'])).toEqual([
      'shadow',
    ])
  })

  it('memoizes ancestor visibility checks within a single query', () => {
    const root = mountRoot(`
      <div class="l1"><div class="l2"><div class="l3">
        <button type="button">One</button>
        <button type="button">Two</button>
        <button type="button">Three</button>
        <button type="button">Four</button>
      </div></div></div>
    `)

    const spy = vi.spyOn(window, 'getComputedStyle')
    try {
      const result = getTabbableElements(root)
      expect(result).toHaveLength(4)
      // 4 buttons + 3 wrapper divs + root + body + html = 10 unique elements.
      expect(spy.mock.calls.length).toBeLessThanOrEqual(10)
    } finally {
      spy.mockRestore()
    }
  })
})
