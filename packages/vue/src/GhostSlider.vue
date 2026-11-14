<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type PropType } from 'vue'

import type { GhostSliderExposed, GhostSliderValue } from './ghost-slider'
import { useNativeFormReset } from './form-reset'
import { useGhostSlider } from './use-ghost-slider'

defineOptions({ inheritAttrs: false })

// Runtime props keep omitted `modelValue` as undefined (not coerced).
const props = defineProps({
  modelValue: {
    type: [Number, Array] as PropType<GhostSliderValue | undefined>,
    default: undefined,
  },
  defaultValue: {
    type: [Number, Array] as PropType<GhostSliderValue | undefined>,
    default: undefined,
  },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  range: { type: Boolean, default: false },
  orientation: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
  },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  nameMax: { type: String, default: undefined },
  form: { type: String, default: undefined },
  valueText: { type: String, default: undefined },
})

const emit = defineEmits<{
  'update:modelValue': [value: GhostSliderValue]
}>()

const root = useTemplateRef<HTMLElement>('root')
const thumb0 = useTemplateRef<HTMLElement>('thumb0')
const formInput0 = useTemplateRef<HTMLInputElement>('formInput0')
const attrs = useAttrs()

const accessibleLabel = computed(() => {
  const fromAttrs = attrs['aria-label']
  if (typeof fromAttrs === 'string' && fromAttrs.length > 0) return fromAttrs
  return undefined
})

const {
  value,
  rootProps,
  trackProps,
  rangeProps,
  thumbProps,
  inputProps,
  applyFormReset,
  focusThumb,
  blurActiveThumb,
} = useGhostSlider({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  range: () => props.range,
  orientation: () => props.orientation,
  disabled: () => props.disabled,
  name: () => props.name,
  nameMax: () => props.nameMax,
  form: () => props.form,
  valueText: () => props.valueText,
  label: () => accessibleLabel.value,
  root,
  onChange: (next) => {
    emit('update:modelValue', next)
  },
})

useNativeFormReset(
  () =>
    formInput0.value ??
    root.value?.querySelector<HTMLInputElement>('input[type="hidden"]') ??
    null,
  applyFormReset,
)

const railStyle = computed(() =>
  props.orientation === 'vertical'
    ? {
        position: 'absolute' as const,
        insetBlock: '0',
        insetInlineStart: '50%',
        transform: 'translateX(-50%)',
        inlineSize: '0.375rem',
        blockSize: '100%',
      }
    : {
        position: 'absolute' as const,
        insetInline: '0',
        insetBlockStart: '50%',
        transform: 'translateY(-50%)',
        blockSize: '0.375rem',
        inlineSize: '100%',
      },
)

const rootBindings = computed(() => {
  const base = rootProps.value
  const extraClass = attrs.class
  return {
    ...base,
    ...attrs,
    class: extraClass ? [base.class, extraClass] : base.class,
    style: {
      position: 'relative' as const,
      display: 'inline-block',
      ...(props.orientation === 'vertical'
        ? { blockSize: '12rem', inlineSize: '2.5rem' }
        : { inlineSize: '12rem', blockSize: '2.5rem' }),
      ...(attrs.style &&
      typeof attrs.style === 'object' &&
      !Array.isArray(attrs.style)
        ? attrs.style
        : {}),
    },
  }
})

defineExpose<GhostSliderExposed>({
  get element() {
    return root.value
  },
  get value() {
    return value.value
  },
  focus(options?: FocusOptions) {
    focusThumb(0)
    if (options && thumb0.value) {
      // Honor preventScroll when callers pass it.
      thumb0.value.focus(options)
    }
  },
  blur() {
    blurActiveThumb()
  },
})
</script>

<template>
  <div ref="root" v-bind="rootBindings">
    <div data-part="rail" :style="railStyle">
      <div
        v-bind="trackProps"
        :style="{
          position: 'absolute',
          inset: '0',
          touchAction: 'none',
        }"
      />
      <div v-bind="rangeProps" />
      <div
        v-for="(thumb, index) in thumbProps"
        :key="index"
        :ref="index === 0 ? 'thumb0' : undefined"
        v-bind="thumb"
      />
    </div>
    <slot />
    <input v-if="inputProps[0]" ref="formInput0" v-bind="inputProps[0]" />
    <input v-if="inputProps[1]" v-bind="inputProps[1]" />
  </div>
</template>
