<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import { logGhostCode } from './dev-codes'
import { isFocusable } from './get-tabbable-elements'
import {
  ghostDialogContextKey,
  resolveDialogHtmlElement,
  type GhostDialogContentElement,
  type GhostDialogContentExposed,
  type GhostDialogContentRole,
} from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFocusScope } from './use-focus-scope'
import { useInertOthers } from './use-inert-others'
import { useScrollLock } from './use-scroll-lock'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog surface. */
    as?: GhostDialogContentElement
    /** Semantic ARIA role for the dialog surface (`'dialog'` or `'alertdialog'`). */
    role?: GhostDialogContentRole
    /** Dismisses the topmost open dialog on `Escape`. */
    closeOnEscape?: boolean
    /** Dismisses the dialog on outside pointerdown (`true` for `'dialog'`, `false` for `'alertdialog'` by default). */
    closeOnOutsideClick?: boolean | undefined
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    role: 'dialog',
    closeOnEscape: true,
    closeOnOutsideClick: undefined,
    portal: true,
    portalTo: 'body',
  },
)

const injected = inject(ghostDialogContextKey)
if (!injected) {
  throw new Error('GhostDialogContent must be used inside GhostDialog')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const contentElement = computed(() =>
  context.isOpen.value ? resolveDialogHtmlElement(hostRef.value) : null,
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

watch(
  contentElement,
  (el) => {
    context.setContentElement(el)
  },
  { immediate: true, flush: 'post' },
)

// When a portaled dialog starts open at mount, GhostPortal teleports the DOM
// node from inline into `portalTo` on the post-mount tick. Moving a focused
// node during Teleport drops focus back to `document.body`, so defer focus
// scope activation by one tick only for that initial-mount portal move.
const focusPortalReady = shallowRef(!props.portal || !context.isOpen.value)
let componentActive = true

onMounted(() => {
  if (!focusPortalReady.value) {
    void nextTick(() => {
      if (componentActive) {
        focusPortalReady.value = true
      }
    })
  }
})

onUnmounted(() => {
  componentActive = false
  context.setContentElement(null)
  context.setContentId(null)
})

const modalActive = computed(
  () => context.isOpen.value && context.isModal.value,
)
const effectiveCloseOnOutsideClick = computed(
  () => props.closeOnOutsideClick ?? props.role !== 'alertdialog',
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

// Register scroll lock and inert isolation before useFocusScope so background
// inert is removed from the trigger before focus restores on close.
useScrollLock(modalActive)
useInertOthers(
  [() => context.contentElement.value, () => context.overlayElement.value],
  modalActive,
)

useDismissableLayer(contentElement, {
  disableEscape: () => !props.closeOnEscape,
  disableOutsidePointer: () => !effectiveCloseOnOutsideClick.value,
  ignore: () => context.triggerElement.value,
  onDismiss: (reason, event) => {
    // Modal dialogs always restore focus on close; non-modal dialogs allow
    // clicking an outside focusable control to keep focus there cleanly.
    const skipRestore =
      !context.isModal.value &&
      reason === 'outside-pointer' &&
      hasFocusableAncestor(event.target)
    shouldRestoreFocus.value = !skipRestore
    if (context.isModal.value && reason === 'outside-pointer') {
      // Closing on pointerdown removes the overlay before the browser's
      // follow-up mousedown event fires at those coordinates; without this,
      // mousedown hits document.body and blurs the restored trigger focus.
      const preventBlur = (mouseEvent: MouseEvent): void => {
        mouseEvent.preventDefault()
      }
      document.addEventListener('mousedown', preventBlur, {
        capture: true,
        once: true,
      })
      window.setTimeout(() => {
        document.removeEventListener('mousedown', preventBlur, {
          capture: true,
        })
      }, 0)
    }
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

const focusTarget = shallowRef<HTMLElement | null>(null)
watch(
  [() => context.isOpen.value, contentElement, focusPortalReady],
  ([open, el, portalReady]) => {
    if (!open || !el) {
      focusTarget.value = null
      return
    }
    if (portalReady && focusTarget.value !== el) {
      focusTarget.value = el
    }
  },
  { immediate: true, flush: 'post' },
)

useFocusScope(focusTarget, {
  trapped: () => context.isModal.value,
  loop: () => context.isModal.value,
  autoFocus: () => context.isModal.value || !context.openedAtMount.value,
  restoreFocus: shouldRestoreFocus,
})

function hasNonEmptyStringAttr(name: string): boolean {
  const value = attrs[name]
  return typeof value === 'string' && value.trim().length > 0
}

if (process.env.NODE_ENV !== 'production') {
  watch(
    [() => context.isOpen.value, contentElement],
    ([open, el]) => {
      if (!open || !el) {
        return
      }
      if (
        !context.titleRegistered.value &&
        !hasNonEmptyStringAttr('aria-label') &&
        !hasNonEmptyStringAttr('aria-labelledby')
      ) {
        logGhostCode('GHOST002')
      }
      if (
        props.role === 'alertdialog' &&
        !context.descriptionRegistered.value &&
        !hasNonEmptyStringAttr('aria-describedby')
      ) {
        logGhostCode('GHOST003')
      }
    },
    { immediate: true, flush: 'post' },
  )
}

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
      key !== 'role' &&
      key !== 'aria-modal' &&
      key !== 'aria-describedby' &&
      key !== 'tabindex'
    ) {
      rest[key] = value
    }
  }

  const result: Record<string, unknown> = {
    ...rest,
    id: contentId.value,
    role: props.role,
    tabindex: attrs['tabindex'] ?? -1,
    'data-part': 'content',
    'data-state': 'open',
  }

  if (context.isModal.value) {
    result['aria-modal'] = 'true'
  }

  if (!hasExplicitLabel.value && context.titleRegistered.value) {
    result['aria-labelledby'] = context.titleId.value
  }

  if ('aria-describedby' in attrs) {
    result['aria-describedby'] = attrs['aria-describedby']
  } else if (context.descriptionRegistered.value) {
    result['aria-describedby'] = context.descriptionId.value
  }

  return result
})

defineExpose<GhostDialogContentExposed>({
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
      :class="['ghost-dialog-content', attrs['class']]"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
