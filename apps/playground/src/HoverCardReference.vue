<script setup lang="ts">
import {
  GhostHoverCard as GhostHoverCardThemed,
  GhostHoverCardContent as GhostHoverCardContentThemed,
  GhostHoverCardTrigger as GhostHoverCardTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <section aria-labelledby="hover-card-lab-heading" class="hover-card-section">
    <h2 id="hover-card-lab-heading">GhostHoverCard interaction lab</h2>

    <p data-testid="hover-card-lab-status">
      Awaiting pointer or focus on triggers.
    </p>

    <div class="hover-card-row">
      <GhostHoverCard
        :open-delay="200"
        :close-delay="100"
        data-testid="hover-card-delay-root"
      >
        <GhostHoverCardTrigger data-testid="hover-card-delay-trigger">
          @ghost-preview
        </GhostHoverCardTrigger>
        <GhostHoverCardContent
          data-testid="hover-card-delay-content"
          class="hover-card-demo-surface"
          :offset="8"
        >
          <p>Opens after the configured hover/focus delay.</p>
          <a href="#" data-testid="hover-card-delay-link">Follow profile</a>
        </GhostHoverCardContent>
      </GhostHoverCard>

      <GhostHoverCard :open-delay="0" data-testid="hover-card-disabled-root">
        <GhostHoverCardTrigger
          data-testid="hover-card-disabled-trigger"
          disabled
        >
          Disabled trigger (no card)
        </GhostHoverCardTrigger>
        <GhostHoverCardContent data-testid="hover-card-disabled-content">
          Should stay hidden.
        </GhostHoverCardContent>
      </GhostHoverCard>

      <button type="button" data-testid="hover-card-escape-target">
        After Escape focus me
      </button>
    </div>

    <div
      class="hover-card-offset-parent"
      data-testid="hover-card-inline-parent"
    >
      <GhostHoverCard :open-delay="0" :close-delay="0">
        <GhostHoverCardTrigger data-testid="hover-card-inline-trigger">
          Inline portal-off sample
        </GhostHoverCardTrigger>
        <GhostHoverCardContent
          data-testid="hover-card-inline-content"
          class="hover-card-demo-surface"
          placement="top"
          :portal="false"
          :offset="6"
        >
          Renders inside the offset parent without teleporting.
        </GhostHoverCardContent>
      </GhostHoverCard>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed hover card chip</legend>
      <GhostHoverCardThemed :open-delay="0">
        <GhostHoverCardTriggerThemed data-testid="hover-card-themed-trigger">
          Themed density preview
        </GhostHoverCardTriggerThemed>
        <GhostHoverCardContentThemed data-testid="hover-card-themed-content">
          Elevation-3 surface from @ghostvue/themes.
        </GhostHoverCardContentThemed>
      </GhostHoverCardThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.hover-card-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hover-card-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.hover-card-offset-parent {
  position: relative;
  padding: 3rem;
  border: 1px dashed currentColor;
}

:global(.hover-card-demo-surface) {
  max-width: 16rem;
}
</style>
