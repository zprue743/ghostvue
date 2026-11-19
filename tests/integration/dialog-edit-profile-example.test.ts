import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import EditProfile from '../../examples/dialog/edit-profile.vue'

/*
 * dialog/edit-profile edits a draft copy of the profile. These checks cover
 * the outcomes a screenshot cannot: Save writes back only valid edits, every
 * close path without Save discards them, and an invalid Save keeps the dialog
 * open with focus on the first field that needs attention.
 */
const attached: ReturnType<typeof mount>[] = []

function mountExample() {
  const wrapper = mount(EditProfile, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) wrapper.unmount()
  attached.length = 0
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]')
}

function field(name: string): HTMLInputElement | HTMLTextAreaElement {
  const element = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[role="dialog"] [name="${name}"]`)
  if (!element) throw new Error(`No field named ${name}`)
  return element
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!button) throw new Error(`No button named ${name}`)
  return button
}

async function openEditor(): Promise<void> {
  buttonNamed('Edit profile').click()
  await flushPromises()
}

async function type(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function submit(): Promise<void> {
  buttonNamed('Save changes').click()
  await flushPromises()
}

describe('dialog/edit-profile example', () => {
  it('opens a labelled dialog seeded from the saved profile', async () => {
    const wrapper = mountExample()
    expect(wrapper.get('.profile__name').text()).toBe('Ada Lovelace')

    await openEditor()
    const content = dialog()
    expect(content).not.toBeNull()
    expect(content?.getAttribute('aria-modal')).toBe('true')
    const titleId = content?.getAttribute('aria-labelledby') ?? ''
    expect(document.getElementById(titleId)?.textContent).toBe('Edit profile')
    expect(field('name').value).toBe('Ada Lovelace')
    expect(field('email').value).toBe('ada@analytical-engines.example')
    expect(field('bio').getAttribute('maxlength')).toBe('280')
  })

  it('saves valid edits to the card and reports the result', async () => {
    const wrapper = mountExample()
    await openEditor()
    await type(field('name'), '  Ada King  ')
    await type(field('title'), 'Lead research engineer')
    await submit()

    expect(dialog()).toBeNull()
    expect(wrapper.get('.profile__name').text()).toBe('Ada King')
    expect(wrapper.text()).toContain('Lead research engineer')
    expect(wrapper.get('[role="status"]').text()).toBe('Profile saved.')

    // The next session starts from the saved values.
    await openEditor()
    expect(field('name').value).toBe('Ada King')
  })

  it('keeps the dialog open and focuses the first invalid field', async () => {
    const wrapper = mountExample()
    await openEditor()
    await type(field('name'), ' ')
    await type(field('email'), 'ada@analytical-engines')
    await submit()

    expect(dialog()).not.toBeNull()
    const name = field('name')
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(field('email').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(name)
    const errors = [
      ...document.querySelectorAll('[role="dialog"] [role="alert"]'),
    ]
    expect(errors.map((error) => error.textContent.trim())).toEqual([
      'Enter your name.',
      'Enter an address like name@company.com.',
    ])
    expect(wrapper.get('.profile__name').text()).toBe('Ada Lovelace')

    // Fixing a field clears its error without another Save.
    await type(name, 'Ada')
    expect(name.getAttribute('aria-invalid')).not.toBe('true')
  })

  it('discards edits on Cancel and Escape', async () => {
    const wrapper = mountExample()
    const status = wrapper.get('[role="status"]')

    await openEditor()
    await type(field('name'), 'Somebody else')
    buttonNamed('Cancel').click()
    await flushPromises()
    expect(dialog()).toBeNull()
    expect(wrapper.get('.profile__name').text()).toBe('Ada Lovelace')
    expect(status.text()).toBe('Edits discarded.')

    await openEditor()
    expect(field('name').value).toBe('Ada Lovelace')
    expect(status.text()).toBe('')
    await type(field('bio'), 'Short bio.')
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await flushPromises()
    expect(dialog()).toBeNull()
    expect(wrapper.text()).not.toContain('Short bio.')
    expect(status.text()).toBe('Edits discarded.')
  })
})
