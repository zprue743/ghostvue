import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import RecordActions from '../../examples/dropdown-menu/record-actions.vue'

/*
 * dropdown-menu/record-actions runs edit, duplicate, status, and archive
 * actions from a per-row menu. These checks cover what a screenshot cannot:
 * the menu structure and ARIA wiring, each action's outcome on the list, and
 * where focus lands when the trigger that opened the menu is gone.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(RecordActions, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
})

function names(): string[] {
  return [...document.querySelectorAll('.briefs__name')].map((element) =>
    element.textContent.trim(),
  )
}

function trigger(title: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[aria-label="Actions for ${title}"]`,
  )
  if (!element) throw new Error(`No trigger for ${title}`)
  return element
}

function menu(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="menu"]')
}

function item(label: string): HTMLElement {
  const element = [
    ...document.querySelectorAll<HTMLElement>(
      '[role="menu"] [role="menuitem"]',
    ),
  ].find((candidate) => candidate.textContent.trim() === label)
  if (!element) throw new Error(`No menu item ${label}`)
  return element
}

async function openMenu(title: string): Promise<void> {
  trigger(title).click()
  await flushPromises()
}

async function choose(title: string, label: string): Promise<void> {
  await openMenu(title)
  item(label).click()
  await flushPromises()
}

function status(): string {
  return document.querySelector('[role="status"]')?.textContent.trim() ?? ''
}

describe('dropdown-menu/record-actions example', () => {
  it('wires each row trigger to a grouped menu with the destructive item last', async () => {
    mountExample()
    expect(names()).toEqual([
      'Spring launch brief',
      'Pricing page refresh',
      'Onboarding email series',
    ])

    const button = trigger('Pricing page refresh')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')

    await openMenu('Pricing page refresh')
    const content = menu()
    expect(content).not.toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-controls')).toBe(content?.id)

    const groups = [...(content?.querySelectorAll('[role="group"]') ?? [])]
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      'Edit',
      'Status',
    ])
    expect(content?.querySelectorAll('[role="separator"]')).toHaveLength(2)
    const items = [
      ...(content?.querySelectorAll('[role="menuitem"]') ?? []),
    ].map((element) => element.textContent.trim())
    expect(items).toEqual(['Edit title', 'Duplicate', 'Publish', 'Archive'])
    expect(item('Archive').classList).toContain('record-menu__danger')
    // Icons are decorative; the item text is the accessible name.
    for (const icon of content?.querySelectorAll('svg') ?? []) {
      expect(icon.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('duplicates a record as a draft right after the source', async () => {
    mountExample()
    await choose('Spring launch brief', 'Duplicate')

    expect(menu()).toBeNull()
    expect(names()).toEqual([
      'Spring launch brief',
      'Spring launch brief (copy)',
      'Pricing page refresh',
      'Onboarding email series',
    ])
    expect(status()).toBe('Duplicated “Spring launch brief” as a draft.')
    expect(document.querySelector('.briefs__summary')?.textContent).toBe(
      '4 active · 1 published',
    )
    expect(document.activeElement).toBe(trigger('Spring launch brief'))
  })

  it('publishes and unpublishes from the status group', async () => {
    mountExample()
    await choose('Pricing page refresh', 'Publish')
    expect(status()).toBe('Published “Pricing page refresh”.')
    expect(document.querySelector('.briefs__summary')?.textContent).toBe(
      '3 active · 2 published',
    )

    await openMenu('Pricing page refresh')
    expect(() => item('Move to drafts')).not.toThrow()
    item('Move to drafts').click()
    await flushPromises()
    expect(status()).toBe('Moved “Pricing page refresh” back to drafts.')
  })

  it('edits a title inline, focusing the field and then the trigger', async () => {
    mountExample()
    await choose('Onboarding email series', 'Edit title')

    const input = document.querySelector<HTMLInputElement>(
      '[data-record-title-input]',
    )
    expect(input?.value).toBe('Onboarding email series')
    expect(document.activeElement).toBe(input)
    if (!input) throw new Error('No title field')

    input.value = '  Welcome email series  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.form?.requestSubmit()
    await flushPromises()

    expect(names()).toContain('Welcome email series')
    expect(status()).toBe('Renamed to “Welcome email series”.')
    expect(document.activeElement).toBe(trigger('Welcome email series'))
  })

  it('keeps editing on an empty title and discards on Escape', async () => {
    mountExample()
    await choose('Spring launch brief', 'Edit title')
    const input = document.querySelector<HTMLInputElement>(
      '[data-record-title-input]',
    )
    if (!input) throw new Error('No title field')

    input.value = ' '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.form?.requestSubmit()
    await flushPromises()
    expect(status()).toBe('Enter a title to save.')
    expect(document.querySelector('[data-record-title-input]')).not.toBeNull()

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await flushPromises()
    expect(document.querySelector('[data-record-title-input]')).toBeNull()
    expect(names()[0]).toBe('Spring launch brief')
    expect(document.activeElement).toBe(trigger('Spring launch brief'))
  })

  it('archives a record, moves focus to the next row, and undoes', async () => {
    mountExample()
    await choose('Pricing page refresh', 'Archive')

    expect(names()).toEqual(['Spring launch brief', 'Onboarding email series'])
    expect(status()).toBe('Archived “Pricing page refresh”.')
    // The trigger left with its row, so focus moves to the row in its place.
    expect(document.activeElement).toBe(trigger('Onboarding email series'))

    const undo = document.querySelector<HTMLElement>('[data-record-undo]')
    expect(undo?.textContent.trim()).toBe('Undo archive')
    undo?.click()
    await flushPromises()
    expect(names()).toEqual([
      'Spring launch brief',
      'Pricing page refresh',
      'Onboarding email series',
    ])
    expect(status()).toBe('Restored “Pricing page refresh”.')
    expect(document.querySelector('[data-record-undo]')).toBeNull()
    expect(document.activeElement).toBe(trigger('Pricing page refresh'))
  })

  it('falls back to the previous row, then to Undo when the list empties', async () => {
    mountExample()
    await choose('Onboarding email series', 'Archive')
    expect(document.activeElement).toBe(trigger('Pricing page refresh'))

    await choose('Pricing page refresh', 'Archive')
    await choose('Spring launch brief', 'Archive')
    expect(names()).toEqual([])
    expect(document.querySelector('.briefs__empty')?.textContent).toBe(
      'No active briefs.',
    )
    expect(document.activeElement).toBe(
      document.querySelector('[data-record-undo]'),
    )
  })
})
