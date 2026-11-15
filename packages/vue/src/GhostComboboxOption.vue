<script setup lang="ts">
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
  nextTick,
} from 'vue'

import {
  ghostComboboxContextKey,
  resolveComboboxHtmlElement,
  type GhostComboboxContext,
  type GhostComboboxOptionElement,
  type GhostComboboxOptionExposed,
} from './ghost-combobox'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    value: string
    disabled?: boolean
    textValue?: string
    as?: GhostComboboxOptionElement
  }>(),
  {
    disabled: false,
  },
)

const injected = inject(ghostComboboxContextKey)
if (!injected) {
  throw new Error('GhostComboboxOption must be used inside GhostCombobox')
}
const context: GhostComboboxContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const optionId = useGhostId('ghost-combobox-option')

const element = computed(() => resolveComboboxHtmlElement(hostRef.value))

const resolvedTextValue = computed(() => {
  if (props.textValue) {
    return props.textValue
  }
  const el = element.value
  return el?.textContent.trim() ?? props.value
})

function getElement(): HTMLElement | null {
  return element.value
}

const registered = { value: false }

function syncRegistration(): void {
  const text = props.textValue ?? resolvedTextValue.value
  const optionDisabled = props.disabled
  if (!registered.value) {
    context.registerOption(
      props.value,
      text,
      optionDisabled,
      optionId.value,
      getElement,
    )
    registered.value = true
    return
  }
  context.setOptionTextValue(props.value, text)
  context.setOptionDisabled(props.value, optionDisabled)
}

watch(
  () => props.disabled,
  () => {
    syncRegistration()
  },
)

watch(
  [resolvedTextValue, () => props.textValue],
  () => {
    syncRegistration()
  },
  { flush: 'post' },
)

onMounted(() => {
  void nextTick(() => {
    syncRegistration()
  })
})

onUnmounted(() => {
  context.unregisterOption(props.value)
})

const isHighlighted = computed(
  () => context.activeOptionValue.value === props.value,
)

const optionAttrs = computed(() => {
  const selected = context.isSelected(props.value)
  const optionDisabled = context.isOptionDisabled(props.value)
  const rest: Record<string, unknown> = { ...attrs }

  return {
    ...rest,
    id: optionId.value,
    role: 'option',
    'aria-selected': selected ? 'true' : 'false',
    'data-part': 'option',
    'data-state': selected
      ? 'checked'
      : isHighlighted.value
        ? 'active'
        : optionDisabled
          ? 'disabled'
          : undefined,
    'data-value': props.value,
    'data-highlighted': isHighlighted.value ? '' : undefined,
    tabindex: -1,
    'aria-disabled': optionDisabled ? 'true' : undefined,
  }
})

function handlePointerDown(event: PointerEvent): void {
  if (context.isOptionDisabled(props.value)) {
    event.preventDefault()
    return
  }
  event.preventDefault()
}

function handleClick(event: MouseEvent): void {
  if (context.isOptionDisabled(props.value)) {
    event.preventDefault()
    return
  }
  context.select(props.value)
  context.inputElement.value?.focus({ preventScroll: true })
}

function handlePointerMove(): void {
  if (context.isOptionDisabled(props.value)) {
    return
  }
  context.setActiveOptionByValue(props.value)
}

defineExpose<GhostComboboxOptionExposed>({
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
    :is="as ?? 'div'"
    ref="host"
    v-bind="optionAttrs"
    @pointerdown="handlePointerDown"
    @click="handleClick"
    @pointermove="handlePointerMove"
  >
    <slot />
  </component>
</template>