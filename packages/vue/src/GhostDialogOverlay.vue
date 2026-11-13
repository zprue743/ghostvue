<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostDialogContextKey,
  resolveDialogHtmlElement,
  type GhostDialogOverlayElement,
  type GhostDialogOverlayExposed,
} from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the modal backdrop. */
    as?: GhostDialogOverlayElement
    /** Teleport overlay through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    portal: true,
    portalTo: 'body',
  },
)

const injected = inject(ghostDialogContextKey)
if (!injected) {
  throw new Error('GhostDialogOverlay must be used inside GhostDialog')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const visible = computed(() => context.isOpen.value && context.isModal.value)
const overlayElement = computed(() =>
  visible.value ? resolveDialogHtmlElement(hostRef.value) : null,
)

watch(
  overlayElement,
  (el) => {
    context.setOverlayElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setOverlayElement(null)
})

const overlayAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'aria-hidden' && key !== 'class') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    'aria-hidden': 'true',
    'data-part': 'overlay',
    'data-state': 'open',
  }
})

defineExpose<GhostDialogOverlayExposed>({
  get element() {
    return overlayElement.value
  },
  focus(options?: FocusOptions) {
    overlayElement.value?.focus(options)
  },
  blur() {
    overlayElement.value?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="visible"
      ref="host"
      :class="['ghost-dialog-overlay', attrs['class']]"
      v-bind="overlayAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
