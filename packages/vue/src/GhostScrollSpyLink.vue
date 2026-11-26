<script setup lang="ts">
import { computed, inject, onBeforeUnmount, useTemplateRef, watch } from 'vue'

import GhostLink from './GhostLink.vue'
import {
  ghostScrollSpyContextKey,
  isScrollSpyPlainActivation,
  normalizeScrollSpyTargetId,
  resolveScrollSpyHtmlElement,
  type GhostScrollSpyLinkExposed,
} from './ghost-scroll-spy'
import type { GhostLinkElement } from './ghost-link'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    target: string
    href?: string
    as?: GhostLinkElement
    disabled?: boolean
  }>(),
  {
    as: 'a',
    disabled: false,
    href: '',
  },
)

defineSlots<{
  default(props: { active: boolean; target: string }): unknown
}>()

const scrollSpyContext = inject(ghostScrollSpyContextKey, null)
if (scrollSpyContext === null) {
  throw new Error('GhostScrollSpyLink must be used inside GhostScrollSpy')
}

const registrationId = Symbol('ghost-scroll-spy-link')
const hostRef = useTemplateRef('host')
const element = computed(() => resolveScrollSpyHtmlElement(hostRef.value))

const targetId = computed(() => normalizeScrollSpyTargetId(props.target))
const resolvedHref = computed(() =>
  props.href.length > 0 ? props.href : `#${targetId.value}`,
)
const active = computed(() => scrollSpyContext.isActive(targetId.value))

function getLinkElement(): HTMLElement | null {
  return element.value
}

watch(
  [targetId, () => props.disabled],
  () => {
    scrollSpyContext.registerItem(
      registrationId,
      targetId.value,
      props.disabled,
      getLinkElement,
    )
  },
  { immediate: true },
)

watch(element, () => {
  scrollSpyContext.registerItem(
    registrationId,
    targetId.value,
    props.disabled,
    getLinkElement,
  )
})

onBeforeUnmount(() => {
  scrollSpyContext.unregisterItem(registrationId)
})

const linkAttrs = computed(() => ({
  class: 'ghost-scroll-spy-link',
  'data-part': 'link',
  ...(active.value
    ? { 'data-state': 'active' as const, 'aria-current': 'location' as const }
    : {}),
  href: resolvedHref.value,
}))

function onClick(event: MouseEvent): void {
  if (scrollSpyContext === null || props.disabled) {
    return
  }
  if (!isScrollSpyPlainActivation(event)) {
    return
  }
  const target =
    typeof document !== 'undefined'
      ? document.getElementById(targetId.value)
      : null
  if (!target) {
    return
  }
  scrollSpyContext.handleActivate({
    id: targetId.value,
    element: target,
    event,
  })
}

defineExpose<GhostScrollSpyLinkExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    if (props.disabled) {
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
  <GhostLink
    ref="host"
    :as="as"
    :disabled="disabled"
    v-bind="{ ...$attrs, ...linkAttrs }"
    @click="onClick"
  >
    <slot :active="active" :target="targetId" />
  </GhostLink>
</template>
