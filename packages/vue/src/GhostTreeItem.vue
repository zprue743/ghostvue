<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  onBeforeUnmount,
  provide,
  shallowRef,
  useAttrs,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostTreeContextKey,
  ghostTreeItemContextKey,
  resolveTreeHtmlElement,
  scanTreeItemSlot,
  type GhostTreeItemContext,
  type GhostTreeItemElement,
  type GhostTreeItemExposed,
  type GhostTreeItemSlotProps,
  type GhostTreeNodeRecord,
  type GhostTreeTriggerAction,
} from './ghost-tree'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the `role="treeitem"` node. */
    as?: GhostTreeItemElement
    /** Unique, stable key used in `modelValue`, `expanded`, and focus tracking. */
    value: string
    /** Disables selection, expansion, and roving focus for this node only. */
    disabled?: boolean
    /** Explicit typeahead label; defaults to the trigger or own text. */
    textValue?: string | undefined
  }>(),
  {
    as: 'li',
    disabled: false,
    textValue: undefined,
  },
)

defineSlots<{
  default(props: GhostTreeItemSlotProps): unknown
}>()

const treeContext = inject(ghostTreeContextKey)
if (!treeContext) {
  throw new Error('GhostTreeItem must be used inside GhostTree')
}
const context = treeContext
const tree = context.tree
const parentItem = inject(ghostTreeItemContextKey, null)

const attrs = useAttrs()
// Untyped view of the same slots: a consumer may omit the default slot.
const slots = useSlots()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveTreeHtmlElement(hostRef.value))

// All three ids are generated here (not in the child parts) so the item can
// reference its trigger and group before they run setup, identically on the
// server and in the hydration render.
const defaultItemId = useGhostId('ghost-tree-item')
const defaultTriggerId = useGhostId('ghost-tree-trigger')
const defaultGroupId = useGhostId('ghost-tree-group')

const itemId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultItemId.value
})

const level = computed(() => (parentItem?.level.value ?? 0) + 1)

interface PartRegistration {
  token: symbol
  id: () => string
}

// Runtime registrations (client source of truth) in setup order.
const labelTriggers = shallowRef<PartRegistration[]>([])
const groups = shallowRef<PartRegistration[]>([])

// Render-time slot scan (see `scanTreeItemSlot`): written while this item
// renders and read by its child parts, which render afterwards.
const slotHasGroup = shallowRef(false)
const slotGroupId = shallowRef<string | undefined>(undefined)
const slotHasLabelTrigger = shallowRef(false)
const slotLabelTriggerId = shallowRef<string | undefined>(undefined)

const expandable = computed(() => groups.value.length > 0 || slotHasGroup.value)
const groupId = computed(
  () => groups.value[0]?.id() ?? slotGroupId.value ?? defaultGroupId.value,
)
const labelTriggerId = computed(() => {
  const registered = labelTriggers.value[0]
  if (registered) {
    return registered.id()
  }
  return slotHasLabelTrigger.value
    ? (slotLabelTriggerId.value ?? defaultTriggerId.value)
    : undefined
})

const isDisabled = computed(() => tree.disabled.value || props.disabled)
const selected = computed(() => tree.isSelected(props.value))
const expanded = computed(
  () => expandable.value && tree.isExpanded(props.value),
)
const focused = computed(() => tree.focusedValue.value === props.value)

/**
 * Typeahead label: the labelling trigger's text, else the item's own text.
 * Nested groups (children's labels) and decorative `aria-hidden` content such
 * as chevrons are skipped in both cases, mirroring the accessible name.
 */
function readOwnText(root: HTMLElement): string {
  let source: HTMLElement = root
  const triggerId = labelTriggerId.value
  if (triggerId !== undefined) {
    const trigger = root.ownerDocument.getElementById(triggerId)
    if (trigger && root.contains(trigger)) {
      source = trigger
    }
  }
  let text = ''
  const visit = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? ''
      } else if (
        child instanceof HTMLElement &&
        child.getAttribute('role') !== 'group' &&
        child.getAttribute('aria-hidden') !== 'true'
      ) {
        visit(child)
      }
    }
  }
  visit(source)
  return text
}

function register(): () => void {
  const record: GhostTreeNodeRecord = {
    value: props.value,
    parentValue: parentItem?.value.value,
    getElement: () => element.value,
    isDisabled: () => props.disabled,
    isExpandable: () => expandable.value,
    getTextValue: () => {
      if (props.textValue !== undefined) {
        return props.textValue
      }
      const root = element.value
      return root ? readOwnText(root) : ''
    },
  }
  return tree.registerNode(record)
}

// Registration happens in setup (not onMounted) so the server render and the
// hydration render see the same registry when computing the tab stop.
let unregister = register()

watch(
  () => props.value,
  () => {
    unregister()
    unregister = register()
  },
)

onBeforeUnmount(() => {
  unregister()
})

function select(): void {
  tree.select(props.value)
}

function toggle(): void {
  if (expandable.value) {
    tree.toggleExpanded(props.value)
  }
}

function activate(action: GhostTreeTriggerAction): void {
  if (isDisabled.value) {
    return
  }
  if (action !== 'toggle') {
    select()
  }
  if (
    action === 'toggle' ||
    (action === 'both' && context.expandOnClick.value)
  ) {
    toggle()
  }
}

function addPart(
  list: typeof labelTriggers,
  token: symbol,
  id: () => string,
): void {
  list.value = [...list.value, { token, id }]
}

function removePart(list: typeof labelTriggers, token: symbol): void {
  list.value = list.value.filter((entry) => entry.token !== token)
}

const itemContext: GhostTreeItemContext = {
  value: computed(() => props.value),
  level,
  element,
  selected,
  expanded,
  disabled: isDisabled,
  expandable,
  groupId,
  labelTriggerId,
  defaultTriggerId,
  defaultGroupId,
  registerLabelTrigger(token, id) {
    const first = labelTriggers.value.length === 0
    addPart(labelTriggers, token, id)
    return first
  },
  unregisterLabelTrigger(token) {
    removePart(labelTriggers, token)
  },
  registerGroup(token, id) {
    addPart(groups, token, id)
  },
  unregisterGroup(token) {
    removePart(groups, token)
  },
  select,
  toggle,
  activate,
}

provide(ghostTreeItemContextKey, itemContext)

const slotProps = computed<GhostTreeItemSlotProps>(() => ({
  selected: selected.value,
  expanded: expanded.value,
  focused: focused.value,
  disabled: isDisabled.value,
  expandable: expandable.value,
  level: level.value,
  select,
  toggle,
}))

/**
 * Row clicks act like a `'both'` trigger. Clicks that bubble from a nested
 * item, or from one of this item's own triggers (which already ran their
 * action), are ignored so a child interaction never selects its parent.
 */
function onItemClick(event: MouseEvent): void {
  const host = element.value
  const target = event.target
  if (event.defaultPrevented || !host || !(target instanceof Element)) {
    return
  }
  if (target.closest('[role="treeitem"]') !== host) {
    return
  }
  const trigger = target.closest('[data-part="trigger"]')
  if (trigger && host.contains(trigger)) {
    return
  }
  activate('both')
}

function toVNodeList(nodes: unknown): unknown[] | undefined {
  return Array.isArray(nodes) ? nodes : undefined
}

function hasExplicitLabel(): boolean {
  return (
    typeof attrs['aria-label'] === 'string' ||
    typeof attrs['aria-labelledby'] === 'string'
  )
}

/**
 * Called from the template so the slot scan runs inside this render, before
 * the item's own attributes are produced.
 */
function resolveItemAttrs(): Record<string, unknown> {
  const structure = scanTreeItemSlot(
    toVNodeList(slots['default']?.(slotProps.value)),
  )
  slotHasGroup.value = structure.hasGroup
  slotGroupId.value = structure.groupId
  slotHasLabelTrigger.value = structure.hasLabelTrigger
  slotLabelTriggerId.value = structure.labelTriggerId

  const { class: consumerClass, style: consumerStyle, ...rest } = attrs
  const tabbable = !isDisabled.value && tree.tabStopValue.value === props.value
  let dataState: string | undefined
  if (selected.value) {
    dataState = 'checked'
  } else if (isDisabled.value) {
    dataState = 'disabled'
  }

  const own: Record<string, unknown> = {
    id: itemId.value,
    class: ['ghost-tree-item', consumerClass],
    // Consumer style follows so it can override the level variable.
    style: [{ '--ghost-tree-level': String(level.value) }, consumerStyle],
    role: 'treeitem',
    tabindex: tabbable ? 0 : -1,
    'aria-selected': selected.value ? 'true' : 'false',
    'aria-disabled': isDisabled.value ? 'true' : undefined,
    'data-part': 'item',
    'data-state': dataState,
    'data-ghost-tree-value': props.value,
    'data-selected': selected.value ? '' : undefined,
    'data-disabled': isDisabled.value ? '' : undefined,
    'data-level': String(level.value),
    onClick: onItemClick,
  }
  if (expandable.value) {
    own['aria-expanded'] = expanded.value ? 'true' : 'false'
    own['aria-controls'] = groupId.value
    own['data-expanded'] = expanded.value ? 'true' : 'false'
  }
  if (!hasExplicitLabel() && labelTriggerId.value !== undefined) {
    own['aria-labelledby'] = labelTriggerId.value
  }
  // Consumer listeners run first so `preventDefault()` can opt out.
  return mergeProps(rest, own)
}

defineExpose<GhostTreeItemExposed>({
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
  <component :is="as" ref="host" v-bind="resolveItemAttrs()">
    <slot v-bind="slotProps" />
  </component>
</template>
