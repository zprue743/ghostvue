<script setup lang="ts">
const elevations = [0, 1, 2, 3, 4, 5] as const
</script>

<template>
  <section
    class="visual-reference"
    aria-labelledby="visual-reference-heading"
    data-testid="visual-reference"
  >
    <h2 id="visual-reference-heading">Elevation, materials, and gradients</h2>
    <p>
      Semantic recipes from
      <code>data-elevation</code>, <code>data-material</code>, and
      <code>data-gradient</code>. Light and dark use nested
      <code>data-sl-mode</code>.
    </p>

    <div class="mode-grid">
      <div
        v-for="mode in ['light', 'dark']"
        :key="mode"
        class="slop-theme mode-column"
        :data-sl-mode="mode"
        :data-testid="`visual-mode-${mode}`"
      >
        <h3>{{ mode }} mode</h3>

        <div class="elevation-grid" :data-testid="`visual-elevation-${mode}`">
          <article
            v-for="level in elevations"
            :key="level"
            class="sample"
            :data-elevation="String(level)"
          >
            <strong>Elevation {{ level }}</strong>
            <span>Surface, shadow, hairline</span>
          </article>
        </div>

        <div
          class="material-stage"
          data-gradient="aurora"
          :data-testid="`visual-materials-${mode}`"
        >
          <article class="sample" data-material="solid">
            <strong>Solid</strong>
            <span>Opaque fill</span>
          </article>
          <article class="sample" data-material="glass">
            <strong>Glass</strong>
            <span>Blur, saturate, noise</span>
          </article>
          <article class="sample" data-material="grain">
            <strong>Grain</strong>
            <span>Noise overlay</span>
          </article>
        </div>

        <div class="gradient-grid" :data-testid="`visual-gradients-${mode}`">
          <article class="sample" data-gradient="accent">
            <strong>Accent</strong>
            <span>linear-gradient in oklch</span>
          </article>
          <article class="sample" data-gradient="aurora">
            <strong>Aurora</strong>
            <span>Layered radial-gradient</span>
          </article>
          <article class="sample" data-gradient="border">
            <strong>Gradient border</strong>
            <span>mask-composite exclude</span>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.visual-reference {
  /* Pin a metric-stable face so Linux CI screenshots do not depend on system-ui. */
  font-family: Arial, Helvetica, sans-serif;
  font-kerning: none;
  font-synthesis: none;
  inline-size: 960px;
  max-inline-size: 100%;
}

.mode-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
}

.mode-column {
  border-radius: 1rem;
  padding: 1rem;
}

.elevation-grid,
.gradient-grid,
.material-stage {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-block: 0.75rem 1.1rem;
}

.material-stage {
  border-radius: 1rem;
  padding: 1rem;
}

.sample {
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-block-size: 6.5rem;
  padding: 0.85rem 0.9rem;
}

.sample span {
  color: var(--sl-text-muted);
  font-size: 0.85rem;
}
</style>
