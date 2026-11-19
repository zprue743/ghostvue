import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import Workspace from '../../examples/tabs/workspace.vue'

/*
 * tabs/workspace switches workspace panels and the interface language. These
 * checks cover what a screenshot cannot: the tab/panel wiring, the disabled
 * tab, the translated labels, and the direction the roving focus follows.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(Workspace, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
})

function tabs(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
}

function tab(name: string): HTMLElement {
  const element = tabs().find((candidate) =>
    candidate.textContent.trim().startsWith(name),
  )
  if (!element) throw new Error(`No tab ${name}`)
  return element
}

function visiblePanel(): HTMLElement {
  const panels = [
    ...document.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  ].filter((panel) => !panel.hidden)
  expect(panels).toHaveLength(1)
  const [panel] = panels
  if (!panel) throw new Error('No visible panel')
  return panel
}

function press(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

async function chooseLanguage(name: string): Promise<void> {
  const item = [
    ...document.querySelectorAll<HTMLElement>(
      '[role="group"] [data-part="item"]',
    ),
  ].find((candidate) => candidate.textContent.trim() === name)
  if (!item) throw new Error(`No language ${name}`)
  item.click()
  await flushPromises()
}

describe('tabs/workspace example', () => {
  it('wires a labelled strip to one visible panel with a disabled tab', async () => {
    mountExample()
    // Panels register after the triggers; aria-controls fills in on the next tick.
    await flushPromises()
    const list = document.querySelector('[role="tablist"]')
    expect(list?.getAttribute('aria-label')).toBe('Workspace sections')
    expect(list?.classList.contains('ghost-tabs-list')).toBe(true)
    expect(list?.hasAttribute('data-themed')).toBe(true)
    expect(tabs().map((element) => element.textContent.trim())).toEqual([
      'Overview',
      'Members 4',
      'Activity',
      'Billing',
    ])

    const overview = tab('Overview')
    expect(overview.getAttribute('aria-selected')).toBe('true')
    expect(overview.tabIndex).toBe(0)
    expect(overview.classList).toContain('ghost-tabs-trigger')
    expect(overview.classList).toContain('workspace__tab')
    const panel = visiblePanel()
    expect(overview.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(overview.id)
    expect(panel.textContent).toContain('4 of 10 seats')

    const billing = tab('Billing')
    expect(billing).toHaveProperty('disabled', true)
    billing.click()
    expect(billing.getAttribute('aria-selected')).toBe('false')
  })

  it('selects panels by pointer and by arrow keys, skipping the disabled tab', async () => {
    mountExample()
    tab('Members').click()
    await flushPromises()
    expect(tab('Members').getAttribute('aria-selected')).toBe('true')
    const members = visiblePanel()
    expect(members.querySelectorAll('li')).toHaveLength(4)
    expect(members.textContent).toContain('katherine.johnson@northwind.example')

    tab('Members').focus()
    press(tab('Members'), 'ArrowRight')
    await flushPromises()
    expect(document.activeElement).toBe(tab('Activity'))
    expect(tab('Activity').getAttribute('aria-selected')).toBe('true')
    expect(visiblePanel().querySelectorAll('time')).toHaveLength(3)

    // Billing is disabled, so the next stop wraps to the first tab.
    press(tab('Activity'), 'ArrowRight')
    await flushPromises()
    expect(document.activeElement).toBe(tab('Overview'))
    press(tab('Overview'), 'End')
    await flushPromises()
    expect(document.activeElement).toBe(tab('Activity'))
  })

  it('translates labels and mirrors arrow keys in Arabic', async () => {
    const wrapper = mountExample()
    await chooseLanguage('Deutsch')
    const root = wrapper.get('section').element
    expect(root.getAttribute('lang')).toBe('de')
    expect(root.getAttribute('dir')).toBe('ltr')
    expect(tabs().map((element) => element.textContent.trim())).toEqual([
      'Übersicht',
      'Mitglieder und Berechtigungen 4',
      'Aktivitätsprotokoll',
      'Abrechnung und Rechnungen',
    ])

    await chooseLanguage('العربية')
    expect(root.getAttribute('dir')).toBe('rtl')
    expect(
      document.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
    ).toBe('أقسام مساحة العمل')

    // Selection survives the language change; ArrowLeft is "next" in RTL.
    const first = tab('نظرة عامة')
    expect(first.getAttribute('aria-selected')).toBe('true')
    first.focus()
    press(first, 'ArrowLeft')
    await flushPromises()
    expect(document.activeElement).toBe(tab('الأعضاء'))
    press(tab('الأعضاء'), 'ArrowRight')
    await flushPromises()
    expect(document.activeElement).toBe(first)
  })
})
