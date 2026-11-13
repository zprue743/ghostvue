<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton as GhostButtonThemed,
  GhostDialog as GhostDialogThemed,
  GhostDialogClose as GhostDialogCloseThemed,
  GhostDialogContent as GhostDialogContentThemed,
  GhostDialogDescription as GhostDialogDescriptionThemed,
  GhostDialogOverlay as GhostDialogOverlayThemed,
  GhostDialogTitle as GhostDialogTitleThemed,
  GhostDialogTrigger as GhostDialogTriggerThemed,
} from '@ghostvue/themes'
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
  GhostPortal,
} from '@ghostvue/vue'

const basicOpen = ref(false)
</script>

<template>
  <section aria-labelledby="dialog-heading" class="dialog-section">
    <h2 id="dialog-heading">GhostDialog</h2>

    <div class="dialog-row">
      <button type="button" data-testid="dialog-outside-target">
        Outside dialog button
      </button>

      <!-- Basic modal dialog -->
      <GhostDialog v-model:open="basicOpen">
        <GhostDialogTrigger data-testid="dialog-basic-trigger">
          Open basic dialog
        </GhostDialogTrigger>
        <GhostPortal>
          <div
            v-if="basicOpen"
            data-ghost-live
            data-testid="dialog-live-region"
            role="status"
            aria-live="polite"
            class="dialog-live-region"
          >
            Live status active
          </div>
        </GhostPortal>
        <GhostDialogOverlay
          data-testid="dialog-basic-overlay"
          class="dialog-demo-overlay"
        />
        <GhostDialogContent
          data-testid="dialog-basic-content"
          class="dialog-demo-surface"
        >
          <GhostDialogTitle data-testid="dialog-basic-title">
            Basic dialog
          </GhostDialogTitle>
          <GhostDialogDescription data-testid="dialog-basic-description">
            Modal dialog with trapped focus, scroll lock, and inert background.
          </GhostDialogDescription>
          <div class="dialog-actions">
            <button type="button" data-testid="dialog-basic-first">
              Primary action
            </button>
            <GhostDialogClose data-testid="dialog-basic-close">
              Close basic dialog
            </GhostDialogClose>
          </div>
        </GhostDialogContent>
      </GhostDialog>

      <!-- Guarded dialog: closeOnEscape=false & closeOnOutsideClick=false -->
      <GhostDialog>
        <GhostDialogTrigger data-testid="dialog-locked-trigger">
          Open guarded dialog
        </GhostDialogTrigger>
        <GhostDialogOverlay
          data-testid="dialog-locked-overlay"
          class="dialog-demo-overlay"
        />
        <GhostDialogContent
          data-testid="dialog-locked-content"
          class="dialog-demo-surface"
          :close-on-escape="false"
          :close-on-outside-click="false"
        >
          <GhostDialogTitle>Guarded dialog</GhostDialogTitle>
          <GhostDialogDescription>
            Requires the close button to dismiss.
          </GhostDialogDescription>
          <GhostDialogClose data-testid="dialog-locked-close">
            Acknowledge
          </GhostDialogClose>
        </GhostDialogContent>
      </GhostDialog>

      <!-- Nested modal dialogs -->
      <GhostDialog>
        <GhostDialogTrigger data-testid="dialog-nested-outer-trigger">
          Open nested outer dialog
        </GhostDialogTrigger>
        <GhostDialogOverlay
          data-testid="dialog-nested-outer-overlay"
          class="dialog-demo-overlay"
        />
        <GhostDialogContent
          data-testid="dialog-nested-outer-content"
          class="dialog-demo-surface"
        >
          <GhostDialogTitle>Outer modal dialog</GhostDialogTitle>
          <GhostDialogDescription>
            Escape closes only the topmost open modal dialog.
          </GhostDialogDescription>
          <div class="dialog-actions">
            <GhostDialog>
              <GhostDialogTrigger data-testid="dialog-nested-inner-trigger">
                Open inner dialog
              </GhostDialogTrigger>
              <GhostDialogOverlay
                data-testid="dialog-nested-inner-overlay"
                class="dialog-demo-overlay"
              />
              <GhostDialogContent
                data-testid="dialog-nested-inner-content"
                class="dialog-demo-surface"
              >
                <GhostDialogTitle>Inner modal dialog</GhostDialogTitle>
                <GhostDialogDescription>
                  Nested on top of the outer dialog.
                </GhostDialogDescription>
                <GhostDialogClose data-testid="dialog-nested-inner-close">
                  Close inner dialog
                </GhostDialogClose>
              </GhostDialogContent>
            </GhostDialog>

            <GhostDialogClose data-testid="dialog-nested-outer-close">
              Close outer dialog
            </GhostDialogClose>
          </div>
        </GhostDialogContent>
      </GhostDialog>

      <!-- Dialog hosting portaled and inline (portal=false) popovers -->
      <GhostDialog>
        <GhostDialogTrigger data-testid="dialog-popovers-trigger">
          Dialog with popovers
        </GhostDialogTrigger>
        <GhostDialogOverlay
          data-testid="dialog-popovers-overlay"
          class="dialog-demo-overlay"
        />
        <GhostDialogContent
          data-testid="dialog-popovers-content"
          class="dialog-demo-surface"
        >
          <GhostDialogTitle>Dialog with popovers</GhostDialogTitle>
          <GhostDialogDescription>
            Contains both a portaled popover and a portal=false inline popover.
          </GhostDialogDescription>
          <div class="dialog-actions">
            <button type="button" data-testid="dialog-popovers-first">
              Dialog start
            </button>

            <GhostPopover>
              <GhostPopoverTrigger data-testid="dialog-pop-portaled-trigger">
                Portaled popover
              </GhostPopoverTrigger>
              <GhostPopoverContent
                data-testid="dialog-pop-portaled-content"
                class="popover-demo-surface"
                placement="bottom-start"
                :offset="8"
              >
                <label for="dialog-pop-portaled-input">Portaled note</label>
                <input
                  id="dialog-pop-portaled-input"
                  data-testid="dialog-pop-portaled-input"
                  type="text"
                />
                <GhostPopoverClose data-testid="dialog-pop-portaled-close">
                  Close portaled
                </GhostPopoverClose>
              </GhostPopoverContent>
            </GhostPopover>

            <GhostDialogClose data-testid="dialog-popovers-close">
              Close dialog
            </GhostDialogClose>

            <GhostPopover>
              <GhostPopoverTrigger data-testid="dialog-pop-inline-trigger">
                Inline popover
              </GhostPopoverTrigger>
              <GhostPopoverContent
                data-testid="dialog-pop-inline-content"
                class="popover-demo-surface"
                :portal="false"
                placement="bottom-start"
                :offset="8"
              >
                <button type="button" data-testid="dialog-pop-inline-action">
                  Inline action
                </button>
                <GhostPopoverClose data-testid="dialog-pop-inline-close">
                  Close inline
                </GhostPopoverClose>
              </GhostPopoverContent>
            </GhostPopover>
          </div>
        </GhostDialogContent>
      </GhostDialog>

      <!-- Non-modal dialog -->
      <GhostDialog :modal="false">
        <GhostDialogTrigger data-testid="dialog-nonmodal-trigger">
          Open non-modal dialog
        </GhostDialogTrigger>
        <GhostDialogOverlay
          data-testid="dialog-nonmodal-overlay"
          class="dialog-demo-overlay"
        />
        <GhostDialogContent
          data-testid="dialog-nonmodal-content"
          class="dialog-demo-surface dialog-nonmodal-surface"
        >
          <GhostDialogTitle>Non-modal dialog</GhostDialogTitle>
          <GhostDialogDescription>
            Leaves background interactive without overlay or scroll lock.
          </GhostDialogDescription>
          <GhostDialogClose data-testid="dialog-nonmodal-close">
            Close non-modal
          </GhostDialogClose>
        </GhostDialogContent>
      </GhostDialog>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed GhostDialog</legend>
      <div class="dialog-row">
        <GhostDialogThemed>
          <GhostDialogTriggerThemed
            :as="GhostButtonThemed"
            data-testid="dialog-themed-trigger"
          >
            Themed modal dialog
          </GhostDialogTriggerThemed>
          <GhostDialogOverlayThemed
            :portal="false"
            data-testid="dialog-themed-overlay"
          />
          <GhostDialogContentThemed
            :portal="false"
            data-testid="dialog-themed-content"
          >
            <GhostDialogTitleThemed>Project settings</GhostDialogTitleThemed>
            <GhostDialogDescriptionThemed>
              Elevation-4 modal surface rendered with semantic tokens.
            </GhostDialogDescriptionThemed>
            <div class="dialog-actions">
              <GhostDialogCloseThemed
                :as="GhostButtonThemed"
                variant="outline"
                tone="neutral"
                data-testid="dialog-themed-close"
              >
                Close
              </GhostDialogCloseThemed>
            </div>
          </GhostDialogContentThemed>
        </GhostDialogThemed>

        <GhostDialogThemed>
          <GhostDialogTriggerThemed
            :as="GhostButtonThemed"
            tone="danger"
            variant="soft"
            data-testid="dialog-alert-trigger"
          >
            Delete project
          </GhostDialogTriggerThemed>
          <GhostDialogOverlayThemed
            :portal="false"
            data-testid="dialog-alert-overlay"
          />
          <GhostDialogContentThemed
            :portal="false"
            role="alertdialog"
            data-testid="dialog-alert-content"
          >
            <GhostDialogTitleThemed>Delete project?</GhostDialogTitleThemed>
            <GhostDialogDescriptionThemed>
              This action permanently removes deployment history.
            </GhostDialogDescriptionThemed>
            <div class="dialog-actions">
              <GhostDialogCloseThemed
                :as="GhostButtonThemed"
                variant="outline"
                tone="neutral"
                data-testid="dialog-alert-cancel"
              >
                Cancel
              </GhostDialogCloseThemed>
              <GhostDialogCloseThemed
                :as="GhostButtonThemed"
                tone="danger"
                data-testid="dialog-alert-confirm"
              >
                Delete
              </GhostDialogCloseThemed>
            </div>
          </GhostDialogContentThemed>
        </GhostDialogThemed>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.dialog-section {
  display: grid;
  gap: 1rem;
  margin-block: 1.5rem;
}

.dialog-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

:global(.dialog-demo-overlay) {
  background: rgb(0 0 0 / 0.5);
  inset: 0;
  position: fixed;
  z-index: 50;
}

:global(.dialog-demo-surface) {
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

:global(.dialog-nonmodal-surface) {
  inset-block-start: 1rem;
  inset-inline-start: auto;
  inset-inline-end: 1rem;
  transform: none;
}

:global(.dialog-live-region) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  inset-block-end: 1rem;
  inset-inline-end: 1rem;
  padding: 0.5rem 0.75rem;
  position: fixed;
  z-index: 60;
}
</style>
