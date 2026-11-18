<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  useAttrs,
  useTemplateRef,
} from 'vue'

import {
  ghostFileUploadContextKey,
  type GhostFileUploadTriggerExposed,
} from './ghost-file-upload'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Disables this trigger only; combines with the root `disabled`. */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostFileUploadContextKey)
if (!injected) {
  throw new Error('GhostFileUploadTrigger must be used inside GhostFileUpload')
}
const context = injected

const attrs = useAttrs()
const host = useTemplateRef<HTMLButtonElement>('host')

onMounted(() => {
  context.setTriggerElement(host.value)
})
onBeforeUnmount(() => {
  context.setTriggerElement(null)
})

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

const bindings = computed(() => {
  const base = context.upload.triggerProps.value
  const disabled = base.disabled || props.disabled
  const id = nonEmptyString(attrs['id']) ?? base.id

  const describedBy = [
    context.describedBy.value,
    nonEmptyString(attrs['aria-describedby']),
  ]
    .filter(Boolean)
    .join(' ')

  const own: Record<string, unknown> = {
    ...base,
    id,
    disabled,
    // Invalid wins over disabled, matching GhostInput.
    'data-state': base['data-state'] ?? (disabled ? 'disabled' : undefined),
    'aria-describedby': describedBy || undefined,
  }

  // Inside GhostField, compose "Label, Choose files" unless the consumer
  // named the trigger. Native `label[for]` alone varies by browser for buttons
  // and may drop the action text.
  const labelId = context.fieldLabelId.value
  const named =
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined
  if (labelId && !named) {
    own['aria-labelledby'] = `${labelId} ${id}`
  }

  return mergeProps(attrs, own)
})

defineExpose<GhostFileUploadTriggerExposed>({
  get element() {
    return host.value
  },
  focus(options?: FocusOptions) {
    host.value?.focus(options)
  },
  blur() {
    host.value?.blur()
  },
})
</script>

<template>
  <button ref="host" v-bind="bindings">
    <slot />
  </button>
</template>
