<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  type GhostFieldLabelAssociate,
  type GhostFieldLabelElement,
  type GhostFieldLabelExposed,
} from './ghost-field'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostFieldLabelElement
    associate?: GhostFieldLabelAssociate
    required?: boolean
    showRequired?: boolean
  }>(),
  {
    as: 'label',
    associate: 'reference',
    required: false,
    showRequired: true,
  },
)

const context = inject(ghostFieldContextKey)
if (!context) {
  throw new Error('GhostFieldLabel must be used inside GhostField')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))

const isRequired = computed(() => props.required || context.required.value)

const labelAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'for') {
      rest[key] = value
    }
  }

  const customId = attrs['id']
  const id =
    typeof customId === 'string' && customId.length > 0
      ? customId
      : context.labelId.value

  const result: Record<string, unknown> = {
    ...rest,
    id,
    'data-part': 'label',
  }

  if (props.associate === 'reference') {
    result['for'] = context.controlId.value
  }

  return result
})

defineExpose<GhostFieldLabelExposed>({
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
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
    <span
      v-if="showRequired && isRequired"
      aria-hidden="true"
      data-part="required-indicator"
    >
      *
    </span>
  </component>
</template>
