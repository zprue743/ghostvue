import {
  computed,
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
  restoreDefault: () => void
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

  function restoreDefault() {
    value.value = seed
  }

  function handleInput(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    // Native disabled/readonly already block typing; skip so scripted events
    // cannot bypass those states through the model.
    if (isDisabled.value || isReadonly.value) return
    value.value = target.value
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
    restoreDefault,
    rootProps,
  }
}
