import {
  computed,
  ref,
  toValue,
  type ComputedRef,
  type CSSProperties,
} from 'vue'

import type { UseSlVisuallyHiddenOptions } from './sl-visually-hidden'

/**
 * Clip technique: 1px not 0 so some engines keep the node in the accessibility
 * tree. No font/spacing declarations (WCAG 1.4.4 / 1.4.12).
 */
const visuallyHiddenStyle = Object.freeze({
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} satisfies CSSProperties)

export interface SlVisuallyHiddenRootProps {
  class: 'slop-visually-hidden'
  style: CSSProperties | undefined
  'data-part': 'root'
  'data-state': 'hidden' | undefined
  onFocusin: () => void
  onFocusout: () => void
}

/** Clip hiding, `data-part` / `data-state`, and focus-driven reveal. */
export function useSlVisuallyHidden(options: UseSlVisuallyHiddenOptions = {}): {
  isRevealed: ComputedRef<boolean>
  rootProps: ComputedRef<SlVisuallyHiddenRootProps>
} {
  // Bubbling stand-in for `:focus-within`. Always track so toggling `focusable`
  // while focused cannot go stale.
  const hasFocusWithin = ref(false)

  const isRevealed = computed(
    () => Boolean(toValue(options.focusable)) && hasFocusWithin.value,
  )

  const rootProps = computed((): SlVisuallyHiddenRootProps => ({
    class: 'slop-visually-hidden',
    style: isRevealed.value ? undefined : visuallyHiddenStyle,
    'data-part': 'root',
    'data-state': isRevealed.value ? undefined : 'hidden',
    onFocusin: () => {
      hasFocusWithin.value = true
    },
    onFocusout: () => {
      hasFocusWithin.value = false
    },
  }))

  return { isRevealed, rootProps }
}
