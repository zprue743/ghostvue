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

/*
 * Keep the token host (?theme, ?density, ?mode) while moving between the
 * gallery and an example, so a reviewer comparing dark/default stays there.
 */
const hostParams = new URLSearchParams(window.location.search)
hostParams.delete('id')
function exampleHref(id?: string): string {
  const params = new URLSearchParams(hostParams)
  if (id) params.set('id', id)
  const query = params.toString()
  return query ? `./examples.html?${query}` : './examples.html'
}
</script>

<template>
  <main class="examples-host">
    <template v-if="example && Preview">
      <p class="examples-host__crumb">
        <a :href="exampleHref()">All examples</a>
      </p>
      <h1>{{ example.title }}</h1>
      <p>{{ example.description }}</p>
      <p>
        <code>{{ example.id }}</code>
        · {{ example.layer }}
      </p>
      <!--
        The canvas mirrors the docs DemoPreview canvas: real padding (visual
        baselines capture it as-is), a block-layout stage, and ring room so
        edge focus rings are not clipped.
      -->
      <div
        class="examples-host__preview"
        data-testid="ghost-example-preview"
        :data-example-id="example.id"
        :data-example-layer="example.layer"
      >
        <!--
          Same `ghost-demo` query container as the docs
          `.ghost-example__viewport`, so examples that adapt with
          `@container ghost-demo` lay out the same in both hosts.
        -->
        <div class="examples-host__viewport">
          <div class="examples-host__stage" data-testid="ghost-example-stage">
            <Preview />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="missing">
      <h1>Unknown example</h1>
      <p>
        No example is registered as
        <code>{{ requestedId }}</code>
        .
      </p>
      <p><a :href="exampleHref()">Back to the gallery</a></p>
    </template>

    <template v-else>
      <h1>GhostVue examples</h1>
      <p>
        Each route renders one typed example SFC from
        <code>examples/</code>
        . The same files feed docs previews, manifests, and accessibility
        checks. Like the docs, headless examples render unthemed and themed
        examples opt in themselves. Add
        <code>?theme=default&amp;density=comfortable&amp;mode=dark</code>
        to change the token host.
      </p>
      <ul class="examples-host__list">
        <li v-for="item in ghostExamples" :key="item.id">
          <a :href="exampleHref(item.id)">{{ item.id }}</a>
          — {{ item.title }}
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.examples-host {
  box-sizing: border-box;
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-inline-size: 52rem;
  padding-inline: 1rem;
}

.examples-host :is(h1, h2, code) {
  overflow-wrap: anywhere;
}

.examples-host__crumb {
  margin-block-end: 1rem;
}

/*
 * Same box as the docs `.ghost-example__preview` at desktop width: the
 * subtle canvas surface and a 1.5-2rem inset. Nothing reaches inside the
 * demo; the example SFC and its recipes decide how it looks.
 */
.examples-host__preview {
  --_examples-ring-room: 0.5rem;

  isolation: isolate;
  position: relative;
  min-inline-size: 0;
  margin-block-start: 1.25rem;
  padding: clamp(1.5rem, calc(2 * var(--ghost-space-inset-md)), 2rem);
  border: 1px solid var(--ghost-border-default);
  border-radius: var(--ghost-radius-xl);
  background: var(--ghost-surface-subtle-bg);
}

/*
 * Mirrors `.ghost-example__viewport`: an inline-size query container with no
 * layout containment, so inline overlays still position against the canvas.
 */
.examples-host__viewport {
  container: ghost-demo / inline-size;
  min-inline-size: 0;
}

/* Mirrors `.ghost-example__stage`: block layout, scroll, room for rings. */
.examples-host__stage {
  display: flow-root;
  min-block-size: 2.5rem;
  margin: calc(-1 * var(--_examples-ring-room));
  padding: var(--_examples-ring-room);
  overflow-x: auto;
}

/* Several root elements fall back to a wrapping row, as in the docs. */
.examples-host__stage:has(> * + *) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ghost-space-gap-md);
}

.examples-host__list {
  display: grid;
  gap: 0.5rem;
  padding-inline-start: 1.2rem;
}
</style>
