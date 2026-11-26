<script setup lang="ts">
import {
  CHECK_ICON_PATH,
  COPY_ICON_PATH,
  COPY_ICON_RECT,
  COPY_ICON_VIEWBOX,
} from './copy-code-icon'
</script>

<template>
  <span class="ghost-copy-icon" aria-hidden="true">
    <svg
      class="ghost-copy-icon__copy"
      :viewBox="COPY_ICON_VIEWBOX"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect
        :x="COPY_ICON_RECT.x"
        :y="COPY_ICON_RECT.y"
        :width="COPY_ICON_RECT.width"
        :height="COPY_ICON_RECT.height"
        :rx="COPY_ICON_RECT.rx"
      />
      <path :d="COPY_ICON_PATH" />
    </svg>
    <svg
      class="ghost-copy-icon__check"
      :viewBox="COPY_ICON_VIEWBOX"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path :d="CHECK_ICON_PATH" />
    </svg>
  </span>
</template>
