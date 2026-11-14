import { computed, toValue, type ComputedRef, type CSSProperties } from 'vue'

import type { UseGhostProgressOptions } from './ghost-progress'

/** ARIA `progressbar` default for `aria-valuemax`; also the public `max` default. */
const DEFAULT_MAX = 100

export interface GhostProgressRootProps {
  class: 'ghost-progress'
  role: 'progressbar'
  'data-part': 'root'
  'data-state': 'indeterminate' | undefined
  'aria-label': string | undefined
  'aria-valuemin': '0'
  'aria-valuemax': string
  'aria-valuenow': string | undefined
  'aria-valuetext': string | undefined
}

export interface GhostProgressIndicatorProps {
  'data-part': 'indicator'
  style: CSSProperties | undefined
}

function resolveMax(max: number | undefined): number {
  if (max == null || !Number.isFinite(max) || max <= 0) return DEFAULT_MAX
  return max
}

function resolveValue(
  value: number | null | undefined,
  max: number,
): number | null {
  // `null` / omitted / NaN are unknown progress, not zero.
  if (value == null || !Number.isFinite(value)) return null
  return Math.min(max, Math.max(0, value))
}

function defaultValueText(value: number, max: number): string {
  return `${String(Math.round((value / max) * 100))}%`
}

/**
 * Determinate `progressbar` semantics with an indeterminate fallback.
 * Native `<progress>` is rejected: it is a replaced element, so there is no
 * `data-part="indicator"` child and reduced-motion cannot be a `--ghost-*`
 * recipe. See `docs/components/progress-spec.md`.
 */
export function useGhostProgress(options: UseGhostProgressOptions = {}): {
  max: ComputedRef<number>
  value: ComputedRef<number | null>
  isIndeterminate: ComputedRef<boolean>
  percent: ComputedRef<number | null>
  valueText: ComputedRef<string | undefined>
  label: ComputedRef<string | undefined>
  rootProps: ComputedRef<GhostProgressRootProps>
  indicatorProps: ComputedRef<GhostProgressIndicatorProps>
} {
  const max = computed(() => resolveMax(toValue(options.max)))
  const value = computed(() => resolveValue(toValue(options.value), max.value))
  const isIndeterminate = computed(() => value.value == null)
  const percent = computed(() =>
    value.value == null ? null : (value.value / max.value) * 100,
  )
  const valueText = computed(() => {
    if (value.value == null) return undefined
    const custom = toValue(options.valueText)
    if (custom) return custom
    return defaultValueText(value.value, max.value)
  })
  const label = computed(() => {
    const text = toValue(options.label)
    if (!text) return undefined
    return text
  })

  const rootProps = computed((): GhostProgressRootProps => ({
    class: 'ghost-progress',
    role: 'progressbar',
    'data-part': 'root',
    'data-state': isIndeterminate.value ? 'indeterminate' : undefined,
    'aria-label': label.value,
    'aria-valuemin': '0',
    'aria-valuemax': String(max.value),
    'aria-valuenow': value.value == null ? undefined : String(value.value),
    'aria-valuetext': valueText.value,
  }))

  const indicatorProps = computed((): GhostProgressIndicatorProps => ({
    'data-part': 'indicator',
    // Determinate fill is an inline percentage so headless consumers get a
    // functional bar without the theme. Indeterminate size is CSS-only.
    style:
      percent.value == null
        ? undefined
        : { inlineSize: `${String(percent.value)}%` },
  }))

  return {
    max,
    value,
    isIndeterminate,
    percent,
    valueText,
    label,
    rootProps,
    indicatorProps,
  }
}
