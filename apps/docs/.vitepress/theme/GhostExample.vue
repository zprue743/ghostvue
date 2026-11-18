<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'

import { exampleLoader, exampleSource } from '../../../../examples/load'
import { ghostExampleById } from '../../../../examples/registry'
import { defineDemoPreview } from './demo-preview-async'
import DemoPreview from './DemoPreview.vue'

/*
 * Id adapter: markdown keeps writing `<GhostExample id="button/icon-only" />`.
 * This component resolves the id against the example registry and loader and
 * hands title, layer, description, the lazy demo, and the highlighted source
 * to `DemoPreview`, which owns the frame.
 */
const props = defineProps<{
  /** Path-derived example id (`button/icon-only`). */
  id: string
}>()

const slots = defineSlots<{
  /**
   * Highlighted source for this example. The docs markdown pipeline fills it
   * with a `<<<` snippet of the same SFC the preview mounts.
   */
  default?: () => unknown
}>()

const meta = computed(() => ghostExampleById(props.id))
const title = computed(() => meta.value?.title ?? props.id)
const source = computed(() => exampleSource(props.id)?.replace(/\n$/, '') ?? '')
const loader = exampleLoader(props.id)

if (!loader) {
  // Fail the docs build when a page points at an id that has no file.
  throw new Error(
    `Unknown example "${props.id}". Add ${props.id}.vue under examples/ and register it.`,
  )
}

const Preview = defineDemoPreview(loader)
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
  <DemoPreview
    :data-example-id="id"
    :title="title"
    :layer="meta?.layer"
    :description="meta?.description"
  >
    <Preview />

    <template #actions>
      <GhostButton
        class="ghost-example__copy"
        type="button"
        size="sm"
        variant="ghost"
        tone="neutral"
        :aria-label="copied ? `Copied ${title} source` : `Copy ${title} source`"
        @click="copySource"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </GhostButton>
    </template>

    <template v-if="slots.default" #source>
      <slot />
    </template>
  </DemoPreview>
</template>
