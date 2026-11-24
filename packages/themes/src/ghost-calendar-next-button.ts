import { defineComponent, h } from 'vue'

import { GhostCalendarNextButton as GhostUnstyledCalendarNextButton } from '@ghostvue/vue'

/**
 * Themed {@link GhostCalendarNextButton}. Without slot content it renders
 * a decorative, CSS-painted chevron (ADR 0013); the button keeps its
 * `aria-label` ("Next month" by default) as the accessible name. Pass
 * slot content to replace the chevron.
 */
export const GhostCalendarNextButton = defineComponent({
  name: 'GhostCalendarNextButton',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledCalendarNextButton,
        { ...attrs, 'data-themed': '' },
        {
          default:
            slots['default'] ??
            (() => h('span', { 'data-part': 'icon', 'aria-hidden': 'true' })),
        },
      )
  },
})
