import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

import {
  getFocusableElements,
  isDisabledElement,
} from './get-tabbable-elements'
import type {
  GhostToolbarDirection,
  GhostToolbarOrientation,
  UseGhostToolbarOptions,
} from './ghost-toolbar'
import {
  useRovingFocus,
  type TextDirection,
  type UseRovingFocusOptions,
} from './use-roving-focus'

export interface GhostToolbarRootProps {
  class: 'ghost-toolbar'
  'data-part': 'root'
  'data-ghost-toolbar': ''
  'data-orientation': GhostToolbarOrientation
  role: 'toolbar'
  'aria-orientation': 'vertical' | undefined
  'aria-label': string | undefined
}

export interface UseGhostToolbarReturn {
  rootProps: ComputedRef<GhostToolbarRootProps>
  focus: (options?: FocusOptions) => void
  blur: () => void
}

/** Moves focus to the current roving tab stop, or the first enabled item. */
export function focusToolbarRovingItem(
  root: HTMLElement | null | undefined,
  options?: FocusOptions,
): void {
  if (!root) {
    return
  }
  const items = getFocusableElements(root).filter((element) => element !== root)
  const enabled = items.filter((item) => !isDisabledElement(item))
  const current =
    enabled.find((item) => item.tabIndex >= 0) ?? enabled[0] ?? undefined
  current?.focus(options)
}

function resolveToolbarDir(
  root: HTMLElement | null | undefined,
  dir: MaybeRefOrGetter<GhostToolbarDirection | undefined> | undefined,
): TextDirection {
  const explicit = toValue(dir)
  if (explicit) {
    return explicit
  }
  if (root) {
    const closest = root.closest('[dir]')?.getAttribute('dir')
    if (closest === 'ltr' || closest === 'rtl') {
      return closest
    }
  }
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * Toolbar semantics, roving focus, and focus helpers for composable or SFC
 * roots. Listeners attach in `onMounted` via {@link useRovingFocus}.
 */
export function useGhostToolbar(
  options: UseGhostToolbarOptions,
): UseGhostToolbarReturn {
  const orientation = computed(
    (): GhostToolbarOrientation => toValue(options.orientation) ?? 'horizontal',
  )

  const rootProps = computed((): GhostToolbarRootProps => {
    const isVertical = orientation.value === 'vertical'
    const label = toValue(options.label)

    return {
      class: 'ghost-toolbar',
      'data-part': 'root',
      'data-ghost-toolbar': '',
      'data-orientation': orientation.value,
      role: 'toolbar',
      'aria-orientation': isVertical ? 'vertical' : undefined,
      'aria-label': label,
    }
  })

  const rovingOptions: UseRovingFocusOptions = {
    orientation: () => orientation.value,
    loop: () => toValue(options.loop) ?? true,
    dir: () => resolveToolbarDir(toValue(options.element), options.dir),
  }

  useRovingFocus(options.element, rovingOptions)

  function focus(focusOptions?: FocusOptions): void {
    focusToolbarRovingItem(toValue(options.element), focusOptions)
  }

  function blur(): void {
    const root = toValue(options.element)
    const active = document.activeElement
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur()
    }
  }

  return { rootProps, focus, blur }
}