<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Prevents activation. */
    disabled?: boolean
    open?: boolean
    variant?: 'one' | 'two'
    count: number
  }>(),
  {
    disabled: false,
    variant: 'one',
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  select: [id: string]
}>()

const element = ref<HTMLDivElement | null>(null)

function focus(options?: FocusOptions) {
  element.value?.focus(options)
}

defineExpose({
  element,
  focus,
})

defineSlots<{
  default(slotProps: { open: boolean }): unknown
  icon(): unknown
}>()
</script>

<template>
  <div
    ref="element"
    :data-disabled="props.disabled ? '' : undefined"
    :data-variant="props.variant"
    :data-count="props.count"
    @click="emit('close')"
  >
    <slot :open="Boolean(props.open)" />
    <slot name="icon" />
  </div>
</template>
