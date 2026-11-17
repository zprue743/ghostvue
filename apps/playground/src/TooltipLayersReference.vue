<script setup lang="ts">
import {
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/vue'
import { ref } from 'vue'

// Exercises tooltips nested in other dismissable layers: one `Escape` must
// close only the topmost overlay, and an open tooltip must not block
// outside-pointer dismissal of the dialog or popover beneath it.
const dialogOpen = ref(false)
const portalTipOpen = ref(false)
</script>

<template>
  <section
    aria-labelledby="tooltip-layers-heading"
    class="tooltip-layers-section"
  >
    <h2 id="tooltip-layers-heading">GhostTooltip in overlay layers</h2>

    <p data-testid="tooltip-layers-status">
      Dialog {{ dialogOpen ? 'open' : 'closed' }}; controlled tooltip
      {{ portalTipOpen ? 'open' : 'closed' }}.
    </p>

    <div class="tooltip-layers-row">
      <GhostDialog v-model:open="dialogOpen">
        <GhostDialogTrigger data-testid="tooltip-layers-dialog-trigger">
          Open dialog with tooltips
        </GhostDialogTrigger>
        <GhostDialogOverlay
          data-testid="tooltip-layers-dialog-overlay"
          class="tooltip-layers-overlay"
        />
        <GhostDialogContent
          data-testid="tooltip-layers-dialog-content"
          class="tooltip-layers-dialog"
        >
          <GhostDialogTitle>Diagnostics</GhostDialogTitle>
          <GhostDialogDescription>
            Each tooltip closes on its own before the dialog.
          </GhostDialogDescription>
          <div class="tooltip-layers-actions">
            <GhostTooltip
              v-model:open="portalTipOpen"
              :delay-duration="0"
              :close-delay="1000"
            >
              <GhostTooltipTrigger data-testid="tooltip-layers-portal-trigger">
                Portaled hint
              </GhostTooltipTrigger>
              <GhostTooltipContent
                data-testid="tooltip-layers-portal-content"
                class="tooltip-layers-surface"
                :offset="6"
              >
                Teleported to the document body.
              </GhostTooltipContent>
            </GhostTooltip>

            <GhostTooltip :delay-duration="0" :close-delay="0">
              <GhostTooltipTrigger data-testid="tooltip-layers-inline-trigger">
                Inline hint
              </GhostTooltipTrigger>
              <GhostTooltipContent
                data-testid="tooltip-layers-inline-content"
                class="tooltip-layers-surface"
                :portal="false"
                :offset="6"
              >
                Rendered inside the dialog.
              </GhostTooltipContent>
            </GhostTooltip>

            <GhostDialogClose data-testid="tooltip-layers-dialog-close">
              Close diagnostics
            </GhostDialogClose>
          </div>
        </GhostDialogContent>
      </GhostDialog>

      <GhostPopover>
        <GhostPopoverTrigger data-testid="tooltip-layers-popover-trigger">
          Open popover with tooltip
        </GhostPopoverTrigger>
        <GhostPopoverContent
          data-testid="tooltip-layers-popover-content"
          class="tooltip-layers-popover"
          :offset="8"
        >
          <GhostTooltip :delay-duration="0" :close-delay="1000">
            <GhostTooltipTrigger
              data-testid="tooltip-layers-popover-tip-trigger"
            >
              Popover hint
            </GhostTooltipTrigger>
            <GhostTooltipContent
              data-testid="tooltip-layers-popover-tip-content"
              class="tooltip-layers-surface"
              placement="bottom"
              :offset="6"
            >
              Tooltip above the popover layer.
            </GhostTooltipContent>
          </GhostTooltip>
          <GhostPopoverClose>Close popover</GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>

      <button type="button" data-testid="tooltip-layers-outside">
        Outside layers
      </button>
    </div>
  </section>
</template>

<style scoped>
.tooltip-layers-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-block: 2rem;
}

.tooltip-layers-row,
.tooltip-layers-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

:global(.tooltip-layers-overlay) {
  background: rgb(0 0 0 / 0.5);
  inset: 0;
  position: fixed;
  z-index: 50;
}

:global(.tooltip-layers-dialog) {
  background: #ffffff;
  border: 2px solid #111827;
  color: #111827;
  display: grid;
  gap: 0.75rem;
  inline-size: min(calc(100vw - 2rem), 28rem);
  inset-block-start: 50%;
  inset-inline-start: 50%;
  padding: 1.25rem;
  position: fixed;
  transform: translate(-50%, -50%);
  z-index: 50;
}

:global(.tooltip-layers-popover) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem;
  z-index: 1000;
}

:global(.tooltip-layers-surface) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  max-width: 16rem;
  padding: 0.5rem 0.75rem;
  z-index: 1100;
}
</style>
