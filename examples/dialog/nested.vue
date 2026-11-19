<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  type GhostDialogCloseExposed,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
} from '@ghostvue/themes'

// The share link is local state, so revoking it is a visible, repeatable result.
const linkActive = ref(true)
const confirmOpen = ref(false)
const done = ref<GhostDialogCloseExposed | null>(null)

/*
 * Revoking disables the inner dialog's opener, so focus cannot go back to it.
 * Send it to Done instead; returning null keeps the default (the opener).
 */
function revokeReturnFocus(): HTMLElement | null {
  return linkActive.value ? null : (done.value?.element ?? null)
}

function revoke(): void {
  linkActive.value = false
  confirmOpen.value = false
}
</script>

<template>
  <GhostDialog>
    <GhostDialogTrigger :as="GhostButton" variant="outline">
      Share report
    </GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Share Q3 revenue report</GhostDialogTitle>
      <GhostDialogDescription>
        Pressing Escape while the confirmation is open closes only the inner
        dialog.
      </GhostDialogDescription>
      <p class="share-status" role="status">
        {{ linkActive ? 'Anyone with the link can view.' : 'Link revoked.' }}
      </p>
      <div class="share-actions">
        <GhostDialog v-model:open="confirmOpen">
          <GhostDialogTrigger
            :as="GhostButton"
            variant="soft"
            tone="danger"
            :disabled="!linkActive"
          >
            Revoke link
          </GhostDialogTrigger>
          <GhostDialogOverlay />
          <GhostDialogContent
            role="alertdialog"
            :return-focus="revokeReturnFocus"
          >
            <GhostDialogTitle>Revoke the share link?</GhostDialogTitle>
            <GhostDialogDescription>
              People who open the old link will see an access request page.
            </GhostDialogDescription>
            <div class="share-actions">
              <GhostDialogClose :as="GhostButton" variant="soft" tone="neutral">
                Keep link
              </GhostDialogClose>
              <GhostButton tone="danger" @click="revoke">Revoke</GhostButton>
            </div>
          </GhostDialogContent>
        </GhostDialog>

        <GhostDialogClose ref="done" :as="GhostButton">Done</GhostDialogClose>
      </div>
    </GhostDialogContent>
  </GhostDialog>
</template>

<style scoped>
.share-status {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
