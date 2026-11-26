<script setup lang="ts">
import {
  GhostScrollSpy,
  GhostScrollSpyItem,
  GhostScrollSpyLink,
  GhostScrollSpyList,
} from '@ghostvue/themes'
</script>

<template>
  <div
    class="ghost-theme scroll-spy-themed"
    data-testid="scroll-spy-themed-page"
  >
    <GhostScrollSpy
      label="Sections"
      class="scroll-spy-themed__nav"
      data-testid="scroll-spy-themed"
    >
      <GhostScrollSpyList>
        <GhostScrollSpyItem>
          <GhostScrollSpyLink target="themed-one">One</GhostScrollSpyLink>
        </GhostScrollSpyItem>
        <GhostScrollSpyItem>
          <GhostScrollSpyLink target="themed-two">Two</GhostScrollSpyLink>
        </GhostScrollSpyItem>
      </GhostScrollSpyList>
    </GhostScrollSpy>
    <div class="scroll-spy-themed__main">
      <section id="themed-one" tabindex="-1" class="scroll-spy-themed__section">
        <h2>Section one</h2>
        <p v-for="index in 10" :key="index">Themed demo content {{ index }}.</p>
      </section>
      <section id="themed-two" tabindex="-1" class="scroll-spy-themed__section">
        <h2>Section two</h2>
        <p v-for="index in 10" :key="index">
          More themed demo content {{ index }}.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scroll-spy-themed {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 10rem minmax(0, 1fr);
}

.scroll-spy-themed__nav {
  inset-block-start: 1rem;
  position: sticky;
}

.scroll-spy-themed__section {
  min-block-size: 75vh;
}
</style>
