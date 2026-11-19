<script setup lang="ts">
import { computed, ref } from 'vue'

import { exampleLoader, exampleSource } from '../../../../examples/load'
import { ghostExampleById } from '../../../../examples/registry'
import { defineDemoPreview } from './demo-preview-async'
import {
  type DemoPlaygroundOverrides,
  demoPlaygroundFor,
} from './demo-playgrounds'
import DemoPlaygroundPanel from './DemoPlaygroundPanel.vue'
import DemoPreview from './DemoPreview.vue'

/*
 * Id adapter: markdown keeps writing `<GhostExample id="button/icon-only" />`.
 * This component resolves the id against the example registry and loader and
 * hands title, layer, description, the lazy demo, the original source text
 * (for Copy) and the highlighted source to `DemoPreview`, which owns the
 * frame and its controls. Ids with a typed props playground also get its
 * panel in the frame's controls slot.
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

/*
 * Opt-in typed props playground (see `demo-playgrounds.ts`). Overrides are
 * bound to the demo as declared props, never as fallthrough attributes, and
 * an empty object leaves the SFC on its own declared defaults. Changing or
 * resetting them re-renders the same demo instance; nothing remounts.
 */
const playground = demoPlaygroundFor(props.id)
const overrides = ref<DemoPlaygroundOverrides>({})
</script>

<template>
  <DemoPreview
    :data-example-id="id"
    :title="title"
    :layer="meta?.layer"
    :description="meta?.description"
    :source-text="source"
  >
    <Preview v-bind="overrides" />

    <template v-if="playground" #controls>
      <DemoPlaygroundPanel
        v-model="overrides"
        :title="title"
        :playground="playground"
      />
    </template>

    <template v-if="slots.default" #source>
      <!--
        With a playground the code below is still the unmodified SFC. Say so,
        so it is not read as the current settings (Copy props has those).
      -->
      <p
        v-if="playground"
        class="ghost-example__source-note"
        data-testid="ghost-example-source-note"
      >
        Original source. Playground overrides are not applied here; use Copy
        props for the current settings.
      </p>
      <slot />
    </template>
  </DemoPreview>
</template>
