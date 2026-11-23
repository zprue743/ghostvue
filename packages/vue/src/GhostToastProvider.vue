<script setup lang="ts">
/**
 * Renderless owner of one toast store. Descendants publish through
 * `useGhostToast()`; a descendant `GhostToastViewport` renders the stack.
 */
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ssrContextKey,
  watch,
} from 'vue'

import { ghostToastProviderContextKey } from './ghost-toast'
import { useGhostId } from './use-ghost-id'
import {
  createGhostToastStore,
  validateGhostToastProviderProps,
} from './use-ghost-toast'

// Declared inline so vue-component-meta extracts prop types and defaults cleanly.
const props = withDefaults(
  defineProps<{
    /** Default auto-dismiss interval in ms for informational toasts. `0` persists. */
    duration?: number
    /** Maximum number of visible toasts; later toasts wait in FIFO order. */
    limit?: number
    /** Accessible name of the viewport region. */
    label?: string
  }>(),
  {
    duration: 8000,
    limit: 3,
    label: 'Notifications',
  },
)

defineSlots<{
  default(): unknown
}>()

// Captured during setup only, so generated ids are unique per provider and
// SSR-stable; `toast()` itself never calls useId.
const storeKey = useGhostId('ghost-toast-store')

// `ssrContextKey` is provided only while rendering on the server. Checking
// it (instead of `typeof window`) keeps jsdom SSR tests honest. T1: toast()
// during SSR is a no-op, and the client queues until a viewport mounts.
const isServer =
  typeof window === 'undefined' ||
  inject<object | null>(ssrContextKey, null) !== null

const store = createGhostToastStore({
  storeKey: storeKey.value,
  duration: () => props.duration,
  limit: () => props.limit,
  isServer,
})

watch(
  () => [props.duration, props.limit] as const,
  ([duration, limit]) => {
    if (process.env.NODE_ENV !== 'production') {
      validateGhostToastProviderProps({ duration, limit })
    }
    store.refresh()
  },
  { immediate: true },
)

function onVisibilityChange(): void {
  store.setPageHidden(document.visibilityState === 'hidden')
}

onMounted(() => {
  onVisibilityChange()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (!isServer) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
  store.dispose()
})

provide(ghostToastProviderContextKey, {
  api: store.api,
  label: computed(() => props.label),
  politeAnnouncement: store.politeAnnouncement,
  assertiveAnnouncement: store.assertiveAnnouncement,
  attachViewport: store.attachViewport,
  setPaused: store.setPaused,
})
</script>

<template>
  <slot />
</template>
