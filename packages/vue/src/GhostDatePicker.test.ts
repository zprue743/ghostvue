import { CalendarDate } from '@internationalized/date'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef, type Ref } from 'vue'

import { waitForFormResetDeferral } from './form-reset'
import type {
  GhostDatePickerInputExposed,
  GhostDatePickerSlotProps,
  GhostDatePickerValue,
} from './ghost-date-picker'
import GhostDatePicker from './GhostDatePicker.vue'
import GhostDatePickerContent from './GhostDatePickerContent.vue'
import GhostDatePickerInput from './GhostDatePickerInput.vue'
import GhostDatePickerTrigger from './GhostDatePickerTrigger.vue'
import GhostField from './GhostField.vue'
import GhostFieldControl from './GhostFieldControl.vue'
import GhostFieldDescription from './GhostFieldDescription.vue'

const attached: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of attached.splice(0)) {
    wrapper.unmount()
  }
  document.body.innerHTML = ''
})

const d = (year: number, month: number, day: number) =>
  new CalendarDate(year, month, day)

interface Options {
  props?: Record<string, unknown>
  open?: Ref<boolean | undefined>
  onOpen?: (open: boolean) => void
  model?: Ref<GhostDatePickerValue | undefined>
  onModel?: (value: GhostDatePickerValue) => void
  range?: boolean
  showTrigger?: Ref<boolean>
  inputAttrs?: Record<string, unknown>
  slot?: (props: GhostDatePickerSlotProps) => void
}

function mountPicker(options: Options = {}) {
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h('form', { id: 'form' }, [
            h(
              GhostDatePicker,
              {
                today: d(2026, 11, 17),
                selectionMode: options.range ? 'range' : 'single',
                ...options.props,
                ...(options.open
                  ? {
                      open: options.open.value,
                      'onUpdate:open': (value: boolean) => {
                        options.onOpen?.(value)
                      },
                    }
                  : {}),
                ...(options.model
                  ? {
                      modelValue: options.model.value,
                      'onUpdate:modelValue': (value: GhostDatePickerValue) => {
                        options.onModel?.(value)
                      },
                    }
                  : {}),
              },
              {
                default: (slotProps: GhostDatePickerSlotProps) => {
                  options.slot?.(slotProps)
                  return [
                    ...(options.range
                      ? [
                          h(GhostDatePickerInput, {
                            part: 'start',
                            'aria-label': 'Start date',
                          }),
                          h(GhostDatePickerInput, {
                            part: 'end',
                            'aria-label': 'End date',
                          }),
                        ]
                      : [
                          h(GhostDatePickerInput, {
                            'aria-label': 'Date',
                            ...options.inputAttrs,
                          }),
                        ]),
                    options.showTrigger?.value === false
                      ? null
                      : h(GhostDatePickerTrigger),
                    h(GhostDatePickerContent),
                  ]
                },
              },
            ),
          ])
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

async function settle() {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')
const hidden = (name: string) =>
  document.querySelector<HTMLInputElement>(
    `input[type="hidden"][name="${name}"]`,
  )

describe('GhostDatePicker native form ownership', () => {
  it('serializes the committed single value as ISO under name', () => {
    mountPicker({ props: { name: 'due', defaultValue: d(2026, 11, 17) } })
    expect(hidden('due')?.value).toBe('2026-11-17')
    const input = document.querySelector('input[type="text"]')
    // The visible input never owns submission.
    expect(input?.hasAttribute('name')).toBe(false)
  })

  it('uses name[start]/name[end] with independent overrides and form association', () => {
    mountPicker({
      range: true,
      props: {
        name: 'stay',
        endName: 'checkout',
        form: 'external',
        defaultValue: { start: d(2026, 1, 1), end: d(2026, 1, 3) },
      },
    })
    expect(hidden('stay[start]')?.value).toBe('2026-01-01')
    expect(hidden('stay[end]')).toBeNull()
    expect(hidden('checkout')?.value).toBe('2026-01-03')
    expect(hidden('checkout')?.getAttribute('form')).toBe('external')
    for (const input of document.querySelectorAll('input[type="text"]')) {
      expect(input.getAttribute('form')).toBe('external')
    }
  })

  it('omits disabled values and serializes empty as an empty string', () => {
    const disabled = ref(false)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h('form', [
            h(GhostDatePicker, { name: 'when', disabled: disabled.value }, () =>
              h(GhostDatePickerInput, { 'aria-label': 'When' }),
            ),
          ]),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    const form = wrapper.get('form').element as HTMLFormElement
    expect(new FormData(form).get('when')).toBe('')
    disabled.value = true
    return nextTick().then(() => {
      expect(new FormData(form).has('when')).toBe(false)
    })
  })

  it('ignores input-local name and form attributes', () => {
    mountPicker({
      props: { name: 'due' },
      inputAttrs: { name: 'hijack', form: 'other' },
    })
    const input = document.querySelector('input[type="text"]')
    expect(input?.getAttribute('name')).toBeNull()
    expect(input?.getAttribute('form')).toBeNull()
    expect(hidden('due')).not.toBeNull()
  })

  it('reconciles uncontrolled reset after the reset event and respects cancellation', async () => {
    const wrapper = mountPicker({
      props: { name: 'due', defaultValue: d(2026, 1, 1) },
    })
    const input = wrapper.get('input[type="text"]')
    await input.setValue('2026-02-02')
    await input.trigger('blur')
    expect(hidden('due')?.value).toBe('2026-02-02')

    const form = wrapper.get('form').element as HTMLFormElement
    const cancel = (event: Event) => {
      event.preventDefault()
    }
    form.addEventListener('reset', cancel)
    form.reset()
    await waitForFormResetDeferral()
    await settle()
    expect(hidden('due')?.value).toBe('2026-02-02')
    form.removeEventListener('reset', cancel)

    await input.setValue('garbage')
    form.reset()
    await waitForFormResetDeferral()
    await settle()
    expect(hidden('due')?.value).toBe('2026-01-01')
    expect((input.element as HTMLInputElement).value).toBe('2026-01-01')
  })
})

describe('GhostDatePickerInput', () => {
  it('links the format hint and errors, merges consumer ARIA, and keeps class/style', async () => {
    const wrapper = mountPicker({
      inputAttrs: {
        class: 'consumer',
        style: { color: 'red' },
        'aria-describedby': 'extra',
      },
    })
    const input = wrapper.get('input[type="text"]')
    const hintId = document.querySelector('[data-part="format-hint"]')?.id ?? ''
    expect(input.attributes('aria-describedby')).toBe(`extra ${hintId}`)
    expect(input.classes()).toContain('consumer')
    expect(input.classes()).toContain('ghost-date-picker-input')
    expect(input.attributes('style')).toContain('color: red')
    expect(input.attributes('type')).toBe('text')
    expect(input.attributes('role')).toBeUndefined()

    await input.setValue('2026-13-01')
    await input.trigger('blur')
    const errorId = input.attributes('aria-describedby')?.split(' ')[2] ?? ''
    expect(document.getElementById(errorId)?.textContent).toBe(
      'Enter a valid date (YYYY-MM-DD)',
    )
    expect(input.attributes('aria-invalid')).toBe('true')
  })

  it('keeps native validity in sync with dirty drafts before any visible error', async () => {
    const wrapper = mountPicker()
    const input = wrapper.get('input[type="text"]')
    const element = input.element as HTMLInputElement
    await input.setValue('2026-11')
    await settle()
    expect(element.validationMessage).toBe('Confirm this date')
    expect(input.attributes('aria-invalid')).toBeUndefined()
    await input.trigger('keydown', { key: 'Escape' })
    await settle()
    expect(element.validity.valid).toBe(true)
  })

  it('prevents implicit submission on Enter only for edited text and ignores IME Enter', async () => {
    const onModel = vi.fn()
    const model = shallowRef<GhostDatePickerValue | undefined>(null)
    const wrapper = mountPicker({ model, onModel })
    const input = wrapper.get('input[type="text"]')
    const element = input.element as HTMLInputElement

    const clean = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    })
    element.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await input.setValue('2026-11-20')
    const composing = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
      isComposing: true,
    })
    element.dispatchEvent(composing)
    expect(onModel).not.toHaveBeenCalled()

    const edited = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    })
    element.dispatchEvent(edited)
    expect(edited.defaultPrevented).toBe(true)
    expect(onModel).toHaveBeenCalledWith(d(2026, 11, 20))
  })

  it('composes with GhostField while keeping root state', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostDatePicker, { required: true }, () => [
            h(GhostField, { invalid: true }, () => [
              h(GhostFieldDescription, () => 'Pick a weekday'),
              h(GhostFieldControl, null, {
                default: (field: Record<string, unknown>) =>
                  h(GhostDatePickerInput, field),
              }),
            ]),
          ]),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await settle()
    const input = wrapper.get('input[type="text"]')
    const description = wrapper.get('p')
    expect(input.attributes('id')).toMatch(/^ghost-field-control/)
    expect(input.attributes('aria-describedby')).toContain(
      description.attributes('id'),
    )
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('required')).toBeDefined()
  })

  it('exposes element, focus, and blur', () => {
    const exposed = ref<GhostDatePickerInputExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostDatePicker, null, () =>
            h(GhostDatePickerInput, { ref: exposed, 'aria-label': 'Date' }),
          ),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    const element = wrapper.get('input').element
    expect(exposed.value?.element).toBe(element)
    exposed.value?.focus()
    expect(document.activeElement).toBe(element)
    exposed.value?.blur()
    expect(document.activeElement).not.toBe(element)
  })

  it('keeps readonly text focusable but not editable', () => {
    const wrapper = mountPicker({
      props: { readonly: true, defaultValue: d(2026, 5, 5) },
    })
    const input = wrapper.get('input[type="text"]')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('disabled')).toBeUndefined()
    ;(input.element as HTMLInputElement).focus()
    expect(document.activeElement).toBe(input.element)
    expect(wrapper.get('[data-part="trigger"]').attributes('disabled')).toBe('')
  })
})

describe('GhostDatePickerTrigger and content', () => {
  it('names the trigger with the selection by default', () => {
    const wrapper = mountPicker({ props: { defaultValue: d(2026, 11, 17) } })
    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('aria-label')).toBe(
      'Choose date, selected date is Tuesday, November 17, 2026',
    )
    expect(trigger.attributes('type')).toBe('button')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('attempts a text commit first, then opens even when it fails', async () => {
    const onOpen = vi.fn()
    const wrapper = mountPicker({ props: { 'onUpdate:open': onOpen } })
    const input = wrapper.get('input[type="text"]')
    await input.setValue('nope')
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await settle()
    expect(onOpen).toHaveBeenCalledWith(true)
    expect(dialog()).not.toBeNull()
    expect(input.attributes('aria-invalid')).toBe('true')
    expect((input.element as HTMLInputElement).value).toBe('nope')
  })

  it('renders an accessible modal with Close and focuses the calendar date', async () => {
    mountPicker({ props: { defaultOpen: true } })
    await settle()
    const surface = dialog()
    expect(surface?.getAttribute('aria-modal')).toBe('true')
    expect(surface?.getAttribute('aria-label')).toBe('Choose date')
    expect(
      surface?.querySelector('[data-part="close"]')?.getAttribute('aria-label'),
    ).toBe('Close date picker')
    await vi.waitFor(() => {
      expect(
        document.activeElement?.getAttribute('data-ghost-calendar-date'),
      ).toBe('2026-11-17')
    })
  })

  it('focuses Close when no date can receive focus (min > max)', async () => {
    mountPicker({
      props: {
        defaultOpen: true,
        minValue: d(2026, 11, 20),
        maxValue: d(2026, 11, 10),
      },
    })
    await settle()
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('data-part')).toBe('close')
    })
  })

  it('keeps the modal when a controlled parent ignores close', async () => {
    const onOpen = vi.fn()
    mountPicker({ open: ref(true), onOpen })
    await settle()
    document.querySelector<HTMLButtonElement>('[data-part="close"]')?.click()
    await settle()
    expect(onOpen).toHaveBeenCalledWith(false)
    expect(dialog()).not.toBeNull()
  })

  it('lets disabled and readonly override open=true and reopen on re-enable', async () => {
    const disabled = ref(false)
    const onOpen = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostDatePicker,
            {
              open: true,
              disabled: disabled.value,
              'onUpdate:open': onOpen,
            },
            () => [
              h(GhostDatePickerInput, { 'aria-label': 'Date' }),
              h(GhostDatePickerContent),
            ],
          ),
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await settle()
    expect(dialog()).not.toBeNull()
    disabled.value = true
    await settle()
    expect(dialog()).toBeNull()
    expect(onOpen).toHaveBeenCalledWith(false)
    disabled.value = false
    await settle()
    expect(dialog()).not.toBeNull()
  })

  it('returns focus to the input when the trigger was removed while open', async () => {
    const showTrigger = ref(true)
    const wrapper = mountPicker({ showTrigger })
    const trigger = wrapper.get('[data-part="trigger"]')
    ;(trigger.element as HTMLElement).focus()
    await trigger.trigger('click')
    await settle()
    expect(dialog()).not.toBeNull()
    showTrigger.value = false
    await settle()
    document.querySelector<HTMLButtonElement>('[data-part="close"]')?.click()
    await settle()
    expect(document.activeElement).toBe(
      wrapper.get('input[type="text"]').element,
    )
  })

  it('exposes value, open, pending, errors, clear, openCalendar, and close in the slot', async () => {
    let slot: GhostDatePickerSlotProps | undefined
    mountPicker({
      props: { defaultValue: d(2026, 3, 3) },
      slot: (props) => {
        slot = props
      },
    })
    expect(slot?.value).toEqual(d(2026, 3, 3))
    expect(slot?.open).toBe(false)
    slot?.openCalendar()
    await settle()
    expect(slot?.open).toBe(true)
    slot?.close()
    await settle()
    expect(slot?.open).toBe(false)
    slot?.clear()
    await settle()
    expect(slot?.value).toBeNull()
    expect(slot?.pending).toBe(false)
    expect(slot?.errors).toEqual([])
  })

  it('removes its document listeners on unmount', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const wrapper = mountPicker({ props: { defaultOpen: true } })
    await settle()
    wrapper.unmount()
    attached.splice(attached.indexOf(wrapper), 1)
    const added = add.mock.calls.map(([type]) => type)
    const removed = remove.mock.calls.map(([type]) => type)
    for (const type of new Set(added)) {
      expect(removed).toContain(type)
    }
    add.mockRestore()
    remove.mockRestore()
  })
})
