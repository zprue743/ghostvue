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
  ghostComboboxListboxId,
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

/**
 * Pressing a non-focusable part of the open content (padding, a group label,
 * an empty message) would otherwise move focus to `body` or to a focusable
 * page ancestor such as a `tabindex="-1"` landmark. Focus then sits outside
 * the widget, so a later Tab or programmatic focus elsewhere never reaches
 * the widget's `focusout` and the list would stay open (GHO-166). Keeping
 * focus on the input also matches the APG pattern, where the listbox never
 * takes focus. Presses on focusable content descendants (options, consumer
 * buttons) keep their default so pointer selection is unchanged.
 */
function handleContentMouseDown(event: MouseEvent): void {
  const root = context.contentElement.value
  let current: Element | null =
    event.target instanceof Element ? event.target : null
  while (current && root?.contains(current)) {
    if (current instanceof HTMLElement && isFocusable(current)) {
      return
    }
    if (current === root) {
      break
    }
    current = current.parentElement
  }
  event.preventDefault()
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
  // Focus departure (GHO-166) closes without restoring: focus stays where the
  // user or the page moved it.
  restoreFocus: () =>
    shouldRestoreFocus.value && !context.focusRestoreSuppressed.value,
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

/*
 * An open list with nothing to choose from (not loading, no registered
 * options) is not presented as a listbox: a listbox must own options or
 * groups (axe aria-required-children), and the empty slot's message is not
 * an option. The element keeps its id, so `aria-controls` still names the
 * popup, and the root live region announces the empty result. While loading,
 * `aria-busy` lets an empty listbox stand.
 */
const presentsListbox = computed(
  () => !isOpen.value || context.loading.value || context.optionCount.value > 0,
)

const listboxAttrs = computed(() => ({
  // The input's and trigger's aria-controls name this element, the
  // role="listbox" popup, rather than the presentational positioning wrapper.
  id: ghostComboboxListboxId(contentId.value),
  role: presentsListbox.value ? 'listbox' : undefined,
  'aria-labelledby': presentsListbox.value ? context.inputId.value : undefined,
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
    <component
      :is="as"
      ref="host"
      v-bind="contentAttrs"
      @focusout="context.notifyFocusOut"
      @pointerdown="context.notifyPointerDownInside"
      @mousedown="handleContentMouseDown"
    >
      <div ref="listbox" v-bind="listboxAttrs">
        <slot />
      </div>
    </component>
  </GhostPortal>
</template>
