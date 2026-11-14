import {
  computed,
  nextTick,
  toValue,
  type ComputedRef,
  type WritableComputedRef,
} from 'vue'

import type { GhostInputType, UseGhostInputOptions } from './ghost-input'
import { useControllableState } from './use-controllable-state'

export interface GhostInputRootProps {
  class: 'ghost-input'
  type: GhostInputType
  value: string
  defaultValue: string
  disabled: boolean | undefined
  readonly: boolean | undefined
  required: boolean | undefined
  'aria-invalid': 'true' | undefined
  'data-part': 'root'
  'data-state': 'invalid' | 'disabled' | 'readonly' | undefined
  onInput: (event: Event) => void
}

/**
 * Native text-like input bindings: string model, disabled/readonly/invalid/
 * required, and `data-part` / `data-state`. `defaultValue` on the root is the
 * form-reset seed, not a live prop.
 */
export function useGhostInput(options: UseGhostInputOptions = {}): {
  value: WritableComputedRef<string>
  isDisabled: ComputedRef<boolean>
  isReadonly: ComputedRef<boolean>
  isInvalid: ComputedRef<boolean>
  isRequired: ComputedRef<boolean>
  applyFormReset: () => void
  rootProps: ComputedRef<GhostInputRootProps>
} {
  // Captured once so later defaultValue writes cannot retarget form reset.
  const seed = toValue(options.defaultValue) ?? ''

  const value = useControllableState<string>({
    prop: () => toValue(options.modelValue),
    defaultValue: seed,
    onChange: (next) => {
      options.onChange?.(next)
    },
  })

  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isReadonly = computed(() => Boolean(toValue(options.readonly)))
  const isInvalid = computed(() => Boolean(toValue(options.invalid)))
  const isRequired = computed(() => Boolean(toValue(options.required)))

  function applyFormReset(): void {
    value.value = seed
    const el = toValue(options.element)
    if (!el) return

    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) {
      if (el.value !== value.value) {
        el.value = value.value
      }
      return
    }

    void nextTick(() => {
      if (!el.isConnected || el.value === value.value) return
      const selectionStart = el.selectionStart
      const selectionEnd = el.selectionEnd
      el.value = value.value
      if (selectionStart == null || selectionEnd == null) return
      const max = el.value.length
      el.setSelectionRange(
        Math.min(selectionStart, max),
        Math.min(selectionEnd, max),
      )
    })
  }

  function handleInput(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    // Native disabled/readonly already block typing; skip so scripted events
    // cannot bypass those states through the model.
    if (isDisabled.value || isReadonly.value) return
    value.value = target.value

    // Controlled writes do not update local state. Restoring `target.value`
    // here would use the still-stale prop and jump the caret to the end.
    // After flush: parent followed → values match, skip; parent ignored →
    // restore the prop and keep the selection.
    void nextTick(() => {
      if (!target.isConnected || target.value === value.value) return
      const selectionStart = target.selectionStart
      const selectionEnd = target.selectionEnd
      target.value = value.value
      if (selectionStart == null || selectionEnd == null) return
      const max = target.value.length
      target.setSelectionRange(
        Math.min(selectionStart, max),
        Math.min(selectionEnd, max),
      )
    })
  }

  const rootProps = computed((): GhostInputRootProps => ({
    class: 'ghost-input',
    type: toValue(options.type) ?? 'text',
    value: value.value,
    defaultValue: seed,
    disabled: isDisabled.value || undefined,
    readonly: isReadonly.value || undefined,
    required: isRequired.value || undefined,
    'aria-invalid': isInvalid.value ? 'true' : undefined,
    'data-part': 'root',
    // Invalid wins so a disabled/readonly error stays stylable; native
    // disabled/readonly already cover unavailability.
    'data-state': isInvalid.value
      ? 'invalid'
      : isDisabled.value
        ? 'disabled'
        : isReadonly.value
          ? 'readonly'
          : undefined,
    onInput: handleInput,
  }))

  return {
    value,
    isDisabled,
    isReadonly,
    isInvalid,
    isRequired,
    applyFormReset,
    rootProps,
  }
}
