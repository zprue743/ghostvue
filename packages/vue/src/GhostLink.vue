<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import GhostVisuallyHidden from './GhostVisuallyHidden.vue'
import type { GhostLinkElement, GhostLinkExposed } from './ghost-link'
import { resolveGhostLinkHtmlElement } from './ghost-link'
import { useGhostLink } from './use-ghost-link'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostLinkElement
    disabled?: boolean
    external?: boolean
    newTabLabel?: string
  }>(),
  {
    as: 'a',
    disabled: false,
    external: false,
    newTabLabel: 'Opens in new tab',
  },
)

defineSlots<{
  default(): unknown
  externalIndicator(): unknown
}>()

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveGhostLinkHtmlElement(hostRef.value))

const hrefAttr = computed(() => {
  const value = attrs['href']
  return typeof value === 'string' && value.length > 0 ? value : undefined
})

const targetAttr = computed(() => {
  const value = attrs['target']
  return typeof value === 'string' ? value : undefined
})

const relAttr = computed(() => {
  const value = attrs['rel']
  return typeof value === 'string' ? value : undefined
})

const newTabHintText = computed(() => ` (${props.newTabLabel})`)

const {
  isDisabled,
  isComponentHost,
  showExternalIndicator,
  showNewTabHint,
  rootProps,
} = useGhostLink({
  as: () => props.as,
  disabled: () => props.disabled,
  external: () => props.external,
  href: () => hrefAttr.value,
  target: () => targetAttr.value,
  rel: () => relAttr.value,
})

const hostAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'href' || key === 'rel') {
      continue
    }
    rest[key] = value
  }

  const merged: Record<string, unknown> = {
    ...rest,
    ...rootProps.value,
    class: [attrs.class, rootProps.value.class],
  }

  if (typeof attrs['data-part'] === 'string') {
    merged['data-part'] = attrs['data-part']
  }
  if (typeof attrs['data-state'] === 'string') {
    merged['data-state'] = attrs['data-state']
  }

  if (isDisabled.value && isComponentHost.value) {
    merged['disabled'] = true
  }

  return merged
})

function handleActivationCapture(event: MouseEvent) {
  if (!isDisabled.value) {
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
}

defineExpose<GhostLinkExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    if (isDisabled.value) {
      return
    }
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="hostAttrs"
    @click.capture="handleActivationCapture"
    @auxclick.capture="handleActivationCapture"
  >
    <slot />
    <span
      v-if="showExternalIndicator"
      data-part="external-icon"
      aria-hidden="true"
    >
      <slot name="externalIndicator">
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <path
            d="M5.75 3.5H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.75M10 2.5h3.5V6M9 7 13.5 2.5"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
    </span>
    <GhostVisuallyHidden v-if="showNewTabHint">
      {{ newTabHintText }}
    </GhostVisuallyHidden>
  </component>
</template>
