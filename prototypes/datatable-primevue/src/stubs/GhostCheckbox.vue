<script setup lang="ts">
import { onMounted, ref, useAttrs, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    indeterminate?: boolean
    disabled?: boolean
  }>(),
  { modelValue: false, indeterminate: false, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const attrs = useAttrs()

const input = ref<HTMLInputElement | null>(null)

function syncIndeterminate() {
  if (input.value) input.value.indeterminate = props.indeterminate
}

onMounted(syncIndeterminate)
watch(() => props.indeterminate, syncIndeterminate)
</script>

<template>
  <input
    ref="input"
    type="checkbox"
    v-bind="attrs"
    :checked="modelValue"
    :disabled="disabled"
    @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
  />
</template>