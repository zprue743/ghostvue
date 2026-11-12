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
        <GhostButton
          class="ghost-example__copy"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-label="
            copied
              ? `Copied ${meta?.title ?? id} source`
              : `Copy ${meta?.title ?? id} source`
          "
          @click="copySource"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </GhostButton>
      </div>
      <p v-if="meta?.description" class="ghost-example__description">
        {{ meta.description }}
      </p>
    </figcaption>

    <div class="ghost-example__preview" data-testid="ghost-example-preview">
      <p v-if="meta?.layer === 'headless'" class="ghost-example__hint">
        Unstyled. Headless.
      </p>
      <div class="ghost-example__stage">
        <Preview />
      </div>
    </div>
  </figure>
</template>

<style scoped>
.ghost-example {
  display: grid;
  gap: 0;
  margin-block: 1.5rem 0;
  overflow: hidden;
  border: 1px solid var(--ghost-border-default, var(--vp-c-border));
  border-block-end: 0;
  border-end-end-radius: 0;
  border-end-start-radius: 0;
  border-start-end-radius: calc(1rem * var(--ghost-roundness, 1));
  border-start-start-radius: calc(1rem * var(--ghost-roundness, 1));
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

.ghost-example__copy {
  margin-inline-start: auto;
}

.ghost-example__description {
  color: var(--ghost-text-muted, var(--vp-c-text-2));
  font-size: 0.88rem;
  line-height: 1.45;
  margin: 0;
}

.ghost-example__preview {
  isolation: isolate;
  min-block-size: 8rem;
  padding: 1.75rem 1.25rem;
  position: relative;
  background-color: var(--ghost-surface-bg, var(--vp-c-bg));
  background-image: radial-gradient(
    var(--ghost-border-muted, var(--vp-c-divider)) 1px,
    transparent 1px
  );
  background-size: 0.85rem 0.85rem;
  border-block-start: 1px solid var(--ghost-border-muted, var(--vp-c-divider));
}

.ghost-example__hint {
  color: var(--ghost-text-subtle, var(--vp-c-text-3));
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  line-height: 1.2;
  margin: 0;
  position: absolute;
  inset-block-start: 0.7rem;
  inset-inline-start: 0.9rem;
  text-transform: uppercase;
}

.ghost-example__stage {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  min-block-size: 4.5rem;
}

.ghost-example__preview :deep(table) {
  border-collapse: collapse;
}

.ghost-example__preview :deep(:is(th, td)) {
  border: 1px solid var(--ghost-border-default, var(--vp-c-border));
  padding: 0.45rem 0.7rem;
  text-align: start;
}

/*
 * VitePress zeros native button chrome. Revert headless hosts to the UA
 * stylesheet so the preview reads as an intentional unstyled control, not
 * broken text. Themed recipes stay on `.ghost-themed-scope` instead.
 */
.ghost-example[data-example-layer='headless']
  .ghost-example__preview
  :deep(button) {
  all: revert;
}

.ghost-example__preview :deep(:focus-visible) {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}
</style>
