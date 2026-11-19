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

import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'
import {
  ghostSelectContextKey,
  ghostSelectListboxId,
  resolveSelectHtmlElement,
  type GhostSelectContext,
  type GhostSelectContentElement,
  type GhostSelectContentExposed,
  type GhostSelectFlipOptions,
  type GhostSelectOffsetOptions,
  type GhostSelectPlacement,
  type GhostSelectShiftOptions,
  type GhostSelectStrategy,
} from './ghost-select'
import { isFocusable } from './get-tabbable-elements'
import { isImeComposing } from './is-ime-composing'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useFocusScope } from './use-focus-scope'
import { useRovingFocus } from './use-roving-focus'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostSelectContentElement
    placement?: GhostSelectPlacement
    offset?: GhostSelectOffsetOptions | boolean | undefined
    flip?: boolean | GhostSelectFlipOptions
    shift?: boolean | GhostSelectShiftOptions
    strategy?: GhostSelectStrategy
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

const injected = inject(ghostSelectContextKey)
if (!injected) {
  throw new Error('GhostSelectContent must be used inside GhostSelect')
}
const context: GhostSelectContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const listboxRef = useTemplateRef<HTMLElement | null>('listbox')

const isOpen = computed(() => context.isOpen.value)

const contentElement = computed(() =>
  isOpen.value ? resolveSelectHtmlElement(hostRef.value) : null,
)

const contentId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultContentId.value
})

watch(
  contentId,
  (id) => {
    context.setContentId(id === context.defaultContentId.value ? null : id)
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

watch(isOpen, (open) => {
  if (open) {
    shouldRestoreFocus.value = true
  }
})

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
    if (!isOpen.value) {
      return
    }
    const skipRestore =
      reason === 'outside-pointer' && hasFocusableAncestor(event.target)
    shouldRestoreFocus.value = !skipRestore
    context.close()
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
  [isOpen, contentElement, isPositioned],
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

/*
 * Initial focus when the scope activates, which waits until the content is
 * positioned and visible. The trigger's own deferred focus runs earlier,
 * while the content is still `visibility: hidden`, so a browser ignores it
 * and focus stayed on the trigger, leaving the open list unreachable from
 * the keyboard. Same rule as the trigger: the selected enabled option, else
 * the first (or, after ArrowUp, the last) enabled option in rendered order.
 */
function resolveInitialOption(): HTMLElement | null {
  const listbox = listboxRef.value
  if (!listbox) {
    return null
  }
  const active = document.activeElement
  if (
    active instanceof HTMLElement &&
    active !== listbox &&
    listbox.contains(active)
  ) {
    return active
  }
  const enabled = [
    ...listbox.querySelectorAll<HTMLElement>(
      '[role="option"]:not([aria-disabled="true"])',
    ),
  ]
  const selected = enabled.find(
    (option) => option.getAttribute('aria-selected') === 'true',
  )
  return (
    selected ??
    (context.openFocusFromEnd.value ? enabled.at(-1) : enabled[0]) ??
    null
  )
}

useFocusScope(focusTarget, {
  trapped: false,
  autoFocus: () => !context.openedAtMount.value,
  restoreFocus: shouldRestoreFocus,
  initialFocus: resolveInitialOption,
})

watch(
  listboxRef,
  (el) => {
    context.setContentElement(el)
  },
  { flush: 'post' },
)

onUnmounted(() => {
  context.setContentElement(null)
})

useRovingFocus(listboxRef, { orientation: 'vertical', loop: true })

function onListboxKeydown(event: KeyboardEvent): void {
  // IME-owned keys (see `isImeComposing`) must not close, select, or run
  // typeahead; the input method consumes them.
  if (!isOpen.value || event.defaultPrevented || isImeComposing(event)) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    shouldRestoreFocus.value = false
    context.close()
    context.triggerElement.value?.focus({ preventScroll: true })
    return
  }
  if (event.key === 'Tab') {
    context.close()
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    const active = document.activeElement
    if (active instanceof HTMLElement && listboxRef.value?.contains(active)) {
      const value = active.getAttribute('data-value')
      if (value) {
        event.preventDefault()
        context.select(value)
        void nextTick(() => {
          context.triggerElement.value?.focus({ preventScroll: true })
        })
      }
    }
    return
  }
  context.handleTypeahead(event)
}

const contentAttrs = computed(() => {
  const open = isOpen.value
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'class' &&
      key !== 'style' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'hidden'
    ) {
      rest[key] = value
    }
  }

  return {
    ...rest,
    id: contentId.value,
    role: attrs['role'] ?? 'presentation',
    // Library class first so consumer class bindings (string, array, object)
    // merge with it instead of being dropped.
    class: ['ghost-select-content', attrs.class],
    'data-part': 'content',
    'data-state': open ? 'open' : 'closed',
    'data-placement': open ? floating.placement.value : undefined,
    hidden: open ? undefined : true,
    style: open
      ? [
          {
            position: floating.strategy.value,
            left: `${String(floating.x.value)}px`,
            top: `${String(floating.y.value)}px`,
            ...(isPositioned.value ? {} : { visibility: 'hidden' as const }),
          },
          attrs.style,
        ]
      : attrs.style,
  }
})

const listboxAttrs = computed(() => ({
  // The trigger's aria-controls names this element, the role="listbox"
  // popup, rather than the presentational positioning wrapper.
  id: ghostSelectListboxId(contentId.value),
  role: 'listbox',
  tabindex: isOpen.value ? -1 : undefined,
  'aria-hidden': isOpen.value ? undefined : true,
  inert: isOpen.value ? undefined : true,
  'aria-labelledby': context.triggerId.value,
  'data-part': 'listbox',
}))

const portalActive = computed(() => props.portal && isOpen.value)

defineExpose<GhostSelectContentExposed>({
  get element() {
    return resolveSelectHtmlElement(hostRef.value)
  },
  focus(options?: FocusOptions) {
    resolveSelectHtmlElement(hostRef.value)?.focus(options)
  },
  blur() {
    resolveSelectHtmlElement(hostRef.value)?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portalActive">
    <component :is="as" ref="host" v-bind="contentAttrs">
      <div ref="listbox" v-bind="listboxAttrs" @keydown="onListboxKeydown">
        <slot />
      </div>
    </component>
  </GhostPortal>
</template>
