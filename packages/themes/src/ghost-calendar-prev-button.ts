import { defineComponent, h } from 'vue'

import { GhostCalendarPrevButton as GhostUnstyledCalendarPrevButton } from '@ghostvue/vue'

/**
 * Themed {@link GhostCalendarPrevButton}. Without slot content it renders
 * a decorative, CSS-painted chevron (ADR 0013); the button keeps its
 * `aria-label` ("Previous month" by default) as the accessible name. Pass
 * slot content to replace the chevron.
 */
export const GhostCalendarPrevButton = defineComponent({
  name: 'GhostCalendarPrevButton',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledCalendarPrevButton,
        { ...attrs, 'data-themed': '' },
        {
          default:
            slots['default'] ??
            (() => h('span', { 'data-part': 'icon', 'aria-hidden': 'true' })),
        },
      )
  },
})
