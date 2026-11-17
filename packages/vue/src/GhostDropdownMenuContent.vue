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
  ghostDropdownMenuContextKey,
  resolveDropdownMenuHtmlElement,
  type GhostDropdownMenuContentElement,
  type GhostDropdownMenuContentExposed,
  type GhostDropdownMenuFlipOptions,
  type GhostDropdownMenuOffsetOptions,
  type GhostDropdownMenuPlacement,
  type GhostDropdownMenuShiftOptions,
  type GhostDropdownMenuStrategy,
} from './ghost-dropdown-menu'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useFocusScope } from './use-focus-scope'
import {
  focusFirstMenuItem,
  focusLastMenuItem,
  useGhostMenuCollection,
} from './use-ghost-menu-collection'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostDropdownMenuContentElement
    placement?: GhostDropdownMenuPlacement
    offset?: GhostDropdownMenuOffsetOptions | boolean | undefined
    flip?: boolean | GhostDropdownMenuFlipOptions
    shift?: boolean | GhostDropdownMenuShiftOptions
    strategy?: GhostDropdownMenuStrategy
    portal?: boolean
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

const injected = inject(ghostDropdownMenuContextKey)
if (!injected) {
  throw new Error(
    'GhostDropdownMenuContent must be used inside GhostDropdownMenu',
  )
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const contentElement = computed(() =>
  context.isOpen.value ? resolveDropdownMenuHtmlElement(hostRef.value) : null,
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
    const skipRestore =
      reason === 'outside-pointer' && hasFocusableAncestor(event.target)
    shouldRestoreFocus.value = !skipRestore
    const restoreTrigger = shouldRestoreFocus.value
    context.close()
    if (restoreTrigger) {
      // APG: Escape closes the menu and returns focus to the trigger even when
      // roving focus moved into portaled items before useFocusScope captured it.
      void nextTick(() => {
        context.triggerElement.value?.focus({ preventScroll: true })
      })
    }
    if (skipRestore) {
      void nextTick(() => {
        if (context.isOpen.value) {
          shouldRestoreFocus.value = true
        }
      })
    }
  },
})

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

watch(
  [focusTarget, isPositioned, () => context.focusLastOnOpen.value],
  ([el, positioned]) => {
    if (!el || !positioned) {
      return
    }
    // Defer so `useFocusScope` records the trigger as `previouslyFocused` first.
    void nextTick(() => {
      if (!context.isOpen.value || focusTarget.value !== el) {
        return
      }
      const focusLast = context.focusLastOnOpen.value
      if (focusLast) {
        focusLastMenuItem(el)
      } else {
        focusFirstMenuItem(el)
      }
    })
  },
  { flush: 'post' },
)

useFocusScope(focusTarget, {
  trapped: false,
  autoFocus: false,
  restoreFocus: shouldRestoreFocus,
})

useGhostMenuCollection(contentElement, {
  onClose: (reason) => {
    if (reason === 'tab') {
      shouldRestoreFocus.value = false
    }
    context.close()
  },
})

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

  return {
    ...rest,
    id: contentId.value,
    role: attrs['role'] ?? 'menu',
    tabindex: attrs['tabindex'] ?? -1,
    'data-part': 'content',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }
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

defineExpose<GhostDropdownMenuContentExposed>({
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
      :class="['ghost-dropdown-menu-content', attrs.class]"
      :style="contentStyle"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
