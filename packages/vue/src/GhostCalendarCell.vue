<script setup lang="ts">
import { isSameMonth } from '@internationalized/date'
import type { CalendarDate } from '@internationalized/date'
import { computed, inject, useAttrs, useTemplateRef, watch } from 'vue'

import { formatCalendarDateLabel } from './calendar-intl'
import {
  ghostCalendarContextKey,
  resolveCalendarHtmlElement,
  type GhostCalendarCellElement,
  type GhostCalendarContext,
  type GhostCalendarPartExposed,
} from './ghost-calendar'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostCalendarCellElement
    date: CalendarDate
  }>(),
  { as: 'button' },
)

const injected = inject(ghostCalendarContextKey)
if (!injected) {
  throw new Error('GhostCalendarCell must be used inside GhostCalendar')
}
const context: GhostCalendarContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveCalendarHtmlElement(hostRef.value))
const isNativeButton = computed(() => props.as === 'button')

const selectionDisabled = computed(() =>
  context.isDateSelectionDisabled(props.date),
)
const focused = computed(() => context.isDateFocused(props.date))
const state = computed(() => context.getCellState(props.date))
const outsideMonth = computed(
  () => !isSameMonth(props.date, context.visibleMonth.value),
)
const isToday = computed(() => {
  const today = context.today.value
  return today ? props.date.compare(today) === 0 : false
})

const formattedDate = computed(() =>
  formatCalendarDateLabel(props.date, context.locale.value),
)

const selected = computed(
  () => state.value !== 'none' && state.value !== 'range-middle',
)

const receivesTabStop = computed(() => focused.value && !context.disabled.value)

const cellAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  delete rest['type']
  delete rest['tabindex']
  const base: Record<string, unknown> = {
    ...rest,
    role: 'gridcell',
    class: 'ghost-calendar-cell',
    'data-part': 'cell',
    'data-ghost-calendar': '',
    'data-ghost-calendar-date': props.date.toString(),
    'data-outside-month': outsideMonth.value ? '' : undefined,
    'data-today': isToday.value ? '' : undefined,
    'data-state': state.value,
    tabindex: receivesTabStop.value ? 0 : -1,
    'aria-label': formattedDate.value,
    'aria-selected': state.value === 'none' ? 'false' : 'true',
  }

  if (isNativeButton.value) {
    base['type'] = attrs['type'] ?? 'button'
    base['disabled'] = selectionDisabled.value || context.disabled.value
  } else if (selectionDisabled.value || context.disabled.value) {
    base['aria-disabled'] = 'true'
  }

  return base
})

watch(
  () => [focused.value, context.disabled.value] as const,
  () => {
    const grid = element.value?.closest('[data-part="grid"]')
    if (grid instanceof HTMLElement) {
      context.syncFocusedTabStops(grid)
    }
  },
  { flush: 'post' },
)

function onClick(event: MouseEvent) {
  if (selectionDisabled.value || context.disabled.value) {
    event.preventDefault()
    return
  }
  context.selectDate(props.date)
}

function onFocus() {
  if (!context.disabled.value) {
    context.setFocusedDate(props.date, { announce: false })
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    if (selectionDisabled.value || context.disabled.value) {
      event.preventDefault()
      return
    }
    if (!(element.value instanceof HTMLButtonElement)) {
      event.preventDefault()
      context.selectDate(props.date)
    }
  }
}

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
  <component
    :is="as"
    ref="host"
    v-bind="cellAttrs"
    @click="onClick"
    @focus="onFocus"
    @keydown="onKeydown"
  >
    <slot
      :date="date"
      :disabled="selectionDisabled"
      :selected="selected"
      :focused="focused"
      :today="isToday"
      :outside-month="outsideMonth"
      :state="state"
      :formatted-date="formattedDate"
    >
      {{ date.day }}
    </slot>
  </component>
</template>
