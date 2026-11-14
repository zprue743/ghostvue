<script setup lang="ts">
import { withBase } from 'vitepress'

import type { GhostButtonVariant } from '@ghostvue/themes'

const props = withDefaults(
  defineProps<{
    href: string
    variant?: GhostButtonVariant
  }>(),
  {
    variant: 'solid',
  },
)
</script>

<template>
  <a
    :href="withBase(props.href)"
    class="ghost-landing__action-link ghost-themed-scope"
  >
    <span
      class="ghost-button"
      :data-variant="variant === 'solid' ? undefined : variant"
    >
      <slot />
    </span>
  </a>
</template>
