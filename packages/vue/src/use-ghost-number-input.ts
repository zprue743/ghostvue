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

interface FormatSpec {
  supported: boolean
  decimal: string
  group: string | undefined
  primaryGroupSize: number
  secondaryGroupSize: number
  isPercent: boolean
  hasAccountingParens: boolean
  digitMap: Map<string, string>
  minusSigns: string[]
  plusSigns: string[]
  affixes: string[]
}

const BIDI_CHARS_RE = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const WHITESPACE_RE = /\s/
const SAMPLE_VALUES = [-123456789.12, 123456789.12, -1, 1, 0, 2] as const

const formatterCache = new Map<string, Intl.NumberFormat>()
const specCache = new Map<string, FormatSpec>()

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

function stripBidiAndTrim(text: string): string {
  return text.replace(BIDI_CHARS_RE, '').trim()
}

function buildDigitMap(
  resolvedLocale: string,
  numberingSystem: string | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (let i = 0; i <= 9; i += 1) {
    map.set(String(i), String(i))
  }
  const digitFormatter = getFormatter(resolvedLocale, {
    ...(numberingSystem ? { numberingSystem } : {}),
    useGrouping: false,
    maximumFractionDigits: 0,
  })
  const digits = digitFormatter
    .formatToParts(1234567890)
    .filter((part) => part.type === 'integer')
    .map((part) => part.value)
    .join('')
  const chars = Array.from(digits)
  if (chars.length === 10) {
    for (let i = 0; i < 10; i += 1) {
      const ch = chars[i]
      if (ch) map.set(ch, String((i + 1) % 10))
    }
  }
  return map
}

function getFormatSpec(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): FormatSpec {
  const key = formatterKey(locale, options)
  const cached = specCache.get(key)
  if (cached) return cached

  const formatter = getFormatter(locale, options)
  const resolved = formatter.resolvedOptions()
  const supported = resolved.notation === 'standard'

  const digitMap = buildDigitMap(resolved.locale, resolved.numberingSystem)

  const decimalProbe = getFormatter(resolved.locale, {
    ...(resolved.numberingSystem
      ? { numberingSystem: resolved.numberingSystem }
      : {}),
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const probeParts = decimalProbe.formatToParts(123456789.1)
  const decimal =
    probeParts.find((part) => part.type === 'decimal')?.value ?? '.'

  const samplePartsList = SAMPLE_VALUES.map((sample) =>
    formatter.formatToParts(sample),
  )

  let group: string | undefined
  const groupSizes: number[] = []
  for (const part of samplePartsList[1] ?? []) {
    if (part.type === 'group') {
      group = part.value
    } else if (part.type === 'integer') {
      groupSizes.push(Array.from(part.value).length)
    }
  }
  if (!group) {
    for (const parts of samplePartsList) {
      const found = parts.find((part) => part.type === 'group')?.value
      if (found) {
        group = found
        break
      }
    }
  }

  const primaryGroupSize =
    groupSizes.length >= 2 ? (groupSizes[groupSizes.length - 1] ?? 3) : 3
  const secondaryGroupSize =
    groupSizes.length >= 3
      ? (groupSizes[groupSizes.length - 2] ?? primaryGroupSize)
      : primaryGroupSize

  const minusSet = new Set<string>(['-'])
  const plusSet = new Set<string>(['+'])
  const affixSet = new Set<string>()
  let hasOpenParen = false
  let hasCloseParen = false
  let sawMinusOnNegative = false

  for (let i = 0; i < SAMPLE_VALUES.length; i += 1) {
    const parts = samplePartsList[i] ?? []
    const isNegativeSample = (SAMPLE_VALUES[i] ?? 0) < 0
    for (const part of parts) {
      if (part.type === 'minusSign') {
        minusSet.add(part.value)
        if (isNegativeSample) sawMinusOnNegative = true
      } else if (part.type === 'plusSign') {
        plusSet.add(part.value)
      } else if (
        part.type === 'currency' ||
        part.type === 'unit' ||
        part.type === 'percentSign' ||
        part.type === 'literal'
      ) {
        const cleaned = stripBidiAndTrim(part.value)
        if (!cleaned) continue
        if (isNegativeSample && cleaned === '(') {
          hasOpenParen = true
          continue
        }
        if (isNegativeSample && cleaned === ')') {
          hasCloseParen = true
          continue
        }
        affixSet.add(cleaned)
      }
    }
  }

  const byLengthDesc = (a: string, b: string) => b.length - a.length
  const spec: FormatSpec = {
    supported,
    decimal,
    group,
    primaryGroupSize,
    secondaryGroupSize,
    isPercent: resolved.style === 'percent',
    hasAccountingParens:
      resolved.currencySign === 'accounting' ||
      (hasOpenParen && hasCloseParen && !sawMinusOnNegative),
    digitMap,
    minusSigns: [...minusSet].sort(byLengthDesc),
    plusSigns: [...plusSet].sort(byLengthDesc),
    affixes: [...affixSet].sort(byLengthDesc),
  }

  specCache.set(key, spec)
  return spec
}

function peelAffixesAndSign(
  trimmedInput: string,
  spec: FormatSpec,
): { sign: 1 | -1; core: string } {
  let s = trimmedInput
  let sign: 1 | -1 = 1
  let seenSign = false

  if (spec.hasAccountingParens && s.startsWith('(') && s.endsWith(')')) {
    s = stripBidiAndTrim(s.slice(1, -1))
    sign = -1
    seenSign = true
  }

  const usedAffixes = new Set<string>()
  while (s.length > 0) {
    let changed = false

    if (!seenSign) {
      for (const minus of spec.minusSigns) {
        if (s.startsWith(minus)) {
          s = stripBidiAndTrim(s.slice(minus.length))
          sign = -1
          seenSign = true
          changed = true
          break
        }
        if (s.endsWith(minus)) {
          s = stripBidiAndTrim(s.slice(0, s.length - minus.length))
          sign = -1
          seenSign = true
          changed = true
          break
        }
      }
      if (changed) continue

      for (const plus of spec.plusSigns) {
        if (s.startsWith(plus)) {
          s = stripBidiAndTrim(s.slice(plus.length))
          sign = 1
          seenSign = true
          changed = true
          break
        }
        if (s.endsWith(plus)) {
          s = stripBidiAndTrim(s.slice(0, s.length - plus.length))
          sign = 1
          seenSign = true
          changed = true
          break
        }
      }
      if (changed) continue
    }

    for (const affix of spec.affixes) {
      if (usedAffixes.has(affix)) continue
      if (s.startsWith(affix)) {
        s = stripBidiAndTrim(s.slice(affix.length))
        usedAffixes.add(affix)
        changed = true
        break
      }
      if (s.endsWith(affix)) {
        s = stripBidiAndTrim(s.slice(0, s.length - affix.length))
        usedAffixes.add(affix)
        changed = true
        break
      }
    }

    if (!changed) break
  }

  return { sign, core: s }
}

function isGroupChar(ch: string, group: string | undefined): boolean {
  if (!group) return false
  if (ch === group) return true
  return WHITESPACE_RE.test(group) && WHITESPACE_RE.test(ch)
}

function parseNumericCore(core: string, spec: FormatSpec): string | null {
  if (!core) return null

  const chars = Array.from(core)
  let decimalIndex = -1
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] === spec.decimal) {
      if (decimalIndex !== -1) return null
      decimalIndex = i
    }
  }

  const intChars = decimalIndex === -1 ? chars : chars.slice(0, decimalIndex)
  const fracChars = decimalIndex === -1 ? [] : chars.slice(decimalIndex + 1)

  const fracDigits: string[] = []
  for (const ch of fracChars) {
    const mapped = spec.digitMap.get(ch)
    if (mapped === undefined) return null
    fracDigits.push(mapped)
  }

  const intGroups: string[] = []
  let currentGroup = ''
  let sawGroupSeparator = false

  for (const ch of intChars) {
    if (isGroupChar(ch, spec.group)) {
      sawGroupSeparator = true
      if (!currentGroup) return null
      intGroups.push(currentGroup)
      currentGroup = ''
      continue
    }
    const mapped = spec.digitMap.get(ch)
    if (mapped === undefined) return null
    currentGroup += mapped
  }

  if (sawGroupSeparator) {
    if (!currentGroup) return null
    intGroups.push(currentGroup)
    if (intGroups.length < 2) return null

    const lastGroup = intGroups[intGroups.length - 1]
    if (lastGroup?.length !== spec.primaryGroupSize) return null

    for (let i = 1; i < intGroups.length - 1; i += 1) {
      if (intGroups[i]?.length !== spec.secondaryGroupSize) return null
    }

    const firstGroup = intGroups[0]
    if (
      !firstGroup ||
      firstGroup.length < 1 ||
      firstGroup.length > spec.secondaryGroupSize
    ) {
      return null
    }
  }

  const intDigits = sawGroupSeparator ? intGroups.join('') : currentGroup
  if (intDigits.length === 0 && fracDigits.length === 0) return null

  return decimalIndex === -1 ? intDigits : `${intDigits}.${fracDigits.join('')}`
}

function shiftDecimalLeft2(ascii: string): string {
  const [intPart = '', fracPart = ''] = ascii.split('.')
  const allDigits = `${intPart}${fracPart}`
  const newPos = intPart.length - 2
  if (newPos <= 0) {
    return `0.${'0'.repeat(-newPos)}${allDigits}`
  }
  return `${allDigits.slice(0, newPos)}.${allDigits.slice(newPos)}`
}

function countDecimals(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0
  const text = value.toString().toLowerCase()
  const [mantissa = '', exponentPart] = text.split('e')
  const dot = mantissa.indexOf('.')
  const mantissaDecimals = dot === -1 ? 0 : mantissa.length - dot - 1
  const exponent = exponentPart ? Number(exponentPart) : 0
  return Math.max(0, mantissaDecimals - exponent)
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
  const trimmed = stripBidiAndTrim(input)
  if (!trimmed) return { kind: 'empty' }

  const spec = getFormatSpec(locale, formatOptions)
  if (!spec.supported) return { kind: 'invalid' }

  const { sign, core } = peelAffixesAndSign(trimmed, spec)
  const ascii = parseNumericCore(core, spec)
  if (ascii === null) return { kind: 'invalid' }

  const scaled = spec.isPercent ? shiftDecimalLeft2(ascii) : ascii
  const parsed = Number(scaled)
  if (!Number.isFinite(parsed)) return { kind: 'invalid' }
  return { kind: 'valid', value: parsed === 0 ? 0 : sign * parsed }
}

function stepFrom(
  current: number | null,
  deltaSteps: number,
  step: number,
  min?: number,
  max?: number,
): number {
  const seed = current ?? min ?? 0
  const decimals = Math.min(
    100,
    Math.max(
      countDecimals(seed),
      countDecimals(step),
      countDecimals(min),
      countDecimals(max),
    ),
  )
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

    const display = formatNumber(committed, locale.value, formatOptions.value)
    draftText.value = display
    const el = target ?? toValue(options.element)
    if (el && el.value !== display) el.value = display
    syncHiddenInput(committed)

    // Controlled parents apply v-model updates on the next tick; keep the
    // committed draft visible now, then reconcile if the parent rejected it.
    void nextTick(() => {
      if (draftText.value !== display) return
      const expected = formatNumber(
        value.value,
        locale.value,
        formatOptions.value,
      )
      if (draftText.value !== expected) {
        draftText.value = expected
      }
      const currentEl = target ?? toValue(options.element)
      if (currentEl && currentEl.value !== expected) {
        currentEl.value = expected
      }
      syncHiddenInput(value.value)
    })

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
    const proposed = formatNumber(next, locale.value, formatOptions.value)
    draftText.value = proposed
    syncSpinbuttonDisplay(next)
    syncHiddenInput(next)

    // The step result is written to both native inputs immediately so stepping
    // feels instant, but a controlled parent may reject (or transform) it. Vue
    // only re-patches `value` when the bound prop changes, so after the
    // parent's v-model flush reconcile both inputs with the authoritative
    // model. Only text still showing the proposed step is overwritten, so a
    // newer edit or step queued in the same tick wins.
    void nextTick(() => {
      const committed = value.value
      const expected = formatNumber(
        committed,
        locale.value,
        formatOptions.value,
      )
      if (draftText.value === proposed) draftText.value = expected
      const el = toValue(options.element)
      if (el?.value === proposed && proposed !== expected) {
        el.value = expected
      }
      syncHiddenInput(committed)
    })
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
