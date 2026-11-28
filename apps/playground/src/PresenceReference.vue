<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import {
  GhostButton as GhostButtonThemed,
  GhostDialog as GhostDialogThemed,
  GhostDialogClose as GhostDialogCloseThemed,
  GhostDialogContent as GhostDialogContentThemed,
  GhostDialogDescription as GhostDialogDescriptionThemed,
  GhostDialogOverlay as GhostDialogOverlayThemed,
  GhostDialogTitle as GhostDialogTitleThemed,
  GhostDialogTrigger as GhostDialogTriggerThemed,
  GhostPopover as GhostPopoverThemed,
  GhostPopoverClose as GhostPopoverCloseThemed,
  GhostPopoverContent as GhostPopoverContentThemed,
  GhostPopoverTrigger as GhostPopoverTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
  GhostPresence,
} from '@ghostvue/vue'

// Overlay exit presence fixtures (presence spec test matrix). Themed parts
// portal into a `.ghost-theme` layer so tokens resolve while the content
// still lives outside the trigger subtree; the browser specs shorten or
// lengthen durations with injected styles.
// The layer is passed as an element, not a selector: a selector would be
// resolved while this section is still detached during the initial mount.
// The fixture shares the playground home, so its counters are plain spans:
// `<output>` would add implicit `status` roles that other sections' specs
// count, and the oversized under-control is capped to the viewport so the
// page keeps its no-horizontal-overflow contract at 320px.
const portalLayer = useTemplateRef<HTMLElement>('portal-layer')
const mounted = ref(true)
const pageClicks = ref(0)
const underClicks = ref(0)
const panelOpen = ref(false)
const panelExits = ref(0)
</script>

<template>
  <section
    class="presence-reference"
    aria-labelledby="presence-reference-heading"
    data-testid="presence-reference"
  >
    <h2 id="presence-reference-heading">Overlay exit presence</h2>

    <div
      id="presence-portal-layer"
      ref="portal-layer"
      class="ghost-theme"
      data-ghost-mode="light"
    ></div>

    <div class="presence-reference__controls">
      <button
        type="button"
        data-testid="presence-page-button"
        @click="pageClicks += 1"
      >
        Page action
      </button>
      <span data-testid="presence-page-count">{{ pageClicks }}</span>
      <label>
        <input
          v-model="mounted"
          type="checkbox"
          data-testid="presence-mount-toggle"
        />
        Mount overlay fixtures
      </label>
    </div>

    <div v-if="mounted" class="ghost-theme presence-reference__fixtures">
      <GhostDialogThemed>
        <GhostDialogTriggerThemed
          :as="GhostButtonThemed"
          data-testid="presence-dialog-trigger"
        >
          Themed modal dialog
        </GhostDialogTriggerThemed>
        <GhostDialogOverlayThemed
          :portal-to="portalLayer"
          data-testid="presence-dialog-overlay"
        />
        <GhostDialogContentThemed
          :portal-to="portalLayer"
          data-testid="presence-dialog-content"
        >
          <GhostDialogTitleThemed>Archive workspace</GhostDialogTitleThemed>
          <GhostDialogDescriptionThemed>
            Archived workspaces stay readable for 30 days.
          </GhostDialogDescriptionThemed>
          <div class="presence-reference__row">
            <GhostButtonThemed data-testid="presence-dialog-first">
              Archive
            </GhostButtonThemed>
            <GhostPopoverThemed>
              <GhostPopoverTriggerThemed
                :as="GhostButtonThemed"
                variant="outline"
                tone="neutral"
                data-testid="presence-nested-trigger"
              >
                Retention details
              </GhostPopoverTriggerThemed>
              <GhostPopoverContentThemed
                :portal-to="portalLayer"
                data-testid="presence-nested-content"
              >
                <p>Retention follows the workspace plan.</p>
                <GhostPopoverCloseThemed
                  :as="GhostButtonThemed"
                  variant="outline"
                  tone="neutral"
                >
                  Got it
                </GhostPopoverCloseThemed>
              </GhostPopoverContentThemed>
            </GhostPopoverThemed>
            <GhostDialogCloseThemed
              :as="GhostButtonThemed"
              variant="outline"
              tone="neutral"
              data-testid="presence-dialog-close"
            >
              Cancel
            </GhostDialogCloseThemed>
          </div>
        </GhostDialogContentThemed>
      </GhostDialogThemed>

      <div class="presence-reference__stack">
        <GhostPopoverThemed>
          <GhostPopoverTriggerThemed
            :as="GhostButtonThemed"
            data-testid="presence-popover-trigger"
          >
            Themed popover
          </GhostPopoverTriggerThemed>
          <GhostPopoverContentThemed
            :portal-to="portalLayer"
            placement="bottom-start"
            :offset="4"
            :flip="false"
            data-testid="presence-popover-content"
          >
            <label for="presence-popover-name">Display name</label>
            <input
              id="presence-popover-name"
              type="text"
              data-testid="presence-popover-input"
            />
            <GhostPopoverCloseThemed
              :as="GhostButtonThemed"
              variant="outline"
              tone="neutral"
            >
              Done
            </GhostPopoverCloseThemed>
          </GhostPopoverContentThemed>
        </GhostPopoverThemed>
        <!-- Sits under the open popover so pass-through clicks are observable. -->
        <button
          type="button"
          class="presence-reference__under"
          data-testid="presence-popover-under"
          @click="underClicks += 1"
        >
          Underlying control
          <span data-testid="presence-popover-under-count">{{
            underClicks
          }}</span>
        </button>
      </div>

      <div class="presence-reference__row">
        <GhostDialogThemed>
          <GhostDialogTriggerThemed
            :as="GhostButtonThemed"
            variant="outline"
            tone="neutral"
            data-testid="presence-inline-dialog-trigger"
          >
            Inline dialog
          </GhostDialogTriggerThemed>
          <GhostDialogOverlayThemed
            :portal="false"
            data-testid="presence-inline-dialog-overlay"
          />
          <GhostDialogContentThemed
            :portal="false"
            data-testid="presence-inline-dialog-content"
          >
            <GhostDialogTitleThemed>Inline dialog</GhostDialogTitleThemed>
            <GhostDialogCloseThemed :as="GhostButtonThemed">
              Close
            </GhostDialogCloseThemed>
          </GhostDialogContentThemed>
        </GhostDialogThemed>

        <GhostPopoverThemed>
          <GhostPopoverTriggerThemed
            :as="GhostButtonThemed"
            variant="outline"
            tone="neutral"
            data-testid="presence-inline-popover-trigger"
          >
            Inline popover
          </GhostPopoverTriggerThemed>
          <GhostPopoverContentThemed
            :portal="false"
            data-testid="presence-inline-popover-content"
          >
            <GhostPopoverCloseThemed :as="GhostButtonThemed">
              Close
            </GhostPopoverCloseThemed>
          </GhostPopoverContentThemed>
        </GhostPopoverThemed>
      </div>
    </div>

    <!-- Headless parts: no theme CSS, so exits are instant unless a test adds motion. -->
    <div class="presence-reference__row">
      <GhostDialog>
        <GhostDialogTrigger data-testid="presence-headless-dialog-trigger">
          Headless dialog
        </GhostDialogTrigger>
        <GhostDialogOverlay
          class="presence-reference__scrim"
          data-testid="presence-headless-dialog-overlay"
        />
        <GhostDialogContent
          class="presence-reference__surface presence-reference__surface--centered"
          data-testid="presence-headless-dialog-content"
        >
          <GhostDialogTitle>Headless dialog</GhostDialogTitle>
          <GhostDialogClose>Close</GhostDialogClose>
        </GhostDialogContent>
      </GhostDialog>

      <GhostPopover>
        <GhostPopoverTrigger data-testid="presence-headless-popover-trigger">
          Headless popover
        </GhostPopoverTrigger>
        <GhostPopoverContent
          class="presence-reference__surface"
          data-testid="presence-headless-popover-content"
        >
          <GhostPopoverClose>Close</GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>

      <button
        type="button"
        data-testid="presence-panel-toggle"
        :aria-expanded="panelOpen"
        aria-controls="presence-panel"
        @click="panelOpen = !panelOpen"
      >
        Toggle panel
      </button>
      <GhostPresence :present="panelOpen" @exit-complete="panelExits += 1">
        <aside
          id="presence-panel"
          class="presence-reference__panel"
          aria-label="Presence panel"
          data-testid="presence-panel"
        >
          <button type="button">Panel action</button>
        </aside>
      </GhostPresence>
      <span data-testid="presence-panel-exits">{{ panelExits }}</span>
    </div>
  </section>
</template>

<style scoped>
.presence-reference {
  display: grid;
  gap: 1rem;
}

.presence-reference__controls,
.presence-reference__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.presence-reference__fixtures {
  display: grid;
  gap: 1rem;
  padding: 0.5rem;
}

.presence-reference__stack {
  display: grid;
  gap: 0.25rem;
  justify-items: start;
}

.presence-reference__under {
  block-size: 12rem;
  inline-size: min(calc(100vw - 2rem), 24rem);
}

.presence-reference__scrim {
  background: color-mix(in srgb, CanvasText 30%, transparent);
  inset: 0;
  position: fixed;
  z-index: 50;
}

.presence-reference__surface {
  background: Canvas;
  border: 1px solid CanvasText;
  color: CanvasText;
  padding: 0.75rem;
  z-index: 51;
}

.presence-reference__surface--centered {
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
}

.presence-reference__panel {
  border: 1px solid GrayText;
  padding: 0.5rem;
  transition: opacity 200ms ease;

  @starting-style {
    opacity: 0;
  }
}

.presence-reference__panel[data-state='closed'] {
  opacity: 0;
}
</style>
