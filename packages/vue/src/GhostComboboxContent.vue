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
  ghostComboboxContextKey,
  resolveComboboxHtmlElement,
  type GhostComboboxContentElement,
  type GhostComboboxContentExposed,
  type GhostComboboxContext,
  type GhostComboboxFlipOptions,
  type GhostComboboxOffsetOptions,
  type GhostComboboxPlacement,
  type GhostComboboxShiftOptions,
  type GhostComboboxStrategy,
} from './ghost-combobox'
import { isFocusable } from './get-tabbable-elements'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useFocusScope } from './use-focus-scope'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostComboboxContentElement
    placement?: GhostComboboxPlacement
    offset?: GhostComboboxOffsetOptions | boolean | undefined
    flip?: boolean | GhostComboboxFlipOptions
    shift?: boolean | GhostComboboxShiftOptions
    strategy?: GhostComboboxStrategy
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

const injected = inject(ghostComboboxContextKey)
if (!injected) {
  throw new Error('GhostComboboxContent must be used inside GhostCombobox')
}
const context: GhostComboboxContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const listboxRef = useTemplateRef<HTMLElement | null>('listbox')

const isOpen = computed(() => context.isOpen.value)

const contentElement = computed(() =>
  isOpen.value ? resolveComboboxHtmlElement(hostRef.value) : null,
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

const floating = useFloating(() => context.inputElement.value, contentElement, {
  placement: () => props.placement,
  offset: () => props.offset,
  flip: () => props.flip,
  shift: () => props.shift,
  strategy: () => props.strategy,
})

const shouldRestoreFocus = shallowRef(true)

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
  ignore: () =>
    [context.inputElement.value, context.contentElement.value].filter(Boolean),
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
  () => !context.inputRegistered.value || floating.isPositioned.value,
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

useFocusScope(focusTarget, {
  trapped: false,
  autoFocus: false,
  restoreFocus: shouldRestoreFocus,
})

watch(
  () => resolveComboboxHtmlElement(hostRef.value),
  (el) => {
    context.setContentElement(el)
  },
  { flush: 'post' },
)

watch(
  listboxRef,
  (el) => {
    context.setListboxElement(el)
  },
  { flush: 'post' },
)

onUnmounted(() => {
  context.setContentElement(null)
  context.setListboxElement(null)
})

const contentAttrs = computed(() => {
  const open = isOpen.value
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'class' &&
      key !== 'style' &&
      key !== 'role' &&
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
    class: ['ghost-combobox-content', attrs.class],
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
  role: 'listbox',
  'aria-labelledby': context.inputId.value,
  'aria-busy': context.loading.value ? true : undefined,
  'aria-hidden': isOpen.value ? undefined : true,
  inert: isOpen.value ? undefined : true,
  'data-part': 'listbox',
}))

const portalActive = computed(() => props.portal && isOpen.value)

defineExpose<GhostComboboxContentExposed>({
  get element() {
    return resolveComboboxHtmlElement(hostRef.value)
  },
  focus(options?: FocusOptions) {
    resolveComboboxHtmlElement(hostRef.value)?.focus(options)
  },
  blur() {
    resolveComboboxHtmlElement(hostRef.value)?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portalActive">
    <component :is="as" ref="host" v-bind="contentAttrs">
      <div ref="listbox" v-bind="listboxAttrs">
        <slot />
      </div>
    </component>
  </GhostPortal>
</template>
