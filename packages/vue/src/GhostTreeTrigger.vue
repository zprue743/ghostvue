<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostTreeItemContextKey,
  resolveTreeHtmlElement,
  type GhostTreeTriggerAction,
  type GhostTreeTriggerElement,
  type GhostTreeTriggerExposed,
  type GhostTreeTriggerSlotProps,
} from './ghost-tree'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component for the non-focusable row or disclosure target. */
    as?: GhostTreeTriggerElement
    /** Pointer click behavior: select and toggle, toggle only, or select only. */
    action?: GhostTreeTriggerAction
    /** Local disable flag, combined with the item and root `disabled`. */
    disabled?: boolean
  }>(),
  {
    as: 'span',
    action: 'both',
    disabled: false,
  },
)

defineSlots<{
  default(props: GhostTreeTriggerSlotProps): unknown
}>()

const injected = inject(ghostTreeItemContextKey)
if (!injected) {
  throw new Error('GhostTreeTrigger must be used inside GhostTreeItem')
}
const item = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveTreeHtmlElement(hostRef.value))

// Always called so Vue's per-instance id counter stays aligned under SSR.
const generatedId = useGhostId('ghost-tree-trigger')
const token = Symbol('ghost-tree-trigger')
const claimedDefaultId = shallowRef(false)

const triggerId = computed(() => {
  const custom = attrs['id']
  if (typeof custom === 'string' && custom.length > 0) {
    return custom
  }
  return claimedDefaultId.value
    ? item.defaultTriggerId.value
    : generatedId.value
})

/**
 * `'toggle'` triggers are disclosure affordances (for example a chevron) and
 * never name the item; any other trigger is a labelling trigger, and the
 * first one becomes the item's `aria-labelledby` target.
 */
function syncLabelRegistration(action: GhostTreeTriggerAction): void {
  item.unregisterLabelTrigger(token)
  claimedDefaultId.value = false
  if (action !== 'toggle') {
    claimedDefaultId.value = item.registerLabelTrigger(
      token,
      () => triggerId.value,
    )
  }
}

syncLabelRegistration(props.action)
watch(() => props.action, syncLabelRegistration)

onBeforeUnmount(() => {
  item.unregisterLabelTrigger(token)
})

const isDisabled = computed(() => props.disabled || item.disabled.value)

function onTriggerClick(event: MouseEvent): void {
  if (event.defaultPrevented || isDisabled.value) {
    return
  }
  item.activate(props.action)
}

const slotProps = computed<GhostTreeTriggerSlotProps>(() => ({
  selected: item.selected.value,
  expanded: item.expanded.value,
  disabled: isDisabled.value,
  expandable: item.expandable.value,
  level: item.level.value,
  select: item.select,
  toggle: item.toggle,
}))

// No role and no tabindex: the owning `treeitem` is the only focus target,
// so the tree has no nested interactive controls (axe `nested-interactive`).
const triggerAttrs = computed(() => {
  let dataState: string | undefined
  if (item.expandable.value) {
    dataState = item.expanded.value ? 'open' : 'closed'
  } else if (item.selected.value) {
    dataState = 'checked'
  }
  return mergeProps(attrs, {
    id: triggerId.value,
    class: 'ghost-tree-trigger',
    'data-part': 'trigger',
    'data-state': dataState,
    'data-selected': item.selected.value ? '' : undefined,
    'data-disabled': isDisabled.value ? '' : undefined,
    'aria-disabled': isDisabled.value ? 'true' : undefined,
    onClick: onTriggerClick,
  })
})

defineExpose<GhostTreeTriggerExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    item.element.value?.focus(options)
  },
  blur() {
    item.element.value?.blur()
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="triggerAttrs">
    <slot v-bind="slotProps" />
  </component>
</template>
