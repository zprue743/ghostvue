import { computed, nextTick, toValue, type ComputedRef } from 'vue'

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
  applyFormReset: () => void
} {
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isIndeterminate = computed(() =>
    Boolean(toValue(options.indeterminate)),
  )

  const seed = toValue(options.defaultValue) ?? false

  const isChecked = useControllableState<boolean>({
    prop: () => toValue(options.modelValue),
    defaultValue: seed,
    ...(options.onChange ? { onChange: options.onChange } : {}),
  })

  function restoreCheckboxDom(input: HTMLInputElement): void {
    if (!input.isConnected) return
    if (input.checked !== isChecked.value) {
      input.checked = isChecked.value
    }
    // Native activation clears `indeterminate`; props may be unchanged when
    // a controlled parent ignores the emit, so restore mixed here as well.
    if (input.indeterminate !== isIndeterminate.value) {
      input.indeterminate = isIndeterminate.value
    }
  }

  function applyFormReset(): void {
    isChecked.value = seed
    const input = toValue(options.element)
    if (!input) return

    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) {
      restoreCheckboxDom(input)
      return
    }

    void nextTick(() => {
      restoreCheckboxDom(input)
    })
  }

  function onChange(event: Event) {
    const input = event.target
    // Disabled native inputs do not fire `change`; the guard is for programmatic dispatch.
    if (!(input instanceof HTMLInputElement) || isDisabled.value) {
      return
    }

    isChecked.value = input.checked

    // Native activation already toggled. Controlled writes do not update local
    // state. Restoring `input.checked` here would use the still-stale prop and
    // revert a v-model parent before it flushes. After flush: parent followed →
    // values match, skip; parent ignored → restore the prop.
    void nextTick(() => {
      restoreCheckboxDom(input)
    })
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

  return { isChecked, isDisabled, isIndeterminate, rootProps, applyFormReset }
}
