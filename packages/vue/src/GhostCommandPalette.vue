<script setup lang="ts">
import { provide } from 'vue'

import {
  ghostCommandPaletteContextKey,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteExposed,
  type GhostCommandPaletteSearchPayload,
  type GhostCommandPaletteSlotProps,
} from './ghost-command-palette'
import type { GhostComboboxMessages } from './ghost-combobox'
import { useGhostCommandPalette } from './use-ghost-command-palette'

// Explicit `undefined` defaults keep omitted `open` / `search` uncontrolled
// instead of letting Vue coerce them to `false` / `''`.
const props = withDefaults(
  defineProps<{
    /** Controlled open state. Omit for uncontrolled mode. */
    open?: boolean | undefined
    /** Initial open state when `open` is omitted. */
    defaultOpen?: boolean
    /** Controlled query text. Omit for uncontrolled mode. */
    search?: string | undefined
    /** Initial query and the value it resets to on close. */
    defaultSearch?: string
    /** Loading presentation: hides empty, sets `aria-busy`, announces loading. */
    loading?: boolean
    /** Modal shell (focus trap, scroll lock, inert background, overlay). */
    modal?: boolean
    /** Blocks opening, search, and command activation. */
    disabled?: boolean
    /** Requests close after a command is activated. */
    closeOnSelect?: boolean
    /** Whether `Escape` closes the palette. */
    closeOnEscape?: boolean
    /** Overrides loading, empty, and results-count announcements. */
    messages?: GhostComboboxMessages | undefined
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    search: undefined,
    defaultSearch: '',
    loading: false,
    modal: true,
    disabled: false,
    closeOnSelect: true,
    closeOnEscape: true,
    messages: undefined,
  },
)

const emit = defineEmits<{
  /** Emitted when the palette should open or close. */
  'update:open': [open: boolean]
  /** Emitted when the query changes. */
  'update:search': [search: string]
  /** Emitted after each query change with a monotonic `requestId`. */
  search: [payload: GhostCommandPaletteSearchPayload]
  /** Emitted synchronously when an enabled command is activated. Not cancelable. */
  command: [payload: GhostCommandPaletteCommandPayload]
}>()

defineSlots<{
  default(props: GhostCommandPaletteSlotProps): unknown
}>()

const palette = useGhostCommandPalette({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  search: () => props.search,
  defaultSearch: () => props.defaultSearch,
  loading: () => props.loading,
  modal: () => props.modal,
  disabled: () => props.disabled,
  closeOnSelect: () => props.closeOnSelect,
  closeOnEscape: () => props.closeOnEscape,
  messages: () => props.messages,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
  onSearchChange: (next) => {
    emit('update:search', next)
  },
  onSearch: (payload) => {
    emit('search', payload)
  },
  onCommand: (payload) => {
    emit('command', payload)
  },
})

provide(ghostCommandPaletteContextKey, palette)

const {
  isOpen,
  searchValue,
  loading: isLoading,
  close,
  focusInput,
  inputElement,
} = palette

defineExpose<GhostCommandPaletteExposed>({
  get element() {
    return inputElement.value
  },
  focus(options?: FocusOptions) {
    inputElement.value?.focus(options)
  },
  blur() {
    inputElement.value?.blur()
  },
  open: palette.open,
  close,
  focusInput,
})
</script>

<!--
  Renderless: the polite live region lives inside GhostCommandPaletteContent
  so the modal's inert background never hides announcements.
-->
<template>
  <slot
    :open="isOpen"
    :search="searchValue"
    :loading="isLoading"
    :close="close"
    :focus-input="focusInput"
  />
</template>
