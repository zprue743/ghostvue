<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  useAttrs,
  useTemplateRef,
} from 'vue'

import { collapsibleHostAllowsAnimationShell } from './ghost-collapsible'
import {
  ghostTreeItemContextKey,
  resolveTreeHtmlElement,
  type GhostTreeGroupElement,
  type GhostTreeGroupExposed,
} from './ghost-tree'
import { useCollapsibleContentHidden } from './use-collapsible-content-hidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the `role="group"` child container. */
    as?: GhostTreeGroupElement
    /** Skips themed height transitions (`data-animation="off"`). */
    disableAnimation?: boolean
  }>(),
  {
    as: 'ul',
    disableAnimation: false,
  },
)

defineSlots<{
  default(): unknown
}>()

const injected = inject(ghostTreeItemContextKey)
if (!injected) {
  throw new Error('GhostTreeGroup must be used inside GhostTreeItem')
}
const item = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveTreeHtmlElement(hostRef.value))

const groupId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : item.defaultGroupId.value
})

// Registering in setup turns the owning item into a branch (`aria-expanded`,
// `aria-controls`) for the rest of the client lifetime.
const token = Symbol('ghost-tree-group')
item.registerGroup(token, () => groupId.value)
onBeforeUnmount(() => {
  item.unregisterGroup(token)
})

const hasDataThemed = computed(() => 'data-themed' in attrs)
const dataAnimationOff = computed(
  () => props.disableAnimation || attrs['data-animation'] === 'off',
)
const useThemedAnimationShell = computed(
  () => hasDataThemed.value && collapsibleHostAllowsAnimationShell(props.as),
)

// Same disclosure mechanics as GhostCollapsibleContent: headless groups hide
// immediately; themed groups defer `hidden` until the close transition ends.
// Navigation already excludes the children because it checks logical
// expansion, not the `hidden` attribute.
const panelHidden = useCollapsibleContentHidden({
  isOpen: () => item.expanded.value,
  host: hostRef,
  disableAnimation: () => props.disableAnimation,
  dataAnimationOff: () => dataAnimationOff.value,
  hasDataThemed: () => hasDataThemed.value,
})

const hasExplicitLabel = computed(
  () =>
    typeof attrs['aria-label'] === 'string' ||
    typeof attrs['aria-labelledby'] === 'string',
)

const groupAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'hidden') {
      rest[key] = value
    }
  }
  const result: Record<string, unknown> = {
    ...rest,
    id: groupId.value,
    role: 'group',
    ...(panelHidden.value ? { hidden: true } : {}),
    'data-part': 'group',
    'data-state': item.expanded.value ? 'open' : 'closed',
    ...(props.disableAnimation ? { 'data-animation': 'off' } : {}),
  }
  const labelId = item.labelTriggerId.value
  if (!hasExplicitLabel.value && labelId !== undefined) {
    result['aria-labelledby'] = labelId
  }
  return result
})

defineExpose<GhostTreeGroupExposed>({
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
  <component :is="as" ref="host" class="ghost-tree-group" v-bind="groupAttrs">
    <div v-if="useThemedAnimationShell" data-part="group-inner">
      <slot />
    </div>
    <slot v-else />
  </component>
</template>
