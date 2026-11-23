<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  useAttrs,
  useTemplateRef,
} from 'vue'

import GhostPortal from './GhostPortal.vue'
import GhostToast from './GhostToast.vue'
import GhostToastAction from './GhostToastAction.vue'
import GhostToastClose from './GhostToastClose.vue'
import GhostToastDescription from './GhostToastDescription.vue'
import GhostToastTitle from './GhostToastTitle.vue'
import { isFocusable } from './get-tabbable-elements'
import {
  ghostToastProviderContextKey,
  ghostToastViewportContextKey,
  type GhostToastViewportElement,
  type GhostToastViewportExposed,
  type GhostToastViewportItemSlotProps,
  type GhostToastViewportSlotProps,
} from './ghost-toast'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Host element. Use `section` when the region should be a landmark. */
    as?: GhostToastViewportElement
    /** Teleport the region and both announcers to `document.body` after mount. */
    portal?: boolean
  }>(),
  {
    as: 'div',
    portal: true,
  },
)

defineSlots<{
  /** Replaces the whole stack. Render one `GhostToast` per item, keyed by `id`. */
  default?(props: GhostToastViewportSlotProps): unknown
  /** Content of one toast, rendered per visible record (keyed by `id`). */
  toast?(props: GhostToastViewportItemSlotProps): unknown
}>()

const context = inject(ghostToastProviderContextKey, null)
if (!context) {
  throw new Error('GhostToastViewport must be used inside GhostToastProvider')
}
const provider = context

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

const toasts = computed(() => provider.api.toasts.value)
const politeAnnouncement = computed(() => provider.politeAnnouncement.value)
const assertiveAnnouncement = computed(
  () => provider.assertiveAnnouncement.value,
)

const bindings = computed(() => {
  const own: Record<string, unknown> = {
    role: 'region',
    'data-ghost-live': '',
    'data-part': 'viewport',
    class: 'ghost-toast-viewport',
    onFocusin,
  }
  // T3: a consumer `aria-labelledby` (or `aria-label`) names the region, and
  // the provider `label` default is dropped instead of competing with it.
  if (
    attrs['aria-labelledby'] === undefined &&
    attrs['aria-label'] === undefined
  ) {
    own['aria-label'] = provider.label.value
  }
  return mergeProps(attrs, own)
})

// The announcers sit outside the region so the hidden copy is not read twice
// while browsing it. Each carries `data-ghost-live` so a modal's inert
// background (ADR 0012) never silences them.
const politeBindings = {
  role: 'status',
  'aria-live': 'polite',
  'aria-atomic': 'true',
  'data-ghost-live': '',
  'data-part': 'announcer-polite',
  style: visuallyHiddenStyle,
} as const

const assertiveBindings = {
  role: 'alert',
  'aria-atomic': 'true',
  'data-ghost-live': '',
  'data-part': 'announcer-assertive',
  style: visuallyHiddenStyle,
} as const

/**
 * Element that had focus before focus entered the region (T5). Removing a
 * focused toast returns focus here instead of dropping it on `<body>`.
 */
let returnTarget: HTMLElement | null = null

function onFocusin(event: FocusEvent): void {
  const from = event.relatedTarget
  const region = host.value
  if (from instanceof Node && region?.contains(from)) {
    return
  }
  returnTarget = from instanceof HTMLElement ? from : null
}

provide(ghostToastViewportContextKey, {
  restoreFocus() {
    const target = returnTarget
    returnTarget = null
    if (target?.isConnected && isFocusable(target)) {
      target.focus({ preventScroll: true })
    }
  },
})

let detach: (() => void) | undefined

// T1: records created before this point waited silently; attaching promotes
// them, announces them, and starts their timers now that the live regions
// exist in the document.
onMounted(() => {
  detach = provider.attachViewport()
})

onBeforeUnmount(() => {
  detach?.()
})

function dismiss(id: string): void {
  provider.api.dismiss(id)
}

defineExpose<GhostToastViewportExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <GhostPortal :disabled="!props.portal">
    <component :is="props.as" ref="host" v-bind="bindings">
      <slot :toasts="toasts" :dismiss="dismiss">
        <template v-for="toast in toasts" :key="toast.id">
          <slot name="toast" :toast="toast" :dismiss="dismiss">
            <GhostToast :toast="toast">
              <GhostToastTitle>{{ toast.title }}</GhostToastTitle>
              <GhostToastDescription v-if="toast.description">{{
                toast.description
              }}</GhostToastDescription>
              <GhostToastAction v-if="toast.action">{{
                toast.action.label
              }}</GhostToastAction>
              <GhostToastClose>Dismiss</GhostToastClose>
            </GhostToast>
          </slot>
        </template>
      </slot>
    </component>
    <div v-bind="politeBindings">
      <span v-if="politeAnnouncement.text" :key="politeAnnouncement.key">{{
        politeAnnouncement.text
      }}</span>
    </div>
    <div v-bind="assertiveBindings">
      <span
        v-if="assertiveAnnouncement.text"
        :key="assertiveAnnouncement.key"
        >{{ assertiveAnnouncement.text }}</span
      >
    </div>
  </GhostPortal>
</template>
