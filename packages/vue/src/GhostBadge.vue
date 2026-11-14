<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { GhostBadgeExposed } from './ghost-badge'
import { useGhostBadge } from './use-ghost-badge'

// Native span with no role: slot text is the name. role=status is a live
// region; role=img would hide the text. Template comments become nodes and
// would sit beside the root, so this stays in script.
const { rootProps } = useGhostBadge()

const element = useTemplateRef<HTMLSpanElement>('element')

defineExpose<GhostBadgeExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <span ref="element" v-bind="rootProps">
    <slot />
  </span>
</template>
