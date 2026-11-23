<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { logGhostCode } from './dev-codes'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import type {
  GhostCommandPaletteItemElement,
  GhostCommandPaletteItemExposed,
} from './ghost-command-palette'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Stable command identity, unique within the palette; emitted on `command`. */
    id: string
    /** Excluded from highlight and activation. */
    disabled?: boolean
    /** Plain-text label for assistive technology; falls back to the item's text. */
    textValue?: string | undefined
    /** Tag name or component rendered for the option. */
    as?: GhostCommandPaletteItemElement | undefined
  }>(),
  {
    disabled: false,
    textValue: undefined,
    as: undefined,
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteItem')

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
// The `id` prop is the command identity, not the DOM id: the element gets a
// generated id so `aria-activedescendant` stays valid for any command string.
const optionId = useGhostId('ghost-command-palette-item')

const element = computed(() => resolveDialogHtmlElement(hostRef.value))

const resolvedTextValue = computed(() => {
  if (props.textValue) {
    return props.textValue
  }
  return element.value?.textContent.trim() ?? props.id
})

function getElement(): HTMLElement | null {
  return element.value
}

let registeredId: string | null = null
let mounted = false

function register(id: string): void {
  if (process.env.NODE_ENV !== 'production' && context.isItemRegistered(id)) {
    logGhostCode('GHOST006', { id })
  }
  context.registerItem(
    id,
    resolvedTextValue.value,
    props.disabled,
    optionId.value,
    getElement,
  )
  registeredId = id
}

function unregister(): void {
  if (registeredId !== null) {
    context.unregisterItem(registeredId)
    registeredId = null
  }
}

function syncRegistration(): void {
  if (!mounted) {
    return
  }
  if (registeredId !== props.id) {
    unregister()
    register(props.id)
    return
  }
  context.setItemTextValue(props.id, resolvedTextValue.value)
  context.setItemDisabled(props.id, props.disabled)
}

watch(
  () => [props.id, props.disabled] as const,
  () => {
    syncRegistration()
  },
)

watch(
  resolvedTextValue,
  () => {
    syncRegistration()
  },
  { flush: 'post' },
)

// Registration waits a tick after mount, like GhostComboboxOption, so slot
// text is rendered before the fallback text value is read.
onMounted(() => {
  void nextTick(() => {
    mounted = true
    syncRegistration()
  })
})

onUnmounted(() => {
  mounted = false
  unregister()
})

const isHighlighted = computed(() => context.activeItemId.value === props.id)

const itemAttrs = computed(() => {
  const itemDisabled = context.isItemDisabled(props.id)
  return {
    ...attrs,
    id: optionId.value,
    role: 'option',
    // There is no committed selection (no `modelValue`). Following the APG
    // list-autocomplete example, only the highlighted option reports
    // `aria-selected="true"`; it never persists across highlight changes.
    'aria-selected': isHighlighted.value ? 'true' : 'false',
    'aria-disabled': itemDisabled ? 'true' : undefined,
    'data-part': 'item',
    'data-state': itemDisabled
      ? 'disabled'
      : isHighlighted.value
        ? 'active'
        : undefined,
    'data-highlighted': isHighlighted.value ? '' : undefined,
    'data-value': props.id,
    class: ['ghost-command-palette-item', attrs.class],
  }
})

// Prevents the press from moving focus off the input (APG combobox).
function handleMouseDown(event: MouseEvent): void {
  event.preventDefault()
}

function handleClick(event: MouseEvent): void {
  if (event.button !== 0 || context.isItemDisabled(props.id)) {
    return
  }
  context.activateCommand(props.id)
}

function handlePointerMove(): void {
  if (context.isItemDisabled(props.id)) {
    return
  }
  context.setActiveItem(props.id)
}

defineExpose<GhostCommandPaletteItemExposed>(
  createDialogPartExposed(() => element.value),
)
</script>

<template>
  <component
    :is="as ?? 'div'"
    ref="host"
    v-bind="itemAttrs"
    @mousedown="handleMouseDown"
    @click="handleClick"
    @pointermove="handlePointerMove"
  >
    <slot />
  </component>
</template>
