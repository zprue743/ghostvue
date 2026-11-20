import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ShareSettings from '../../examples/popover/share-settings.vue'

/*
 * popover/share-settings applies sharing settings as they change. These checks
 * cover outcomes a screenshot cannot: the panel's accessible name and focus
 * entry, each setting's effect on the live summary, the link permission's
 * disabled state while access is restricted, settings that survive closing
 * and reopening, and focus returning to the trigger on Done and Escape.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(ShareSettings, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
})

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]')
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

function radio(value: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    `[role="dialog"] input[type="radio"][value="${value}"]`,
  )
  if (!input) throw new Error(`No radio for ${value}`)
  return input
}

function switchLabelled(text: string): HTMLElement {
  const label = [...document.querySelectorAll('label')].find(
    (candidate) => candidate.textContent.trim() === text,
  )
  const target = label?.htmlFor ? document.getElementById(label.htmlFor) : null
  if (!target) throw new Error(`No switch labelled ${text}`)
  return target
}

/** The live region's lines, joined the way a screen reader reads them. */
function summary(): string {
  return [...document.querySelectorAll('[role="status"] p')]
    .map((line) => line.textContent.trim())
    .join(' ')
}

async function openPanel(): Promise<void> {
  buttonNamed('Share').click()
  await flushPromises()
}

async function choose(value: string): Promise<void> {
  radio(value).click()
  await flushPromises()
}

describe('popover/share-settings example', () => {
  it('opens a panel named by its heading with focus on the checked access', async () => {
    mountExample()
    const trigger = buttonNamed('Share')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    await openPanel()
    const content = panel()
    expect(content).not.toBeNull()
    expect(content?.getAttribute('aria-modal')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-controls')).toBe(content?.id)
    const headingId = content?.getAttribute('aria-labelledby') ?? ''
    expect(document.getElementById(headingId)?.textContent.trim()).toBe(
      'Share “Q3 launch plan”',
    )
    // The panel is portaled out of the card to <body>.
    expect(content?.parentElement).toBe(document.body)
    expect(radio('restricted').checked).toBe(true)
    expect(document.activeElement).toBe(radio('restricted'))
  })

  it('updates the live summary as each setting changes', async () => {
    mountExample()
    expect(summary()).toBe(
      'Only the 3 people listed can open this plan. Editors can invite others; downloads are off for viewers.',
    )
    await openPanel()

    const roles = document.querySelector('[role="dialog"] [role="group"]')
    expect(roles?.getAttribute('aria-disabled')).toBe('true')
    expect(buttonNamed('Editor').disabled).toBe(true)
    const hintId = roles?.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(hintId)?.textContent.trim()).toBe(
      'Available with workspace or link access.',
    )

    await choose('workspace')
    expect(summary()).toContain('Anyone at Northwind can view this plan.')
    expect(roles?.getAttribute('aria-disabled')).toBeNull()
    expect(roles?.hasAttribute('aria-describedby')).toBe(false)

    buttonNamed('Editor').click()
    await flushPromises()
    expect(buttonNamed('Editor').getAttribute('aria-pressed')).toBe('true')
    expect(summary()).toContain('Anyone at Northwind can edit this plan.')

    await choose('link')
    expect(summary()).toContain('Anyone with the link can edit this plan.')

    switchLabelled('Editors can invite others').click()
    switchLabelled('Viewers can download').click()
    await flushPromises()
    expect(summary()).toContain(
      'Only the owner can invite; viewers can download.',
    )

    // Back to restricted: the link role is kept but no longer applies.
    await choose('restricted')
    expect(summary()).toContain('Only the 3 people listed can open this plan.')
    expect(buttonNamed('Editor').disabled).toBe(true)
  })

  it('returns focus to Share on Done and Escape and keeps the settings', async () => {
    mountExample()
    const trigger = buttonNamed('Share')

    await openPanel()
    await choose('link')
    buttonNamed('Done').click()
    await flushPromises()
    expect(panel()).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(summary()).toContain('Anyone with the link can view this plan.')

    await openPanel()
    expect(radio('link').checked).toBe(true)
    expect(document.activeElement).toBe(radio('link'))
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await flushPromises()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
