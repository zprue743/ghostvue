<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  provide,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostTreeContextKey,
  resolveTreeHtmlElement,
  type GhostTreeDirection,
  type GhostTreeElement,
  type GhostTreeExposed,
  type GhostTreeSelectionMode,
  type GhostTreeSelectPayload,
  type GhostTreeSlotProps,
  type GhostTreeTogglePayload,
  type GhostTreeValue,
} from './ghost-tree'
import { useGhostTree } from './use-ghost-tree'

// Explicit `undefined` defaults keep `modelValue` / `expanded` uncontrolled
// when omitted instead of Vue coercing them to empty values.
const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the `role="tree"` container. */
    as?: GhostTreeElement
    /** Single (`string | undefined`) or multiple (`string[]`) selection. */
    selectionMode?: GhostTreeSelectionMode
    /** Controlled selection (`v-model`). Omit for uncontrolled mode. */
    modelValue?: GhostTreeValue
    /** Initial uncontrolled selection. */
    defaultValue?: GhostTreeValue
    /** Controlled expanded branch values (`v-model:expanded`). */
    expanded?: string[] | undefined
    /** Initial expanded branch values when `expanded` is omitted. */
    defaultExpanded?: string[]
    /** In single mode, re-activating the selected node clears the selection. */
    allowDeselect?: boolean
    /** Pointer clicks on a branch row also toggle expansion. */
    expandOnClick?: boolean
    /** `ArrowDown` / `ArrowUp` wrap at the ends of the visible node list. */
    loop?: boolean
    /** Explicit writing direction; otherwise inherited from `[dir]`. */
    dir?: GhostTreeDirection | undefined
    /** Disables every interaction in the tree. */
    disabled?: boolean
  }>(),
  {
    as: 'ul',
    selectionMode: 'single',
    modelValue: undefined,
    defaultValue: undefined,
    expanded: undefined,
    defaultExpanded: () => [],
    allowDeselect: false,
    expandOnClick: true,
    loop: false,
    dir: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** Emitted with the next selection (a new array in multiple mode). */
  'update:modelValue': [value: GhostTreeValue]
  /** Emitted with the next expanded values (always a new array). */
  'update:expanded': [expanded: string[]]
  /** Emitted after an enabled node's selection action is triggered. */
  select: [payload: GhostTreeSelectPayload]
  /** Emitted after an enabled branch's expansion action is triggered. */
  toggle: [payload: GhostTreeTogglePayload]
}>()

defineSlots<{
  default(props: GhostTreeSlotProps): unknown
}>()

const hostRef = useTemplateRef('host')
const element = computed(() => resolveTreeHtmlElement(hostRef.value))

const tree = useGhostTree({
  selectionMode: () => props.selectionMode,
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  expanded: () => props.expanded,
  defaultExpanded: () => props.defaultExpanded,
  allowDeselect: () => props.allowDeselect,
  loop: () => props.loop,
  disabled: () => props.disabled,
  dir: () => props.dir,
  rootElement: element,
  onValueChange: (value) => {
    emit('update:modelValue', value)
  },
  onExpandedChange: (expanded) => {
    emit('update:expanded', expanded)
  },
  onSelect: (payload) => {
    emit('select', payload)
  },
  onToggle: (payload) => {
    emit('toggle', payload)
  },
})

provide(ghostTreeContextKey, {
  tree,
  expandOnClick: computed(() => props.expandOnClick),
})

// Listeners attach after mount (SSR-safe) and after Vue's own invokers so a
// consumer `@keydown` that calls `preventDefault()` opts out of tree handling.
let stopListenerWatch: (() => void) | undefined

onMounted(() => {
  stopListenerWatch = watch(
    element,
    (host, _previous, onCleanup) => {
      if (!host) {
        return
      }
      host.addEventListener('keydown', tree.handleKeydown)
      host.addEventListener('focusin', tree.handleFocusIn)
      onCleanup(() => {
        host.removeEventListener('keydown', tree.handleKeydown)
        host.removeEventListener('focusin', tree.handleFocusIn)
      })
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  stopListenerWatch?.()
})

const slotProps = computed<GhostTreeSlotProps>(() => ({
  modelValue: tree.modelValue.value,
  expanded: tree.expanded.value,
  focusedValue: tree.focusedValue.value,
  isSelected: tree.isSelected,
  isExpanded: tree.isExpanded,
  select: tree.select,
  toggleExpanded: tree.toggleExpanded,
  expandAllSiblings: tree.expandAllSiblings,
}))

defineExpose<GhostTreeExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const value = tree.tabStopValue.value
    if (value !== undefined) {
      tree.focusNode(value, options)
    }
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
    class="ghost-tree"
    role="tree"
    :aria-multiselectable="selectionMode === 'multiple' ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    data-part="root"
    data-ghost-tree=""
    :data-dir="tree.dir.value"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot v-bind="slotProps" />
  </component>
</template>
