<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostPaginationExposed } from './ghost-pagination'
import { useGhostPagination } from './use-ghost-pagination'
import { useRovingFocus } from './use-roving-focus'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: number | undefined
    defaultPage?: number
    pageCount: number
    siblingCount?: number
    boundaryCount?: number
    showEdges?: boolean
    disabled?: boolean
    ariaLabel?: string
    getPageLabel?: ((page: number) => string) | undefined
    previousLabel?: string
    nextLabel?: string
    firstLabel?: string
    lastLabel?: string
    ellipsisLabel?: string
  }>(),
  {
    modelValue: undefined,
    defaultPage: 1,
    siblingCount: 1,
    boundaryCount: 1,
    showEdges: true,
    disabled: false,
    ariaLabel: 'Pagination',
    previousLabel: 'Previous page',
    nextLabel: 'Next page',
    firstLabel: 'First page',
    lastLabel: 'Last page',
    ellipsisLabel: 'More pages',
    getPageLabel: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [page: number]
}>()

const attrs = useAttrs()
const root = useTemplateRef<HTMLElement>('root')
const list = useTemplateRef<HTMLUListElement>('list')

useRovingFocus(list, {
  orientation: 'horizontal',
  loop: false,
})

const {
  page,
  range,
  rootProps,
  listProps,
  firstProps,
  previousProps,
  nextProps,
  lastProps,
  pageButtonProps,
  ellipsisProps,
  ellipsisGlyphProps,
} = useGhostPagination({
  modelValue: () => props.modelValue,
  defaultPage: () => props.defaultPage,
  pageCount: () => props.pageCount,
  siblingCount: () => props.siblingCount,
  boundaryCount: () => props.boundaryCount,
  showEdges: () => props.showEdges,
  disabled: () => props.disabled,
  ariaLabel: () => props.ariaLabel,
  getPageLabel: () => props.getPageLabel,
  previousLabel: () => props.previousLabel,
  nextLabel: () => props.nextLabel,
  firstLabel: () => props.firstLabel,
  lastLabel: () => props.lastLabel,
  ellipsisLabel: () => props.ellipsisLabel,
  onChange: (next) => {
    emit('update:modelValue', next)
  },
})

const showEdges = computed(() => props.showEdges)

const navBindings = computed(() => {
  const rootBase = rootProps.value
  const extraClass = attrs.class
  return {
    ...attrs,
    ...rootBase,
    class: extraClass ? [rootBase.class, extraClass] : rootBase.class,
  }
})

function focusCurrentOrFirst(options?: FocusOptions): void {
  const listElement = list.value
  if (!listElement) return
  const current = listElement.querySelector<HTMLElement>(
    'button[aria-current="page"]',
  )
  const target =
    current && !current.hasAttribute('disabled')
      ? current
      : listElement.querySelector<HTMLElement>('button:not([disabled])')
  target?.focus(options)
}

defineSlots<{
  page(props: { page: number; current: boolean }): unknown
  ellipsis(props: { placement: 'start' | 'end' }): unknown
}>()

defineExpose<GhostPaginationExposed>({
  get element() {
    return root.value
  },
  focus: focusCurrentOrFirst,
  blur() {
    const active = list.value?.querySelector('button:focus')
    if (active instanceof HTMLElement) active.blur()
    root.value?.blur()
  },
})
</script>

<template>
  <nav ref="root" v-bind="navBindings">
    <ul ref="list" v-bind="listProps">
      <li v-if="showEdges" data-part="item" role="listitem">
        <button v-bind="firstProps">«</button>
      </li>
      <li data-part="item" role="listitem">
        <button v-bind="previousProps">‹</button>
      </li>
      <template v-for="(entry, index) in range" :key="`page-${index}`">
        <li
          v-if="entry.type === 'ellipsis'"
          data-part="item"
          role="listitem"
          :aria-label="ellipsisProps()['aria-label']"
        >
          <span :data-part="ellipsisProps()['data-part']">
            <slot name="ellipsis" :placement="entry.placement">
              <span v-bind="ellipsisGlyphProps">…</span>
            </slot>
          </span>
        </li>
        <li v-else data-part="item" role="listitem">
          <button v-bind="pageButtonProps(entry.page)">
            <slot name="page" :page="entry.page" :current="entry.page === page">
              {{ entry.page }}
            </slot>
          </button>
        </li>
      </template>
      <li data-part="item" role="listitem">
        <button v-bind="nextProps">›</button>
      </li>
      <li v-if="showEdges" data-part="item" role="listitem">
        <button v-bind="lastProps">»</button>
      </li>
    </ul>
  </nav>
</template>
