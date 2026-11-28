import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ReviewRequestForm from '../../examples/combobox/review-request-form.vue'

/*
 * combobox/review-request-form is the Combobox page's themed form workflow.
 * These checks cover what the preview teaches: client filtering with an
 * empty state, keyboard selection in single and multiple mode, one FormData
 * entry per selected label, the required reviewer failing checkValidity(),
 * and native reset back to the default labels.
 */
const attached: ReturnType<typeof mount>[] = []

async function mountExample() {
  const wrapper = mount(ReviewRequestForm, { attachTo: document.body })
  attached.push(wrapper)
  // Options register on the tick after they mount.
  await flushPromises()
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
})

function inputLabelled(name: string): HTMLInputElement {
  const label = [...document.querySelectorAll('label')].find((candidate) =>
    candidate.textContent.trim().startsWith(name),
  )
  const id = label?.getAttribute('for')
  const input = id ? document.getElementById(id) : null
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`No input labelled ${name}`)
  }
  return input
}

async function press(input: HTMLInputElement, key: string): Promise<void> {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await flushPromises()
}

async function type(input: HTMLInputElement, query: string): Promise<void> {
  input.focus()
  input.value = query
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

function visibleOptions(input: HTMLInputElement): string[] {
  const listId = input.getAttribute('aria-controls')
  const list = listId ? document.getElementById(listId) : null
  return [...(list?.querySelectorAll('[role="option"]') ?? [])].map((option) =>
    option.textContent.trim(),
  )
}

function emptyText(input: HTMLInputElement): string {
  const listId = input.getAttribute('aria-controls')
  const content = listId
    ? document.getElementById(listId)?.closest('.review-list')
    : null
  const empty = content?.querySelector<HTMLElement>('[data-part="empty"]')
  if (!empty || empty.style.display === 'none') return ''
  return empty.textContent.trim()
}

function chips(wrapper: Awaited<ReturnType<typeof mountExample>>): string[] {
  return wrapper.findAll('.review__chips li').map((chip) => chip.text())
}

async function submit(wrapper: Awaited<ReturnType<typeof mountExample>>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('combobox/review-request-form example', () => {
  it('blocks submit until a reviewer is chosen and focuses the input', async () => {
    const wrapper = await mountExample()
    const reviewer = inputLabelled('Reviewer')
    expect(reviewer.getAttribute('aria-required')).toBe('true')

    await submit(wrapper)
    expect(reviewer.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(reviewer)
    expect(wrapper.get('[role="alert"]').text()).toBe('Choose a reviewer.')
    expect(wrapper.find('.review__submitted').exists()).toBe(false)
  })

  it('filters reviewers, shows the empty state, and selects with the keyboard', async () => {
    const wrapper = await mountExample()
    const reviewer = inputLabelled('Reviewer')

    await type(reviewer, 'zz')
    expect(visibleOptions(reviewer)).toEqual([])
    expect(emptyText(reviewer)).toBe('No one matches that name.')

    await type(reviewer, 'pri')
    expect(visibleOptions(reviewer)).toEqual(['Priya Natarajan'])
    await press(reviewer, 'ArrowDown')
    expect(reviewer.getAttribute('aria-activedescendant')).toBeTruthy()
    await press(reviewer, 'Enter')
    expect(reviewer.value).toBe('Priya Natarajan')
    expect(reviewer.getAttribute('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    // The committed label lists every reviewer again on reopen.
    await press(reviewer, 'ArrowDown')
    expect(visibleOptions(reviewer)).toHaveLength(5)
  })

  it('toggles several labels without closing and submits one entry each', async () => {
    const wrapper = await mountExample()
    expect(chips(wrapper)).toEqual(['Bug'])

    const labels = inputLabelled('Labels')
    await type(labels, 'perf')
    expect(visibleOptions(labels)).toEqual(['Performance'])
    await press(labels, 'ArrowDown')
    await press(labels, 'Enter')
    // Multiple mode keeps the list open and the query in place.
    expect(labels.getAttribute('aria-expanded')).toBe('true')
    expect(labels.value).toBe('perf')
    expect(chips(wrapper)).toEqual(['Bug', 'Performance'])

    await type(labels, 'nothing')
    expect(emptyText(labels)).toBe('No labels match.')

    const reviewer = inputLabelled('Reviewer')
    await type(reviewer, 'maya')
    await press(reviewer, 'ArrowDown')
    await press(reviewer, 'Enter')
    await submit(wrapper)

    const data = new FormData(wrapper.get('form').element)
    expect(data.getAll('reviewer')).toEqual(['maya-chen'])
    expect(data.getAll('labels')).toEqual(['bug', 'performance'])
    expect(
      wrapper.findAll('.review__entry').map((row) => row.get('dd').text()),
    ).toEqual(['maya-chen', 'bug, performance'])
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Review requested from Maya Chen.',
    )
  })

  it('native reset restores the default labels and clears the reviewer', async () => {
    const wrapper = await mountExample()
    const labels = inputLabelled('Labels')
    await type(labels, 'bug')
    await press(labels, 'ArrowDown')
    await press(labels, 'Enter')
    expect(chips(wrapper)).toEqual([])
    expect(wrapper.get('.review__none').text()).toBe('No labels')

    const reviewer = inputLabelled('Reviewer')
    await type(reviewer, 'jonas')
    await press(reviewer, 'ArrowDown')
    await press(reviewer, 'Enter')

    wrapper.get('form').element.reset()
    await flushPromises()
    expect(chips(wrapper)).toEqual(['Bug'])
    expect(reviewer.value).toBe('')
    expect(labels.value).toBe('')
    expect(
      new FormData(wrapper.get('form').element).getAll('reviewer'),
    ).toEqual([''])
    expect(wrapper.get('[role="status"]').text()).toBe('Form reset.')
  })
})
