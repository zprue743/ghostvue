<script setup lang="ts">
import {
  GhostScrollSpy,
  GhostScrollSpyItem,
  GhostScrollSpyLink,
  GhostScrollSpyList,
} from '@ghostvue/vue'
</script>

<template>
  <div class="scroll-spy-composable" data-testid="scroll-spy-composable">
    <GhostScrollSpy
      v-slot="{ activeId, scrollTo }"
      label="Custom layout"
      class="vp-raw"
    >
      <p class="scroll-spy-composable__status">
        Active section:
        <strong>{{ activeId ?? '—' }}</strong>
      </p>
      <GhostScrollSpyList class="scroll-spy-composable__list">
        <GhostScrollSpyItem v-for="id in ['custom-a', 'custom-b']" :key="id">
          <GhostScrollSpyLink :target="id">
            {{ id }}
          </GhostScrollSpyLink>
          <button type="button" @click="scrollTo(id, { focus: true })">
            Jump
          </button>
        </GhostScrollSpyItem>
      </GhostScrollSpyList>
    </GhostScrollSpy>
    <div class="scroll-spy-composable__main">
      <section
        v-for="id in ['custom-a', 'custom-b']"
        :id="id"
        :key="id"
        tabindex="-1"
        class="scroll-spy-composable__section"
      >
        <h2>{{ id }}</h2>
        <p v-for="index in 8" :key="index">Section content {{ index }}.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scroll-spy-composable {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 14rem minmax(0, 1fr);
}

.scroll-spy-composable__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scroll-spy-composable__section {
  min-block-size: 65vh;
}
</style>
