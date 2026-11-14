import {
  computed,
  nextTick,
  onMounted,
  toValue,
  watch,
  type ComputedRef,
  type WritableComputedRef,
} from 'vue'

import type { UseGhostTextareaOptions } from './ghost-textarea'
import { useControllableState } from './use-controllable-state'

export type GhostTextareaDataState = 'disabled' | 'readonly' | 'invalid'

export interface GhostTextareaRootProps {
  class: 'ghost-textarea'
  rows: number
  disabled: boolean | undefined
  readonly: boolean | undefined
  required: boolean | undefined
  'aria-invalid': 'true' | undefined
  'data-part': 'root'
  'data-state': GhostTextareaDataState | undefined
  'data-auto-resize': '' | undefined
  value: string
  defaultValue: string
  onInput: (event: Event) => void
  /**
   * Unitless row count for themed `block-size: N * 1lh`. Native `rows` uses
   * font metrics and rounds 1px differently across fontconfigs.
   */
  style: { '--_ghost-textarea-rows': string }
}

const DEFAULT_ROWS = 2
const NORMAL_LINE_HEIGHT = 1.5

function numeric(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveLineHeight(computed: CSSStyleDeclaration): number {
  const lineHeight = computed.lineHeight
  if (lineHeight && lineHeight !== 'normal') {
    const parsed = Number.parseFloat(lineHeight)
    if (Number.isFinite(parsed)) return parsed
  }

  // UA `normal` is font-relative; 1.5 matches `--ghost-type-line-normal`.
  return numeric(computed.fontSize) * NORMAL_LINE_HEIGHT
}

function rowBoxHeight(computed: CSSStyleDeclaration, rows: number): number {
  const lineHeight = resolveLineHeight(computed)
  const paddingY =
    numeric(computed.paddingTop) + numeric(computed.paddingBottom)
  const borderY =
    numeric(computed.borderTopWidth) + numeric(computed.borderBottomWidth)
  const content = lineHeight * rows
  return computed.boxSizing === 'border-box'
    ? content + paddingY + borderY
    : content
}

function dataState(options: {
  disabled: boolean
  readonly: boolean
  invalid: boolean
}): GhostTextareaDataState | undefined {
  // Single hook like GhostButton. Native attrs remain the a11y source of truth.
  if (options.disabled) return 'disabled'
  if (options.readonly) return 'readonly'
  if (options.invalid) return 'invalid'
  return undefined
}

/**
 * Native textarea model, state hooks, and SSR-safe auto-resize.
 *
 * Measurement runs after mount only. Writing `height` during render would
 * hydrate-mismatch because `scrollHeight` is not available on the server.
 */
export function useGhostTextarea(options: UseGhostTextareaOptions = {}): {
  value: WritableComputedRef<string>
  isDisabled: ComputedRef<boolean>
  isReadonly: ComputedRef<boolean>
  isInvalid: ComputedRef<boolean>
  isRequired: ComputedRef<boolean>
  autoResize: ComputedRef<boolean>
  rows: ComputedRef<number>
  maxRows: ComputedRef<number | undefined>
  rootProps: ComputedRef<GhostTextareaRootProps>
  onInput: (event: Event) => void
  resize: (element?: HTMLTextAreaElement | null) => void
  applyFormReset: () => void
} {
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isReadonly = computed(() => Boolean(toValue(options.readonly)))
  const isInvalid = computed(() => Boolean(toValue(options.invalid)))
  const isRequired = computed(() => Boolean(toValue(options.required)))
  const autoResize = computed(() => Boolean(toValue(options.autoResize)))
  const rows = computed(() => toValue(options.rows) ?? DEFAULT_ROWS)
  const maxRows = computed(() => toValue(options.maxRows))

  // Captured once so later defaultValue writes cannot retarget form reset.
  const seed = toValue(options.defaultValue) ?? ''

  const value = useControllableState<string>({
    prop: () => toValue(options.modelValue),
    defaultValue: seed,
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  function applyFormReset(): void {
    value.value = seed
    const el = toValue(options.element) ?? null
    if (!el) return

    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) {
      if (el.value !== value.value) {
        el.value = value.value
      }
      resize(el)
      return
    }

    void nextTick(() => {
      restoreDomIfRejected(el)
    })
  }

  function currentElement(
    override?: HTMLTextAreaElement | null,
  ): HTMLTextAreaElement | null {
    if (override) return override
    return toValue(options.element) ?? null
  }

  function resize(element?: HTMLTextAreaElement | null): void {
    const el = currentElement(element)
    if (!el || typeof document === 'undefined') return

    if (!autoResize.value) {
      el.style.height = ''
      el.style.overflowY = ''
      return
    }

    const computed = getComputedStyle(el)
    const minHeight = rowBoxHeight(computed, rows.value)
    const maxRowCount = maxRows.value
    const maxHeight =
      maxRowCount == null
        ? Number.POSITIVE_INFINITY
        : rowBoxHeight(computed, Math.max(rows.value, maxRowCount))

    el.style.height = 'auto'
    const borderY =
      numeric(computed.borderTopWidth) + numeric(computed.borderBottomWidth)
    const contentHeight =
      el.scrollHeight + (computed.boxSizing === 'border-box' ? borderY : 0)
    // Integer px so auto-resize height does not drift 1px across Chromium fontconfigs.
    const next = Math.round(
      Math.min(Math.max(contentHeight, minHeight), maxHeight),
    )

    el.style.height = `${String(next)}px`
    el.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
  }

  function restoreDomIfRejected(target: HTMLTextAreaElement): void {
    if (target.value === value.value) return

    const start = target.selectionStart
    const end = target.selectionEnd
    target.value = value.value
    const length = target.value.length
    target.setSelectionRange(Math.min(start, length), Math.min(end, length))
    resize(target)
  }

  function onInput(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLTextAreaElement)) return
    value.value = target.value
    resize(target)

    // Controlled mode does not write local state. The getter still returns the
    // pre-emit prop until the parent re-renders, so a synchronous restore would
    // treat a normal v-model write as a rejection and move the caret to the end.
    // Wait a tick for the parent to accept or ignore, then restore only if needed.
    void nextTick(() => {
      restoreDomIfRejected(target)
    })
  }

  const rootProps = computed((): GhostTextareaRootProps => ({
    class: 'ghost-textarea',
    rows: rows.value,
    disabled: isDisabled.value || undefined,
    readonly: isReadonly.value || undefined,
    required: isRequired.value || undefined,
    'aria-invalid': isInvalid.value ? 'true' : undefined,
    'data-part': 'root',
    'data-state': dataState({
      disabled: isDisabled.value,
      readonly: isReadonly.value,
      invalid: isInvalid.value,
    }),
    'data-auto-resize': autoResize.value ? '' : undefined,
    value: value.value,
    defaultValue: seed,
    onInput,
    style: {
      '--_ghost-textarea-rows': String(rows.value),
    },
  }))

  onMounted(() => {
    watch(
      () =>
        [
          toValue(options.element) ?? null,
          autoResize.value,
          rows.value,
          maxRows.value,
          value.value,
        ] as const,
      ([element, enabled]) => {
        if (!element) return
        if (!enabled) {
          element.style.height = ''
          element.style.overflowY = ''
          return
        }
        resize(element)
      },
      { immediate: true },
    )

    watch(
      () => [toValue(options.element) ?? null, autoResize.value] as const,
      ([element, enabled], _previous, onCleanup) => {
        if (!element || !enabled || typeof ResizeObserver !== 'function') {
          return
        }

        // Height writes would loop the observer; only remeasure when width changes.
        let lastWidth = element.getBoundingClientRect().width
        const observer = new ResizeObserver((entries) => {
          const width = entries[0]?.contentRect.width
          if (width == null || width === lastWidth) return
          lastWidth = width
          resize(element)
        })
        observer.observe(element)
        onCleanup(() => {
          observer.disconnect()
        })
      },
      { immediate: true },
    )
  })

  return {
    value,
    isDisabled,
    isReadonly,
    isInvalid,
    isRequired,
    autoResize,
    rows,
    maxRows,
    rootProps,
    onInput,
    resize,
    applyFormReset,
  }
}
