<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostCalendarContextKey,
  resolveCalendarHtmlElement,
  type GhostCalendarHeadingElement,
  type GhostCalendarPartExposed,
} from './ghost-calendar'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostCalendarHeadingElement
  }>(),
  { as: 'h2' },
)

const context = inject(ghostCalendarContextKey)
if (!context) {
  throw new Error('GhostCalendarHeading must be used inside GhostCalendar')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveCalendarHtmlElement(hostRef.value))
const defaultId = useGhostId('ghost-calendar-heading')

const headingId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultId.value
})

watch(
  headingId,
  (id) => {
    context.registerHeadingId(id)
  },
  { immediate: true },
)

onUnmounted(() => {
  context.unregisterHeadingId()
})

const label = computed(() => context.monthYearLabel.value)

const headingAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  delete rest['id']
  return {
    ...rest,
    id: headingId.value,
    class: ['ghost-calendar-heading', attrs.class],
    'data-part': 'heading',
    'data-ghost-calendar': '',
    'aria-live': 'polite',
  }
})

defineSlots<{
  default(props: { label: string; visibleMonth: CalendarDate }): unknown
}>()

defineExpose<GhostCalendarPartExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component :is="props.as" ref="host" v-bind="headingAttrs">
    <slot :label="label" :visible-month="context.visibleMonth.value">
      {{ label }}
    </slot>
  </component>
</template>
