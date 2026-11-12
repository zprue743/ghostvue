<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

import { exampleLoader } from '../../../examples/load'
import { ghostExamples, ghostExampleById } from '../../../examples/registry'

const requestedId = new URLSearchParams(window.location.search).get('id')
const example = computed(() =>
  requestedId ? ghostExampleById(requestedId) : undefined,
)
const loader = requestedId ? exampleLoader(requestedId) : undefined
const Preview = loader ? defineAsyncComponent(loader) : null
const missing = Boolean(requestedId) && (!example.value || !loader)
</script>

<template>
  <main class="examples-host">
    <template v-if="example && Preview">
      <p class="examples-host__crumb">
        <a href="./examples.html">All examples</a>
      </p>
      <h1>{{ example.title }}</h1>
      <p>{{ example.description }}</p>
      <p>
        <code>{{ example.id }}</code>
        · {{ example.layer }}
      </p>
      <div
        class="examples-host__preview"
        data-testid="ghost-example-preview"
        :data-example-id="example.id"
      >
        <Preview />
      </div>
    </template>

    <template v-else-if="missing">
      <h1>Unknown example</h1>
      <p>
        No example is registered as
        <code>{{ requestedId }}</code>
        .
      </p>
      <p><a href="./examples.html">Back to the gallery</a></p>
    </template>

    <template v-else>
      <h1>GhostVue examples</h1>
      <p>
        Each route renders one typed example SFC from
        <code>examples/</code>
        . The same files feed docs previews, manifests, and accessibility
        checks.
      </p>
      <ul class="examples-host__list">
        <li v-for="item in ghostExamples" :key="item.id">
          <a :href="`?id=${item.id}`">{{ item.id }}</a>
          — {{ item.title }}
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.examples-host {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-inline-size: 52rem;
}

.examples-host :is(h1, h2, code) {
  overflow-wrap: anywhere;
}

.examples-host__crumb {
  margin-block-end: 1rem;
}

.examples-host__preview {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block-start: 1.25rem;
  min-block-size: 4rem;
}

.examples-host__preview :deep(table) {
  border-collapse: collapse;
}

.examples-host__preview :deep(:is(th, td)) {
  border: 1px solid #767676;
  padding: 0.5rem 0.75rem;
  text-align: start;
}

.examples-host__list {
  display: grid;
  gap: 0.5rem;
  padding-inline-start: 1.2rem;
}

/* Headless examples have no theme chrome; match the main playground target. */
.examples-host :deep(button) {
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
}

.examples-host :deep(:focus-visible) {
  outline: 0.2rem solid Highlight;
  outline-offset: 0.15rem;
}

.examples-host :deep(main:focus) {
  outline: none;
}
</style>
