import { computed, toValue, type ComputedRef } from 'vue'

import {
  mergeLinkRel,
  type GhostLinkElement,
  type UseGhostLinkOptions,
} from './ghost-link'

export interface GhostLinkRootProps {
  class: 'ghost-link'
  'data-part': 'root'
  'data-state': 'disabled' | undefined
  'aria-disabled'?: 'true'
  tabindex?: -1
  href?: string
  rel?: string
}

/** Styling hooks, disabled navigation, and safe `rel` for `target="_blank"`. */
export function useGhostLink(options: UseGhostLinkOptions = {}): {
  isDisabled: ComputedRef<boolean>
  isNativeAnchor: ComputedRef<boolean>
  isComponentHost: ComputedRef<boolean>
  showExternalIndicator: ComputedRef<boolean>
  showNewTabHint: ComputedRef<boolean>
  rootProps: ComputedRef<GhostLinkRootProps>
} {
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))

  const as = computed((): GhostLinkElement => toValue(options.as) ?? 'a')

  const isNativeAnchor = computed(() => as.value === 'a')
  const isComponentHost = computed(() => typeof as.value !== 'string')

  const target = computed(() => toValue(options.target))
  const href = computed(() => toValue(options.href))
  const rel = computed(() => toValue(options.rel))

  const opensInNewTab = computed(() => target.value === '_blank')

  const showExternalIndicator = computed(() => {
    if (isDisabled.value) {
      return false
    }
    return Boolean(toValue(options.external)) || opensInNewTab.value
  })

  const showNewTabHint = computed(
    () => !isDisabled.value && opensInNewTab.value,
  )

  const rootProps = computed((): GhostLinkRootProps => {
    const base: GhostLinkRootProps = {
      class: 'ghost-link',
      'data-part': 'root',
      'data-state': isDisabled.value ? 'disabled' : undefined,
    }

    const mergedRel = mergeLinkRel(target.value, rel.value)
    if (mergedRel !== undefined) {
      base.rel = mergedRel
    }

    if (isDisabled.value) {
      return {
        ...base,
        'aria-disabled': 'true',
        tabindex: -1,
      }
    }

    if (isNativeAnchor.value && href.value) {
      base.href = href.value
    }

    return base
  })

  return {
    isDisabled,
    isNativeAnchor,
    isComponentHost,
    showExternalIndicator,
    showNewTabHint,
    rootProps,
  }
}
