<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  shallowRef,
  useAttrs,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  type GhostFieldContext,
  type GhostFieldErrorElement,
  type GhostFieldErrorExposed,
} from './ghost-field'
import {
  fieldPartSlotHasRenderableContent,
  useGhostFieldPartContent,
} from './use-ghost-field-part-content'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    as?: GhostFieldErrorElement
  }>(),
  {
    as: 'span',
  },
)

const injectedFieldContext = inject(ghostFieldContextKey)
if (!injectedFieldContext) {
  throw new Error('GhostFieldError must be used inside GhostField')
}
const fieldContext: GhostFieldContext = injectedFieldContext

const attrs = useAttrs()
const slots = useSlots()
const hostRef = useTemplateRef<HTMLElement>('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))
const visible = shallowRef(false)

const errorId = computed(() => {
  const customId = attrs['id']
  return typeof customId === 'string' && customId.length > 0
    ? customId
    : fieldContext.defaultErrorId.value
})

watch(
  errorId,
  (id) => {
    fieldContext.setErrorId(
      id === fieldContext.defaultErrorId.value ? null : id,
    )
  },
  { immediate: true },
)

onUnmounted(() => {
  fieldContext.setErrorId(null)
})

useGhostFieldPartContent(hostRef, (next) => {
  visible.value = next
  fieldContext.setErrorVisible(next)
  fieldContext.setErrorRegistered(next)
})

function buildErrorAttrs(): Record<string, unknown> {
  const slotRender = slots['default']
  const showInMarkup = slotRender
    ? fieldPartSlotHasRenderableContent(slotRender())
    : false

  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'hidden' && key !== 'role') {
      rest[key] = value
    }
  }

  const result: Record<string, unknown> = {
    ...rest,
    id: errorId.value,
    'data-part': 'error',
  }

  if (showInMarkup) {
    result['role'] = 'alert'
  } else {
    result['hidden'] = true
  }

  return result
}

defineExpose<GhostFieldErrorExposed>({
  get element() {
    return visible.value ? element.value : null
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
  <component :is="as" ref="host" v-bind="buildErrorAttrs()">
    <slot />
  </component>
</template>
