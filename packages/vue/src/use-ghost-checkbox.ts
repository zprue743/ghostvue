import { computed, toValue, type ComputedRef } from 'vue'

import { useControllableState } from './use-controllable-state'
import type {
  GhostCheckboxDataState,
  UseGhostCheckboxOptions,
} from './ghost-checkbox'

export interface GhostCheckboxRootProps {
  class: 'ghost-checkbox'
  type: 'checkbox'
  checked: boolean
  disabled: boolean | undefined
  'data-part': 'root'
  'data-state': GhostCheckboxDataState | undefined
  onChange: (event: Event) => void
}

/**
 * Boolean v-model, consumer-owned mixed state, native disabled.
 * Mixed is a DOM property, not `aria-checked="mixed"`: ARIA in HTML ignores
 * that attribute on `input type=checkbox`.
 */
export function useGhostCheckbox(options: UseGhostCheckboxOptions = {}): {
  isChecked: ReturnType<typeof useControllableState<boolean>>
  isDisabled: ComputedRef<boolean>
  isIndeterminate: ComputedRef<boolean>
  rootProps: ComputedRef<GhostCheckboxRootProps>
} {
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isIndeterminate = computed(() =>
    Boolean(toValue(options.indeterminate)),
  )

  const isChecked = useControllableState<boolean>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue) ?? false,
    ...(options.onChange ? { onChange: options.onChange } : {}),
  })

  function onChange(event: Event) {
    const input = event.target
    // Disabled native inputs do not fire `change`; the guard is for programmatic dispatch.
    if (!(input instanceof HTMLInputElement) || isDisabled.value) {
      return
    }

    isChecked.value = input.checked

    // Native activation already toggled. If the getter still disagrees, the
    // parent is controlling and ignored the emit — restore so the DOM matches.
    if (input.checked !== isChecked.value) {
      input.checked = isChecked.value
    }
  }

  const rootProps = computed((): GhostCheckboxRootProps => ({
    class: 'ghost-checkbox',
    type: 'checkbox',
    checked: isChecked.value,
    disabled: isDisabled.value || undefined,
    'data-part': 'root',
    // Mixed wins over checked: that is what AT and the visual communicate.
    'data-state': isIndeterminate.value
      ? 'indeterminate'
      : isChecked.value
        ? 'checked'
        : undefined,
    onChange,
  }))

  return { isChecked, isDisabled, isIndeterminate, rootProps }
}
