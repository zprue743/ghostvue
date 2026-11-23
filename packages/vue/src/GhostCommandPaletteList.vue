<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import type {
  GhostCommandPaletteListElement,
  GhostCommandPaletteListExposed,
} from './ghost-command-palette'
import { isFocusable } from './get-tabbable-elements'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the listbox. */
    as?: GhostCommandPaletteListElement
  }>(),
  {
    as: 'div',
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteList')
const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDialogHtmlElement(hostRef.value))

/*
 * Same rule as GhostComboboxContent: an open list with nothing to choose from
 * (not loading, no registered items) drops the listbox role, because a
 * listbox must own options (axe aria-required-children) and the empty
 * message is plain text. The id stays so the input's `aria-controls` still
 * resolves. While loading, `aria-busy` lets an empty listbox stand.
 */
const presentsListbox = computed(
  () => context.loading.value || context.itemCount.value > 0,
)

const listAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'role' && key !== 'class') {
      rest[key] = value
    }
  }
  return {
    ...rest,
    id: context.listId.value,
    role: presentsListbox.value ? 'listbox' : undefined,
    'aria-labelledby': presentsListbox.value
      ? context.inputId.value
      : undefined,
    'aria-busy': context.loading.value ? 'true' : undefined,
    'data-part': 'list',
    class: ['ghost-command-palette-list', attrs.class],
  }
})

/**
 * Keeps DOM focus on the input when the list chrome (padding, group labels,
 * items, separators) is pressed: the APG combobox never moves focus into the
 * listbox, and typing must keep working after a pointer press. Presses on
 * focusable consumer descendants keep their default.
 */
function handleMouseDown(event: MouseEvent): void {
  const root = element.value
  let current: Element | null =
    event.target instanceof Element ? event.target : null
  while (current && root?.contains(current)) {
    if (current instanceof HTMLElement && isFocusable(current)) {
      return
    }
    if (current === root) {
      break
    }
    current = current.parentElement
  }
  event.preventDefault()
}

defineExpose<GhostCommandPaletteListExposed>(
  createDialogPartExposed(() => element.value),
)
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="listAttrs"
    @mousedown="handleMouseDown"
  >
    <slot />
  </component>
</template>
