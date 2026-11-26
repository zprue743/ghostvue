<script setup lang="ts">
import {
  GhostScrollSpy,
  GhostScrollSpyItem,
  GhostScrollSpyLink,
  GhostScrollSpyList,
} from '@ghostvue/vue'
</script>

<template>
  <div class="scroll-spy-basic" data-testid="scroll-spy-basic-page">
    <GhostScrollSpy
      label="On this page"
      class="scroll-spy-basic__nav"
      data-testid="scroll-spy-basic"
    >
      <GhostScrollSpyList>
        <GhostScrollSpyItem>
          <GhostScrollSpyLink
            target="scroll-spy-intro"
            data-testid="link-intro"
          >
            Introduction
          </GhostScrollSpyLink>
        </GhostScrollSpyItem>
        <GhostScrollSpyItem>
          <GhostScrollSpyLink
            target="scroll-spy-details"
            data-testid="link-details"
          >
            Details
          </GhostScrollSpyLink>
        </GhostScrollSpyItem>
        <GhostScrollSpyItem>
          <GhostScrollSpyLink
            target="scroll-spy-summary"
            data-testid="link-summary"
          >
            Summary
          </GhostScrollSpyLink>
        </GhostScrollSpyItem>
      </GhostScrollSpyList>
    </GhostScrollSpy>
    <main class="scroll-spy-basic__main">
      <section
        id="scroll-spy-intro"
        tabindex="-1"
        class="scroll-spy-basic__section"
      >
        <h2>Introduction</h2>
        <p v-for="index in 6" :key="index">
          Intro paragraph {{ index }} with enough copy to scroll this demo page.
        </p>
      </section>
      <section
        id="scroll-spy-details"
        tabindex="-1"
        class="scroll-spy-basic__section"
      >
        <h2>Details</h2>
        <p v-for="index in 8" :key="index">
          Details paragraph {{ index }} describing implementation notes.
        </p>
      </section>
      <section
        id="scroll-spy-summary"
        tabindex="-1"
        class="scroll-spy-basic__section"
      >
        <h2>Summary</h2>
        <p v-for="index in 4" :key="index">
          Summary paragraph {{ index }} wrapping up the scroll-spy walkthrough.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.scroll-spy-basic {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr) 12rem;
}

.scroll-spy-basic__nav {
  inset-block-start: 1rem;
  position: sticky;
}

.scroll-spy-basic__main {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.scroll-spy-basic__section {
  min-block-size: 70vh;
}
</style>
