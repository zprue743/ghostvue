<script setup lang="ts">
import {
  GhostTooltip as GhostTooltipThemed,
  GhostTooltipContent as GhostTooltipContentThemed,
  GhostTooltipTrigger as GhostTooltipTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <section aria-labelledby="tooltip-lab-heading" class="tooltip-section">
    <h2 id="tooltip-lab-heading">GhostTooltip interaction lab</h2>

    <p data-testid="tooltip-lab-status">
      Awaiting pointer or focus on triggers.
    </p>

    <div class="tooltip-row">
      <GhostTooltip
        :delay-duration="200"
        :close-delay="100"
        data-testid="tooltip-delay-root"
      >
        <GhostTooltipTrigger data-testid="tooltip-delay-trigger">
          Delayed glossary term
        </GhostTooltipTrigger>
        <GhostTooltipContent
          data-testid="tooltip-delay-content"
          class="tooltip-demo-surface"
          :offset="8"
        >
          Opens after the configured hover/focus delay.
        </GhostTooltipContent>
      </GhostTooltip>

      <GhostTooltip
        :delay-duration="0"
        :disable-hoverable-content="true"
        data-testid="tooltip-instant-root"
      >
        <GhostTooltipTrigger data-testid="tooltip-instant-trigger" disabled>
          Disabled trigger (no tooltip)
        </GhostTooltipTrigger>
        <GhostTooltipContent data-testid="tooltip-instant-content">
          Should stay hidden.
        </GhostTooltipContent>
      </GhostTooltip>

      <button type="button" data-testid="tooltip-escape-target">
        After Escape focus me
      </button>
    </div>

    <div class="tooltip-offset-parent" data-testid="tooltip-inline-parent">
      <GhostTooltip :delay-duration="0" :close-delay="0">
        <GhostTooltipTrigger data-testid="tooltip-inline-trigger">
          Inline portal-off sample
        </GhostTooltipTrigger>
        <GhostTooltipContent
          data-testid="tooltip-inline-content"
          class="tooltip-demo-surface"
          placement="top"
          :portal="false"
          :offset="6"
        >
          Renders inside the offset parent without teleporting.
        </GhostTooltipContent>
      </GhostTooltip>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed tooltip chip</legend>
      <GhostTooltipThemed :delay-duration="0">
        <GhostTooltipTriggerThemed data-testid="tooltip-themed-trigger">
          Themed density hint
        </GhostTooltipTriggerThemed>
        <GhostTooltipContentThemed
          data-testid="tooltip-themed-content"
          placement="top"
          :offset="8"
        >
          Comfortable row height adds vertical padding to table cells.
        </GhostTooltipContentThemed>
      </GhostTooltipThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.tooltip-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-block: 2rem;
}

.tooltip-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.tooltip-offset-parent {
  position: relative;
  width: fit-content;
}

.tooltip-demo-surface {
  background: var(--ghost-surface-bg, canvas);
  border: 1px solid currentColor;
  max-width: 16rem;
  padding: 0.5rem 0.75rem;
}
</style>
