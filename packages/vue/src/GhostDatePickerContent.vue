<script setup lang="ts">
import { computed, inject, provide, useAttrs, useTemplateRef, watch } from 'vue'

import {
  createDialogPartsContext,
  resolveDialogHtmlElement,
  useDialogState,
} from './dialog-shared'
import { ghostDialogContextKey } from './ghost-dialog'
import {
  ghostDatePickerContextKey,
  type GhostDatePickerPartExposed,
} from './ghost-date-picker'
import type {
  GhostPopoverFlipOptions,
  GhostPopoverOffsetOptions,
  GhostPopoverPlacement,
  GhostPopoverShiftOptions,
  GhostPopoverStrategy,
} from './ghost-popover'
import type { GhostPortalTarget } from './ghost-portal'
import GhostDatePickerCalendar from './GhostDatePickerCalendar.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import { useFloating } from './use-floating'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Preferred placement relative to the input (or trigger). */
    placement?: GhostPopoverPlacement
    /** Distance or axis offsets between anchor and content. */
    offset?: GhostPopoverOffsetOptions | boolean | undefined
    /** Flip to the opposite side when overflowing. */
    flip?: boolean | GhostPopoverFlipOptions
    /** Shift along the cross axis to stay in view. */
    shift?: boolean | GhostPopoverShiftOptions
    /** CSS positioning strategy. */
    strategy?: GhostPopoverStrategy
    /** Teleport through `GhostPortal` when `true`; render inline when `false`. */
    portal?: boolean
    /** Teleport target when `portal` is `true`. */
    portalTo?: GhostPortalTarget
    /** Accessible name of the built-in Close control. */
    closeLabel?: string
    /** Polite instruction announced after the first range activation. */
    endDateInstruction?: string
  }>(),
  {
    placement: 'bottom-start',
    offset: 4,
    flip: true,
    shift: true,
    strategy: 'absolute',
    portal: true,
    portalTo: 'body',
    closeLabel: 'Close date picker',
    endDateInstruction: 'Choose an end date',
  },
)

defineSlots<{
  /** Calendar and optional help/error content. Defaults to `GhostDatePickerCalendar`. */
  default(): unknown
}>()

const injected = inject(ghostDatePickerContextKey)
if (!injected) {
  throw new Error('GhostDatePickerContent must be used inside GhostDatePicker')
}
const context = injected
const attrs = useAttrs()

/**
 * Anchored modal (spec "Composition"): GhostDialog's content part owns focus
 * trapping, background inert, scroll lock, and dismissable-layer stacking,
 * while `useFloating` positions it like a popover. The dialog state is
 * provided here, not on the root, so dialog parts a consumer renders beside
 * the picker inputs keep resolving their own enclosing GhostDialog.
 */
const dialogState = useDialogState(
  {
    open: () => context.isOpen.value,
    onOpenChange: (open) => {
      // Escape and outside dismissal discard calendar-only progress.
      if (!open) {
        context.close()
      }
    },
  },
  'ghost-date-picker',
)
provide(ghostDialogContextKey, createDialogPartsContext(dialogState))

const dialogRef = useTemplateRef('dialog')
const closeRef = useTemplateRef<HTMLButtonElement>('closeButton')
const contentElement = computed(() =>
  context.isOpen.value ? resolveDialogHtmlElement(dialogRef.value) : null,
)

const anchor = computed<HTMLElement | null>(
  () =>
    context.inputElement('single') ??
    context.inputElement('start') ??
    context.triggerElement.value,
)

const floating = useFloating(anchor, contentElement, {
  placement: () => props.placement,
  offset: () => props.offset,
  flip: () => props.flip,
  shift: () => props.shift,
  strategy: () => props.strategy,
})

const positioned = computed(
  () => anchor.value === null || floating.isPositioned.value,
)

// Focus enters only after positioning and the calendar grid have rendered,
// so the first focus lands on the visible roving date cell.
const focusReady = computed(() => {
  const calendar = context.calendarFocus.value
  return positioned.value && (calendar === null || calendar.ready.value)
})

function initialFocus(): HTMLElement | null {
  const target = context.calendarFocus.value?.resolve() ?? null
  // A disabled cell (for example a misconfigured calendar) cannot take
  // focus; the Close button is the documented fallback.
  if (target && !(target instanceof HTMLButtonElement && target.disabled)) {
    return target
  }
  return closeRef.value
}

function isUsable(element: HTMLElement | null): element is HTMLElement {
  return (
    element !== null &&
    element.isConnected &&
    !(
      (element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement) &&
      element.disabled
    )
  )
}

function returnFocus(): HTMLElement | null {
  const candidates = [
    context.triggerElement.value,
    context.inputElement('single'),
    context.inputElement('start'),
  ]
  return candidates.find(isUsable) ?? null
}

const summaryRef = useTemplateRef<HTMLElement>('summary')
watch(
  summaryRef,
  (element) => {
    context.setSummaryElement(element)
  },
  { flush: 'post' },
)

const statusText = computed(() => {
  const error = context.calendarError.value
  if (error) {
    return error.message
  }
  return context.anchor.value ? props.endDateInstruction : ''
})

const summaryTextId = computed(() => `${context.summaryId.value}-text`)

const contentBindings = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'class' && key !== 'style' && key !== 'id') {
      rest[key] = value
    }
  }
  const labelled =
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined
  if (!labelled) {
    rest['aria-label'] =
      context.selectionMode.value === 'range' ? 'Choose dates' : 'Choose date'
  }
  return {
    ...rest,
    id: context.contentId.value,
    class: ['ghost-date-picker-content', attrs.class],
    style: [
      {
        position: floating.strategy.value,
        left: `${String(floating.x.value)}px`,
        top: `${String(floating.y.value)}px`,
        ...(positioned.value ? {} : { visibility: 'hidden' as const }),
      },
      attrs.style,
    ],
    'data-ghost-date-picker': '',
    'data-selection-mode': context.selectionMode.value,
  }
})

defineExpose<GhostDatePickerPartExposed>({
  get element() {
    return contentElement.value
  },
  focus(options?: FocusOptions) {
    contentElement.value?.focus(options)
  },
  blur() {
    contentElement.value?.blur()
  },
})
</script>

<template>
  <GhostDialogContent
    ref="dialog"
    v-bind="contentBindings"
    :portal="portal"
    :portal-to="portalTo"
    :focus-ready="focusReady"
    :initial-focus="initialFocus"
    :return-focus="returnFocus"
  >
    <button
      ref="closeButton"
      type="button"
      class="ghost-date-picker-close"
      data-part="close"
      :aria-label="closeLabel"
      @click="context.close()"
    >
      <span aria-hidden="true">×</span>
    </button>
    <div
      v-if="context.summaryErrors.value.length > 0"
      :id="context.summaryId.value"
      ref="summary"
      class="ghost-date-picker-error-summary"
      data-part="error-summary"
      role="group"
      tabindex="-1"
      :aria-labelledby="summaryTextId"
    >
      <p :id="summaryTextId">
        {{
          context.summaryErrors.value.map((error) => error.message).join('. ')
        }}
      </p>
    </div>
    <slot>
      <GhostDatePickerCalendar />
    </slot>
    <p class="ghost-date-picker-status" data-part="status" role="status">
      {{ statusText }}
    </p>
  </GhostDialogContent>
</template>
