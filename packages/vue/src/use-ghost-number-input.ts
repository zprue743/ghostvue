import {
  computed,
  nextTick,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type WritableComputedRef,
} from 'vue'

import type { UseGhostNumberInputOptions } from './ghost-number-input'
import { useControllableState } from './use-controllable-state'

export interface GhostNumberInputRootProps {
  class: 'ghost-number-input'
  'data-part': 'root'
  'data-state'?: 'invalid' | 'disabled' | 'readonly'
}

export interface GhostNumberInputInputProps {
  class: 'ghost-number-input__input'
  type: 'text'
  role: 'spinbutton'
  inputMode: 'decimal'
  value: string
  defaultValue: string | undefined
  disabled: boolean | undefined
  readonly: boolean | undefined
  required: boolean | undefined
  'aria-invalid': 'true' | undefined
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuenow'?: number
  'aria-valuetext'?: string
  'data-part': 'input'
  onInput: (event: Event) => void
  onBlur: (event: FocusEvent) => void
  onKeydown: (event: KeyboardEvent) => void
  onFocus: (event: FocusEvent) => void
}

export interface GhostNumberInputHiddenInputProps {
  type: 'hidden'
  name: string | undefined
  value: string
  form: string | undefined
  disabled: boolean | undefined
}

export interface GhostNumberInputButtonProps {
  type: 'button'
  class: 'ghost-number-input__button'
  tabindex: -1
  disabled: boolean | undefined
  'aria-label': string
  'data-part': 'decrement' | 'increment'
  onClick: (event: MouseEvent) => void
}

type DraftParseResult =
  { kind: 'empty' } | { kind: 'invalid' } | { kind: 'valid'; value: number }

const formatterCache = new Map<string, Intl.NumberFormat>()

function formatterKey(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): string {
  return `${locale ?? ''}::${JSON.stringify(options)}`
}

function getFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = formatterKey(locale, options)
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}

function countDecimals(step: number): number {
  const text = step.toString()
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value
  if (min !== undefined && next < min) next = min
  if (max !== undefined && next > max) next = max
  return next
}

function formatNumber(
  value: number | null,
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): string {
  if (value === null) return ''
  return getFormatter(locale, options).format(value)
}

/** Canonical string for native form submission, not the localized display. */
function formSubmitValue(value: number | null): string {
  return value === null ? '' : String(value)
}

function parseDraft(
  input: string,
  locale: string | undefined,
  formatOptions: Intl.NumberFormatOptions,
): DraftParseResult {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'empty' }

  const formatter = getFormatter(locale, formatOptions)
  const parts = formatter.formatToParts(-12345.67)
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'
  const group = parts.find((part) => part.type === 'group')?.value ?? ','
  const minus = parts.find((part) => part.type === 'minusSign')?.value ?? '-'

  let normalized = trimmed.split(group).join('')
  if (normalized.startsWith(minus)) {
    normalized = `-${normalized.slice(minus.length)}`
  }
  if (decimal !== '.') {
    normalized = normalized.split(decimal).join('.')
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return { kind: 'invalid' }
  return { kind: 'valid', value: parsed }
}

function stepFrom(
  current: number | null,
  deltaSteps: number,
  step: number,
  min?: number,
  max?: number,
): number {
  const seed = current ?? min ?? 0
  const decimals = countDecimals(step)
  const next = seed + deltaSteps * step
  const clamped = clampNumber(next, min, max)
  return Number(clamped.toFixed(decimals))
}

function canStep(
  current: number | null,
  direction: 1 | -1,
  step: number,
  min?: number,
  max?: number,
): boolean {
  const next = stepFrom(current, direction, step, min, max)
  if (current === null) return true
  return next !== current
}

/**
 * Locale-aware spinbutton bindings: numeric model, bounds, stepping, and APG
 * keyboard support on a text field with `role="spinbutton"`.
 */
export function useGhostNumberInput(options: UseGhostNumberInputOptions = {}): {
  value: WritableComputedRef<number | null>
  isDisabled: ComputedRef<boolean>
  isReadonly: ComputedRef<boolean>
  isInvalid: ComputedRef<boolean>
  isRequired: ComputedRef<boolean>
  rootProps: ComputedRef<GhostNumberInputRootProps>
  inputProps: ComputedRef<GhostNumberInputInputProps>
  hiddenInputProps: ComputedRef<GhostNumberInputHiddenInputProps>
  decrementProps: ComputedRef<GhostNumberInputButtonProps>
  incrementProps: ComputedRef<GhostNumberInputButtonProps>
  increment: () => void
  decrement: () => void
  applyFormReset: () => void
} {
  const seed = toValue(options.defaultValue) ?? null

  const value = useControllableState<number | null>({
    prop: () => toValue(options.modelValue),
    defaultValue: seed,
    onChange: (next) => {
      options.onChange?.(next)
    },
  })

  const editing = shallowRef(false)
  const draftText = ref('')

  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isReadonly = computed(() => Boolean(toValue(options.readonly)))
  const isInvalid = computed(() => Boolean(toValue(options.invalid)))
  const isRequired = computed(() => Boolean(toValue(options.required)))

  const min = computed(() => toValue(options.min))
  const max = computed(() => toValue(options.max))
  const step = computed(() => {
    const raw = toValue(options.step)
    return raw === undefined || raw <= 0 ? 1 : raw
  })
  const locale = computed(() => toValue(options.locale))
  const formatOptions = computed(() => toValue(options.formatOptions) ?? {})

  function currentDraftText(): string {
    const el = toValue(options.element)
    if (editing.value) return el?.value ?? draftText.value
    return el?.value ?? draftText.value
  }

  function syncHiddenInput(nextValue: number | null): void {
    const hidden = toValue(options.formInput)
    if (!hidden) return
    const next = formSubmitValue(nextValue)
    if (hidden.value !== next) hidden.value = next
  }

  function syncSpinbuttonDisplay(nextValue: number | null): void {
    const el = toValue(options.element)
    if (!el || editing.value) return
    const display = formatNumber(nextValue, locale.value, formatOptions.value)
    if (el.value !== display) el.value = display
  }

  function revertDraftToCommitted(target?: HTMLInputElement): void {
    const display = formatNumber(value.value, locale.value, formatOptions.value)
    draftText.value = display
    const el = target ?? toValue(options.element)
    if (el && el.value !== display) el.value = display
  }

  function commitDraft(target?: HTMLInputElement): number | null {
    const parsed = parseDraft(
      target?.value ?? currentDraftText(),
      locale.value,
      formatOptions.value,
    )

    if (parsed.kind === 'invalid') {
      revertDraftToCommitted(target)
      return value.value
    }

    const committed =
      parsed.kind === 'empty'
        ? null
        : clampNumber(parsed.value, min.value, max.value)

    if (!Object.is(committed, value.value)) {
      value.value = committed
    }

    draftText.value = formatNumber(
      value.value,
      locale.value,
      formatOptions.value,
    )
    const el = target ?? toValue(options.element)
    if (el && el.value !== draftText.value) el.value = draftText.value
    syncHiddenInput(committed)
    return committed
  }

  function applyFormReset(): void {
    value.value = seed
    editing.value = false
    draftText.value = ''
    syncSpinbuttonDisplay(seed)
    syncHiddenInput(seed)

    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) return

    void nextTick(() => {
      syncSpinbuttonDisplay(value.value)
      syncHiddenInput(value.value)
    })
  }

  function setValueFromStep(next: number): void {
    value.value = next
    editing.value = false
    draftText.value = formatNumber(next, locale.value, formatOptions.value)
    syncSpinbuttonDisplay(next)
    syncHiddenInput(next)
  }

  function increment(): void {
    if (isDisabled.value || isReadonly.value) return
    const current = commitDraft()
    if (!canStep(current, 1, step.value, min.value, max.value)) return
    setValueFromStep(stepFrom(current, 1, step.value, min.value, max.value))
  }

  function decrement(): void {
    if (isDisabled.value || isReadonly.value) return
    const current = commitDraft()
    if (!canStep(current, -1, step.value, min.value, max.value)) return
    setValueFromStep(stepFrom(current, -1, step.value, min.value, max.value))
  }

  function onFocus(): void {
    editing.value = true
    draftText.value =
      value.value === null
        ? ''
        : formatNumber(value.value, locale.value, formatOptions.value)
  }

  function onInput(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (isDisabled.value || isReadonly.value) return
    draftText.value = target.value
  }

  function onBlur(event: FocusEvent): void {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    editing.value = false
    commitDraft(target)

    void nextTick(() => {
      if (!target.isConnected) return
      const expected = formatNumber(
        value.value,
        locale.value,
        formatOptions.value,
      )
      if (target.value === expected) return
      target.value = expected
    })
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isDisabled.value || isReadonly.value) return

    if (event.key === 'Enter') {
      commitDraft(
        event.target instanceof HTMLInputElement ? event.target : undefined,
      )
      return
    }

    // Without min/max, Home/End behave like ordinary text fields (caret only).
    if (event.key === 'Home' && min.value === undefined) return
    if (event.key === 'End' && max.value === undefined) return

    const steppingKeys = [
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'Home',
      'End',
    ]
    if (!steppingKeys.includes(event.key)) return

    const input =
      event.target instanceof HTMLInputElement ? event.target : undefined
    if (input) {
      editing.value = true
      draftText.value = input.value
    }

    const current = commitDraft(input)

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (canStep(current, 1, step.value, min.value, max.value)) {
        setValueFromStep(stepFrom(current, 1, step.value, min.value, max.value))
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (canStep(current, -1, step.value, min.value, max.value)) {
        setValueFromStep(
          stepFrom(current, -1, step.value, min.value, max.value),
        )
      }
      return
    }
    if (event.key === 'PageUp') {
      event.preventDefault()
      setValueFromStep(stepFrom(current, 10, step.value, min.value, max.value))
      return
    }
    if (event.key === 'PageDown') {
      event.preventDefault()
      setValueFromStep(stepFrom(current, -10, step.value, min.value, max.value))
      return
    }
    if (event.key === 'Home' && min.value !== undefined) {
      event.preventDefault()
      setValueFromStep(min.value)
      return
    }
    if (event.key === 'End' && max.value !== undefined) {
      event.preventDefault()
      setValueFromStep(max.value)
    }
  }

  watch(
    () => value.value,
    (next) => {
      syncHiddenInput(next)
      if (!editing.value) {
        syncSpinbuttonDisplay(next)
      }
    },
  )

  watch([locale, formatOptions], () => {
    if (!editing.value) {
      syncSpinbuttonDisplay(value.value)
    }
  })

  const displayValue = computed(() => {
    if (editing.value) return draftText.value
    return formatNumber(value.value, locale.value, formatOptions.value)
  })

  const rootProps = computed((): GhostNumberInputRootProps => {
    const state = isInvalid.value
      ? 'invalid'
      : isDisabled.value
        ? 'disabled'
        : isReadonly.value
          ? 'readonly'
          : undefined
    return {
      class: 'ghost-number-input',
      'data-part': 'root',
      ...(state ? { 'data-state': state } : {}),
    }
  })

  const inputProps = computed((): GhostNumberInputInputProps => {
    const formatted =
      value.value === null
        ? undefined
        : formatNumber(value.value, locale.value, formatOptions.value)
    return {
      class: 'ghost-number-input__input',
      type: 'text',
      role: 'spinbutton',
      inputMode: 'decimal',
      value: displayValue.value,
      defaultValue:
        seed === null
          ? undefined
          : formatNumber(seed, locale.value, formatOptions.value),
      disabled: isDisabled.value || undefined,
      readonly: isReadonly.value || undefined,
      required: isRequired.value || undefined,
      'aria-invalid': isInvalid.value ? 'true' : undefined,
      ...(min.value === undefined ? {} : { 'aria-valuemin': min.value }),
      ...(max.value === undefined ? {} : { 'aria-valuemax': max.value }),
      ...(value.value === null ? {} : { 'aria-valuenow': value.value }),
      ...(formatted === undefined ? {} : { 'aria-valuetext': formatted }),
      'data-part': 'input',
      onInput,
      onBlur,
      onKeydown,
      onFocus,
    }
  })

  const hiddenInputProps = computed((): GhostNumberInputHiddenInputProps => {
    const name = toValue(options.name)
    return {
      type: 'hidden',
      name: name ?? undefined,
      value: formSubmitValue(value.value),
      form: toValue(options.form),
      disabled: isDisabled.value || undefined,
    }
  })

  const decrementProps = computed((): GhostNumberInputButtonProps => ({
    type: 'button',
    class: 'ghost-number-input__button',
    tabindex: -1,
    disabled:
      isDisabled.value ||
      isReadonly.value ||
      !canStep(value.value, -1, step.value, min.value, max.value) ||
      undefined,
    'aria-label': toValue(options.decrementLabel) ?? 'Decrease',
    'data-part': 'decrement',
    onClick: (event: MouseEvent) => {
      if (event.defaultPrevented) return
      decrement()
    },
  }))

  const incrementProps = computed((): GhostNumberInputButtonProps => ({
    type: 'button',
    class: 'ghost-number-input__button',
    tabindex: -1,
    disabled:
      isDisabled.value ||
      isReadonly.value ||
      !canStep(value.value, 1, step.value, min.value, max.value) ||
      undefined,
    'aria-label': toValue(options.incrementLabel) ?? 'Increase',
    'data-part': 'increment',
    onClick: (event: MouseEvent) => {
      if (event.defaultPrevented) return
      increment()
    },
  }))

  return {
    value,
    isDisabled,
    isReadonly,
    isInvalid,
    isRequired,
    rootProps,
    inputProps,
    hiddenInputProps,
    decrementProps,
    incrementProps,
    increment,
    decrement,
    applyFormReset,
  }
}
