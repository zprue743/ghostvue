<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { useDialogTriggerPart } from './dialog-shared'
import type {
  GhostCommandPaletteTriggerElement,
  GhostCommandPaletteTriggerExposed,
} from './ghost-command-palette'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the trigger control. */
    as?: GhostCommandPaletteTriggerElement
    /** Disables opening from this trigger; the root `disabled` also applies. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteTrigger')
const attrs = useAttrs()
const hostRef = useTemplateRef('host')

// The dialog trigger mechanics read `props.disabled`; a disabled palette
// disables every trigger without the consumer repeating the prop.
const partProps = {
  get as() {
    return props.as
  },
  get disabled() {
    return props.disabled || context.disabled.value
  },
}

// The trigger is part of the widget for non-modal focus departure (C4), so
// focus leaving it while the palette is open is reported like the content's.
const { triggerAttrs, onClick, onKeydown, exposed } = useDialogTriggerPart(
  context.dialog,
  partProps,
  hostRef,
)

const attrsWithClass = computed(() => ({
  ...triggerAttrs.value,
  class: ['ghost-command-palette-trigger', attrs.class],
}))

defineExpose<GhostCommandPaletteTriggerExposed>(exposed)
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="attrsWithClass"
    @click="onClick"
    @keydown="onKeydown"
    @focusout="context.notifyFocusOut"
  >
    <slot />
  </component>
</template>
