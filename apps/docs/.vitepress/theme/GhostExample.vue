<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'

import { exampleLoader, exampleSource } from '../../../../examples/load'
import { ghostExampleById } from '../../../../examples/registry'

const props = defineProps<{
  /** Path-derived example id (`button/icon-only`). */
  id: string
}>()

const meta = computed(() => ghostExampleById(props.id))
const source = computed(() => exampleSource(props.id)?.replace(/\n$/, '') ?? '')
const loader = exampleLoader(props.id)

if (!loader) {
  // Fail the docs build when a page points at an id that has no file.
  throw new Error(
    `Unknown example "${props.id}". Add ${props.id}.vue under examples/ and register it.`,
  )
}

const Preview = defineAsyncComponent(loader)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copySource(): Promise<void> {
  try {
    await navigator.clipboard.writeText(`${source.value}\n`)
    copied.value = true
    if (copiedTimer !== undefined) {
      clearTimeout(copiedTimer)
    }
    copiedTimer = setTimeout(() => {
      copied.value = false
      copiedTimer = undefined
    }, 2000)
  } catch {
    copied.value = false
  }
}

onUnmounted(() => {
  if (copiedTimer !== undefined) {
    clearTimeout(copiedTimer)
  }
})
</script>

<template>
  <figure
    class="ghost-example"
    :data-example-id="id"
    :data-example-layer="meta?.layer"
  >
    <figcaption class="ghost-example__header">
      <div class="ghost-example__heading">
        <span class="ghost-example__title">{{ meta?.title ?? id }}</span>
        <span v-if="meta?.layer === 'headless'" class="ghost-example__badge">
          Headless
        </span>
      </div>
      <p v-if="meta?.description" class="ghost-example__description">
        {{ meta.description }}
      </p>
    </figcaption>

    <div class="ghost-example__preview" data-testid="ghost-example-preview">
      <Preview />
    </div>

    <div class="ghost-example__source-wrap">
      <div class="ghost-example__source-bar">
        <span class="ghost-example__lang">vue</span>
        <GhostButton
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          @click="copySource"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </GhostButton>
      </div>
      <pre
        class="ghost-example__source"
        tabindex="0"
        :aria-label="`${meta?.title ?? id} source`"
      ><code>{{ source }}</code></pre>
    </div>
  </figure>
</template>

<style scoped>
.ghost-example {
  display: grid;
  gap: 0;
  margin-block: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--ghost-border-default, var(--vp-c-border));
  border-radius: calc(1rem * var(--ghost-roundness, 1));
  background: var(--ghost-surface-bg, var(--vp-c-bg));
}

.ghost-example__header {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.15rem 0.85rem;
}

.ghost-example__heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ghost-example__title {
  color: var(--ghost-surface-fg, var(--vp-c-text-1));
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  line-height: 1.3;
}

.ghost-example__badge {
  border: 1px solid var(--ghost-border-muted, var(--vp-c-divider));
  border-radius: 999px;
  color: var(--ghost-text-muted, var(--vp-c-text-2));
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.5rem;
  text-transform: uppercase;
}

.ghost-example__description {
  color: var(--ghost-text-muted, var(--vp-c-text-2));
  font-size: 0.88rem;
  line-height: 1.45;
  margin: 0;
}

.ghost-example__preview {
  align-items: center;
  background: linear-gradient(
    180deg,
    color-mix(
      in oklch,
      var(--ghost-surface-subtle-bg, var(--vp-c-bg-alt)) 88%,
      transparent
    ),
    var(--ghost-surface-subtle-bg, var(--vp-c-bg-alt))
  );
  border-block: 1px solid var(--ghost-border-muted, var(--vp-c-divider));
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
  min-block-size: 6.5rem;
  padding: 1.35rem 1.15rem;
}

.ghost-example__preview :deep(table) {
  border-collapse: collapse;
}

.ghost-example__preview :deep(:is(th, td)) {
  border: 1px solid var(--ghost-border-default, var(--vp-c-border));
  padding: 0.45rem 0.7rem;
  text-align: start;
}

.ghost-example__preview :deep(:focus-visible) {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

.ghost-example[data-example-layer='headless']
  .ghost-example__preview
  :deep(button) {
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
}

.ghost-example__source-wrap {
  background: var(--vp-code-bg, var(--ghost-surface-muted-bg));
}

.ghost-example__source-bar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.55rem 0.15rem 1.15rem;
}

.ghost-example__lang {
  color: var(--ghost-text-subtle, var(--vp-c-text-3));
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ghost-example__source {
  font-family: var(
    --vp-font-family-mono,
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace
  );
  font-size: 0.82rem;
  line-height: 1.55;
  margin: 0;
  max-inline-size: 100%;
  overflow: auto;
  padding: 0.35rem 1.15rem 1.15rem;
}

.ghost-example__source:focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: -2px;
}

.ghost-example__source code {
  background: transparent;
  color: var(--ghost-surface-fg, var(--vp-c-text-1));
  font: inherit;
  padding: 0;
}
</style>
