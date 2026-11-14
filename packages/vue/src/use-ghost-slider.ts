import {
  computed,
  nextTick,
  toValue,
  watch,
  type ComputedRef,
  type CSSProperties,
  type WritableComputedRef,
} from 'vue'

import { useControllableState } from './use-controllable-state'
import type {
  GhostSliderOrientation,
  GhostSliderValue,
  UseGhostSliderOptions,
} from './ghost-slider'

export interface GhostSliderRootProps {
  class: 'ghost-slider'
  'data-part': 'root'
  'data-orientation': GhostSliderOrientation
}

export interface GhostSliderTrackProps {
  'data-part': 'track'
  'aria-hidden': 'true'
  onPointerdown: (event: PointerEvent) => void
}

export interface GhostSliderRangeProps {
  'data-part': 'range'
  'aria-hidden': 'true'
  style: CSSProperties
}

export interface GhostSliderThumbProps {
  'data-part': 'thumb'
  'data-thumb-index': '0' | '1'
  role: 'slider'
  tabindex: number | undefined
  'aria-valuemin': string
  'aria-valuemax': string
  'aria-valuenow': string
  'aria-valuetext': string | undefined
  'aria-label': string | undefined
  'aria-labelledby': string | undefined
  'aria-disabled': 'true' | undefined
  'aria-orientation': 'vertical' | undefined
  style: CSSProperties
  onKeydown: (event: KeyboardEvent) => void
  onPointerdown: (event: PointerEvent) => void
}

export interface GhostSliderInputProps {
  type: 'hidden'
  name: string | undefined
  value: string
  form: string | undefined
  disabled: boolean | undefined
}

function resolveBounds(
  min: number | undefined,
  max: number | undefined,
): {
  min: number
  max: number
} {
  const lo = min != null && Number.isFinite(min) ? min : 0
  const hi = max != null && Number.isFinite(max) ? max : 100
  if (lo <= hi) return { min: lo, max: hi }
  return { min: hi, max: lo }
}

function resolveStep(step: number | undefined): number {
  if (step == null || !Number.isFinite(step) || step <= 0) return 1
  return step
}

function snapValue(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.min(max, Math.max(min, value))
  const steps = Math.round((clamped - min) / step)
  const snapped = min + steps * step
  // Floating-point guard: clamp again after arithmetic.
  return Math.min(max, Math.max(min, Number(snapped.toPrecision(12))))
}

function valuesEqual(a: GhostSliderValue, b: GhostSliderValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Object.is(a, b)
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((entry, index) => Object.is(entry, b[index]))
    )
  }
  return false
}

function defaultForRange(
  min: number,
  max: number,
  range: boolean,
): GhostSliderValue {
  return range ? ([min, max] as const) : min
}

function normalizeSeed(
  seed: GhostSliderValue | undefined,
  range: boolean,
  min: number,
  max: number,
): GhostSliderValue {
  if (seed == null) return defaultForRange(min, max, range)
  if (range) {
    const lowRaw = Array.isArray(seed) ? Number(seed[0]) : min
    const highRaw = Array.isArray(seed)
      ? Number(seed[1])
      : typeof seed === 'number'
        ? seed
        : max
    const low = snapValue(lowRaw, min, max, 1)
    const high = snapValue(highRaw, min, max, 1)
    return [Math.min(low, high), Math.max(low, high)] as const
  }
  const single = Array.isArray(seed) ? Number(seed[0]) : Number(seed)
  return snapValue(single, min, max, 1)
}

/**
 * APG slider semantics, stepping, range invariants, and form hidden inputs.
 */
export function useGhostSlider(options: UseGhostSliderOptions = {}): {
  value: WritableComputedRef<GhostSliderValue>
  isRange: ComputedRef<boolean>
  isDisabled: ComputedRef<boolean>
  orientation: ComputedRef<GhostSliderOrientation>
  bounds: ComputedRef<{ min: number; max: number }>
  step: ComputedRef<number>
  rootProps: ComputedRef<GhostSliderRootProps>
  trackProps: ComputedRef<GhostSliderTrackProps>
  rangeProps: ComputedRef<GhostSliderRangeProps>
  thumbProps: ComputedRef<GhostSliderThumbProps[]>
  inputProps: ComputedRef<GhostSliderInputProps[]>
  setThumbValue: (index: 0 | 1, next: number) => void
  applyFormReset: () => void
  focusThumb: (index?: 0 | 1) => void
  blurActiveThumb: () => void
} {
  const isRange = computed(() => Boolean(toValue(options.range)))
  const bounds = computed(() =>
    resolveBounds(toValue(options.min), toValue(options.max)),
  )
  const step = computed(() => resolveStep(toValue(options.step)))
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const orientation = computed(
    (): GhostSliderOrientation => toValue(options.orientation) ?? 'horizontal',
  )
  const formId = computed((): string | undefined => {
    const form = toValue(options.form)
    return form ?? undefined
  })

  const resetBaseline = normalizeSeed(
    toValue(options.defaultValue),
    isRange.value,
    bounds.value.min,
    bounds.value.max,
  )

  const rawModel = useControllableState<GhostSliderValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: resetBaseline,
    onChange: (next) => {
      options.onChange?.(next)
    },
  })

  const value = computed({
    get(): GhostSliderValue {
      const current = rawModel.value
      return normalizeModel(current, isRange.value, bounds.value, step.value)
    },
    set(next: GhostSliderValue) {
      const normalized = normalizeModel(
        next,
        isRange.value,
        bounds.value,
        step.value,
      )
      if (valuesEqual(value.value, normalized)) return
      rawModel.value = normalized
    },
  })

  watch([isRange, bounds, step], () => {
    const normalized = normalizeModel(
      value.value,
      isRange.value,
      bounds.value,
      step.value,
    )
    if (!valuesEqual(value.value, normalized)) {
      value.value = normalized
    }
  })

  function setThumbValue(index: 0 | 1, rawNext: number): void {
    if (isDisabled.value) return
    const { min, max } = bounds.value
    const snapped = snapValue(rawNext, min, max, step.value)
    if (!isRange.value) {
      value.value = snapped
      return
    }
    const [low, high] = value.value as readonly [number, number]
    if (index === 0) {
      value.value = [Math.min(snapped, high), high] as const
    } else {
      value.value = [low, Math.max(snapped, low)] as const
    }
  }

  function largeStep(): number {
    const { min, max } = bounds.value
    const span = max - min
    if (span <= 0) return step.value
    return Math.max(step.value * 10, span / 10)
  }

  function resolveDir(): 'ltr' | 'rtl' {
    const root = toValue(options.root)
    if (!root) return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
    const closest = root.closest('[dir]')?.getAttribute('dir')
    if (closest === 'ltr' || closest === 'rtl') return closest
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  }

  function movementForKey(key: string): number | 'min' | 'max' | undefined {
    const horizontal = orientation.value === 'horizontal'
    const vertical = orientation.value === 'vertical'
    const dir = resolveDir()

    if (key === 'Home') return 'min'
    if (key === 'End') return 'max'

    const page = largeStep()
    if (key === 'PageUp') return page
    if (key === 'PageDown') return -page

    if (horizontal) {
      const towardMax = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const towardMin = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
      if (key === towardMax) return step.value
      if (key === towardMin) return -step.value
    }
    if (vertical) {
      if (key === 'ArrowUp') return step.value
      if (key === 'ArrowDown') return -step.value
    }
    return undefined
  }

  function onThumbKeydown(index: 0 | 1, event: KeyboardEvent): void {
    if (isDisabled.value || event.defaultPrevented) return
    const move = movementForKey(event.key)
    if (move === undefined) return
    event.preventDefault()
    const { min, max } = bounds.value
    const current = thumbValueAt(index)
    if (move === 'min') {
      setThumbValue(index, min)
      return
    }
    if (move === 'max') {
      setThumbValue(index, max)
      return
    }
    setThumbValue(index, current + move)
  }

  function thumbValueAt(index: 0 | 1): number {
    if (!isRange.value) return value.value as number
    const tuple = value.value as readonly [number, number]
    return index === 0 ? tuple[0] : tuple[1]
  }

  function thumbAriaBounds(index: 0 | 1): { min: number; max: number } {
    const { min, max } = bounds.value
    if (!isRange.value) return { min, max }
    const tuple = value.value as readonly [number, number]
    if (index === 0) return { min, max: tuple[1] }
    return { min: tuple[0], max }
  }

  function percentForThumb(index: 0 | 1): number {
    const { min, max } = bounds.value
    const span = max - min
    if (span <= 0) return 0
    return ((thumbValueAt(index) - min) / span) * 100
  }

  function thumbStyle(index: 0 | 1): CSSProperties {
    const percent = percentForThumb(index)
    if (orientation.value === 'vertical') {
      return {
        position: 'absolute',
        insetBlockEnd: `${String(percent)}%`,
        insetInlineStart: '50%',
        transform: 'translate(-50%, 50%)',
      }
    }
    return {
      position: 'absolute',
      insetInlineStart: `${String(percent)}%`,
      insetBlockStart: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  function rangeFillStyle(): CSSProperties {
    const { min, max } = bounds.value
    const span = max - min
    if (span <= 0) {
      return { display: 'none' }
    }
    if (!isRange.value) {
      const end = percentForThumb(0)
      if (orientation.value === 'vertical') {
        return {
          position: 'absolute',
          insetInline: '0',
          insetBlockEnd: '0',
          blockSize: `${String(end)}%`,
        }
      }
      return {
        position: 'absolute',
        insetBlock: '0',
        insetInlineStart: '0',
        inlineSize: `${String(end)}%`,
      }
    }
    const [low, high] = value.value as readonly [number, number]
    const start = ((low - min) / span) * 100
    const end = ((high - min) / span) * 100
    const size = end - start
    if (orientation.value === 'vertical') {
      return {
        position: 'absolute',
        insetInline: '0',
        insetBlockEnd: `${String(start)}%`,
        blockSize: `${String(size)}%`,
      }
    }
    return {
      position: 'absolute',
      insetBlock: '0',
      insetInlineStart: `${String(start)}%`,
      inlineSize: `${String(size)}%`,
    }
  }

  function positionFromPointer(clientX: number, clientY: number): number {
    const root = toValue(options.root)
    if (!root) return bounds.value.min
    const track = root.querySelector('[data-part="track"]')
    if (!(track instanceof HTMLElement)) return bounds.value.min
    const rect = track.getBoundingClientRect()
    const { min, max } = bounds.value
    const span = max - min
    if (span <= 0) return min

    let ratio: number
    if (orientation.value === 'vertical') {
      const usable = Math.max(rect.height, 1)
      ratio = 1 - (clientY - rect.top) / usable
    } else {
      const dir = resolveDir()
      const usable = Math.max(rect.width, 1)
      const fromStart = (clientX - rect.left) / usable
      ratio = dir === 'rtl' ? 1 - fromStart : fromStart
    }
    return snapValue(min + ratio * span, min, max, step.value)
  }

  function thumbElement(index: 0 | 1): HTMLElement | null {
    const root = toValue(options.root)
    if (!root) return null
    return root.querySelector<HTMLElement>(
      `[data-part="thumb"][data-thumb-index="${String(index)}"]`,
    )
  }

  function startPointerDrag(
    index: 0 | 1,
    event: PointerEvent,
    captureTarget?: HTMLElement,
  ): void {
    if (isDisabled.value || event.button !== 0) return
    const fromEvent = event.currentTarget
    const target =
      captureTarget ??
      (fromEvent instanceof HTMLElement ? fromEvent : undefined)
    if (!target) return
    event.preventDefault()
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId)
    }

    const onMove = (moveEvent: PointerEvent): void => {
      setThumbValue(
        index,
        positionFromPointer(moveEvent.clientX, moveEvent.clientY),
      )
    }
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      if (typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(event.pointerId)
        } catch {
          // Already released.
        }
      }
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
    setThumbValue(index, positionFromPointer(event.clientX, event.clientY))
  }

  function onTrackPointerDown(event: PointerEvent): void {
    if (isDisabled.value || event.button !== 0) return
    const next = positionFromPointer(event.clientX, event.clientY)
    const index: 0 | 1 = (() => {
      if (!isRange.value) return 0
      const [low, high] = value.value as readonly [number, number]
      return Math.abs(next - low) <= Math.abs(next - high) ? 0 : 1
    })()
    setThumbValue(index, next)
    const thumb = thumbElement(index)
    if (thumb) {
      startPointerDrag(index, event, thumb)
      return
    }
    focusThumb(index)
  }

  const rootProps = computed((): GhostSliderRootProps => ({
    class: 'ghost-slider',
    'data-part': 'root',
    'data-orientation': orientation.value,
  }))

  const trackProps = computed((): GhostSliderTrackProps => ({
    'data-part': 'track',
    'aria-hidden': 'true',
    onPointerdown: onTrackPointerDown,
  }))

  const rangeProps = computed((): GhostSliderRangeProps => ({
    'data-part': 'range',
    'aria-hidden': 'true',
    style: rangeFillStyle(),
  }))

  const thumbProps = computed((): GhostSliderThumbProps[] => {
    const count = isRange.value ? 2 : 1
    const items: GhostSliderThumbProps[] = []
    for (let index = 0; index < count; index += 1) {
      const thumbIndex = index as 0 | 1
      const aria = thumbAriaBounds(thumbIndex)
      const customText = toValue(options.valueText)
      const thumbLabel = toValue(options.label)
      const labelledBy = toValue(options.ariaLabelledby)
      const thumbAccessibleName =
        thumbLabel && isRange.value
          ? `${thumbLabel} ${thumbIndex === 0 ? 'minimum' : 'maximum'}`
          : thumbLabel
      items.push({
        'data-part': 'thumb',
        'data-thumb-index': thumbIndex === 0 ? '0' : '1',
        role: 'slider',
        tabindex: isDisabled.value ? -1 : 0,
        'aria-valuemin': String(aria.min),
        'aria-valuemax': String(aria.max),
        'aria-valuenow': String(thumbValueAt(thumbIndex)),
        'aria-valuetext': !isRange.value ? customText : undefined,
        // Name and value text are separate: valuetext never substitutes for a name.
        'aria-labelledby': labelledBy,
        'aria-label': labelledBy == null ? thumbAccessibleName : undefined,
        'aria-disabled': isDisabled.value ? 'true' : undefined,
        'aria-orientation':
          orientation.value === 'vertical' ? 'vertical' : undefined,
        style: thumbStyle(thumbIndex),
        onKeydown: (event) => {
          onThumbKeydown(thumbIndex, event)
        },
        onPointerdown: (event) => {
          startPointerDrag(thumbIndex, event)
        },
      })
    }
    return items
  })

  const inputProps = computed((): GhostSliderInputProps[] => {
    const name = toValue(options.name)
    const nameMax = toValue(options.nameMax)
    const disabled = isDisabled.value || undefined
    if (!isRange.value) {
      return [
        {
          type: 'hidden',
          name: name ?? undefined,
          value: String(value.value),
          form: formId.value,
          disabled,
        },
      ]
    }
    const [low, high] = value.value as readonly [number, number]
    return [
      {
        type: 'hidden',
        name: name ?? undefined,
        value: String(low),
        form: formId.value,
        disabled,
      },
      {
        type: 'hidden',
        name: nameMax ?? undefined,
        value: String(high),
        form: formId.value,
        disabled,
      },
    ]
  })

  function syncHiddenInputs(): void {
    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) return
    void nextTick(() => {
      const root = toValue(options.root)
      if (!root) return
      const inputs = root.querySelectorAll<HTMLInputElement>(
        'input[type="hidden"]',
      )
      const props = inputProps.value
      inputs.forEach((input, index) => {
        const next = props[index]
        if (!next) return
        if (input.value !== next.value) input.value = next.value
      })
    })
  }

  watch(value, () => {
    syncHiddenInputs()
  })

  function applyFormReset(): void {
    value.value = resetBaseline
    syncHiddenInputs()
  }

  function focusThumb(index: 0 | 1 = 0): void {
    const root = toValue(options.root)
    if (!root) return
    const target = root.querySelector<HTMLElement>(
      `[data-part="thumb"][data-thumb-index="${String(index)}"]`,
    )
    target?.focus()
  }

  function blurActiveThumb(): void {
    const root = toValue(options.root)
    const active = document.activeElement
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur()
    }
  }

  return {
    value,
    isRange,
    isDisabled,
    orientation,
    bounds,
    step,
    rootProps,
    trackProps,
    rangeProps,
    thumbProps,
    inputProps,
    setThumbValue,
    applyFormReset,
    focusThumb,
    blurActiveThumb,
  }
}

function normalizeModel(
  current: GhostSliderValue,
  range: boolean,
  bounds: { min: number; max: number },
  step: number,
): GhostSliderValue {
  const { min, max } = bounds
  if (!range) {
    const single = Array.isArray(current) ? Number(current[0]) : Number(current)
    return snapValue(single, min, max, step)
  }
  const lowRaw = Array.isArray(current) ? Number(current[0]) : Number(current)
  const highRaw = Array.isArray(current) ? Number(current[1]) : max
  const low = snapValue(lowRaw, min, max, step)
  const high = snapValue(highRaw, min, max, step)
  return [Math.min(low, high), Math.max(low, high)] as const
}
