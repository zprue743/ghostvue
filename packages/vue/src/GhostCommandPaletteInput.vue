<script setup lang="ts">
import { computed, onUnmounted, useAttrs, useTemplateRef, watch } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { resolveDialogHtmlElement } from './dialog-shared'
import type {
  GhostCommandPaletteInputElement,
  GhostCommandPaletteInputExposed,
} from './ghost-command-palette'
import { isImeComposing } from './is-ime-composing'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the query field. */
    as?: GhostCommandPaletteInputElement
    /** Disables typing and activation from this input. */
    disabled?: boolean
  }>(),
  {
    as: 'input',
    disabled: false,
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteInput')

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveDialogHtmlElement(hostRef.value))
const isNativeInput = computed(
  () => props.as === 'input' || attrs['type'] === 'text',
)
const isComponentHost = computed(() => typeof props.as !== 'string')
const isEffectivelyDisabled = computed(
  () => props.disabled || context.disabled.value,
)

const inputId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.inputId.value
})

watch(
  () => attrs['id'],
  (id) => {
    context.setInputId(typeof id === 'string' && id.length > 0 ? id : null)
  },
  { immediate: true },
)

watch(
  element,
  (el) => {
    context.setInputElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setInputElement(null)
  context.setInputId(null)
})

function hasName(): boolean {
  return (
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined
  )
}

const inputAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'value' &&
      key !== 'class' &&
      key !== 'onInput' &&
      key !== 'onKeydown'
    ) {
      rest[key] = value
    }
  }

  const dialog = context.dialog
  const base: Record<string, unknown> = {
    ...rest,
    id: inputId.value,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    // The listbox is held open for as long as the palette (and therefore
    // this input) is mounted.
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': context.listId.value,
    'aria-activedescendant': context.activeDescendantId.value,
    // Without its own name the input reuses the palette title, so the
    // combobox and the listbox labelled by it are never anonymous.
    'aria-labelledby':
      !hasName() && dialog.titleRegistered.value
        ? dialog.titleId.value
        : attrs['aria-labelledby'],
    'data-part': 'input',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    autocomplete: attrs['autocomplete'] ?? 'off',
    class: ['ghost-command-palette-input', attrs.class],
  }

  if (isNativeInput.value || isComponentHost.value) {
    if (isNativeInput.value) {
      base['type'] = attrs['type'] ?? 'text'
    }
    base['value'] = context.searchValue.value
    base['disabled'] = isEffectivelyDisabled.value
  } else {
    base['tabindex'] =
      attrs['tabindex'] ?? (isEffectivelyDisabled.value ? undefined : 0)
    base['aria-disabled'] = isEffectivelyDisabled.value ? 'true' : undefined
  }

  return base
})

function invokeAttrHandler(handler: unknown, event: Event): void {
  if (typeof handler === 'function') {
    ;(handler as (event: Event) => void)(event)
  } else if (Array.isArray(handler)) {
    for (const fn of handler) {
      if (typeof fn === 'function') {
        ;(fn as (event: Event) => void)(event)
      }
    }
  }
}

function handleInput(event: Event): void {
  if (isEffectivelyDisabled.value) {
    return
  }
  invokeAttrHandler(attrs['onInput'], event)
  if (event.defaultPrevented) {
    return
  }
  const target = event.target
  const value =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.value
      : ''
  context.setSearchFromInput(value)
}

/*
 * Copied from GhostComboboxInput's `handleKeydown` (spec: Keyboard
 * interaction) rather than importing that part, so the palette mounts no
 * combobox chrome. Differences are deliberate:
 *
 * - The list is always open while the input exists, so arrows never open it.
 * - Enter activates the highlighted command through `activateCommand`, never
 *   the combobox `select()`, so the query and selection stay untouched.
 * - Escape only clears the highlight and leaves the event un-prevented, so
 *   the content's dismissable layer closes the palette (or the topmost nested
 *   layer) according to `closeOnEscape`.
 *
 * The IME guard matches the combobox: while composing, arrows, Home/End,
 * Enter, and Escape belong to the input method.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (isEffectivelyDisabled.value) {
    return
  }
  invokeAttrHandler(attrs['onKeydown'], event)
  if (event.defaultPrevented || isImeComposing(event)) {
    return
  }

  switch (event.key) {
    case 'Escape':
      context.setActiveItem(undefined)
      return
    case 'ArrowDown':
      event.preventDefault()
      context.moveActive(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      context.moveActive(-1)
      return
    case 'Home':
      event.preventDefault()
      context.moveActiveFirst()
      return
    case 'End':
      event.preventDefault()
      context.moveActiveLast()
      return
    case 'Enter': {
      const active = context.activeItemId.value
      if (active) {
        event.preventDefault()
        context.activateCommand(active)
      }
      return
    }
    default:
      return
  }
}

defineExpose<GhostCommandPaletteInputExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="inputAttrs"
    @input="handleInput"
    @keydown="handleKeydown"
  />
</template>
