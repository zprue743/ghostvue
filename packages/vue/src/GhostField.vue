<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef } from 'vue'

import { ghostFieldContextKey, type GhostFieldExposed } from './ghost-field'
import { useGhostField, type GhostFieldRootProps } from './use-ghost-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Optional control id override for label association. */
    id?: string | undefined
    /** Propagates disabled semantics to the control. */
    disabled?: boolean
    /** Propagates invalid semantics and root `data-state`. */
    invalid?: boolean
    /** Propagates required semantics to the control. */
    required?: boolean
  }>(),
  {
    id: undefined,
    disabled: false,
    invalid: false,
    required: false,
  },
)

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const rootRef = useTemplateRef<HTMLElement>('root')

const {
  controlId,
  labelId,
  descriptionId,
  errorId,
  disabled,
  invalid,
  required,
} = useGhostField({
  id: () => props.id,
  disabled: () => props.disabled,
  invalid: () => props.invalid,
  required: () => props.required,
})

const descriptionRegistered = shallowRef(false)
const errorRegistered = shallowRef(false)
const errorVisible = shallowRef(false)

const ariaDescribedBy = computed(() => {
  const ids: string[] = []
  if (descriptionRegistered.value) {
    ids.push(descriptionId.value)
  }
  if (errorRegistered.value && errorVisible.value) {
    ids.push(errorId.value)
  }
  return ids.length > 0 ? ids.join(' ') : undefined
})

provide(ghostFieldContextKey, {
  controlId,
  labelId,
  descriptionId,
  errorId,
  disabled,
  invalid,
  required,
  descriptionRegistered,
  errorRegistered,
  errorVisible,
  ariaDescribedBy,
  setDescriptionRegistered(registered: boolean) {
    descriptionRegistered.value = registered
  },
  setErrorRegistered(registered: boolean) {
    errorRegistered.value = registered
  },
  setErrorVisible(visible: boolean) {
    errorVisible.value = visible
  },
})

const rootBindings = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'class') {
      rest[key] = value
    }
  }

  const result: GhostFieldRootProps & Record<string, unknown> = {
    ...rest,
    'data-part': 'root',
    'data-ghost-field': '',
  }

  if (invalid.value) {
    result['data-state'] = 'invalid'
  } else if (disabled.value) {
    result['data-state'] = 'disabled'
  }

  return result
})

defineExpose<GhostFieldExposed>({
  get element() {
    return rootRef.value
  },
})
</script>

<template>
  <div
    ref="root"
    class="ghost-field"
    :class="attrs.class"
    v-bind="rootBindings"
  >
    <slot />
  </div>
</template>
