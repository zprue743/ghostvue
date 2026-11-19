import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AssigneeSearch from '../../examples/combobox/assignee-search.vue'

/*
 * combobox/assignee-search searches a local people directory with
 * query-dependent latency. These checks cover what a screenshot cannot: each
 * async state (loading, results, empty, error, selected), the ARIA wiring,
 * and that a slower, older response never overwrites a newer one.
 */
const attached: ReturnType<typeof mount>[] = []

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
  vi.useRealTimers()
})

async function mountExample() {
  const wrapper = mount(AssigneeSearch, { attachTo: document.body })
  attached.push(wrapper)
  // Options register on the tick after they mount.
  await flushPromises()
  return wrapper
}

function input(): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>('[role="combobox"]')
  if (!element) throw new Error('No combobox input')
  return element
}

function listbox(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[role="listbox"]')
  if (!element) throw new Error('No listbox')
  return element
}

function optionNames(): string[] {
  return [
    ...document.querySelectorAll('[role="option"] .assignee-option__name'),
  ].map((element) => element.textContent.trim())
}

function emptyText(): string {
  const empty = document.querySelector<HTMLElement>('[data-part="empty"]')
  if (!empty || empty.style.display === 'none') return ''
  return empty.textContent.replace(/\s+/g, ' ').trim()
}

function status(): string {
  return (
    document
      .querySelector('.assign__status[role="status"]')
      ?.textContent.trim() ?? ''
  )
}

async function press(key: string): Promise<void> {
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
  await flushPromises()
}

async function type(query: string): Promise<void> {
  const element = input()
  element.focus()
  element.value = query
  element.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

describe('combobox/assignee-search example', () => {
  it('labels the input from the field and suggests the issue team before typing', async () => {
    await mountExample()
    const element = input()
    const label = document.querySelector('label[for]')
    expect(label?.textContent.trim()).toBe('Assignee')
    expect(label?.getAttribute('for')).toBe(element.id)
    expect(element.getAttribute('placeholder')).toBe('Search people')
    expect(element.getAttribute('aria-describedby')).toBeTruthy()
    expect(element.getAttribute('aria-controls')).toBe(listbox().id)

    element.focus()
    await press('ArrowDown')
    expect(element.getAttribute('aria-expanded')).toBe('true')
    expect(optionNames()).toEqual(['Maya Chen', 'Marcus Reed', 'Hannah Moore'])
    expect(
      document.querySelector('[role="group"] [data-part="label"]')?.textContent,
    ).toContain('Suggested')
    const active = element.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active ?? '')?.textContent).toContain(
      'Maya Chen',
    )
  })

  it('shows loading, then results for the query', async () => {
    await mountExample()
    await type('pri')
    expect(listbox().getAttribute('aria-busy')).toBe('true')
    expect(document.querySelector('.assignee-results__loading')).not.toBeNull()
    expect(optionNames()).toEqual([])
    // The empty message stays hidden while a request is in flight.
    expect(emptyText()).toBe('')

    await advance(600)
    expect(listbox().hasAttribute('aria-busy')).toBe(false)
    expect(document.querySelector('.assignee-results__loading')).toBeNull()
    expect(optionNames()).toEqual(['Priya Natarajan'])
    expect(
      document.querySelector('[role="group"] [data-part="label"]')?.textContent,
    ).toContain('Matching people')
  })

  it('ignores an older response that resolves after a newer one', async () => {
    await mountExample()
    // "m" answers in 440 ms; "ma" in 280 ms, so "m" resolves last.
    await type('m')
    await type('ma')
    await advance(300)
    const forMa = optionNames()
    expect(forMa).toContain('Maya Chen')
    expect(forMa).not.toContain('Daniel Kim')
    expect(listbox().hasAttribute('aria-busy')).toBe(false)

    await advance(400)
    // The stale "m" response matched more people; it must not replace "ma".
    expect(optionNames()).toEqual(forMa)
    expect(listbox().hasAttribute('aria-busy')).toBe(false)
    expect(input().value).toBe('ma')
  })

  it('keeps loading until the latest request answers', async () => {
    await mountExample()
    await type('da')
    await type('d')
    // "da" (280 ms) resolves first but is stale; "d" (440 ms) is still running.
    await advance(300)
    expect(listbox().getAttribute('aria-busy')).toBe('true')
    expect(optionNames()).toEqual([])
    await advance(200)
    expect(listbox().hasAttribute('aria-busy')).toBe(false)
    expect(optionNames().length).toBeGreaterThan(1)
  })

  it('shows an empty state for a query with no matches', async () => {
    await mountExample()
    await type('zzz')
    await advance(600)
    expect(optionNames()).toEqual([])
    expect(emptyText()).toContain('No one matches “zzz”')
  })

  it('shows an error state while the directory is offline', async () => {
    const wrapper = await mountExample()
    await wrapper.get('#assignee-offline').trigger('click')
    expect(wrapper.get('#assignee-offline').attributes('aria-checked')).toBe(
      'true',
    )
    await type('maya')
    await advance(600)
    expect(optionNames()).toEqual([])
    expect(emptyText()).toContain('Couldn’t reach the directory')

    // Back online, the next query loads normally.
    await wrapper.get('#assignee-offline').trigger('click')
    await type('may')
    await advance(600)
    expect(emptyText()).toBe('')
    expect(optionNames()).toEqual(['Maya Chen'])
  })

  it('assigns with Enter and unassigns back to the search', async () => {
    const wrapper = await mountExample()
    await type('jonas')
    await advance(600)
    await press('ArrowDown')
    await press('Enter')
    expect(input().getAttribute('aria-expanded')).toBe('false')
    expect(input().value).toBe('Jonas Weber')
    expect(status()).toBe('Assigned to Jonas Weber.')
    expect(wrapper.get('.assign__person-name').text()).toBe('Jonas Weber')

    const unassign = wrapper.get('button[aria-label="Unassign Jonas Weber"]')
    await unassign.trigger('click')
    await flushPromises()
    expect(wrapper.find('.assign__person').exists()).toBe(false)
    expect(wrapper.get('.assign__unassigned').text()).toBe('Unassigned')
    expect(status()).toBe('Issue is unassigned.')
    expect(input().value).toBe('')
    expect(document.activeElement).toBe(input())
  })
})
