<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import {
  ghostCommandPaletteGroupLabelKey,
  type GhostCommandPaletteLabelElement,
  type GhostCommandPaletteLabelExposed,
} from './ghost-command-palette'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the group label. */
    as?: GhostCommandPaletteLabelElement
  }>(),
  {
    as: 'div',
  },
)

injectCommandPaletteContext('GhostCommandPaletteLabel')

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const groupLabel = inject(ghostCommandPaletteGroupLabelKey, null)
const generatedId = useGhostId('ghost-command-palette-label')

// A consumer `id` wins so existing `aria-labelledby` references keep working.
const labelId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : generatedId.value
})

watch(
  labelId,
  (id) => {
    groupLabel?.setLabelId(id)
  },
  { immediate: true },
)

onUnmounted(() => {
  groupLabel?.setLabelId(null)
})

const labelAttrs = computed(() => ({
  ...attrs,
  id: labelId.value,
  'data-part': 'label',
  class: ['ghost-command-palette-label', attrs.class],
}))

defineExpose<GhostCommandPaletteLabelExposed>(
  createDialogPartExposed(() => resolveDialogHtmlElement(hostRef.value)),
)
</script>

<template>
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
  </component>
</template>
