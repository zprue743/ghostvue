<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'

/**
 * Canvas placeholder while a demo chunk loads or after it fails, so the
 * preview never shows an unexplained empty box.
 */
defineProps<{
  state: 'loading' | 'error'
}>()

function reloadPage(): void {
  window.location.reload()
}
</script>

<template>
  <!--
    `role="status"` is polite: loading is announced once, without stealing
    focus. The failure text stays in the same live region so it is announced
    when it replaces the loading message.
  -->
  <div class="ghost-example__status" role="status" :data-state="state">
    <template v-if="state === 'loading'">Loading example…</template>
    <template v-else>
      <span>
        This example could not load. The site may have been updated since the
        page opened.
      </span>
      <GhostButton
        type="button"
        size="sm"
        variant="outline"
        tone="neutral"
        @click="reloadPage"
      >
        Reload page
      </GhostButton>
    </template>
  </div>
</template>
