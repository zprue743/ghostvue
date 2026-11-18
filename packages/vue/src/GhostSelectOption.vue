<script setup lang="ts">
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  onUpdated,
  useAttrs,
  useTemplateRef,
  watch,
  nextTick,
} from 'vue'

import {
  ghostSelectContextKey,
  resolveSelectHtmlElement,
  type GhostSelectContext,
  type GhostSelectOptionElement,
  type GhostSelectOptionExposed,
} from './ghost-select'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    value: string
    disabled?: boolean
    textValue?: string | undefined
    as?: GhostSelectOptionElement | undefined
  }>(),
  {
    disabled: false,
    textValue: undefined,
    as: undefined,
  },
)

const injected = inject(ghostSelectContextKey)
if (!injected) {
  throw new Error('GhostSelectOption must be used inside GhostSelect')
}
const context: GhostSelectContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const optionId = useGhostId('ghost-select-option')

const element = computed(() => resolveSelectHtmlElement(hostRef.value))

function resolveOptionTextValue(): string {
  if (props.textValue !== undefined) {
    return props.textValue
  }
  const el = element.value
  return el?.textContent.trim() ?? props.value
}

function getElement(): HTMLElement | null {
  return element.value
}

const registered = { value: false }
let textObserver: MutationObserver | undefined

function disconnectTextObserver(): void {
  textObserver?.disconnect()
  textObserver = undefined
}

function connectTextObserver(el: HTMLElement | null): void {
  disconnectTextObserver()
  if (
    !el ||
    props.textValue !== undefined ||
    typeof MutationObserver !== 'function'
  ) {
    return
  }
  textObserver = new MutationObserver(() => {
    syncRegistration()
  })
  textObserver.observe(el, {
    childList: true,
    characterData: true,
    subtree: true,
  })
}

function syncRegistration(): void {
  const text = resolveOptionTextValue()
  const optionDisabled = props.disabled
  if (!registered.value) {
    context.registerOption(props.value, text, optionDisabled, getElement)
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
  [element, () => props.textValue],
  ([el]) => {
    connectTextObserver(el)
    syncRegistration()
  },
  { flush: 'post' },
)

onMounted(() => {
  void nextTick(() => {
    connectTextObserver(element.value)
    syncRegistration()
  })
})

onUpdated(() => {
  syncRegistration()
})

onUnmounted(() => {
  disconnectTextObserver()
  context.unregisterOption(props.value)
})

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
      : optionDisabled
        ? 'disabled'
        : undefined,
    'data-value': props.value,
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
}

defineExpose<GhostSelectOptionExposed>({
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
  >
    <slot />
  </component>
</template>
