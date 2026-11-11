import { computed, toValue, type ComputedRef } from 'vue'

import type { SlButtonType, UseSlButtonOptions } from './sl-button'

export interface SlButtonRootProps {
  class: 'slop-button'
  type: SlButtonType
  disabled: boolean | undefined
  'aria-disabled': 'true' | undefined
  'aria-busy': 'true' | undefined
  'data-part': 'root'
  'data-state': 'loading' | 'disabled' | undefined
  onClickCapture: (event: MouseEvent) => void
}

/** Native type/disabled, loading that stays focusable, `data-part` / `data-state`. */
export function useSlButton(options: UseSlButtonOptions = {}): {
  isDisabled: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  rootProps: ComputedRef<SlButtonRootProps>
} {
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isLoading = computed(() => Boolean(toValue(options.loading)))

  function preventLoadingActivation(event: MouseEvent) {
    if (!isLoading.value) return

    // Stay focusable while loading. Capture-phase cancel stops listeners and form
    // submit without faking keyboard activation.
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  const rootProps = computed((): SlButtonRootProps => ({
    class: 'slop-button',
    type: toValue(options.type) ?? 'button',
    disabled: isDisabled.value || undefined,
    'aria-disabled': isLoading.value ? 'true' : undefined,
    'aria-busy': isLoading.value ? 'true' : undefined,
    'data-part': 'root',
    // Loading wins `data-state` so both-true stays stylable; native `disabled`
    // already covers unavailability.
    'data-state': isLoading.value
      ? 'loading'
      : isDisabled.value
        ? 'disabled'
        : undefined,
    onClickCapture: preventLoadingActivation,
  }))

  return { isDisabled, isLoading, rootProps }
}
