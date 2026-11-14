import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostPagination as GhostUnstyledPagination,
  type GhostPaginationExposed,
} from '@ghostvue/vue'

/** Control sizing. Omitting it selects `md`. */
export type GhostPaginationSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostPagination = defineComponent({
  name: 'GhostPagination',
  inheritAttrs: false,
  props: {
    modelValue: { type: Number, default: undefined },
    defaultPage: { type: Number, default: 1 },
    pageCount: { type: Number, required: true },
    siblingCount: { type: Number, default: 1 },
    boundaryCount: { type: Number, default: 1 },
    showEdges: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    ariaLabel: { type: String, default: 'Pagination' },
    getPageLabel: {
      type: Function as PropType<(page: number) => string>,
      default: undefined,
    },
    previousLabel: { type: String, default: 'Previous page' },
    nextLabel: { type: String, default: 'Next page' },
    firstLabel: { type: String, default: 'First page' },
    lastLabel: { type: String, default: 'Last page' },
    ellipsisLabel: { type: String, default: 'More pages' },
    size: { type: String as PropType<GhostPaginationSize>, default: 'md' },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, expose }) {
    const inner = ref<GhostPaginationExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostPaginationExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledPagination, {
          ref: inner,
          ...attrs,
          ...(props.modelValue === undefined
            ? {}
            : { modelValue: props.modelValue }),
          defaultPage: props.defaultPage,
          pageCount: props.pageCount,
          siblingCount: props.siblingCount,
          boundaryCount: props.boundaryCount,
          showEdges: props.showEdges,
          disabled: props.disabled,
          ariaLabel: props.ariaLabel,
          ...(props.getPageLabel ? { getPageLabel: props.getPageLabel } : {}),
          previousLabel: props.previousLabel,
          nextLabel: props.nextLabel,
          firstLabel: props.firstLabel,
          lastLabel: props.lastLabel,
          ellipsisLabel: props.ellipsisLabel,
          'data-size': props.size === 'md' ? undefined : props.size,
          'onUpdate:modelValue': (page: number) => {
            emit('update:modelValue', page)
          },
        }),
      ])
  },
})

export type { GhostPaginationExposed }
