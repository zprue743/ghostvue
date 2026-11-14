import { computed, toValue, type ComputedRef } from 'vue'

import type {
  GhostSeparatorElement,
  GhostSeparatorOrientation,
  UseGhostSeparatorOptions,
} from './ghost-separator'

export interface GhostSeparatorRootProps {
  class: 'ghost-separator'
  'data-part': 'root'
  'data-orientation': GhostSeparatorOrientation
  role: 'separator' | 'none' | undefined
  'aria-orientation': 'vertical' | undefined
}

/**
 * Role / `aria-orientation` matrix and `data-part` / `data-orientation` hooks.
 * Native horizontal `hr` already implies separator, so those attributes stay unset.
 */
export function useGhostSeparator(options: UseGhostSeparatorOptions = {}): {
  as: ComputedRef<GhostSeparatorElement>
  decorative: ComputedRef<boolean>
  orientation: ComputedRef<GhostSeparatorOrientation>
  rootProps: ComputedRef<GhostSeparatorRootProps>
} {
  const orientation = computed(
    (): GhostSeparatorOrientation =>
      toValue(options.orientation) ?? 'horizontal',
  )
  const decorative = computed(() => Boolean(toValue(options.decorative)))
  const as = computed((): GhostSeparatorElement => {
    const explicit = toValue(options.as)
    if (explicit) return explicit
    // Vertical has no native thematic-break element; `hr` stays horizontal-only.
    return orientation.value === 'vertical' ? 'div' : 'hr'
  })

  const rootProps = computed((): GhostSeparatorRootProps => {
    const isDecorative = decorative.value
    const isVertical = orientation.value === 'vertical'
    const isNativeHorizontalHr = as.value === 'hr' && !isVertical

    return {
      class: 'ghost-separator',
      'data-part': 'root',
      'data-orientation': orientation.value,
      // Decorative drops semantics. Native horizontal `hr` already is separator.
      role: isDecorative
        ? 'none'
        : isNativeHorizontalHr
          ? undefined
          : 'separator',
      // ARIA default for separator is horizontal; only vertical needs the attribute.
      'aria-orientation': isDecorative || !isVertical ? undefined : 'vertical',
    }
  })

  return { as, decorative, orientation, rootProps }
}
