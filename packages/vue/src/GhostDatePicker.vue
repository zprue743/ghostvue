<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, nextTick, provide, shallowRef, watch } from 'vue'

import { isPickerDate, isPickerRange, toIsoDate } from './date-picker-value'
import { useNativeFormReset } from './form-reset'
import {
  ghostDatePickerContextKey,
  type GhostDatePickerContext,
  type GhostDatePickerError,
  type GhostDatePickerFormat,
  type GhostDatePickerParse,
  type GhostDatePickerPart,
  type GhostDatePickerSelectionMode,
  type GhostDatePickerValidateRange,
  type GhostDatePickerValue,
  type GhostDatePickerWeekday,
} from './ghost-date-picker'
import { useGhostDatePicker } from './use-ghost-date-picker'
import { useGhostId } from './use-ghost-id'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

// Explicit `undefined` defaults keep omitted `modelValue` / `open` uncontrolled
// instead of letting Vue coerce booleans to `false`.
const props = withDefaults(
  defineProps<{
    /** `'single'` or `'range'`; fixed for the instance (remount with a new `key`). */
    selectionMode?: GhostDatePickerSelectionMode
    /** Controlled committed value; `undefined` is uncontrolled, `null` is controlled empty. */
    modelValue?: GhostDatePickerValue | undefined
    /** Initial uncontrolled value and uncontrolled form-reset target. */
    defaultValue?: GhostDatePickerValue
    /** Controlled requested open state. */
    open?: boolean | undefined
    /** Initial uncontrolled open state. */
    defaultOpen?: boolean
    /** Inclusive lower bound. */
    minValue?: CalendarDate | undefined
    /** Inclusive upper bound. */
    maxValue?: CalendarDate | undefined
    /** Unavailable endpoint dates (focusable, not selectable). */
    isDateDisabled?: ((date: CalendarDate) => boolean) | undefined
    /** Whole-range business validation returning an error message or `null`. */
    validateRange?: GhostDatePickerValidateRange | undefined
    /** Calendar and formatting locale. */
    locale?: string
    /** Week start override (Sunday = `0`). */
    weekStartsOn?: GhostDatePickerWeekday | undefined
    /** Explicit current date for SSR-safe "today" styling and focus fallback. */
    today?: CalendarDate | undefined
    /** Month shown when the picker opens empty. */
    defaultVisibleMonth?: CalendarDate | undefined
    /** Synchronous parser; defaults to strict ISO `YYYY-MM-DD`. */
    parse?: GhostDatePickerParse | undefined
    /** Synchronous display formatter; defaults to ISO `YYYY-MM-DD`. */
    format?: GhostDatePickerFormat | undefined
    /** Blocks all interaction and closes the calendar. */
    disabled?: boolean
    /** Keeps text focusable and selectable but prevents editing, clearing, and opening. */
    readonly?: boolean
    /** Native required constraint on an empty committed value. */
    required?: boolean
    /** Consumer-supplied invalid state (`external-invalid`). */
    invalid?: boolean
    /** Form name: `name` (single) or `name[start]` / `name[end]` (range). */
    name?: string | undefined
    /** Range start submission name override. */
    startName?: string | undefined
    /** Range end submission name override. */
    endName?: string | undefined
    /** External `<form>` id for submission, validation, and reset. */
    form?: string | undefined
    /** Format description linked to every input. */
    formatHint?: string
    /** Localizes built-in error messages. */
    validationMessage?: ((error: GhostDatePickerError) => string) | undefined
  }>(),
  {
    selectionMode: 'single',
    modelValue: undefined,
    defaultValue: null,
    open: undefined,
    defaultOpen: false,
    minValue: undefined,
    maxValue: undefined,
    isDateDisabled: undefined,
    validateRange: undefined,
    locale: 'en-US',
    weekStartsOn: undefined,
    today: undefined,
    defaultVisibleMonth: undefined,
    parse: undefined,
    format: undefined,
    disabled: false,
    readonly: false,
    required: false,
    invalid: false,
    name: undefined,
    startName: undefined,
    endName: undefined,
    form: undefined,
    formatHint: 'YYYY-MM-DD',
    validationMessage: undefined,
  },
)

const emit = defineEmits<{
  /** Valid committed value proposal. Equal values are not re-emitted. */
  'update:modelValue': [value: GhostDatePickerValue]
  /** Open-state proposal. */
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: {
    value: GhostDatePickerValue
    open: boolean
    pending: boolean
    errors: GhostDatePickerError[]
    clear: () => void
    openCalendar: () => void
    close: () => void
  }): unknown
}>()

const picker = useGhostDatePicker({
  selectionMode: () => props.selectionMode,
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  minValue: () => props.minValue,
  maxValue: () => props.maxValue,
  isDateDisabled: () => props.isDateDisabled,
  validateRange: () => props.validateRange,
  locale: () => props.locale,
  weekStartsOn: () => props.weekStartsOn,
  today: () => props.today,
  defaultVisibleMonth: () => props.defaultVisibleMonth,
  parse: () => props.parse,
  format: () => props.format,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  required: () => props.required,
  invalid: () => props.invalid,
  formatHint: () => props.formatHint,
  validationMessage: () => props.validationMessage,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

const contentId = useGhostId('ghost-date-picker-content')
const hintId = useGhostId('ghost-date-picker-hint')
const summaryId = useGhostId('ghost-date-picker-summary')
const errorIds = {
  single: useGhostId('ghost-date-picker-error'),
  start: useGhostId('ghost-date-picker-start-error'),
  end: useGhostId('ghost-date-picker-end-error'),
}

const inputs = shallowRef<
  Partial<Record<GhostDatePickerPart, HTMLInputElement>>
>({})
const triggerElement = shallowRef<HTMLElement | null>(null)
const summaryElement = shallowRef<HTMLElement | null>(null)
const startHidden = shallowRef<HTMLInputElement | null>(null)
const calendarFocus: GhostDatePickerContext['calendarFocus'] = shallowRef(null)
const resetVersion = shallowRef(0)

// The open dialog's error summary appears only after a native `invalid`
// event while the modal is open, and disappears with the dialog.
const summaryRequested = shallowRef(false)
watch(picker.isOpen, (open) => {
  if (!open) {
    summaryRequested.value = false
  }
})
const summaryErrors = computed(() =>
  summaryRequested.value && picker.isOpen.value ? picker.errors.value : [],
)

/**
 * While the modal is open the inputs sit in the inert background, so the
 * browser cannot focus them to show its validation bubble. Cancel that default
 * and move focus to the in-dialog error summary instead. Submission stays
 * blocked because the inputs remain invalid.
 */
function onInputInvalid(event: Event): void {
  picker.markValidationAttempted()
  if (!picker.isOpen.value) {
    return
  }
  event.preventDefault()
  summaryRequested.value = true
  void nextTick(() => {
    summaryElement.value?.focus({ preventScroll: true })
  })
}

useNativeFormReset(
  () =>
    startHidden.value ??
    inputs.value.single ??
    inputs.value.start ??
    inputs.value.end ??
    null,
  () => {
    picker.applyFormReset()
    resetVersion.value += 1
  },
)

function isoOf(date: CalendarDate | undefined): string {
  return date ? toIsoDate(date) : ''
}

/** Hidden inputs serialize only the committed value, never drafts. */
const hiddenInputs = computed(() => {
  const current = picker.value.value
  const disabled = props.disabled || undefined
  if (props.selectionMode === 'single') {
    return [
      {
        key: 'single',
        name: props.name,
        value: isPickerDate(current) ? toIsoDate(current) : '',
      },
    ].map((entry) => ({ ...entry, form: props.form, disabled }))
  }
  const range = isPickerRange(current) ? current : undefined
  return [
    {
      key: 'start',
      name:
        props.startName ?? (props.name ? `${props.name}[start]` : undefined),
      value: isoOf(range?.start),
    },
    {
      key: 'end',
      name: props.endName ?? (props.name ? `${props.name}[end]` : undefined),
      value: isoOf(range?.end),
    },
  ].map((entry) => ({ ...entry, form: props.form, disabled }))
})

const descriptionParts = computed<GhostDatePickerPart[]>(() =>
  props.selectionMode === 'single' ? ['single'] : ['start', 'end'],
)

function errorText(part: GhostDatePickerPart): string {
  return picker
    .errorsFor(part)
    .map((error) => error.message)
    .join('. ')
}

function setHiddenRef(key: string, element: unknown): void {
  if (key === 'single' || key === 'start') {
    startHidden.value = element instanceof HTMLInputElement ? element : null
  }
}

const context: GhostDatePickerContext = {
  ...picker,
  contentId,
  hintId,
  summaryId,
  errorId: (part) => errorIds[part].value,
  form: computed(() => props.form),
  minValue: computed(() => props.minValue),
  maxValue: computed(() => props.maxValue),
  isDateDisabled: computed(() => props.isDateDisabled),
  weekStartsOn: computed(() => props.weekStartsOn),
  today: computed(() => props.today),
  formatHint: computed(() => props.formatHint),
  summaryErrors,
  resetVersion,
  registerInput(part, element) {
    const next: Partial<Record<GhostDatePickerPart, HTMLInputElement>> = {}
    for (const [key, value] of Object.entries(inputs.value)) {
      if (key !== part) {
        next[key as GhostDatePickerPart] = value
      }
    }
    if (element) {
      next[part] = element
    }
    inputs.value = next
  },
  inputElement: (part) => inputs.value[part] ?? null,
  setTriggerElement(element) {
    triggerElement.value = element
  },
  triggerElement,
  setSummaryElement(element) {
    summaryElement.value = element
  },
  onInputInvalid,
  calendarFocus,
}

provide(ghostDatePickerContextKey, context)
</script>

<template>
  <slot
    :value="picker.value.value"
    :open="picker.isOpen.value"
    :pending="picker.pending.value"
    :errors="picker.errors.value"
    :clear="picker.clear"
    :open-calendar="picker.openCalendar"
    :close="picker.close"
  />
  <input
    v-for="hidden in hiddenInputs"
    :key="hidden.key"
    :ref="(el) => setHiddenRef(hidden.key, el)"
    type="hidden"
    :name="hidden.name"
    :value="hidden.value"
    :form="hidden.form"
    :disabled="hidden.disabled"
    data-ghost-date-picker-value=""
  />
  <span :id="hintId" :style="visuallyHiddenStyle" data-part="format-hint">{{
    formatHint
  }}</span>
  <span
    v-for="part in descriptionParts"
    :id="errorIds[part].value"
    :key="part"
    :style="visuallyHiddenStyle"
    data-part="error-description"
    >{{ errorText(part) }}</span
  >
</template>
