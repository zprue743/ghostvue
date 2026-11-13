<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onUnmounted,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import { isFocusable } from './get-tabbable-elements'
import {
  ghostPopoverContextKey,
  resolvePopoverHtmlElement,
  type GhostPopoverContentElement,
  type GhostPopoverContentExposed,
  type GhostPopoverFlipOptions,
  type GhostPopoverOffsetOptions,
  type GhostPopoverPlacement,
  type GhostPopoverShiftOptions,
  type GhostPopoverStrategy,
} from './ghost-popover'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useFocusScope } from './use-focus-scope'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the popover dialog surface. */
    as?: GhostPopoverContentElement
    /** Preferred placement relative to the trigger. */
    placement?: GhostPopoverPlacement
    /** Distance or axis offsets passed to `useFloating`. */
    offset?: GhostPopoverOffsetOptions | boolean | undefined
    /** Flip to an opposite side when overflowing the viewport or boundary. */
    flip?: boolean | GhostPopoverFlipOptions
    /** Shift along the cross axis to keep the popover in view. */
    shift?: boolean | GhostPopoverShiftOptions
    /** CSS positioning strategy passed to `useFloating`. */
    strategy?: GhostPopoverStrategy
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    placement: 'bottom',
    offset: undefined,
    flip: true,
    shift: true,
    strategy: 'absolute',
    portal: true,
    portalTo: 'body',
  },
)

const injected = inject(ghostPopoverContextKey)
if (!injected) {
  throw new Error('GhostPopoverContent must be used inside GhostPopover')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const contentElement = computed(() =>
  context.isOpen.value ? resolvePopoverHtmlElement(hostRef.value) : null,
)

const contentId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultContentId.value
})

watch(
  [() => context.isOpen.value, contentId],
  ([open, id]) => {
    if (open && id !== context.defaultContentId.value) {
      context.setContentId(id)
    } else {
      context.setContentId(null)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  context.setContentId(null)
})

const floating = useFloating(
  () => context.triggerElement.value,
  contentElement,
  {
    placement: () => props.placement,
    offset: () => props.offset,
    flip: () => props.flip,
    shift: () => props.shift,
    strategy: () => props.strategy,
  },
)

// Only autofocus on an actual closed-to-open transition after mount so a
// popover rendered with `defaultOpen` or `open: true` at mount does not steal
// focus on page load.
const shouldAutoFocus = shallowRef(false)
const shouldRestoreFocus = shallowRef(true)

watch(
  () => context.isOpen.value,
  (open) => {
    if (open) {
      shouldAutoFocus.value = true
      shouldRestoreFocus.value = true
    }
  },
)

function hasFocusableAncestor(target: EventTarget | null): boolean {
  let current: Element | null =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    if (current instanceof HTMLElement && isFocusable(current)) {
      return true
    }
    current = current.parentElement
  }
  return false
}

useDismissableLayer(contentElement, {
  ignore: () => context.triggerElement.value,
  onDismiss: (reason, event) => {
    // Allow outside clicks on other focusable controls (or their child spans/SVGs)
    // to keep focus instead of pulling focus back to the trigger on close.
    const skipRestore =
      reason === 'outside-pointer' && hasFocusableAncestor(event.target)
    shouldRestoreFocus.value = !skipRestore
    context.close()
    if (skipRestore) {
      // Scope the suppression to this dismissal only so a controlled parent
      // that ignores `update:open` still restores focus on a later close.
      void nextTick(() => {
        if (context.isOpen.value) {
          shouldRestoreFocus.value = true
        }
      })
    }
  },
})

// Wait for positioning readiness (visibility: hidden removed) and post-mount
// portal placement before handing the element to useFocusScope. When no trigger
// anchor is registered, skip the positioning gate so standalone content still
// becomes visible and receives focus.
const isPositioned = computed(
  () => !context.triggerRegistered.value || floating.isPositioned.value,
)

const focusTarget = shallowRef<HTMLElement | null>(null)
watch(
  [() => context.isOpen.value, contentElement, isPositioned],
  ([open, el, positioned]) => {
    if (!open || !el) {
      focusTarget.value = null
      return
    }
    if (positioned && focusTarget.value !== el) {
      focusTarget.value = el
    }
  },
  { immediate: true, flush: 'post' },
)

useFocusScope(focusTarget, {
  trapped: false,
  autoFocus: shouldAutoFocus,
  restoreFocus: shouldRestoreFocus,
})

const hasExplicitLabel = computed(
  () =>
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined,
)

const contentAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'class' &&
      key !== 'style' &&
      key !== 'role' &&
      key !== 'tabindex'
    ) {
      rest[key] = value
    }
  }

  const result: Record<string, unknown> = {
    ...rest,
    id: contentId.value,
    role: attrs['role'] ?? 'dialog',
    tabindex: attrs['tabindex'] ?? -1,
    'data-part': 'content',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }

  if (!hasExplicitLabel.value && context.triggerRegistered.value) {
    result['aria-labelledby'] = context.triggerId.value
  }

  return result
})

const contentStyle = computed(() => [
  {
    position: floating.strategy.value,
    left: `${String(floating.x.value)}px`,
    top: `${String(floating.y.value)}px`,
    ...(isPositioned.value ? {} : { visibility: 'hidden' as const }),
  },
  attrs.style,
])

defineExpose<GhostPopoverContentExposed>({
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
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="context.isOpen.value"
      ref="host"
      class="ghost-popover-content"
      :style="contentStyle"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
