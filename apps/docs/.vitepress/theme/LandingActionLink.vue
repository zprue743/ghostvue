<script setup lang="ts">
import { withBase } from 'vitepress'

import type { GhostButtonSize, GhostButtonVariant } from '@ghostvue/themes'

/*
 * A navigation link drawn with the themed GhostButton recipe. GhostButton
 * always renders a native `<button>`, and a button must not be nested in a
 * link, so the recipe classes sit on a span inside a real anchor. Remove this
 * wrapper once GhostButton (or GhostLink) can render a button-styled link.
 */
const props = withDefaults(
  defineProps<{
    href: string
    variant?: GhostButtonVariant
    size?: GhostButtonSize
  }>(),
  {
    variant: 'solid',
    size: 'md',
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
      :data-size="size === 'md' ? undefined : size"
    >
      <slot />
    </span>
  </a>
</template>
