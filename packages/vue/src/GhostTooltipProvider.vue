<script setup lang="ts">
/**
 * Groups adjacent `GhostTooltip` trees so pointer moves between triggers can
 * skip the open delay within `skipDelayDuration` after a prior tooltip closes.
 */
import { computed, provide, shallowRef } from 'vue'

import {
  ghostTooltipProviderContextKey,
  type GhostTooltipProviderProps,
} from './ghost-tooltip-provider'

const props = withDefaults(defineProps<GhostTooltipProviderProps>(), {
  delayDuration: 700,
  skipDelayDuration: 300,
})

defineSlots<{
  default(): unknown
}>()

const anyTooltipHasOpened = shallowRef(false)
const openTooltipCount = shallowRef(0)
const lastTooltipClosedAt = shallowRef<number | null>(null)

function resolveOpenDelay(
  tooltipDelay: number | undefined,
  viaPointer: boolean,
): number {
  const base = tooltipDelay ?? props.delayDuration
  if (!viaPointer) {
    return base
  }
  if (!anyTooltipHasOpened.value) {
    return base
  }
  // Adjacent hover while another tooltip in this provider is still open.
  if (openTooltipCount.value > 0) {
    return 0
  }
  const closedAt = lastTooltipClosedAt.value
  if (closedAt !== null && Date.now() - closedAt < props.skipDelayDuration) {
    return 0
  }
  return base
}

function onTooltipDidOpen(): void {
  anyTooltipHasOpened.value = true
  openTooltipCount.value += 1
}

function onTooltipDidClose(): void {
  openTooltipCount.value = Math.max(0, openTooltipCount.value - 1)
  lastTooltipClosedAt.value = Date.now()
}

provide(ghostTooltipProviderContextKey, {
  delayDuration: computed(() => props.delayDuration),
  skipDelayDuration: computed(() => props.skipDelayDuration),
  resolveOpenDelay,
  onTooltipDidOpen,
  onTooltipDidClose,
})
</script>

<template>
  <slot />
</template>
