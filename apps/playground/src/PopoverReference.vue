<script setup lang="ts">
import {
  GhostButton as GhostButtonThemed,
  GhostPopover as GhostPopoverThemed,
  GhostPopoverClose as GhostPopoverCloseThemed,
  GhostPopoverContent as GhostPopoverContentThemed,
  GhostPopoverTrigger as GhostPopoverTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <section aria-labelledby="popover-heading" class="popover-section">
    <h2 id="popover-heading">GhostPopover</h2>

    <div class="popover-row">
      <GhostPopover>
        <GhostPopoverTrigger data-testid="popover-basic-trigger">
          Basic popover
        </GhostPopoverTrigger>
        <GhostPopoverContent
          data-testid="popover-basic-content"
          class="popover-demo-surface"
          :offset="8"
        >
          <label for="popover-basic-note">Note</label>
          <input
            id="popover-basic-note"
            data-testid="popover-basic-input"
            type="text"
          />
          <GhostPopoverClose data-testid="popover-basic-close">
            Close basic
          </GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>

      <button type="button" data-testid="popover-outside-target">
        Outside control
      </button>

      <GhostPopover>
        <GhostPopoverTrigger data-testid="popover-flip-trigger">
          Edge flip popover
        </GhostPopoverTrigger>
        <GhostPopoverContent
          data-testid="popover-flip-content"
          class="popover-demo-surface popover-flip-box"
          placement="bottom"
          :offset="8"
          :flip="{ padding: 8 }"
          :shift="{ padding: 8 }"
        >
          <p>Flips above trigger near viewport bottom.</p>
          <GhostPopoverClose>Close flip</GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>

      <GhostPopover>
        <GhostPopoverTrigger data-testid="popover-nested-outer-trigger">
          Nested outer popover
        </GhostPopoverTrigger>
        <GhostPopoverContent
          data-testid="popover-nested-outer-content"
          class="popover-demo-surface"
          placement="bottom-start"
          :offset="8"
        >
          <p data-testid="popover-nested-outer-body">Outer popover panel</p>
          <GhostPopover>
            <GhostPopoverTrigger data-testid="popover-nested-inner-trigger">
              Open inner popover
            </GhostPopoverTrigger>
            <GhostPopoverContent
              data-testid="popover-nested-inner-content"
              class="popover-demo-surface"
              placement="bottom-start"
              :offset="8"
            >
              <p>Inner popover panel</p>
              <GhostPopoverClose data-testid="popover-nested-inner-close">
                Close inner
              </GhostPopoverClose>
            </GhostPopoverContent>
          </GhostPopover>
          <GhostPopoverClose data-testid="popover-nested-outer-close">
            Close outer
          </GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>
    </div>

    <div class="popover-offset-parent" data-testid="popover-offset-parent">
      <GhostPopover>
        <GhostPopoverTrigger data-testid="popover-offset-trigger">
          Offset parent popover
        </GhostPopoverTrigger>
        <GhostPopoverContent
          data-testid="popover-offset-content"
          class="popover-demo-surface"
          placement="bottom"
          :offset="10"
          :flip="false"
          :shift="false"
          :portal="false"
        >
          <p>Inline content inside an offset position:relative parent.</p>
          <GhostPopoverClose>Close offset</GhostPopoverClose>
        </GhostPopoverContent>
      </GhostPopover>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed GhostPopover</legend>
      <GhostPopoverThemed>
        <GhostPopoverTriggerThemed
          :as="GhostButtonThemed"
          variant="outline"
          data-testid="popover-themed-trigger"
        >
          Themed popover
        </GhostPopoverTriggerThemed>
        <GhostPopoverContentThemed
          data-testid="popover-themed-content"
          :offset="8"
          :portal="false"
        >
          <p>Elevated surface using semantic --ghost-* tokens.</p>
          <GhostPopoverCloseThemed
            :as="GhostButtonThemed"
            variant="soft"
            tone="neutral"
            size="sm"
          >
            Done
          </GhostPopoverCloseThemed>
        </GhostPopoverContentThemed>
      </GhostPopoverThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.popover-section {
  display: grid;
  gap: 1rem;
  margin-block: 1.5rem;
}

.popover-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.popover-offset-parent {
  border: 1px dashed #767676;
  inset-block-start: 0.75rem;
  inset-inline-start: 1.5rem;
  margin-block-end: 1.5rem;
  max-inline-size: calc(100% - 1.5rem);
  padding: 1.25rem;
  position: relative;
}

:global(.popover-demo-surface) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem;
  z-index: 1000;
}

:global(.popover-flip-box) {
  block-size: 8rem;
  inline-size: 12rem;
}
</style>
