<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostComboboxContextKey,
  invokeComboboxAttrHandler,
  resolveComboboxHtmlElement,
  type GhostComboboxContext,
  type GhostComboboxInputElement,
  type GhostComboboxInputExposed,
} from './ghost-combobox'
import { isImeComposing } from './is-ime-composing'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostComboboxInputElement
    disabled?: boolean
  }>(),
  {
    as: 'input',
    disabled: false,
  },
)

const injected = inject(ghostComboboxContextKey)
if (!injected) {
  throw new Error('GhostComboboxInput must be used inside GhostCombobox')
}
const context: GhostComboboxContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveComboboxHtmlElement(hostRef.value))
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
    : context.defaultInputId.value
})

context.setInputRegistered(true)

watch(
  inputId,
  (id) => {
    context.setInputId(id === context.defaultInputId.value ? null : id)
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
  context.setInputRegistered(false)
})

const displayValue = computed(() => {
  void context.labelVersion.value
  if (
    !context.multiple.value &&
    typeof context.selectedValue.value === 'string'
  ) {
    if (!context.isOpen.value) {
      return (
        context.getOptionText(context.selectedValue.value) ??
        context.searchValue.value
      )
    }
  }
  return context.searchValue.value
})

const inputAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'value' &&
      key !== 'onInput' &&
      key !== 'onKeydown' &&
      key !== 'onFocus' &&
      key !== 'onFocusout' &&
      key !== 'onClick'
    ) {
      rest[key] = value
    }
  }

  const open = context.isOpen.value
  const base: Record<string, unknown> = {
    ...rest,
    id: inputId.value,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    'aria-expanded': String(open),
    'aria-controls': context.contentId.value,
    'aria-activedescendant': open
      ? context.activeDescendantId.value
      : undefined,
    'aria-invalid': context.invalid.value ? 'true' : undefined,
    'aria-required': context.required.value ? 'true' : undefined,
    'data-part': 'input',
    'data-state': open ? 'open' : 'closed',
    placeholder: context.placeholder.value,
    autocomplete: attrs['autocomplete'] ?? 'off',
  }

  // eslint-disable-next-line @typescript-eslint/dot-notation -- fallthrough attrs use an index signature
  const className = ['ghost-combobox-input', attrs['class']]
  if (isNativeInput.value) {
    base['type'] = attrs['type'] ?? 'text'
    base['value'] = displayValue.value
    base['disabled'] = isEffectivelyDisabled.value
    base['class'] = className
  } else if (isComponentHost.value) {
    base['value'] = displayValue.value
    base['disabled'] = isEffectivelyDisabled.value
    base['class'] = className
  } else {
    base['tabindex'] =
      attrs['tabindex'] ?? (isEffectivelyDisabled.value ? undefined : 0)
    base['aria-disabled'] = isEffectivelyDisabled.value ? 'true' : undefined
    base['class'] = className
  }

  return base
})

function handleInput(event: Event): void {
  if (isEffectivelyDisabled.value) {
    return
  }
  invokeComboboxAttrHandler(attrs['onInput'], event)
  if (event.defaultPrevented) {
    return
  }
  const target = event.target
  const value =
    target instanceof HTMLInputElement
      ? target.value
      : target instanceof HTMLTextAreaElement
        ? target.value
        : ''
  context.onInputSearch(value)
}

function handleFocus(event: FocusEvent): void {
  invokeComboboxAttrHandler(attrs['onFocus'], event)
  if (event.defaultPrevented || isEffectivelyDisabled.value) {
    return
  }
}

function handleFocusOut(event: FocusEvent): void {
  invokeComboboxAttrHandler(attrs['onFocusout'], event)
  if (event.defaultPrevented) {
    return
  }
  context.notifyFocusOut(event.relatedTarget)
}

function handleClick(event: MouseEvent): void {
  invokeComboboxAttrHandler(attrs['onClick'], event)
  if (event.defaultPrevented || isEffectivelyDisabled.value) {
    return
  }
  if (!context.isOpen.value) {
    context.open()
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (isEffectivelyDisabled.value) {
    return
  }
  invokeComboboxAttrHandler(attrs['onKeydown'], event)
  // While an IME is composing, ArrowUp/ArrowDown move through its candidate
  // list, Enter confirms the candidate, and Escape cancels the composition.
  // Consumer handlers above still observe the event, but the combobox must not
  // open, move the active option, select, or close. Escape is left
  // un-prevented and the dismissable layer applies the same guard, so the
  // popup stays open. See `isImeComposing` for the keyCode 229 fallback.
  if (event.defaultPrevented || isImeComposing(event)) {
    return
  }

  if (event.key === 'Escape') {
    if (context.isOpen.value) {
      event.preventDefault()
      context.close()
      context.setActiveOptionByValue(undefined)
    }
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!context.isOpen.value) {
      context.open()
    }
    context.moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!context.isOpen.value) {
      context.open()
    }
    context.moveActive(-1)
    return
  }

  if (event.key === 'Home' && context.isOpen.value) {
    event.preventDefault()
    context.moveActiveFirst()
    return
  }

  if (event.key === 'End' && context.isOpen.value) {
    event.preventDefault()
    context.moveActiveLast()
    return
  }

  if (event.key === 'Enter' && context.isOpen.value) {
    const active = context.activeOptionValue.value
    if (active) {
      event.preventDefault()
      context.select(active)
      if (!context.multiple.value) {
        element.value?.focus({ preventScroll: true })
      }
    }
  }
}

defineExpose<GhostComboboxInputExposed>({
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
    @focus="handleFocus"
    @focusout="handleFocusOut"
    @click="handleClick"
    @keydown="handleKeydown"
  />
</template>
