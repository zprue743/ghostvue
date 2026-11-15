<script setup lang="ts">
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostCalendarContextKey,
  resolveCalendarHtmlElement,
  type GhostCalendarContext,
  type GhostCalendarGridCellSlotProps,
  type GhostCalendarGridElement,
  type GhostCalendarPartExposed,
} from './ghost-calendar'
import { applyCalendarFocusTabStops } from './sync-calendar-focus-tab-stops'
import GhostCalendarCell from './GhostCalendarCell.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    as?: GhostCalendarGridElement
  }>(),
  { as: 'div' },
)

const injected = inject(ghostCalendarContextKey)
if (!injected) {
  throw new Error('GhostCalendarGrid must be used inside GhostCalendar')
}
const context: GhostCalendarContext = injected

const hostRef = useTemplateRef('host')
const element = computed(() => resolveCalendarHtmlElement(hostRef.value))
/** Set during grid keyboard moves so post-flush focus follows re-rendered cells. */
const pendingKeyboardFocus = shallowRef(false)
const visibleMonthAtKeyboard = shallowRef('')

const gridAttrs = computed(() => ({
  role: 'grid',
  class: 'ghost-calendar-grid',
  'data-part': 'grid',
  'data-ghost-calendar': '',
  'aria-labelledby': context.headingId.value,
  'aria-disabled': context.disabled.value ? 'true' : undefined,
}))

defineSlots<{
  default(): unknown
  cell(props: GhostCalendarGridCellSlotProps): unknown
}>()

function resolveRtl(): boolean {
  const host = element.value
  if (host) {
    const dir =
      host.closest('[dir]')?.getAttribute('dir') ??
      document.documentElement.getAttribute('dir')
    if (dir === 'rtl') {
      return true
    }
  }
  return document.documentElement.dir === 'rtl'
}

function focusRovingTabStop(): void {
  const grid = element.value
  if (!grid) {
    return
  }
  applyCalendarFocusTabStops(grid, context.focusedDate.value.toString())
  grid
    .querySelector<HTMLElement>('[data-ghost-calendar-date][tabindex="0"]')
    ?.focus()
}

function moveKeyboardFocus(action: () => void): void {
  visibleMonthAtKeyboard.value = context.visibleMonth.value.toString()
  pendingKeyboardFocus.value = true
  action()
}

function onKeydown(event: KeyboardEvent) {
  if (context.disabled.value) {
    return
  }
  const rtl = resolveRtl()
  const key = event.key
  const shift = event.shiftKey

  if (key === 'ArrowRight') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusNextDay(rtl)
    })
    return
  }
  if (key === 'ArrowLeft') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusNextDay(!rtl)
    })
    return
  }
  if (key === 'ArrowDown') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusNextWeek(false)
    })
    return
  }
  if (key === 'ArrowUp') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusNextWeek(true)
    })
    return
  }
  if (key === 'Home') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusWeekBoundary(false)
    })
    return
  }
  if (key === 'End') {
    event.preventDefault()
    moveKeyboardFocus(() => {
      context.focusWeekBoundary(true)
    })
    return
  }
  if (key === 'PageDown') {
    event.preventDefault()
    if (shift) {
      moveKeyboardFocus(() => {
        context.focusNextYear(false)
      })
    } else {
      moveKeyboardFocus(() => {
        context.focusNextMonth(false)
      })
    }
    return
  }
  if (key === 'PageUp') {
    event.preventDefault()
    if (shift) {
      moveKeyboardFocus(() => {
        context.focusNextYear(true)
      })
    } else {
      moveKeyboardFocus(() => {
        context.focusNextMonth(true)
      })
    }
  }
}

function syncTabStops() {
  const grid = element.value
  if (grid) {
    context.syncFocusedTabStops(grid)
    context.setGridElement(grid)
  }
}

watch(
  () =>
    [
      context.focusedDate.value.toString(),
      context.visibleMonth.value.toString(),
      context.disabled.value,
    ] as const,
  () => {
    syncTabStops()
    if (pendingKeyboardFocus.value) {
      pendingKeyboardFocus.value = false
      const monthChanged =
        visibleMonthAtKeyboard.value !== context.visibleMonth.value.toString()
      if (monthChanged && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            focusRovingTabStop()
          })
        })
      } else {
        focusRovingTabStop()
      }
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  const grid = element.value
  if (grid) {
    grid.addEventListener('keydown', onKeydown)
    context.setGridElement(grid)
    syncTabStops()
  }
})

onUnmounted(() => {
  const grid = element.value
  if (grid) {
    grid.removeEventListener('keydown', onKeydown)
  }
  context.setGridElement(null)
})

defineExpose<GhostCalendarPartExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const grid = element.value
    if (!grid) {
      return
    }
    const tabStop = grid.querySelector<HTMLElement>(
      '[data-ghost-calendar-date][tabindex="0"]',
    )
    ;(tabStop ?? grid).focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="gridAttrs">
    <div class="ghost-calendar-weekdays" role="row">
      <span
        v-for="(label, index) in context.weekdayLabels.value"
        :key="`weekday-${index}`"
        class="ghost-calendar-weekday"
        role="columnheader"
        >{{ label }}</span
      >
    </div>
    <div
      v-for="(week, rowIndex) in context.weekRows.value"
      :key="`week-${rowIndex}`"
      class="ghost-calendar-week"
      role="row"
    >
      <template v-if="$slots['cell']">
        <GhostCalendarCell
          v-for="date in week"
          :key="date.toString()"
          :date="date"
        >
          <template #default="slotProps">
            <slot name="cell" v-bind="slotProps" />
          </template>
        </GhostCalendarCell>
      </template>
      <template v-else-if="$slots['default']">
        <slot />
      </template>
      <template v-else>
        <GhostCalendarCell
          v-for="date in week"
          :key="date.toString()"
          :date="date"
        />
      </template>
    </div>
  </component>
</template>
