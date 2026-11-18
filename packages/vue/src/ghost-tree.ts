import {
  isVNode,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
  type VNode,
} from 'vue'

/** Single (`string | undefined`) or multiple (`string[]`) selection. */
export type GhostTreeSelectionMode = 'single' | 'multiple'

/**
 * Committed selection. `string | undefined` in `'single'` mode and `string[]`
 * in `'multiple'` mode.
 */
export type GhostTreeValue = string | string[] | undefined

/** Writing direction used to map `ArrowRight` / `ArrowLeft`. */
export type GhostTreeDirection = 'ltr' | 'rtl'

/**
 * Pointer action of a {@link GhostTreeTrigger}: `'both'` selects and (for
 * branches with `expandOnClick`) toggles, `'toggle'` only toggles expansion,
 * `'select'` only selects.
 */
export type GhostTreeTriggerAction = 'both' | 'toggle' | 'select'

/** Valid `as` targets for {@link GhostTree}. */
export type GhostTreeElement = string | Component

/** Valid `as` targets for {@link GhostTreeItem}. */
export type GhostTreeItemElement = string | Component

/** Valid `as` targets for {@link GhostTreeTrigger}. */
export type GhostTreeTriggerElement = string | Component

/** Valid `as` targets for {@link GhostTreeGroup}. */
export type GhostTreeGroupElement = string | Component

/** Payload of the `select` event. `selected` is the requested next state. */
export interface GhostTreeSelectPayload {
  value: string
  selected: boolean
}

/** Payload of the `toggle` event. `expanded` is the requested next state. */
export interface GhostTreeTogglePayload {
  value: string
  expanded: boolean
}

/** Props for the {@link GhostTree} root component. */
export interface GhostTreeProps {
  /**
   * Tag name or component rendered for the `role="tree"` container.
   * @default 'ul'
   */
  as?: GhostTreeElement
  /**
   * Single or multiple selection. `'multiple'` sets `aria-multiselectable`.
   * @default 'single'
   */
  selectionMode?: GhostTreeSelectionMode
  /**
   * Controlled selection (`v-model`). Omit for uncontrolled mode.
   * @default undefined
   */
  modelValue?: GhostTreeValue
  /**
   * Initial uncontrolled selection.
   * @default undefined
   */
  defaultValue?: GhostTreeValue
  /**
   * Controlled expanded branch values (`v-model:expanded`). Omit for
   * uncontrolled mode.
   * @default undefined
   */
  expanded?: string[] | undefined
  /**
   * Initial expanded branch values when `expanded` is omitted.
   * @default []
   */
  defaultExpanded?: string[]
  /**
   * In `'single'` mode, re-activating the selected node clears the selection.
   * @default false
   */
  allowDeselect?: boolean
  /**
   * Pointer clicks on a branch row (or a `'both'` trigger) also toggle expansion.
   * @default true
   */
  expandOnClick?: boolean
  /**
   * `ArrowDown` / `ArrowUp` wrap at the ends of the visible node list.
   * @default false
   */
  loop?: boolean
  /**
   * Explicit writing direction. When omitted, resolves from the closest
   * `[dir]` ancestor, then `<html dir>`, then `'ltr'`.
   * @default undefined
   */
  dir?: GhostTreeDirection | undefined
  /**
   * Disables every interaction in the tree.
   * @default false
   */
  disabled?: boolean
}

/** Props passed to the {@link GhostTree} default slot. */
export interface GhostTreeSlotProps {
  modelValue: GhostTreeValue
  expanded: string[]
  focusedValue: string | undefined
  isSelected: (value: string) => boolean
  isExpanded: (value: string) => boolean
  select: (value: string) => void
  toggleExpanded: (value: string) => void
  expandAllSiblings: (value: string) => void
}

/** Methods and state exposed by a template ref to {@link GhostTree}. */
export interface GhostTreeExposed {
  readonly element: HTMLElement | null
  /** Focuses the current roving tab stop item, if any. */
  focus(options?: FocusOptions): void
  blur(): void
}

/** Props for {@link GhostTreeItem}. */
export interface GhostTreeItemProps {
  /**
   * Tag name or component rendered for the `role="treeitem"` node.
   * @default 'li'
   */
  as?: GhostTreeItemElement
  /** Unique, stable key used in `modelValue`, `expanded`, and focus tracking. */
  value: string
  /**
   * Disables selection, expansion, and roving focus for this node only.
   * @default false
   */
  disabled?: boolean
  /**
   * Explicit typeahead label. Defaults to the trigger text, or the item's own
   * text excluding nested groups.
   * @default undefined
   */
  textValue?: string | undefined
}

/** Props passed to the {@link GhostTreeItem} default slot. */
export interface GhostTreeItemSlotProps {
  selected: boolean
  expanded: boolean
  focused: boolean
  disabled: boolean
  expandable: boolean
  level: number
  select: () => void
  toggle: () => void
}

/** Methods and state exposed by a template ref to {@link GhostTreeItem}. */
export interface GhostTreeItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Props for {@link GhostTreeTrigger}. */
export interface GhostTreeTriggerProps {
  /**
   * Tag name or component for the non-focusable row or disclosure target.
   * @default 'span'
   */
  as?: GhostTreeTriggerElement
  /**
   * Pointer click behavior.
   * @default 'both'
   */
  action?: GhostTreeTriggerAction
  /**
   * Local disable flag, combined with the item and root `disabled`.
   * @default false
   */
  disabled?: boolean
}

/** Props passed to the {@link GhostTreeTrigger} default slot. */
export interface GhostTreeTriggerSlotProps {
  selected: boolean
  expanded: boolean
  disabled: boolean
  expandable: boolean
  level: number
  select: () => void
  toggle: () => void
}

/**
 * Methods and state exposed by a template ref to {@link GhostTreeTrigger}.
 * `focus()` delegates to the owning `role="treeitem"` element.
 */
export interface GhostTreeTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Props for {@link GhostTreeGroup}. */
export interface GhostTreeGroupProps {
  /**
   * Tag name or component rendered for the `role="group"` child container.
   * @default 'ul'
   */
  as?: GhostTreeGroupElement
  /**
   * Skips themed height transitions (`data-animation="off"`).
   * @default false
   */
  disableAnimation?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostTreeGroup}. */
export interface GhostTreeGroupExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/**
 * A mounted `GhostTreeItem` as seen by {@link useGhostTree}. Getters keep the
 * registry free of reactive copies: the composable reads current prop values
 * and DOM elements only when it needs them (navigation, typeahead, recovery).
 */
export interface GhostTreeNodeRecord {
  readonly value: string
  /** Value of the closest ancestor `GhostTreeItem`, or `undefined` at root level. */
  readonly parentValue: string | undefined
  getElement: () => HTMLElement | null
  /** The item's own `disabled` prop (the root flag is applied separately). */
  isDisabled: () => boolean
  /** `true` once a `GhostTreeGroup` belongs to the item. */
  isExpandable: () => boolean
  /** Label used by printable-character typeahead. */
  getTextValue: () => string
}

/** Options for {@link useGhostTree}. */
export interface UseGhostTreeOptions {
  selectionMode?: MaybeRefOrGetter<GhostTreeSelectionMode | undefined>
  modelValue?: MaybeRefOrGetter<GhostTreeValue>
  defaultValue?: MaybeRefOrGetter<GhostTreeValue>
  expanded?: MaybeRefOrGetter<string[] | undefined>
  defaultExpanded?: MaybeRefOrGetter<string[] | undefined>
  allowDeselect?: MaybeRefOrGetter<boolean | undefined>
  loop?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  dir?: MaybeRefOrGetter<GhostTreeDirection | undefined>
  /** Tree root element; used to resolve the inherited writing direction. */
  rootElement?: MaybeRefOrGetter<HTMLElement | null | undefined>
  onValueChange?: (value: GhostTreeValue) => void
  onExpandedChange?: (expanded: string[]) => void
  onSelect?: (payload: GhostTreeSelectPayload) => void
  onToggle?: (payload: GhostTreeTogglePayload) => void
}

/** Reactive state and helpers returned by {@link useGhostTree}. */
export interface UseGhostTreeReturn {
  /** Authoritative committed selection (controlled prop or internal state). */
  modelValue: ComputedRef<GhostTreeValue>
  /** Authoritative expanded branch values. */
  expanded: ComputedRef<string[]>
  /** Value of the item that owns (or last owned) keyboard focus. */
  focusedValue: Ref<string | undefined>
  /** Value of the single item that renders `tabindex="0"`. */
  tabStopValue: ComputedRef<string | undefined>
  /** Effective writing direction (`'ltr'` during SSR unless explicit). */
  dir: ComputedRef<GhostTreeDirection>
  disabled: ComputedRef<boolean>
  isSelected: (value: string) => boolean
  isExpanded: (value: string) => boolean
  /** Root or item `disabled`. */
  isDisabled: (value: string) => boolean
  select: (value: string) => void
  setExpanded: (value: string, expanded: boolean) => void
  toggleExpanded: (value: string) => void
  expandAllSiblings: (value: string) => void
  /** Registers a node; returns the matching unregister function. */
  registerNode: (record: GhostTreeNodeRecord) => () => void
  /** Moves `focusedValue` (and DOM focus when mounted) to `value`. */
  focusNode: (value: string, options?: FocusOptions) => boolean
  /** Root keydown handler implementing the APG Tree View keyboard contract. */
  handleKeydown: (event: KeyboardEvent) => void
  /** Root focusin handler that tracks the focused item. */
  handleFocusIn: (event: FocusEvent) => void
  /** Visible enabled values in rendered document order. */
  getNavigableValues: () => string[]
}

/** Context shared from {@link GhostTree} with every descendant part. */
export interface GhostTreeContext {
  tree: UseGhostTreeReturn
  expandOnClick: ComputedRef<boolean>
}

/**
 * Context shared from a {@link GhostTreeItem} with its own trigger(s), group,
 * and nested items (which read it as their parent).
 */
export interface GhostTreeItemContext {
  value: ComputedRef<string>
  level: ComputedRef<number>
  element: ComputedRef<HTMLElement | null>
  selected: ComputedRef<boolean>
  expanded: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  expandable: ComputedRef<boolean>
  /** Effective `role="group"` id used by `aria-controls`. */
  groupId: ComputedRef<string>
  /** Effective labelling trigger id, when a labelling trigger exists. */
  labelTriggerId: ComputedRef<string | undefined>
  /** Item-generated id for the first labelling trigger. */
  defaultTriggerId: ComputedRef<string>
  /** Item-generated id for the group. */
  defaultGroupId: ComputedRef<string>
  /**
   * Registers a labelling trigger (`action` other than `'toggle'`). Returns
   * `true` when it is the first one and should use `defaultTriggerId`.
   */
  registerLabelTrigger: (token: symbol, id: () => string) => boolean
  unregisterLabelTrigger: (token: symbol) => void
  registerGroup: (token: symbol, id: () => string) => void
  unregisterGroup: (token: symbol) => void
  select: () => void
  toggle: () => void
  /** Pointer activation shared by the item row and its triggers. */
  activate: (action: GhostTreeTriggerAction) => void
}

export const ghostTreeContextKey: InjectionKey<GhostTreeContext> =
  Symbol('ghost-tree')

export const ghostTreeItemContextKey: InjectionKey<GhostTreeItemContext> =
  Symbol('ghost-tree-item')

/** Component `name` shared by the headless and themed tree parts. */
export const GHOST_TREE_GROUP_NAME = 'GhostTreeGroup'
export const GHOST_TREE_TRIGGER_NAME = 'GhostTreeTrigger'

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so themed wrappers resolve to
 * their inner element).
 */
export function resolveTreeHtmlElement(target: unknown): HTMLElement | null {
  if (typeof HTMLElement === 'undefined') {
    return null
  }
  if (target instanceof HTMLElement) {
    return target
  }
  if (typeof target === 'object' && target !== null) {
    if ('element' in target && target.element instanceof HTMLElement) {
      return target.element
    }
    if ('$el' in target && target.$el instanceof HTMLElement) {
      return target.$el
    }
  }
  return null
}

function readDir(
  element: Element | null | undefined,
): GhostTreeDirection | null {
  const value = element?.getAttribute('dir')?.trim().toLowerCase()
  return value === 'rtl' || value === 'ltr' ? value : null
}

/**
 * Resolves the effective writing direction for a tree, SSR-safe.
 *
 * Priority: explicit `dir` → closest `[dir="ltr" | "rtl"]` ancestor (or self)
 * of `element` → `<html dir>` → `'ltr'`. `dir="auto"` and other values are
 * skipped so resolution falls through to the next source.
 */
export function resolveTreeDir(
  explicitDir: GhostTreeDirection | undefined,
  element?: HTMLElement | null,
): GhostTreeDirection {
  if (explicitDir === 'ltr' || explicitDir === 'rtl') {
    return explicitDir
  }
  let current: Element | null = element ?? null
  while (current) {
    const value = readDir(current)
    if (value) {
      return value
    }
    current = current.parentElement
  }
  if (typeof document === 'undefined') {
    return 'ltr'
  }
  return readDir(document.documentElement) ?? 'ltr'
}

/** Structure of one item's direct slot output, read before the item renders. */
export interface GhostTreeItemSlotStructure {
  hasGroup: boolean
  /** Consumer `id` on the first group, if any. */
  groupId: string | undefined
  hasLabelTrigger: boolean
  /** Consumer `id` on the first labelling trigger, if any. */
  labelTriggerId: string | undefined
}

function componentName(type: unknown): string | undefined {
  if (typeof type !== 'object' || type === null) {
    return undefined
  }
  if ('name' in type && typeof type.name === 'string') {
    return type.name
  }
  if ('__name' in type && typeof type.__name === 'string') {
    return type.__name
  }
  return undefined
}

function readStringProp(vnode: VNode, key: string): string | undefined {
  const value: unknown = vnode.props?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Scans the vnodes an item is about to render for its own `GhostTreeGroup`
 * and labelling `GhostTreeTrigger`.
 *
 * Why: an item's attributes (`aria-expanded`, `aria-controls`,
 * `aria-labelledby`) are serialized before its child parts run `setup()`, so
 * runtime registration alone cannot produce them in server-rendered HTML.
 * Reading the slot's vnode types gives the same answer on the server and in
 * the hydration render, while registration stays the client source of truth
 * (it also covers parts hidden inside consumer wrapper components, which this
 * shallow scan cannot see). Matching is by component name so the themed
 * wrappers in `@ghostvue/themes` are recognized too. The scan descends
 * through elements and fragments but never into component slots, so nested
 * items and their parts are not mistaken for this item's own.
 */
export function scanTreeItemSlot(
  nodes: readonly unknown[] | undefined,
): GhostTreeItemSlotStructure {
  const result: GhostTreeItemSlotStructure = {
    hasGroup: false,
    groupId: undefined,
    hasLabelTrigger: false,
    labelTriggerId: undefined,
  }
  const visit = (items: readonly unknown[]): void => {
    for (const item of items) {
      if (Array.isArray(item)) {
        visit(item)
        continue
      }
      if (!isVNode(item)) {
        continue
      }
      const name = componentName(item.type)
      if (name === GHOST_TREE_GROUP_NAME) {
        if (!result.hasGroup) {
          result.hasGroup = true
          result.groupId = readStringProp(item, 'id')
        }
        continue
      }
      if (name === GHOST_TREE_TRIGGER_NAME) {
        if (!result.hasLabelTrigger && item.props?.['action'] !== 'toggle') {
          result.hasLabelTrigger = true
          result.labelTriggerId = readStringProp(item, 'id')
        }
        continue
      }
      if (name === undefined && Array.isArray(item.children)) {
        visit(item.children)
      }
    }
  }
  if (nodes) {
    visit(nodes)
  }
  return result
}
