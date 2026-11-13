<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import {
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
  GhostPortal,
  useDismissableLayer,
  useFocusScope,
} from '@ghostvue/vue'

import { useInertOthers } from '../../../packages/vue/src/use-inert-others'
import { useScrollLock } from '../../../packages/vue/src/use-scroll-lock'

const modalOpen = ref(false)
const openTrigger = useTemplateRef<HTMLButtonElement>('open-trigger')
const modalSurface = useTemplateRef<HTMLElement>('modal-surface')

function closeModal(): void {
  modalOpen.value = false
}

useScrollLock(modalOpen)
useInertOthers(modalSurface, modalOpen)
useDismissableLayer(modalSurface, {
  onDismiss: closeModal,
  ignore: openTrigger,
})
useFocusScope(modalSurface, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})
</script>

<template>
  <section
    aria-labelledby="modal-primitives-heading"
    class="modal-primitives-section"
  >
    <h2 id="modal-primitives-heading">Modal primitives</h2>
    <button
      ref="open-trigger"
      type="button"
      data-testid="modal-fixture-open"
      @click="modalOpen = true"
    >
      Open modal fixture
    </button>

    <GhostPortal>
      <div
        v-if="modalOpen"
        data-ghost-live
        data-testid="modal-fixture-live"
        role="status"
        aria-live="polite"
        class="modal-fixture-live"
      >
        Live notifications stay active
      </div>
    </GhostPortal>

    <GhostPortal>
      <div
        v-if="modalOpen"
        ref="modal-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-fixture-title"
        tabindex="-1"
        data-testid="modal-fixture-surface"
        class="modal-fixture-surface"
      >
        <h3 id="modal-fixture-title">Modal primitives fixture</h3>
        <button type="button" data-testid="modal-fixture-first">
          Modal first
        </button>

        <GhostPopover>
          <GhostPopoverTrigger data-testid="modal-popover-trigger">
            Open modal popover
          </GhostPopoverTrigger>
          <GhostPopoverContent
            data-testid="modal-popover-content"
            class="popover-demo-surface"
            placement="bottom-start"
            :offset="8"
          >
            <label for="modal-popover-note">Popover note</label>
            <input
              id="modal-popover-note"
              data-testid="modal-popover-input"
              type="text"
            />
            <button type="button" data-testid="modal-popover-action">
              Popover action
            </button>
            <GhostPopoverClose data-testid="modal-popover-close">
              Close popover
            </GhostPopoverClose>
          </GhostPopoverContent>
        </GhostPopover>

        <button
          type="button"
          data-testid="modal-fixture-close"
          @click="closeModal"
        >
          Close modal
        </button>
      </div>
    </GhostPortal>
  </section>
</template>

<style scoped>
.modal-primitives-section {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  margin-block: 1.5rem;
}

:global(.modal-fixture-surface) {
  background: #ffffff;
  border: 2px solid #111827;
  color: #111827;
  display: grid;
  gap: 0.75rem;
  inset-block-start: 4rem;
  inset-inline: 1rem;
  margin-inline: auto;
  max-inline-size: 24rem;
  padding: 1rem;
  position: fixed;
  z-index: 900;
}

:global(.modal-fixture-live) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  inset-block-end: 1rem;
  inset-inline-end: 1rem;
  padding: 0.5rem 0.75rem;
  position: fixed;
  z-index: 950;
}
</style>
