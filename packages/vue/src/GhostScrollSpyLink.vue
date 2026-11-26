<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import type { GhostLinkElement } from './ghost-link'
import { resolveGhostLinkHtmlElement } from './ghost-link'
import {
  ghostScrollSpyContextKey,
  isScrollSpyPlainActivation,
  normalizeScrollSpyTargetId,
  resolveScrollSpyHtmlElement,
  type GhostScrollSpyLinkExposed,
} from './ghost-scroll-spy'
import { useGhostLink } from './use-ghost-link'

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

const attrs = useAttrs()
const scrollSpyContext = inject(ghostScrollSpyContextKey, null)
if (scrollSpyContext === null) {
  throw new Error('GhostScrollSpyLink must be used inside GhostScrollSpy')
}

const registrationId = Symbol('ghost-scroll-spy-link')
const hostRef = useTemplateRef('host')
const element = computed(() => {
  const fromHost = resolveGhostLinkHtmlElement(hostRef.value)
  if (fromHost) {
    return fromHost
  }
  return resolveScrollSpyHtmlElement(hostRef.value)
})

const targetId = computed(() => normalizeScrollSpyTargetId(props.target))
const resolvedHref = computed(() =>
  props.href.length > 0 ? props.href : `#${targetId.value}`,
)
const relAttr = computed(() => {
  const value = attrs['rel']
  return typeof value === 'string' ? value : undefined
})
const active = computed(() =>
  scrollSpyContext.isActive(targetId.value, registrationId),
)

const { isDisabled, isComponentHost, rootProps } = useGhostLink({
  as: () => props.as,
  disabled: () => props.disabled,
  href: () => resolvedHref.value,
  rel: () => relAttr.value,
})

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
    class: ['ghost-scroll-spy-link', attrs.class, rootProps.value.class],
    'data-part': 'link',
  }

  if (active.value && !isDisabled.value) {
    merged['data-state'] = 'active'
    merged['aria-current'] = 'location'
  }

  if (isComponentHost.value) {
    if (isDisabled.value) {
      merged['disabled'] = true
    } else {
      merged['href'] = resolvedHref.value
    }
  }

  return merged
})

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

function handleActivationCapture(event: MouseEvent): void {
  if (!isDisabled.value) {
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
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
  <component
    :is="as"
    ref="host"
    v-bind="hostAttrs"
    @click.capture="handleActivationCapture"
    @auxclick.capture="handleActivationCapture"
    @click="onClick"
  >
    <slot :active="active" :target="targetId" />
  </component>
</template>
