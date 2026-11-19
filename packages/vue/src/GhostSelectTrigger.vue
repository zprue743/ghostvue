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
  ghostSelectContextKey,
  ghostSelectListboxId,
  resolveSelectHtmlElement,
  type GhostSelectContext,
  type GhostSelectTriggerElement,
  type GhostSelectTriggerExposed,
} from './ghost-select'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostSelectTriggerElement
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const injected = inject(ghostSelectContextKey)
if (!injected) {
  throw new Error('GhostSelectTrigger must be used inside GhostSelect')
}
const context: GhostSelectContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveSelectHtmlElement(hostRef.value))
const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')
const isEffectivelyDisabled = computed(
  () => props.disabled || context.disabled.value,
)

const triggerId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultTriggerId.value
})

context.setTriggerRegistered(true)

watch(
  triggerId,
  (id) => {
    context.setTriggerId(id === context.defaultTriggerId.value ? null : id)
  },
  { immediate: true },
)

watch(
  element,
  (el) => {
    context.setTriggerElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setTriggerElement(null)
  context.setTriggerId(null)
  context.setTriggerRegistered(false)
})

function openWithFocus(preferEnd = false): void {
  if (isEffectivelyDisabled.value || context.isOpen.value) {
    return
  }
  context.openFocusFromEnd.value = preferEnd
  context.open()
  // Focuses at once where the list is already laid out; in a browser the
  // content is still unpositioned (visibility: hidden) here, so it takes
  // initial focus from the same rule when its focus scope activates.
  void Promise.resolve().then(() => {
    const selected = context.selectedValue.value
    if (selected && !context.isOptionDisabled(selected)) {
      context.focusOptionByValue(selected)
      return
    }
    context.focusFirstEnabledOption(preferEnd)
  })
}

// Booleans arrive as `true` from GhostFieldControl or as strings from
// templates (`aria-invalid="true"`); `false`/`"false"` mean unset.
function isAriaTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === ''
}

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'onClick' &&
      key !== 'onKeydown' &&
      key !== 'invalid' &&
      key !== 'required' &&
      key !== 'aria-invalid' &&
      key !== 'aria-required'
    ) {
      rest[key] = value
    }
  }

  /*
   * GhostFieldControl slot props spread onto the trigger carry field state as
   * `invalid`, `required`, and `aria-invalid`. The root's own flags and the
   * field's are combined so neither side can clear the other; the raw
   * `invalid`/`required` keys are consumed here because neither is a valid
   * attribute on the combobox host (native submit validation lives on the
   * root's hidden input).
   */
  const invalid =
    context.invalid.value ||
    isAriaTrue(attrs['invalid']) ||
    isAriaTrue(attrs['aria-invalid'])
  const required =
    context.required.value ||
    isAriaTrue(attrs['required']) ||
    isAriaTrue(attrs['aria-required'])

  const base: Record<string, unknown> = {
    ...rest,
    id: triggerId.value,
    role: 'combobox',
    'aria-haspopup': 'listbox',
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': ghostSelectListboxId(context.contentId.value),
    'aria-invalid': invalid ? 'true' : undefined,
    'aria-required': required ? 'true' : undefined,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }

  if (isNativeButtonTag.value) {
    base['type'] = attrs['type'] ?? 'button'
    base['disabled'] = isEffectivelyDisabled.value
  } else if (isComponentHost.value) {
    base['disabled'] = isEffectivelyDisabled.value
    if (attrs['type'] !== undefined) {
      base['type'] = attrs['type']
    }
  } else {
    base['role'] = attrs['role'] ?? 'combobox'
    base['tabindex'] =
      attrs['tabindex'] ?? (isEffectivelyDisabled.value ? undefined : 0)
    if (isEffectivelyDisabled.value) {
      base['aria-disabled'] = 'true'
    }
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

function handleClick(event: MouseEvent): void {
  if (isEffectivelyDisabled.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  invokeAttrHandler(attrs['onClick'], event)
  if (event.defaultPrevented) {
    return
  }
  if (context.isOpen.value) {
    context.close()
    return
  }
  if (element.value && document.activeElement !== element.value) {
    element.value.focus({ preventScroll: true })
  }
  openWithFocus()
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isEffectivelyDisabled.value) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
  if (event.defaultPrevented || isEffectivelyDisabled.value) {
    return
  }

  if (context.isOpen.value) {
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openWithFocus(event.key === 'ArrowUp')
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    /*
     * Cancel the key's default for every host. On a native button, Enter
     * synthesizes a click right after keydown (Space does so on keyup); that
     * click reached handleClick while the list was already open and closed it
     * again, so Enter never opened a button trigger.
     */
    event.preventDefault()
    openWithFocus()
  }
}

defineExpose<GhostSelectTriggerExposed>({
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
    v-bind="triggerAttrs"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>
