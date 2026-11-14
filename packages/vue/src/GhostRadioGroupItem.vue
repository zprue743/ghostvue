<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostRadioGroupContextKey,
  type GhostRadioGroupItemExposed,
} from './ghost-radio-group'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    value: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const injected = inject(ghostRadioGroupContextKey)
if (!injected) {
  throw new Error('GhostRadioGroupItem must be used inside GhostRadioGroup')
}
const context = injected

const attrs = useAttrs()
const element = useTemplateRef<HTMLInputElement>('element')
const defaultId = useGhostId('ghost-radio-group-item')
const inputId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultId.value
})

watch(
  [inputId, () => props.disabled],
  () => {
    context.registerItem(props.value, props.disabled, () => element.value)
  },
  { immediate: true },
)

watch(
  () => props.disabled,
  (disabled) => {
    context.setItemDisabled(props.value, disabled)
  },
)

watch(
  () => props.value,
  (value, previous) => {
    if (previous) {
      context.unregisterItem(previous)
    }
    context.registerItem(value, props.disabled, () => element.value)
  },
)

onUnmounted(() => {
  context.unregisterItem(props.value)
})

const selected = computed(() => {
  void context.registryVersion.value
  return context.isSelected(props.value)
})
const isDisabled = computed(() => context.isItemDisabled(props.value))

watch(
  () => context.selectedValue.value,
  () => {
    context.restoreItemDom(props.value)
  },
  { flush: 'post' },
)

const inputBindings = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'class' && key !== 'onChange') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    id: inputId.value,
    class: ['ghost-radio-group-item', attrs.class].filter(Boolean),
    type: 'radio' as const,
    name: context.name.value,
    value: props.value,
    checked: selected.value,
    disabled: isDisabled.value || undefined,
    required: context.required.value || undefined,
    'data-part': 'item',
    'data-ghost-radio-group-value': props.value,
    'data-ghost-radio-group': '',
    'data-state': selected.value ? 'checked' : undefined,
    onChange,
  }
})

function onChange(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || isDisabled.value) {
    return
  }
  context.select(props.value)
  context.restoreItemDom(props.value)
  void nextTick(() => {
    context.restoreItemDom(props.value)
  })
}

defineExpose<GhostRadioGroupItemExposed>({
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
  <input ref="element" v-bind="inputBindings" />
</template>
