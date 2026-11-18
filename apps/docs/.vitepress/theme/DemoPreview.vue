<script setup lang="ts">
import { ref, useId } from 'vue'

import { GhostButton } from '@ghostvue/themes'

/**
 * Presentational frame shared by every live docs demo: header (title, layer
 * badge, description, toolbar), optional controls, a block-layout canvas, and
 * a collapsed source disclosure. It knows nothing about the example registry;
 * `GhostExample` adapts a registered id into these props and slots.
 *
 * The `ghost-example*` class names are the stable hooks for
 * `docs-demo-compat.css` and the docs e2e suites, so they stay unchanged even
 * though the frame now lives in its own component.
 */
const props = defineProps<{
  /** Visible demo title; also names the toolbar and source region. */
  title: string
  /** `headless` shows a badge and opts the canvas into native-control resets. */
  layer?: 'headless' | 'themed' | undefined
  /** One-line summary under the title. */
  description?: string | undefined
}>()

const slots = defineSlots<{
  /** The live demo. The example owns its own internal layout. */
  default?: () => unknown
  /** Extra toolbar actions rendered after the source toggle. */
  actions?: () => unknown
  /** Optional demo controls rendered between the header and the canvas. */
  controls?: () => unknown
  /** Highlighted source, revealed by the toolbar's Code disclosure. */
  source?: () => unknown
}>()

const uid = useId()
const sourceRegionId = `ghost-example-source-${uid}`
/*
 * Collapsed by default so the live demo leads and the code stays secondary.
 * The state lives on the frame, not the demo, and the region uses `v-show`,
 * so toggling never remounts or resets the preview and the highlighted markup
 * stays in the SSR output.
 */
const sourceOpen = ref(false)
</script>

<template>
  <figure class="ghost-example" :data-example-layer="props.layer">
    <figcaption class="ghost-example__header">
      <div class="ghost-example__intro">
        <div class="ghost-example__heading">
          <span class="ghost-example__title">{{ title }}</span>
          <span v-if="layer === 'headless'" class="ghost-example__badge">
            Headless
          </span>
        </div>
        <p v-if="description" class="ghost-example__description">
          {{ description }}
        </p>
      </div>
      <!--
        A plain group, not role="toolbar": a toolbar promises arrow-key roving,
        and two or three buttons read fine as ordinary Tab stops.
      -->
      <div
        v-if="slots.source || slots.actions"
        class="ghost-example__toolbar"
        role="group"
        :aria-label="`${title} actions`"
      >
        <!--
          Disclosure pattern: a native button whose aria-expanded mirrors the
          region below. The label stays constant ("Code") so the control does
          not change width or name when toggled; state is announced via
          aria-expanded and shown by the chevron.
        -->
        <GhostButton
          v-if="slots.source"
          class="ghost-example__toggle"
          type="button"
          size="sm"
          variant="ghost"
          tone="neutral"
          :aria-expanded="sourceOpen ? 'true' : 'false'"
          :aria-controls="sourceRegionId"
          :aria-label="`${title} source code`"
          @click="sourceOpen = !sourceOpen"
        >
          <svg
            class="ghost-example__chevron"
            aria-hidden="true"
            viewBox="0 0 16 16"
            width="12"
            height="12"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
            />
          </svg>
          Code
        </GhostButton>
        <slot name="actions" />
      </div>
    </figcaption>

    <div
      v-if="slots.controls"
      class="ghost-example__controls"
      role="group"
      :aria-label="`${title} controls`"
    >
      <slot name="controls" />
    </div>

    <div class="ghost-example__preview" data-testid="ghost-example-preview">
      <div class="ghost-example__stage">
        <slot />
      </div>
    </div>

    <div
      v-if="slots.source"
      v-show="sourceOpen"
      :id="sourceRegionId"
      class="ghost-example__source"
      data-testid="ghost-example-source"
      role="region"
      :aria-label="`${title} source`"
    >
      <slot name="source" />
    </div>
  </figure>
</template>
