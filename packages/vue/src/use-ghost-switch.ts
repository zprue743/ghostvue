import {
  computed,
  toValue,
  type ComputedRef,
  type WritableComputedRef,
} from 'vue'

import { useControllableState } from './use-controllable-state'
import type { UseGhostSwitchOptions } from './ghost-switch'

export interface GhostSwitchRootProps {
  class: 'ghost-switch'
  type: 'button'
  role: 'switch'
  disabled: boolean | undefined
  form: string | undefined
  'aria-checked': 'true' | 'false'
  'aria-readonly': 'true' | undefined
  'data-part': 'root'
  'data-state': 'checked' | 'unchecked'
  onClick: (event: MouseEvent) => void
}

export interface GhostSwitchInputProps {
  type: 'hidden'
  name: string | undefined
  value: string
  form: string | undefined
  disabled: boolean | undefined
}

/**
 * Controllable on/off, APG switch semantics, and form submit/reset.
 *
 * Host is `button[role=switch]` (not a checkbox) so Enter toggles with native
 * activation, `readonly` can be real (`aria-readonly` plus ignored clicks),
 * and GHO-74 Checkbox does not share this primitive. Form participation is a
 * `type="hidden"` input — not a second checkbox — so the control has one
 * labelable element.
 */
export function useGhostSwitch(options: UseGhostSwitchOptions = {}): {
  checked: WritableComputedRef<boolean>
  isDisabled: ComputedRef<boolean>
  isReadonly: ComputedRef<boolean>
  rootProps: ComputedRef<GhostSwitchRootProps>
  inputProps: ComputedRef<GhostSwitchInputProps>
  toggle: () => void
  applyFormReset: () => void
} {
  // Native defaultChecked is the value at parse time; later defaultValue
  // writes must not change what form.reset() restores.
  const resetValue = toValue(options.defaultValue) ?? false

  const checked = useControllableState({
    prop: () => toValue(options.modelValue),
    defaultValue: resetValue,
    onChange: (next) => {
      options.onChange?.(next)
    },
  })

  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isReadonly = computed(() => Boolean(toValue(options.readonly)))
  const formId = computed((): string | undefined => {
    const form = toValue(options.form)
    if (!form) return undefined
    return form
  })

  function toggle(): void {
    if (isDisabled.value || isReadonly.value) return
    checked.value = !checked.value
  }

  function onActivate(event: MouseEvent): void {
    // Honor preventDefault so a consumer can cancel the toggle (confirm dialogs).
    if (event.defaultPrevented) return
    toggle()
  }

  const rootProps = computed((): GhostSwitchRootProps => ({
    class: 'ghost-switch',
    type: 'button',
    role: 'switch',
    disabled: isDisabled.value || undefined,
    form: formId.value,
    'aria-checked': checked.value ? 'true' : 'false',
    'aria-readonly': isReadonly.value ? 'true' : undefined,
    'data-part': 'root',
    'data-state': checked.value ? 'checked' : 'unchecked',
    onClick: onActivate,
  }))

  const inputProps = computed((): GhostSwitchInputProps => {
    const name = toValue(options.name)
    // Unnamed, off, and disabled switches contribute nothing, matching checkbox submit.
    const submits = Boolean(name) && checked.value && !isDisabled.value

    return {
      type: 'hidden',
      name: submits ? name : undefined,
      value: toValue(options.value) ?? 'on',
      form: formId.value,
      disabled: isDisabled.value || undefined,
    }
  })

  function applyFormReset(): void {
    checked.value = resetValue
  }

  return {
    checked,
    isDisabled,
    isReadonly,
    rootProps,
    inputProps,
    toggle,
    applyFormReset,
  }
}
