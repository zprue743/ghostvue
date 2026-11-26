<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef, watch } from 'vue'

import {
  ghostScrollSpyContextKey,
  resolveScrollSpyHtmlElement,
  type GhostScrollSpyElement,
  type GhostScrollSpyExposed,
  type GhostScrollSpyOrientation,
  type GhostScrollSpyTravelDirection,
} from './ghost-scroll-spy'
import { useGhostScrollSpy } from './use-ghost-scroll-spy'

defineOptions({ inheritAttrs: false })

/* Optional v-model props intentionally omit withDefaults entries (exactOptionalPropertyTypes). */
/* eslint-disable vue/require-default-prop -- see GhostTabs modelValue default pattern */

const props = withDefaults(
  defineProps<{
    as?: GhostScrollSpyElement
    label?: string
    modelValue?: string | undefined
    defaultValue?: string | undefined
    orientation?: GhostScrollSpyOrientation
    container?: HTMLElement | Window | null
    probeOffset?: number
    endThreshold?: number
    scrollBehavior?: ScrollBehavior
    historyMode?: 'replace' | 'push' | 'none'
    focusTarget?: boolean
    travelSettleMs?: number
  }>(),
  {
    as: 'nav',
    label: 'Page sections',
    orientation: 'vertical',
    scrollBehavior: 'smooth',
    historyMode: 'replace',
    focusTarget: true,
    travelSettleMs: 180,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  activate: [
    detail: {
      id: string
      element: HTMLElement | null
      event: MouseEvent | KeyboardEvent
    },
  ]
}>()

defineSlots<{
  default(props: {
    activeId: string | undefined
    travelDirection: GhostScrollSpyTravelDirection | undefined
    itemCount: number
    scrollTo: (
      targetId: string,
      options?: { behavior?: ScrollBehavior; focus?: boolean },
    ) => void
  }): unknown
}>()

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const scrollSpy = useGhostScrollSpy({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  orientation: () => props.orientation,
  container: () => props.container,
  probeOffset: () => props.probeOffset,
  endThreshold: () => props.endThreshold,
  scrollBehavior: () => props.scrollBehavior,
  historyMode: () => props.historyMode,
  focusTarget: () => props.focusTarget,
  travelSettleMs: () => props.travelSettleMs,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
  onActivate: (detail) => {
    emit('activate', detail)
  },
})

const element = computed(() => resolveScrollSpyHtmlElement(hostRef.value))

watch(
  element,
  (next) => {
    scrollSpy.attachRoot(next)
  },
  { immediate: true },
)

const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  const ariaLabel =
    typeof rest['aria-label'] === 'string' ? rest['aria-label'] : undefined
  const ariaLabelledby =
    typeof rest['aria-labelledby'] === 'string'
      ? rest['aria-labelledby']
      : undefined
  if (!ariaLabel && !ariaLabelledby) {
    rest['aria-label'] = props.label
  }

  return {
    ...rest,
    class: ['ghost-scroll-spy', attrs.class],
    'data-part': 'root',
    'data-orientation': scrollSpy.orientation.value,
  }
})

provide(ghostScrollSpyContextKey, {
  orientation: scrollSpy.orientation,
  activeId: scrollSpy.activeId,
  isActive: (target: string) => scrollSpy.isActive(target),
  registerItem: (
    id: symbol,
    target: string,
    disabled: boolean,
    getLinkElement: () => HTMLElement | null,
  ) => {
    scrollSpy.registerItem(id, target, disabled, getLinkElement)
  },
  unregisterItem: (id: symbol) => {
    scrollSpy.unregisterItem(id)
  },
  setItemDisabled: (id: symbol, disabled: boolean) => {
    scrollSpy.setItemDisabled(id, disabled)
  },
  handleActivate: (detail) => {
    scrollSpy.handleActivate(detail)
  },
})

defineExpose<GhostScrollSpyExposed>({
  get element() {
    return element.value
  },
  get activeId() {
    return scrollSpy.activeId.value
  },
  scrollTo(targetId, options) {
    scrollSpy.scrollTo(targetId, options)
  },
  measure() {
    scrollSpy.measure()
  },
})
</script>

<template>
  <component :is="props.as" ref="host" v-bind="rootAttrs">
    <slot
      :active-id="scrollSpy.activeId.value"
      :travel-direction="scrollSpy.travelDirection.value"
      :item-count="scrollSpy.itemCount.value"
      :scroll-to="scrollSpy.scrollTo"
    />
  </component>
</template>
