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
  ghostComboboxListboxId,
  resolveComboboxHtmlElement,
  type GhostComboboxContext,
  type GhostComboboxTriggerElement,
  type GhostComboboxTriggerExposed,
} from './ghost-combobox'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostComboboxTriggerElement
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const injected = inject(ghostComboboxContextKey)
if (!injected) {
  throw new Error('GhostComboboxTrigger must be used inside GhostCombobox')
}
const context: GhostComboboxContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveComboboxHtmlElement(hostRef.value))
const isNativeButtonTag = computed(() => props.as === 'button')
const isEffectivelyDisabled = computed(
  () => props.disabled || context.disabled.value,
)

// The trigger is part of the widget for focus departure (GHO-166): moving
// focus between it and the input must not close the list.
watch(
  element,
  (el) => {
    context.setTriggerElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setTriggerElement(null)
})

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'type' && key !== 'onClick' && key !== 'onKeydown') {
      rest[key] = value
    }
  }
  const open = context.isOpen.value
  return {
    ...rest,
    type: isNativeButtonTag.value ? (attrs['type'] ?? 'button') : attrs['type'],
    'aria-expanded': String(open),
    'aria-controls': ghostComboboxListboxId(context.contentId.value),
    'data-part': 'trigger',
    'data-state': open ? 'open' : 'closed',
    disabled: isNativeButtonTag.value ? isEffectivelyDisabled.value : undefined,
    'aria-disabled':
      !isNativeButtonTag.value && isEffectivelyDisabled.value
        ? 'true'
        : undefined,
    // eslint-disable-next-line @typescript-eslint/dot-notation -- fallthrough attrs use an index signature
    class: ['ghost-combobox-trigger', attrs['class']],
  }
})

function handleClick(event: MouseEvent): void {
  if (isEffectivelyDisabled.value) {
    event.preventDefault()
    return
  }
  context.toggleOpen()
  context.inputElement.value?.focus({ preventScroll: true })
}

function handleKeydown(event: KeyboardEvent): void {
  if (isEffectivelyDisabled.value) {
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    context.toggleOpen()
    context.inputElement.value?.focus({ preventScroll: true })
  }
}

defineExpose<GhostComboboxTriggerExposed>({
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
    @focusout="context.notifyFocusOut"
    @pointerdown="context.notifyPointerDownInside"
  >
    <slot />
  </component>
</template>
