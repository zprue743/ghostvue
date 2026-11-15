<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { GhostAvatarElement, GhostAvatarExposed } from './ghost-avatar'
import { useGhostAvatar } from './use-ghost-avatar'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    name?: string
    as?: GhostAvatarElement
  }>(),
  {
    as: 'span',
  },
)

const { imageProps, initials, rootProps, showFallback, showImage } =
  useGhostAvatar({
    alt: () => props.alt,
    name: () => props.name,
    src: () => props.src,
  })

const element = useTemplateRef<HTMLElement>('element')

defineExpose<GhostAvatarExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="rootProps">
    <img v-if="showImage && imageProps" v-bind="imageProps" />
    <span v-if="showFallback" data-part="fallback">
      <slot name="fallback">{{ initials }}</slot>
    </span>
  </component>
</template>
