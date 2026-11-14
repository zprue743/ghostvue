<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, toRef, useTemplateRef, watch } from 'vue'

import {
  focusFirstEnabledAccordionTrigger,
  handleAccordionHeaderKeydown,
} from './accordion-header-keyboard'
import {
  ghostAccordionContextKey,
  resolveAccordionHtmlElement,
  type GhostAccordionExposed,
  type GhostAccordionHeadingLevel,
  type GhostAccordionType,
  type GhostAccordionValue,
} from './ghost-accordion'
import { useGhostAccordion } from './use-ghost-accordion'

// Explicit `modelValue: undefined` preserves uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    /** Single or multiple expanded panels. */
    type?: GhostAccordionType
    /** When `type` is `single`, allow closing the active panel. */
    collapsible?: boolean
    /** Controlled expansion value. Omit for uncontrolled mode. */
    modelValue?: GhostAccordionValue
    /** Initial expansion when `modelValue` is omitted. */
    defaultValue?: GhostAccordionValue
    /** Heading level wrapping each accordion trigger (`h1`–`h6`). */
    headingLevel?: GhostAccordionHeadingLevel
    /** Disables toggling on every item when `true`. */
    disabled?: boolean
  }>(),
  {
    type: 'single',
    collapsible: false,
    modelValue: undefined,
    defaultValue: undefined,
    headingLevel: 3,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** Emitted when the expansion value changes. */
  'update:modelValue': [value: GhostAccordionValue]
}>()

defineSlots<{
  default(): unknown
}>()

const accordion = useGhostAccordion({
  type: () => props.type,
  collapsible: () => props.collapsible,
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
})

provide(ghostAccordionContextKey, {
  type: accordion.type,
  collapsible: accordion.collapsible,
  headingLevel: computed(() => props.headingLevel),
  disabled: toRef(props, 'disabled'),
  isItemOpen: accordion.isItemOpen,
  setItemOpen: accordion.setItemOpen,
  isItemDisabled: () => props.disabled,
})

const hostRef = useTemplateRef('host')
const element = computed(() => resolveAccordionHtmlElement(hostRef.value))

let stopKeydownWatch: (() => void) | undefined

onMounted(() => {
  stopKeydownWatch = watch(
    element,
    (host, _prev, onCleanup) => {
      if (!host) {
        return
      }
      const onKeyDown = (event: KeyboardEvent): void => {
        handleAccordionHeaderKeydown(event, host)
      }
      host.addEventListener('keydown', onKeyDown)
      onCleanup(() => host.removeEventListener('keydown', onKeyDown))
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  stopKeydownWatch?.()
})

defineExpose<GhostAccordionExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const host = element.value
    if (!host) {
      return
    }
    focusFirstEnabledAccordionTrigger(host, options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <div ref="host" class="ghost-accordion" data-part="root" data-ghost-accordion>
    <slot />
  </div>
</template>