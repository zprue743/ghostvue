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
import { useGhostPresence } from './use-ghost-presence'

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

// Logical `isOpen` drives dismissal and focus, released immediately on
// close; presence only keeps the node mounted while its own exit motion runs.
// Closing before the first position resolved skips retention: the surface was
// still `visibility: hidden`, so there is nothing to animate out.
const presence = useGhostPresence({
  present: () => context.isOpen.value,
  element: () => resolvePopoverHtmlElement(hostRef.value),
  disabled: () => !isPositioned.value,
})

/** Mounted surface, live while `'open'` or `'exiting'`. */
const presentElement = computed(() =>
  presence.isPresent.value ? resolvePopoverHtmlElement(hostRef.value) : null,
)
/** Open-gated surface used by the interactive subsystems. */
const contentElement = computed(() =>
  context.isOpen.value ? presentElement.value : null,
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

// Bound to the mounted surface so coordinates, `data-placement` and scroll
// tracking persist through the exit instead of snapping to (0, 0).
const floating = useFloating(
  () => context.triggerElement.value,
  presentElement,
  {
    placement: () => props.placement,
    offset: () => props.offset,
    flip: () => props.flip,
    shift: () => props.shift,
    strategy: () => props.strategy,
  },
)

const shouldRestoreFocus = shallowRef(true)

watch(
  () => context.isOpen.value,
  (open) => {
    if (open) {
      shouldRestoreFocus.value = true
    }
  },
  { immediate: true },
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
  autoFocus: () => !context.openedAtMount.value,
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
    'data-state': presence.dataState.value,
  }

  if (!hasExplicitLabel.value && context.triggerRegistered.value) {
    result['aria-labelledby'] = context.triggerId.value
  }

  if (presence.isExiting.value) {
    // Out of the accessibility tree and unfocusable while it fades; a
    // consumer `inert` is passed through above and returns on reopen.
    result['inert'] = true
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
  // After consumer style: a departing surface never intercepts clicks meant
  // for the controls it still covers mid-fade.
  presence.isExiting.value ? { pointerEvents: 'none' as const } : undefined,
])

defineExpose<GhostPopoverContentExposed>({
  get element() {
    return presentElement.value
  },
  focus(options?: FocusOptions) {
    presentElement.value?.focus(options)
  },
  blur() {
    presentElement.value?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="presence.isPresent.value"
      ref="host"
      :class="['ghost-popover-content', attrs.class]"
      :style="contentStyle"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
