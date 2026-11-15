import { computed, toValue, type ComputedRef } from 'vue'

import { useGhostId } from './use-ghost-id'
import type {
  GhostInlineAlertElement,
  GhostInlineAlertHeadingLevel,
  UseGhostInlineAlertOptions,
} from './ghost-inline-alert'

export interface GhostInlineAlertRootProps {
  class: 'ghost-inline-alert'
  'data-part': 'root'
  'data-ghost-inline-alert': ''
  role?: 'status' | 'alert'
  'aria-labelledby'?: string
}

/**
 * Root bindings for inline contextual feedback. Live-region `role` values apply
 * only when `announce` is `status` or `alert`; static alerts use section
 * labelling when a title is present.
 */
export function useGhostInlineAlert(options: UseGhostInlineAlertOptions = {}): {
  as: ComputedRef<GhostInlineAlertElement>
  headingTag: ComputedRef<`h${GhostInlineAlertHeadingLevel}`>
  titleId: ComputedRef<string>
  rootProps: ComputedRef<GhostInlineAlertRootProps>
} {
  const generatedTitleId = useGhostId('ghost-inline-alert-title')

  const as = computed(
    (): GhostInlineAlertElement => toValue(options.as) ?? 'div',
  )

  const headingLevel = computed((): GhostInlineAlertHeadingLevel => {
    const level = toValue(options.headingLevel) ?? 3
    return level
  })

  const headingTag = computed((): `h${GhostInlineAlertHeadingLevel}` => {
    return `h${String(headingLevel.value)}` as `h${GhostInlineAlertHeadingLevel}`
  })

  const titleId = computed(
    () => toValue(options.titleId) ?? generatedTitleId.value,
  )

  const rootProps = computed((): GhostInlineAlertRootProps => {
    const announce = toValue(options.announce) ?? 'off'
    const base: GhostInlineAlertRootProps = {
      class: 'ghost-inline-alert',
      'data-part': 'root',
      'data-ghost-inline-alert': '',
    }

    if (announce === 'status') {
      return { ...base, role: 'status' }
    }

    if (announce === 'alert') {
      return { ...base, role: 'alert' }
    }

    const labelledRoot = toValue(options.hasTitle) && as.value === 'section'

    if (labelledRoot) {
      return {
        ...base,
        'aria-labelledby': titleId.value,
      }
    }

    return base
  })

  return { as, headingTag, titleId, rootProps }
}
