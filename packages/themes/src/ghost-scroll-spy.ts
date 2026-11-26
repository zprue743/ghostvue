import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostScrollSpy as GhostUnstyledScrollSpy,
  type GhostScrollSpyElement,
  type GhostScrollSpyExposed,
  type GhostScrollSpyHistoryMode,
  type GhostScrollSpyItemElement,
  type GhostScrollSpyItemExposed,
  type GhostScrollSpyLinkExposed,
  type GhostScrollSpyListElement,
  type GhostScrollSpyListExposed,
  type GhostScrollSpyOrientation,
  type GhostScrollSpyProps,
} from '@ghostvue/vue'

/** Themed {@link GhostScrollSpy} root wrapper. */
export const GhostScrollSpy = defineComponent({
  name: 'GhostScrollSpy',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostScrollSpyElement>,
      default: 'nav',
    },
    label: { type: String, default: 'Page sections' },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: undefined },
    orientation: {
      type: String as PropType<GhostScrollSpyOrientation>,
      default: 'vertical',
    },
    container: {
      type: Object as PropType<HTMLElement | Window | null>,
      default: undefined,
    },
    probeOffset: { type: Number, default: undefined },
    endThreshold: { type: Number, default: undefined },
    scrollBehavior: {
      type: String as PropType<ScrollBehavior>,
      default: 'smooth',
    },
    historyMode: {
      type: String as PropType<GhostScrollSpyHistoryMode>,
      default: 'replace',
    },
    focusTarget: { type: Boolean, default: true },
    travelSettleMs: { type: Number, default: 180 },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostScrollSpyExposed | null>(null)
    expose({
      get element() {
        return inner.value?.element ?? null
      },
      get activeId() {
        return inner.value?.activeId
      },
      scrollTo(targetId, options) {
        inner.value?.scrollTo(targetId, options)
      },
      measure() {
        inner.value?.measure()
      },
    } satisfies GhostScrollSpyExposed)
    return () =>
      h(
        GhostUnstyledScrollSpy,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          label: props.label,
          orientation: props.orientation,
          scrollBehavior: props.scrollBehavior,
          historyMode: props.historyMode,
          focusTarget: props.focusTarget,
          travelSettleMs: props.travelSettleMs,
          ...(props.modelValue !== undefined
            ? { modelValue: props.modelValue }
            : {}),
          ...(props.defaultValue !== undefined
            ? { defaultValue: props.defaultValue }
            : {}),
          ...(props.container !== undefined
            ? { container: props.container }
            : {}),
          ...(props.probeOffset !== undefined
            ? { probeOffset: props.probeOffset }
            : {}),
          ...(props.endThreshold !== undefined
            ? { endThreshold: props.endThreshold }
            : {}),
          'data-themed': '',
        },
        slots,
      )
  },
})

export { GhostScrollSpyList } from './ghost-scroll-spy-list'
export { GhostScrollSpyItem } from './ghost-scroll-spy-item'
export { GhostScrollSpyLink } from './ghost-scroll-spy-link'

export type {
  GhostScrollSpyElement,
  GhostScrollSpyExposed,
  GhostScrollSpyItemElement,
  GhostScrollSpyItemExposed,
  GhostScrollSpyLinkExposed,
  GhostScrollSpyListElement,
  GhostScrollSpyListExposed,
  GhostScrollSpyProps,
}
