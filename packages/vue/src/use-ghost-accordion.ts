import { computed, toValue } from 'vue'

import type {
  GhostAccordionType,
  GhostAccordionValue,
  UseGhostAccordionOptions,
  UseGhostAccordionReturn,
} from './ghost-accordion'
import { useControllableState } from './use-controllable-state'

function normalizeMultipleValue(value: GhostAccordionValue): string[] {
  if (Array.isArray(value)) {
    return [...value]
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  return []
}

/**
 * Headless accordion expansion state for single or multiple coordinated panels.
 */
export function useGhostAccordion(
  options: UseGhostAccordionOptions = {},
): UseGhostAccordionReturn {
  const type = computed<GhostAccordionType>(
    () => toValue(options.type) ?? 'single',
  )
  const collapsible = computed(() => toValue(options.collapsible) ?? false)

  const modelValue = useControllableState<GhostAccordionValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  function isItemOpen(value: string): boolean {
    const current = modelValue.value
    if (type.value === 'single') {
      return current === value
    }
    return normalizeMultipleValue(current).includes(value)
  }

  function setItemOpen(value: string, open: boolean): void {
    if (type.value === 'single') {
      if (open) {
        if (!Object.is(modelValue.value, value)) {
          modelValue.value = value
        }
        return
      }
      if (collapsible.value && modelValue.value === value) {
        modelValue.value = undefined
      }
      return
    }

    const next = normalizeMultipleValue(modelValue.value)
    const index = next.indexOf(value)
    if (open) {
      if (index === -1) {
        next.push(value)
        modelValue.value = next
      }
      return
    }
    if (index !== -1) {
      next.splice(index, 1)
      modelValue.value = next
    }
  }

  return {
    modelValue,
    type,
    collapsible,
    isItemOpen,
    setItemOpen,
  }
}
