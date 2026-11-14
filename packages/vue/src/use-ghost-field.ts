import { computed, toValue } from 'vue'

import type { UseGhostFieldOptions, UseGhostFieldReturn } from './ghost-field'
import { useGhostId } from './use-ghost-id'

/**
 * SSR-stable ids and field state for {@link GhostField} parts.
 */
export function useGhostField(
  options: UseGhostFieldOptions = {},
): UseGhostFieldReturn {
  const controlId = useGhostId('ghost-field-control', () => toValue(options.id))
  const labelId = useGhostId('ghost-field-label')
  const descriptionId = useGhostId('ghost-field-description')
  const errorId = useGhostId('ghost-field-error')

  const disabled = computed(() => toValue(options.disabled) ?? false)
  const invalid = computed(() => toValue(options.invalid) ?? false)
  const required = computed(() => toValue(options.required) ?? false)

  return {
    controlId,
    labelId,
    descriptionId,
    errorId,
    disabled,
    invalid,
    required,
  }
}

export interface GhostFieldRootProps {
  'data-part': 'root'
  'data-ghost-field': ''
  'data-state'?: 'invalid' | 'disabled'
}
