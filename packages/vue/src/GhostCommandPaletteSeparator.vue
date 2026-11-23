<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import type {
  GhostCommandPaletteSeparatorElement,
  GhostCommandPaletteSeparatorExposed,
} from './ghost-command-palette'
import type { GhostSeparatorElement } from './ghost-separator'
import { useGhostSeparator } from './use-ghost-separator'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the divider. */
    as?: GhostCommandPaletteSeparatorElement
  }>(),
  {
    as: 'div',
  },
)

injectCommandPaletteContext('GhostCommandPaletteSeparator')

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

/*
 * Always decorative (C5): a listbox may only own options and groups, so a
 * `role="separator"` child would be invalid. `role="none"` keeps the divider
 * purely visual; it is never a highlight or focus target.
 */
const { rootProps, as } = useGhostSeparator({
  as: () => props.as as GhostSeparatorElement,
  decorative: true,
  orientation: 'horizontal',
})

const separatorAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
  'data-part': 'separator' as const,
  class: ['ghost-command-palette-separator', attrs.class],
}))

defineExpose<GhostCommandPaletteSeparatorExposed>(
  createDialogPartExposed(() => resolveDialogHtmlElement(hostRef.value)),
)
</script>

<template>
  <component :is="as" ref="host" v-bind="separatorAttrs" />
</template>
