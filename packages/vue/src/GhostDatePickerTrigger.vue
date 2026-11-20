<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import { formatCalendarDateLabel } from './calendar-intl'
import { isPickerDate, isPickerRange } from './date-picker-value'
import {
  ghostDatePickerContextKey,
  type GhostDatePickerPartExposed,
} from './ghost-date-picker'
import { invokeAttrHandler } from './invoke-attr-handler'

defineOptions({ inheritAttrs: false })

defineSlots<{
  /** Visible trigger content. Defaults to a decorative calendar icon. */
  default(): unknown
}>()

const injected = inject(ghostDatePickerContextKey)
if (!injected) {
  throw new Error('GhostDatePickerTrigger must be used inside GhostDatePicker')
}
const context = injected

const attrs = useAttrs()
const element = useTemplateRef<HTMLButtonElement>('element')

watch(
  element,
  (el) => {
    context.setTriggerElement(el)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  context.setTriggerElement(null)
})

/**
 * Default accessible name that includes the committed selection (APG Date
 * Picker Dialog). Consumers localize it with native `aria-label` or
 * `aria-labelledby`, which replace this default.
 */
const defaultLabel = computed(() => {
  const current = context.value.value
  const locale = context.locale.value
  if (context.selectionMode.value === 'range') {
    if (isPickerRange(current)) {
      return `Choose dates, selected range is ${formatCalendarDateLabel(current.start, locale)} to ${formatCalendarDateLabel(current.end, locale)}`
    }
    return 'Choose dates'
  }
  if (isPickerDate(current)) {
    return `Choose date, selected date is ${formatCalendarDateLabel(current, locale)}`
  }
  return 'Choose date'
})

const isBlocked = computed(
  () => context.isDisabled.value || context.isReadonly.value,
)

const triggerBindings = computed((): Record<string, unknown> => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'class' && key !== 'onClick' && key !== 'type') {
      rest[key] = value
    }
  }
  const labelled =
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined
  return {
    ...rest,
    type: 'button',
    'aria-label': labelled ? attrs['aria-label'] : defaultLabel.value,
    'aria-haspopup': 'dialog',
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': context.contentId.value,
    disabled: isBlocked.value || undefined,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    'data-ghost-date-picker': '',
  }
})

function onClick(event: MouseEvent): void {
  invokeAttrHandler(attrs['onClick'], event)
  if (event.defaultPrevented || isBlocked.value) {
    return
  }
  // Own focus before opening so the dialog records the trigger as opener.
  if (element.value && document.activeElement !== element.value) {
    element.value.focus({ preventScroll: true })
  }
  // Attempt a normal text commit first, then open even if it fails so the
  // calendar can correct invalid text. Cancelling keeps the invalid draft.
  context.commitText()
  context.openCalendar()
}

defineExpose<GhostDatePickerPartExposed>({
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
  <button
    ref="element"
    :class="['ghost-date-picker-trigger', attrs['class']]"
    v-bind="triggerBindings"
    @click="onClick"
  >
    <slot>
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="2" y="3" width="12" height="11" rx="1.5" />
        <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
      </svg>
    </slot>
  </button>
</template>
