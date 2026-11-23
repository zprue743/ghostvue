<script setup lang="ts">
/**
 * Native action button. Runs the `action.onClick` given to `toast()`, then
 * emits `click`. It does not dismiss the toast; the handler decides.
 */
import { computed, inject, mergeProps, useAttrs, useTemplateRef } from 'vue'

import {
  ghostToastItemContextKey,
  type GhostToastActionExposed,
} from './ghost-toast'

defineOptions({
  inheritAttrs: false,
})

const emit = defineEmits<{
  /** After the record's `action.onClick` ran. */
  click: [event: MouseEvent]
}>()

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostToastItemContextKey, null)
if (!injected) {
  throw new Error('GhostToastAction must be used inside GhostToast')
}
const item = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLButtonElement>('host')

function onClick(event: MouseEvent): void {
  item.toast.value.action?.onClick()
  emit('click', event)
}

const bindings = computed(() =>
  mergeProps(attrs, {
    type: 'button',
    class: 'ghost-toast-action',
    'data-part': 'action',
    onClick,
  }),
)

defineExpose<GhostToastActionExposed>({
  get element() {
    return host.value
  },
  focus(options?: FocusOptions) {
    host.value?.focus(options)
  },
  blur() {
    host.value?.blur()
  },
})
</script>

<template>
  <button ref="host" v-bind="bindings">
    <slot />
  </button>
</template>
