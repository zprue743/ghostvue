import {
  computed,
  ref,
  toValue,
  type ComputedRef,
  type CSSProperties,
} from 'vue'

import type { UseSlVisuallyHiddenOptions } from './sl-visually-hidden'

/**
 * The clip technique keeps content in the accessibility tree while removing it
 * from visual presentation. Every declaration is load-bearing:
 *
 * - `position: absolute` with `margin: -1px` takes the box out of layout flow so
 *   surrounding content does not shift around it.
 * - The dimensions are `1px` rather than `0` because some browser and
 *   screen-reader combinations drop zero-area elements from the accessibility
 *   tree, which would defeat the entire purpose of the component.
 * - `clip-path: inset(50%)` is the modern clip; `clip: rect(0 0 0 0)` is
 *   deprecated but retained for engines that never implemented `clip-path` for
 *   this case.
 * - `overflow: hidden` with `white-space: nowrap` stops a long string from
 *   wrapping inside the 1px box and producing scrollable overflow.
 *
 * Four alternatives are deliberately rejected: `display: none` and
 * `visibility: hidden` remove content from assistive technology entirely, zero
 * dimensions risk the same accessibility-tree removal, and
 * `text-indent: -9999px` breaks in right-to-left writing modes.
 *
 * The style also sets no `font-size`, `line-height`, `letter-spacing`, or
 * `word-spacing`. Their absence is part of the contract rather than an
 * oversight: setting any of them would conflict with the WCAG text-resize and
 * text-spacing criteria, so a test asserts they stay absent.
 *
 * Module-level so the object is created once rather than per instance.
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

/**
 * Headless visually-hidden behavior: clip-technique styles, `data-part` /
 * `data-state` hooks, and focus-driven reveal. No generated id — consumers that
 * need `id` pass it as a native attribute. Reveal is derived from real focus,
 * so controllable state does not apply.
 */
export function useSlVisuallyHidden(options: UseSlVisuallyHiddenOptions = {}): {
  isRevealed: ComputedRef<boolean>
  rootProps: ComputedRef<SlVisuallyHiddenRootProps>
} {
  // `focusin` / `focusout` stand in for `:focus-within`, which inline styles
  // cannot express. Both events bubble, so a skip-link anchor drives reveal
  // without the root itself ever becoming focusable.
  //
  // Focus presence is tracked whatever `focusable` is set to, and `focusable`
  // only gates whether that presence reveals anything. Skipping the tracking
  // while hidden would strand a stale reading if `focusable` changed while the
  // subtree held focus.
  //
  // Moving focus between two descendants fires `focusout` then `focusin`
  // synchronously. Vue coalesces the resulting render, so the content does not
  // flicker between the two events.
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
