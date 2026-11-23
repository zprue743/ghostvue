<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import {
  ghostCommandPaletteGroupLabelKey,
  type GhostCommandPaletteGroupElement,
  type GhostCommandPaletteGroupExposed,
} from './ghost-command-palette'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the group. */
    as?: GhostCommandPaletteGroupElement
  }>(),
  {
    as: 'div',
  },
)

injectCommandPaletteContext('GhostCommandPaletteGroup')

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

// Groups are presentational and semantic only: they never filter or sort.
// The nested Label reports its id so the group is named by it.
const labelId = shallowRef<string | null>(null)
provide(ghostCommandPaletteGroupLabelKey, {
  setLabelId(id: string | null) {
    labelId.value = id
  },
})

const groupAttrs = computed(() => ({
  ...attrs,
  role: 'group',
  'aria-labelledby': attrs['aria-labelledby'] ?? labelId.value ?? undefined,
  'data-part': 'group',
  class: ['ghost-command-palette-group', attrs.class],
}))

defineExpose<GhostCommandPaletteGroupExposed>(
  createDialogPartExposed(() => resolveDialogHtmlElement(hostRef.value)),
)
</script>

<template>
  <component :is="as" ref="host" v-bind="groupAttrs">
    <slot />
  </component>
</template>
