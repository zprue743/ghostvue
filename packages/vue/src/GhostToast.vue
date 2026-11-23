<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  provide,
  useAttrs,
  useTemplateRef,
} from 'vue'

import {
  ghostToastItemContextKey,
  ghostToastProviderContextKey,
  ghostToastViewportContextKey,
  type GhostToastExposed,
  type GhostToastRecord,
  type GhostToastSlotProps,
} from './ghost-toast'
import { isImeComposing } from './is-ime-composing'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  /** Record to render, usually one item of the viewport's `toasts`. */
  toast: GhostToastRecord
}>()

defineSlots<{
  default?(props: GhostToastSlotProps): unknown
}>()

const injected = inject(ghostToastProviderContextKey, null)
if (!injected) {
  throw new Error('GhostToast must be used inside GhostToastProvider')
}
const provider = injected
const viewport = inject(ghostToastViewportContextKey, null)

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

function dismiss(): void {
  provider.api.dismiss(props.toast.id)
}

function onMouseenter(): void {
  provider.setPaused(props.toast.id, 'hover', true)
}

function onMouseleave(): void {
  provider.setPaused(props.toast.id, 'hover', false)
}

function onFocusin(): void {
  provider.setPaused(props.toast.id, 'focus', true)
}

function onFocusout(event: FocusEvent): void {
  // Moving between the action and close buttons keeps the pause.
  const next = event.relatedTarget
  if (next instanceof Node && host.value?.contains(next)) {
    return
  }
  provider.setPaused(props.toast.id, 'focus', false)
}

function onKeydown(event: KeyboardEvent): void {
  if (
    event.key !== 'Escape' ||
    event.defaultPrevented ||
    isImeComposing(event)
  ) {
    return
  }
  // T5: dismiss only this toast. Stopping propagation (and marking the event
  // handled) keeps a dialog behind the stack open: its dismissable layer
  // listens on `document` in the bubble phase and skips prevented events.
  event.preventDefault()
  event.stopPropagation()
  dismiss()
}

// A toast never takes focus, but if the user's focus is inside it when it
// leaves (Escape, Close, or an action that dismisses), return focus to where
// it was before it entered the region rather than dropping it on <body>.
onBeforeUnmount(() => {
  const element = host.value
  const active = typeof document === 'undefined' ? null : document.activeElement
  if (element && active && element.contains(active)) {
    viewport?.restoreFocus()
  }
})

provide(ghostToastItemContextKey, {
  toast: computed(() => props.toast),
  dismiss,
})

const bindings = computed(() =>
  mergeProps(attrs, {
    class: 'ghost-toast',
    'data-ghost-toast': '',
    'data-part': 'root',
    // Omitted for the default type so selectors only match the variant.
    'data-type': props.toast.type === 'error' ? 'error' : undefined,
    onMouseenter,
    onMouseleave,
    onFocusin,
    onFocusout,
    onKeydown,
  }),
)

const slotProps = computed((): GhostToastSlotProps => ({
  toast: props.toast,
  dismiss,
}))

defineExpose<GhostToastExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <div ref="host" v-bind="bindings">
    <slot v-bind="slotProps" />
  </div>
</template>
