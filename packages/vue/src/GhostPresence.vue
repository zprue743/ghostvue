<script setup lang="ts">
import {
  Comment,
  Fragment,
  cloneVNode,
  computed,
  h,
  shallowRef,
  watch,
  type VNode,
} from 'vue'

import { logGhostCode } from './dev-codes'
import type { GhostPresenceSlotProps } from './ghost-presence'
import { resolvePresenceElement, useGhostPresence } from './use-ghost-presence'

// Renderless: there is no wrapper element to receive fallthrough attributes.
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Logical open/mounted state. When `true`, mounts the default slot; when `false`, transitions through `exiting` before unmount. */
    present: boolean
    /** When `true`, bypasses exit waiting and unmounts immediately when `present` turns `false`. */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  /** Emitted when an exit finishes and the slot unmounts. Not emitted on reopen interruption or owner unmount. */
  exitComplete: []
}>()

const slots = defineSlots<{
  /** Content mounted while present. A single element or component root is decorated automatically; otherwise bind `setElement`, `state`, and `exiting` on the animated surface. */
  default(props: GhostPresenceSlotProps): VNode[]
}>()

// Two binding paths: the automatic ref on a single cloned root, and the
// manual `setElement` slot prop for fragments and portal wrappers. A manual
// binding wins because the consumer named the animated surface explicitly.
const manualElement = shallowRef<HTMLElement | null>(null)
const childElement = shallowRef<HTMLElement | null>(null)

const presence = useGhostPresence({
  present: () => props.present,
  element: () => manualElement.value ?? childElement.value,
  disabled: () => props.disabled,
  onExitComplete: () => {
    emit('exitComplete')
  },
})

function setElement(target: unknown): void {
  manualElement.value = resolvePresenceElement(target)
}

function bindChildElement(target: unknown): void {
  childElement.value = resolvePresenceElement(target)
}

if (process.env.NODE_ENV !== 'production') {
  let warned = false
  // Registered after useGhostPresence, so on close it observes the element
  // still bound from the last open render: an unresolved surface here means
  // the exit cannot be animated and the slot unmounts immediately.
  watch(
    () => props.present,
    (present, wasPresent) => {
      if (
        warned ||
        present ||
        !wasPresent ||
        props.disabled ||
        presence.phase.value !== 'exiting' ||
        manualElement.value ||
        childElement.value
      ) {
        return
      }
      warned = true
      logGhostCode('GHOST014')
    },
    { flush: 'sync' },
  )
}

const slotProps = computed<GhostPresenceSlotProps>(() => ({
  present: props.present,
  phase: presence.phase.value,
  state: presence.dataState.value,
  exiting: presence.isExiting.value,
  setElement,
}))

function isDecoratableRoot(vnode: VNode): boolean {
  const { type } = vnode
  if (typeof type === 'string') {
    return true
  }
  if (typeof type === 'function') {
    return true
  }
  if (typeof type !== 'object') {
    return false
  }
  // Teleport, Suspense and KeepAlive have no single element root to animate.
  return !(
    '__isTeleport' in type ||
    '__isSuspense' in type ||
    '__isKeepAlive' in type
  )
}

/**
 * Renders the slot. A lone element or component root is cloned with a merged
 * ref (the consumer's own `ref` keeps working), a default `data-state`, and
 * `inert` plus `pointer-events: none` while exiting. Clones are rebuilt from
 * the fresh slot vnode on every render, so consumer `inert` and inline
 * `pointer-events` return unchanged after a reopen.
 */
function renderSlot(): VNode {
  const children = slots.default(slotProps.value)
  const roots = children.filter((vnode) => vnode.type !== Comment)
  const only = roots.length === 1 ? roots[0] : undefined
  if (!only || !isDecoratableRoot(only)) {
    return h(Fragment, children)
  }
  const extra: Record<string, unknown> = { ref: bindChildElement }
  if (only.props?.['data-state'] === undefined) {
    extra['data-state'] = presence.dataState.value
  }
  if (presence.isExiting.value) {
    extra['inert'] = true
    extra['style'] = { pointerEvents: 'none' }
  }
  return cloneVNode(only, extra, true)
}
</script>

<template>
  <component :is="renderSlot()" v-if="presence.isPresent.value" />
</template>
