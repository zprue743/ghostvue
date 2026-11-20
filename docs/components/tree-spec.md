---
schemaVersion: 1.0.0
component: GhostTree
components:
  - GhostTree
  - GhostTreeItem
  - GhostTreeTrigger
  - GhostTreeGroup
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Direction (Option A) approved by Zac (maintainer) in chat on 2026-11-17; recorded in the GHO-105 Linear document and the "Approval and readiness update - November 17, 2026" note on GHO-105. See the Status line in this spec.'
manifests:
  - packages/vue/manifests/ghost-tree.manifest.json
  - packages/vue/manifests/ghost-tree-item.manifest.json
  - packages/vue/manifests/ghost-tree-trigger.manifest.json
  - packages/vue/manifests/ghost-tree-group.manifest.json
  - packages/themes/manifests/ghost-tree.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# GhostTree specification

**Status:** Approved. Direction (Option A) approved by Zac (maintainer) in
chat, November 17, 2026. The complete design plan and specification was
recorded in the GHO-105 Linear document
([GHO-105 — Tree / TreeView design plan and specification](https://linear.app/ghost-vue/document/gho-105-tree-treeview-design-plan-and-specification-3d0c40799cb1)),
and per Zac's instructions GHO-105 was marked `agent:ready` in the
"Approval and readiness update — November 17, 2026" note on
[GHO-105](https://linear.app/ghost-vue/issue/GHO-105).
**Predecessor:** [GhostCollapsible specification](/specs/collapsible) (GHO-86).

## Purpose and user problems

`GhostTree` is an accessible hierarchical list widget (`role="tree"`) for navigating, expanding/collapsing, and selecting nested items such as file explorers, taxonomy filters, organizational hierarchies, and nested configuration outlines. It gives consumers compound keyed parts (`GhostTree`, `GhostTreeItem`, `GhostTreeTrigger`, `GhostTreeGroup`) with controlled and uncontrolled selection (`single` or `multiple`) and expansion (`expanded`), a single roving `tabindex="0"` tab stop, RTL-aware 2D arrow navigation, typeahead, and deterministic SSR markup without mutating consumer data.

## Non-goals

- Built-in row virtualization or windowed DOM recycling (deferred per `GHO-105` Option A).
- Built-in async lazy-loading state machines or transport callbacks (consumers own async child fetching and render `GhostTreeGroup` children when available).
- Cascading/tri-state parent-child selection (`propagateSelect` / `bubbleSelect`); nested selection is strictly independent in v1.
- Implicit `Shift+Arrow` / `Shift+Click` contiguous range selection or `Ctrl/Cmd+A` shortcut interception in v1.
- Drag-and-drop node reordering or inline node renaming (`contenteditable` / input editing).
- Multi-column tabular trees (`role="treegrid"` belongs to DataTable `GHO-35`).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostTree` — root `role="tree"` container and context provider (`as="ul"` default).
- `GhostTreeItem` — keyed `role="treeitem"` node (`as="li"` default) owning focus, selection state, and branch expansion state.
- `GhostTreeTrigger` — non-focusable row header or disclosure toggle target inside `GhostTreeItem` (`as="span"` default) providing the item's accessible label (`aria-labelledby`) and pointer action (`'both' | 'toggle' | 'select'`).
- `GhostTreeGroup` — nested `role="group"` child container inside `GhostTreeItem` (`as="ul"` default) reusing `GhostCollapsible`'s `hidden` and themed height-transition semantics.
- `useGhostTree` — headless composable managing selection, expansion, node registration, parent/child relationships, roving focus, arrow-key navigation, and typeahead.
- `resolveTreeDir` — pure SSR-safe helper resolving `'ltr' | 'rtl'`.
- Types: `GhostTreeSelectionMode`, `GhostTreeValue`, `GhostTreeDirection`, `GhostTreeElement`, `GhostTreeProps`, `GhostTreeSlotProps`, `GhostTreeExposed`, `GhostTreeItemElement`, `GhostTreeItemProps`, `GhostTreeItemSlotProps`, `GhostTreeItemExposed`, `GhostTreeTriggerElement`, `GhostTreeTriggerAction`, `GhostTreeTriggerProps`, `GhostTreeTriggerSlotProps`, `GhostTreeTriggerExposed`, `GhostTreeGroupElement`, `GhostTreeGroupProps`, `GhostTreeGroupExposed`, `GhostTreeSelectPayload`, `GhostTreeTogglePayload`, `GhostTreeNodeRecord`, `UseGhostTreeOptions`, `UseGhostTreeReturn`, `GhostTreeContext`, `GhostTreeItemContext`, `ghostTreeContextKey`, `ghostTreeItemContextKey`.

Themed exports from `@ghostvue/themes`:

- `GhostTree`, `GhostTreeItem`, `GhostTreeTrigger`, `GhostTreeGroup` (plus re-exported types and styles via `packages/themes/src/ghost-tree.css` in `default.css`).

### Props and configuration

```ts
export type GhostTreeSelectionMode = 'single' | 'multiple'
export type GhostTreeValue = string | string[] | undefined
export type GhostTreeDirection = 'ltr' | 'rtl'
export type GhostTreeTriggerAction = 'both' | 'toggle' | 'select'

export interface GhostTreeSelectPayload {
  value: string
  selected: boolean
}

export interface GhostTreeTogglePayload {
  value: string
  expanded: boolean
}
```

#### `GhostTree` (root)

| Prop              | Type                                                              | Default     | Contract                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`              | `GhostTreeElement` (`string \| Component`)                        | `'ul'`      | Element tag or component rendered for the `role="tree"` container.                                                                                                                                                                  |
| `selectionMode`   | `GhostTreeSelectionMode` (`'single' \| 'multiple'`)               | `'single'`  | Single selection (`string \| undefined`) vs multi-selection (`string[]`). Sets `aria-multiselectable="true"` when `'multiple'`.                                                                                                     |
| `modelValue`      | `GhostTreeValue` (`string \| string[] \| undefined`)              | `undefined` | Controlled selection (`v-model`). Omit for uncontrolled mode. Supports explicit controlled `undefined` in `'single'` mode when `onUpdate:modelValue` is bound (`allowControlledUndefined: true`).                                   |
| `defaultValue`    | `GhostTreeValue` (`string \| string[] \| undefined`)              | `undefined` | Initial uncontrolled selection (`undefined` in `'single'` mode, `[]` in `'multiple'` mode).                                                                                                                                         |
| `expanded`        | `string[] \| undefined`                                           | `undefined` | Controlled expanded branch keys (`v-model:expanded`). Omit for uncontrolled mode.                                                                                                                                                   |
| `defaultExpanded` | `string[]`                                                        | `[]`        | Initial expanded branch keys when `expanded` is omitted.                                                                                                                                                                            |
| `allowDeselect`   | `boolean`                                                         | `false`     | In `selectionMode="single"`, allows re-activating the selected node via click, `Space`, or `Enter` to clear `modelValue` to `undefined`. Ignored in `'multiple'` mode (where nodes always toggle).                                  |
| `expandOnClick`   | `boolean`                                                         | `true`      | When `true`, pointer click on a branch `GhostTreeItem` (or `GhostTreeTrigger` with `action="both"`) toggles branch expansion in addition to selection. When `false`, row clicks only select unless a trigger has `action="toggle"`. |
| `loop`            | `boolean`                                                         | `false`     | When `true`, `ArrowDown` wraps from the last visible enabled node to the first and `ArrowUp` wraps from the first to the last. Defaults to `false` per APG Tree View.                                                               |
| `dir`             | `GhostTreeDirection \| undefined` (`'ltr' \| 'rtl' \| undefined`) | `undefined` | Explicit writing direction for `ArrowRight`/`ArrowLeft`. When omitted, resolves from closest `[dir]` ancestor or `document.documentElement.dir` (`'ltr'` fallback in SSR).                                                          |
| `disabled`        | `boolean`                                                         | `false`     | Disables all tree interaction (`aria-disabled="true"` on root and items; all items set `tabindex="-1"`).                                                                                                                            |

#### `GhostTreeItem`

| Prop        | Type                                           | Default      | Contract                                                                                                                                                                                     |
| ----------- | ---------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`        | `GhostTreeItemElement` (`string \| Component`) | `'li'`       | Element tag or component rendered for the `role="treeitem"` node.                                                                                                                            |
| `value`     | `string`                                       | **required** | Unique, stable key identifying this node in `modelValue`, `expanded`, and focus tracking.                                                                                                    |
| `disabled`  | `boolean`                                      | `false`      | Disables selection, expansion toggling, and roving focus for this node (`aria-disabled="true"`). Combines with root `disabled`.                                                              |
| `textValue` | `string \| undefined`                          | `undefined`  | Explicit label used by printable-character typeahead. When omitted, derived from `GhostTreeTrigger` text content, or the item's own text content excluding nested `[role="group"]` elements. |

#### `GhostTreeTrigger`

| Prop       | Type                                                        | Default  | Contract                                                                                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostTreeTriggerElement` (`string \| Component`)           | `'span'` | Element tag or component for the item's row or disclosure control. Defaults to `'span'` with no interactive `role` or `tabindex` so `GhostTreeItem` remains the sole `role="treeitem"` tab stop and avoids `nested-interactive` Axe violations.     |
| `action`   | `GhostTreeTriggerAction` (`'both' \| 'toggle' \| 'select'`) | `'both'` | Pointer click behavior: `'both'` selects the item and (if expandable and `expandOnClick=true`) toggles expansion; `'toggle'` only toggles branch expansion without changing selection; `'select'` only selects the item without toggling expansion. |
| `disabled` | `boolean`                                                   | `false`  | Local disable flag combining with `GhostTreeItem` and `GhostTree` `disabled`.                                                                                                                                                                       |

#### `GhostTreeGroup`

| Prop               | Type                                            | Default | Contract                                                                                             |
| ------------------ | ----------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `as`               | `GhostTreeGroupElement` (`string \| Component`) | `'ul'`  | Element tag or component rendered for the `role="group"` child container.                            |
| `disableAnimation` | `boolean`                                       | `false` | When `true`, sets `data-animation="off"` and skips themed CSS height transitions on expand/collapse. |

### v-model contracts

- `v-model` **(**`modelValue` **/** `update:modelValue`**):**
  - Managed via `useControllableState` with `allowControlledUndefined: true`.
  - In `selectionMode="single"`, committed values are `string | undefined`. Selecting an unselected node emits `update:modelValue(value)`. Selecting an already-selected node emits `update:modelValue(undefined)` only when `allowDeselect === true`; when `allowDeselect === false`, it is a no-op (no duplicate emission).
  - In `selectionMode="multiple"`, committed values are `string[]` (default `[]`). Activating a node toggles its `value` in a new shallow-cloned array (preserving existing order and appending newly selected keys) and emits `update:modelValue(nextArray)`. Never mutates the consumer's input array in place.
- `v-model:expanded` **(**`expanded` **/** `update:expanded`**):**
  - Managed via `useControllableState<string[]>`.
  - Expanding a branch appends `value` (deduplicated) to a new `string[]` and emits `update:expanded(nextExpanded)`. Collapsing removes `value` into a new `string[]` and emits `update:expanded(nextExpanded)`. Expanding sibling branches via `*` adds all newly expanded sibling keys in a single atomic `update:expanded` emission. Never mutates the consumer's `expanded` array in place.

### Events, callbacks, slots, and exposed methods

- `GhostTree` **events:**
  - `'update:modelValue': [value: GhostTreeValue]`
  - `'update:expanded': [expanded: string[]]`
  - `'select': [payload: GhostTreeSelectPayload]` — emitted after an enabled node's selection action is triggered.
  - `'toggle': [payload: GhostTreeTogglePayload]` — emitted after an enabled branch node's expansion action is triggered.
- `GhostTree` **default slot (**`GhostTreeSlotProps`**):**
  - `{ modelValue: GhostTreeValue, expanded: string[], focusedValue: string | undefined, isSelected: (value: string) => boolean, isExpanded: (value: string) => boolean, select: (value: string) => void, toggleExpanded: (value: string) => void, expandAllSiblings: (value: string) => void }`
- `GhostTreeItem` **default slot (**`GhostTreeItemSlotProps`**):**
  - `{ selected: boolean, expanded: boolean, focused: boolean, disabled: boolean, expandable: boolean, level: number, select: () => void, toggle: () => void }`
- `GhostTreeTrigger` **default slot (**`GhostTreeTriggerSlotProps`**):**
  - `{ selected: boolean, expanded: boolean, disabled: boolean, expandable: boolean, level: number, select: () => void, toggle: () => void }`
- **Exposed component refs:**
  - `GhostTree`, `GhostTreeItem`, `GhostTreeTrigger`, and `GhostTreeGroup` each expose `{ readonly element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`.
  - `GhostTree.focus()` focuses the active roving tab-stop `GhostTreeItem` element (if any).
  - `GhostTreeTrigger.focus()` delegates to its owning `GhostTreeItem` element so programmatic focus always lands on the `role="treeitem"` host.

## State model

- **Independent focus, selection, and expansion:**
  - Moving focus via arrow keys, `Home`, `End`, or typeahead updates `focusedValue` and the roving `tabindex="0"` stop only; it never mutates `modelValue` or `expanded`.
  - Nested selection is strictly independent: toggling a parent branch node never modifies its descendants' selection state, and selecting/deselecting all children never modifies or sets an indeterminate state on the parent branch node.
  - Range selection (`Shift+Arrow`, `Shift+Click`) and `Ctrl/Cmd+A` select-all shortcuts are intentionally omitted in v1 so `Alt`/`Ctrl`/`Meta` chords remain browser/OS-native (`GHO-168`) and `Shift+Arrow` moves focus predictably without unexpected multi-node mutations.
- **Branch vs leaf detection (**`expandable`**):**
  - A `GhostTreeItem` becomes a branch (`expandable === true`) when a direct child `GhostTreeGroup` mounts and registers with its `ghostTreeItemContextKey`.
  - Leaf items (`expandable === false`) omit `aria-expanded`, `aria-controls`, and `data-expanded`.
  - Branch items (`expandable === true`) bind `aria-expanded="true" | "false"`, `aria-controls="<groupId>"`, `data-expanded="true" | "false"`, and `data-state="open" | "closed"` on their trigger/group.
- **Controlled update rejection:**
  - If `modelValue` or `expanded` is controlled and the parent ignores `@update:modelValue` or `@update:expanded`, `useControllableState` retains the parent's prop value.
  - `aria-selected`, `aria-expanded`, `data-state`, `data-selected`, `data-expanded`, and `GhostTreeGroup`'s `hidden` attribute always derive from the authoritative state (`modelValue` and `expanded` refs), so rejected updates never leave DOM or ARIA state out of sync.
  - Pressing `ArrowRight` (LTR) / `ArrowLeft` (RTL) on a closed branch only proposes `setExpanded(value, true)` and keeps focus on the branch node; moving focus to the first child happens only when pressing the expand key on a branch whose authoritative `isExpanded(value)` is already `true`. Thus, a rejected controlled expansion never moves focus into hidden children.

### Loading, empty, disabled, read-only, and error states

- **Root** `disabled: true`**:** sets `aria-disabled="true"` and `data-disabled=""` on `GhostTree` and all `GhostTreeItem`s, sets every item's `tabindex="-1"`, and ignores all pointer and keyboard selection, expansion, and navigation.
- **Item** `disabled: true`**:** sets `aria-disabled="true"` and `data-disabled=""` on that `GhostTreeItem` and its `GhostTreeTrigger`, sets its `tabindex="-1"`, and skips it during arrow navigation, `Home`/`End`, `*` sibling expansion, and typeahead.
- **Disabled parent with pre-expanded children:** `disabled` on a `GhostTreeItem` disables that node itself, not its descendants. If a disabled branch is open via `defaultExpanded` or controlled `expanded`, its enabled children remain visible and navigable. Pressing `ArrowLeft` (LTR) / `ArrowRight` (RTL) on a child whose immediate parent is disabled moves focus to the **closest visible enabled ancestor** `GhostTreeItem` (or stays on the child if no ancestor is enabled).
- **Empty tree:** when zero enabled `GhostTreeItem`s are registered or visible, no element has `tabindex="0"`, and keyboard handlers exit cleanly without throwing or calling `preventDefault()`.

### Async behavior

- Consumers own async data fetching (e.g., loading child items when `@toggle` fires with `expanded: true` or via `v-model:expanded`).
- When async children mount inside `GhostTreeGroup`, they register dynamically in `useGhostTree`, preserving the current `focusedValue` and single `tabindex="0"` stop.

## Consumer data

- Consumers render their own nested collections via `v-for` (or static templates) with stable `:key` and `value` strings on each `GhostTreeItem`.
- `GhostTree` never reads, clones, sorts, or mutates consumer domain objects; it tracks only the `value: string` keys and DOM references registered by mounted `GhostTreeItem` instances.

## Accessibility contract

Follows [WAI-ARIA APG Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

### Semantics and relationships

- `GhostTree`: `role="tree"`, `aria-multiselectable="true"` when `selectionMode === 'multiple'` (omitted when `'single'`), `aria-disabled="true"` when `disabled === true`. Consumers supply an accessible name via `aria-label` or `aria-labelledby`.
- `GhostTreeItem`: `role="treeitem"`, `id` (from `useGhostId('ghost-tree-item')` unless consumer `id` is provided), `tabindex="0"` on the single active roving stop and `tabindex="-1"` on all other items, `aria-selected="true" | "false"`, `aria-disabled="true"` when disabled.
  - When a `GhostTreeGroup` is registered inside `GhostTreeItem`: sets `aria-expanded="true" | "false"` and `aria-controls="<groupId>"`.
  - When no `GhostTreeGroup` is registered (leaf node): omits `aria-expanded` and `aria-controls`.
  - When a `GhostTreeTrigger` is registered inside `GhostTreeItem` and the consumer did not pass `aria-label` or `aria-labelledby` on `GhostTreeItem`: sets `aria-labelledby="<triggerId>"` so the branch `treeitem`'s accessible name is computed exclusively from its trigger label and never concatenates descendant `GhostTreeGroup` items.
- `GhostTreeTrigger`: default `as="span"`, `id` (from `useGhostId('ghost-tree-trigger')` unless consumer `id` is provided; the owning `GhostTreeItem` generates the id used by its first labelling trigger so it can reference it before the trigger renders), `data-part="trigger"`. Triggers with `action="toggle"` are disclosure affordances and never label the item; the first trigger with `action="both"` or `"select"` is the `aria-labelledby` target. Does not set `role="button"` or `tabindex` so `GhostTreeItem` (`role="treeitem"`) has zero nested interactive controls (`axe-core` `nested-interactive` rule).
- `GhostTreeGroup`: `role="group"`, `id` (from `useGhostId('ghost-tree-group')` unless consumer `id` is provided), `hidden` when collapsed (managed via `useCollapsibleContentHidden`), and `aria-labelledby="<triggerId>"` when its owning `GhostTreeItem` has a registered `GhostTreeTrigger` (unless consumer `aria-label` or `aria-labelledby` is provided).

### Keyboard interaction

Let `expandKey` be `ArrowRight` in LTR (`dir="ltr"`) and `ArrowLeft` in RTL (`dir="rtl"`). Let `collapseKey` be `ArrowLeft` in LTR and `ArrowRight` in RTL.

| Key                                                           | State / Context                                                                                     | Behavior                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab`                                           | Anywhere                                                                                            | Moves focus into and out of the tree as a single Tab stop (`tabindex="0"`). Never intercepted by `GhostTree`.                                                                                                                                                                                                                                                                                          |
| `ArrowDown`                                                   | On any visible enabled node                                                                         | Moves focus and roving `tabindex="0"` to the next visible enabled `GhostTreeItem` in rendered DOM order (`sortByDocumentOrder`). Does not change selection or expansion. Wraps to first only when `loop=true`; at boundary with `loop=false`, stays on the last item.                                                                                                                                  |
| `ArrowUp`                                                     | On any visible enabled node                                                                         | Moves focus and roving `tabindex="0"` to the previous visible enabled `GhostTreeItem` in rendered DOM order. Does not change selection or expansion. Wraps to last only when `loop=true`; at boundary with `loop=false`, stays on the first item.                                                                                                                                                      |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) (`expandKey`)          | On a **closed** branch node (`expandable && !expanded`)                                             | Requests expansion (`setExpanded(value, true)`). Focus remains on the current branch node.                                                                                                                                                                                                                                                                                                             |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) (`expandKey`)          | On an **open** branch node (`expandable && expanded`)                                               | Moves focus and roving `tabindex="0"` to the first visible enabled child `GhostTreeItem` inside this branch. If the open branch has no visible enabled children, focus stays on the branch node.                                                                                                                                                                                                       |
| `ArrowRight` (LTR) / `ArrowLeft` (RTL) (`expandKey`)          | On a **leaf** node (`!expandable`)                                                                  | Does nothing.                                                                                                                                                                                                                                                                                                                                                                                          |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) (`collapseKey`)        | On an **open** branch node (`expandable && expanded`)                                               | Requests collapse (`setExpanded(value, false)`). Focus remains on the current branch node.                                                                                                                                                                                                                                                                                                             |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) (`collapseKey`)        | On a **closed** branch node or **leaf** node with a visible enabled ancestor                        | Moves focus and roving `tabindex="0"` to the closest visible enabled ancestor `GhostTreeItem`.                                                                                                                                                                                                                                                                                                         |
| `ArrowLeft` (LTR) / `ArrowRight` (RTL) (`collapseKey`)        | On a root-level **closed** branch node or root-level **leaf** node (or when no ancestor is enabled) | Does nothing.                                                                                                                                                                                                                                                                                                                                                                                          |
| `Home`                                                        | On any visible enabled node                                                                         | Moves focus and roving `tabindex="0"` to the first visible enabled `GhostTreeItem` in the tree.                                                                                                                                                                                                                                                                                                        |
| `End`                                                         | On any visible enabled node                                                                         | Moves focus and roving `tabindex="0"` to the last visible enabled `GhostTreeItem` in the tree.                                                                                                                                                                                                                                                                                                         |
| `Enter`                                                       | On any visible enabled node                                                                         | Selects the focused node in `selectionMode="single"` (or deselects when already selected and `allowDeselect=true`), or toggles selection of the focused node in `selectionMode="multiple"`. Does not toggle branch expansion.                                                                                                                                                                          |
| `Space` (`' '`)                                               | When typeahead buffer is **empty**                                                                  | Selects the focused node in `selectionMode="single"` (or deselects when `allowDeselect=true`), or toggles selection of the focused node in `selectionMode="multiple"` without requiring modifier keys. Prevents page scroll (`event.preventDefault()`).                                                                                                                                                |
| `Space` (`' '`)                                               | When typeahead buffer is **non-empty**                                                              | Appends `' '` to the active typeahead query, resets the 500ms typeahead timer, and focuses the matching visible enabled node without toggling selection (`event.preventDefault()`).                                                                                                                                                                                                                    |
| `*` (Asterisk)                                                | When typeahead buffer is **empty**                                                                  | Expands all closed, enabled sibling branch `GhostTreeItem`s that share the same parent `GhostTreeItem` (or root level) as the focused node in one `update:expanded` update. Focus and selection do not change.                                                                                                                                                                                         |
| Printable characters (`key.length === 1`, unmodified)         | On any visible enabled node                                                                         | Appends character to the 500ms typeahead buffer and moves focus (without changing selection) to the matching visible enabled node in rendered DOM order: starting at `activeIndex + 1` for 1-character queries, keeping the active node if it still matches when extending multi-character queries (`GHO-175`), and cycling through same-letter matches on repeated single-character presses (`"aa"`). |
| `Alt+*`, `Ctrl+*`, `Meta+*` chords                            | Anywhere                                                                                            | Ignored by `GhostTree`; never calls `preventDefault()`, never moves focus or mutates state (`GHO-168`).                                                                                                                                                                                                                                                                                                |
| IME composition (`isComposing === true` or `keyCode === 229`) | Anywhere                                                                                            | Ignored by `GhostTree`; never calls `preventDefault()`, never moves focus, selects, expands, or updates typeahead (`GHO-167`).                                                                                                                                                                                                                                                                         |

### Focus behavior and recovery

- **Single Tab stop:** Exactly one visible enabled `GhostTreeItem` has `tabindex="0"` at any time; all other `GhostTreeItem`s have `tabindex="-1"`.
- **Initial tab stop (SSR and mount):**
  1. In `selectionMode="single"`, if `modelValue` (or `defaultValue`) matches a visible enabled item, that item receives `tabindex="0"`.
  2. In `selectionMode="multiple"`, the first visible enabled item in document/registration order whose `value` is in `modelValue` (or `defaultValue`) receives `tabindex="0"`.
  3. Otherwise, the first visible enabled item receives `tabindex="0"`.
  4. Before mount, while a selected value has not yet registered (items render one at a time during SSR), earlier items withhold the stop. If the selected value never renders, the server HTML has no `tabindex="0"` and the first visible enabled item receives it after mount.
- **Visibility definition for navigation and tab stops:** A `GhostTreeItem` is visible and eligible for focus iff:
  1. It is not disabled (`!rootDisabled && !itemDisabled`),
  2. Every ancestor `GhostTreeItem` in its parent chain is currently expanded (`isExpanded(ancestorValue) === true`), AND
  3. When mounted in the client DOM, its element is connected (`element.isConnected`) and not hidden by an ancestor `[hidden]`, `[inert]`, `[aria-hidden="true"]`, or `display: none` (`!isHidden(element)`).
     Checking logical ancestor expansion (`isExpanded`) ensures that as soon as a branch transitions to `expanded = false`, its descendants are immediately excluded from focus/navigation even while a themed CSS close transition is still running.
- **Collapse of a focused descendant:**
  - When an ancestor branch collapses while `focusedValue` is on a descendant inside that branch (e.g. clicking the ancestor's `<GhostTreeTrigger action="toggle">` or a controlled `expanded` prop update removing the ancestor):
  - `focusedValue` and `tabindex="0"` immediately recover to the **closest visible enabled ancestor** `GhostTreeItem` (or if no ancestor is enabled, the next visible enabled node, then previous visible enabled node).
  - If `document.activeElement` was inside the tree on the collapsed descendant, `.focus({ preventScroll: true })` is called on the recovery target's DOM element so focus is never trapped on a `hidden` node or lost to `document.body`.
- **Reordered, inserted, and removed nodes:**
  - Reordering or inserting `GhostTreeItem`s via keyed `v-for` preserves the current `focusedValue` and re-sorts visible enabled candidates via `sortByDocumentOrder` on the next key press or focus sync.
  - Removing/unmounting a `GhostTreeItem` removes it from the live node registry without mutating or emitting `update:modelValue` or `update:expanded`. If the removed item was `focusedValue`, `focusedValue` recovers to the next visible enabled item at its prior position, else the previous visible enabled item, else its closest visible enabled ancestor, else the first visible enabled item (and moves DOM `.focus({ preventScroll: true })` on `nextTick` if the removed item held `document.activeElement`).

### Assistive technology expectations

- Screen readers announce the tree name, `treeitem` role, selected state (`aria-selected`), expanded/collapsed state (`aria-expanded` on branches only), disabled state (`aria-disabled`), and hierarchical level/position from the nested `<ul role="tree"> -> <li role="treeitem"> -> <ul role="group">` structure.
- Branch `GhostTreeItem`s automatically link `aria-labelledby` to their registered `GhostTreeTrigger` ID (when no explicit `aria-label`/`aria-labelledby` is passed) so screen readers read only the branch's own label rather than concatenating child `GhostTreeGroup` text.

## Rendering and customization

### Styling hooks (`data-part`, `data-state`, and secondary `data-*` attributes)

| Component          | Class                | `data-part` | `data-state`                                                                                        | Secondary `data-*` & CSS variables                                                                                                                                                                                                           |
| ------------------ | -------------------- | ----------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GhostTree`        | `ghost-tree`         | `root`      | —                                                                                                   | `data-ghost-tree=""`, `data-dir="ltr" \| "rtl"`, `data-disabled=""` (when disabled)                                                                                                                                                          |
| `GhostTreeItem`    | `ghost-tree-item`    | `item`      | `'checked'` (when selected), `'disabled'` (when disabled and unselected), absent when idle          | `data-ghost-tree-value="<value>"`, `data-selected=""` (when selected), `data-expanded="true" \| "false"` (on branch items only), `data-disabled=""` (when disabled), `data-level="<number>"` (1-based depth), `--ghost-tree-level: <number>` |
| `GhostTreeTrigger` | `ghost-tree-trigger` | `trigger`   | `'open' \| 'closed'` (on branch items), `'checked'` (on selected leaf items), absent when idle leaf | `data-selected=""` (when selected), `data-disabled=""` (when disabled)                                                                                                                                                                       |
| `GhostTreeGroup`   | `ghost-tree-group`   | `group`     | `'open' \| 'closed'`                                                                                | `data-animation="off"` (when `disableAnimation=true`)                                                                                                                                                                                        |

### Themed CSS (`packages/themes/src/ghost-tree.css`)

- Authored under `@layer ghostvue-theme` using only semantic `--ghost-*` tokens (`--ghost-surface-fg`, `--ghost-surface-muted-bg` for selected rows, `--ghost-elevation-2-bg` for hovered rows, `--ghost-radius-sm`, `--ghost-space-inset-xs`, `--ghost-space-inset-sm`, `--ghost-space-inset-md`, `--ghost-space-gap-xs`, `--ghost-type-family-sans`, `--ghost-type-feature-default`, `--ghost-type-size-sm`, `--ghost-type-weight-medium`, `--ghost-type-line-snug`, `--ghost-focus-ring-width`, `--ghost-focus-ring-color`, `--ghost-focus-ring-offset`, `--ghost-action-disabled-opacity`, `--ghost-motion-duration-moderate`, `--ghost-motion-easing-standard`) with **zero** hardcoded color literals or non-zero `px`/`ms`/`s`/`rem`/`em` values. (The design plan named `--ghost-action-ghost-bg-hover` and `--ghost-action-secondary-bg`; those tokens do not exist, so the row states use the same tokens as Select options and menu items.)
- Resets `list-style: none; margin: 0; padding: 0;` on `.ghost-tree` and `.ghost-tree-group`.
- Indents nested items via `padding-inline-start: calc((var(--ghost-tree-level, 1) - 1) * var(--ghost-space-inset-md))` on the item row so indentation adapts automatically in both LTR and RTL at any depth.
- Draws the `:focus-visible` outline on `.ghost-tree-item:focus-visible > [data-part='trigger']` (with `outline: none` on the outer `.ghost-tree-item`) when a `GhostTreeTrigger` is present, and directly on `.ghost-tree-item:focus-visible:not(:has(> [data-part='trigger']))` for triggerless leaf items—so the focus ring highlights only the focused node's row and never wraps around an expanded child `GhostTreeGroup`.
- Animates `GhostTreeGroup` expand/collapse under `@supports (interpolate-size: allow-keywords)` and `@media (prefers-reduced-motion: no-preference)` using `block-size` and `@starting-style`, collapsing transitions under `@media (prefers-reduced-motion: reduce)` or `[data-animation='off']` (matching `ghost-collapsible.css`).
- Supports `@media (forced-colors: active)` with `Highlight` / `HighlightText` for selected/focused indicators and `GrayText` for disabled items.

## Environment behavior

### SSR and hydration

- Deterministic IDs from `useGhostId` (`ghost-tree-item`, `ghost-tree-trigger`, `ghost-tree-group`) populate `aria-controls` and `aria-labelledby` identically on server and client.
- An item's attributes are serialized before its child parts run `setup()`. So that `aria-expanded`, `aria-controls`, and `aria-labelledby` are present in server HTML, `GhostTreeItem` scans the vnodes its own slot returns for a `GhostTreeGroup` and a labelling `GhostTreeTrigger` (matched by component name, so the themed wrappers count, reading a consumer `id` when given). The scan descends through elements and fragments but not into other components; parts hidden inside consumer wrapper components are picked up by client registration after hydration instead.
- Closed `GhostTreeGroup` elements render in SSR HTML with `hidden` and `data-state="closed"`; open groups render without `hidden` and with `data-state="open"`.
- Zero `window`, `document`, `MutationObserver`, or `matchMedia` access during `setup()`.
- Initial `tabindex="0"` vs `tabindex="-1"` is computed deterministically from `modelValue`/`defaultValue` and `expanded`/`defaultExpanded` during SSR render so hydration produces zero attribute mismatches.

### Mobile and touch

- Pointer clicks on `GhostTreeTrigger` or `GhostTreeItem` activate selection/expansion per `expandOnClick` and `action` without hover-only affordances.
- Themed row height and padding provide comfortable touch targets using `--ghost-space-inset-xs` / `--ghost-space-inset-sm`.

## Performance

- Node registration uses a `Map<string, GhostTreeNodeRecord>` with a monotonic `registryVersion` counter so mounting/unmounting $N$ nodes is $O(N)$ without cloning arrays on every item mount (`GHO-176`).
- `sortByDocumentOrder` runs lazily on keyboard navigation, typeahead, or roving tab-stop recovery rather than on every registration call.
- Never deep-watches consumer data; only primitive key props (`value`, `disabled`, `textValue`) and controlled `modelValue` / `expanded` refs are watched.

## Composition

- Reuses `useControllableState`, `useGhostId`, `useCollapsibleContentHidden`, `collapsibleHostAllowsAnimationShell`, `sortByDocumentOrder`, and `isDisabledElement` from `packages/vue/src/`.
- Does **not** delegate keyboard navigation to `GhostCollapsible` or 1D `useRovingFocus`: `GhostCollapsible` is a single disclosure primitive and `useRovingFocus` is a 1D flat rover, whereas `GhostTree` requires hierarchical parent/child `ArrowRight`/`ArrowLeft` expansion and traversal, `*` sibling expansion, and focus recovery on ancestor collapse.

## Test plan

- **Unit / composable (**`packages/vue/src/use-ghost-tree.test.ts` **&** `packages/vue/src/GhostTree.test.ts`**):**
  - Uncontrolled and controlled `modelValue` (`single` and `multiple`), `allowDeselect`, and `expanded` (`v-model:expanded`).
  - Controlled update rejection for both `modelValue` and `expanded` (verifying `aria-selected`, `aria-expanded`, `data-state`, `hidden`, and that `ArrowRight` on a rejected closed branch does not move focus into hidden children).
  - Independent focus vs selection across all navigation keys (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`, `Home`, `End`, `Shift+Arrow`, typeahead).
  - Independent nested selection (selecting parent does not select children; selecting all children does not select parent).
  - RTL arrow reversal (`dir="rtl"` on prop, ancestor `[dir="rtl"]`, or `document.documentElement.dir = 'rtl'`).
  - `*` expands all closed enabled sibling branches at the same level without moving focus.
  - Disabled root, disabled branch (including pre-expanded disabled branch with enabled children and `ArrowLeft` skipping disabled parent to closest enabled ancestor), and disabled leaf items.
  - Collapse of an ancestor while a descendant holds focus / roving tab stop -> immediate focus recovery to closest visible enabled ancestor.
  - Dynamic keyed reorder, insertion before/after active stop, and removal/unmount of active/selected/expanded node (preserving `modelValue` and `expanded` without spurious events while recovering focus).
  - Typeahead matching, 500ms timer reset, `Space` in active query vs standalone `Space` selection, multi-character prefix continuation (`GHO-175`), repeated single-character cycling (`"aa"`), `textValue` override, excluding collapsed descendants, and ignoring IME composition (`isComposing: true` and `keyCode: 229`, `GHO-167`) and `Alt`/`Ctrl`/`Meta` chords (`GHO-168`).
  - `GhostTreeTrigger` `action="both" | "toggle" | "select"` and `GhostTree` `expandOnClick=false`.
  - SSR `renderToString` + client hydration (`tests/integration/ssr-hydration.test.ts`) with zero mismatches and no leaked timers/listeners on unmount.
- **Theme & integration (**`tests/integration/ghost-tree-themed.test.ts` **&** `tests/integration/ghost-tree-theme-css.test.ts`**):**
  - Themed wrapper forwarding (`data-themed`, class/style merging, exposed `element`/`focus`/`blur`) with >= 80% coverage.
  - CSS token audit verifying `--ghost-*` usage and zero hardcoded color/unit/time literals.
- **Browser / Playwright (**`tests/e2e/ghost-tree.spec.ts`**):**
  - Real browser focus (`toBeFocused()`) and ARIA state assertions across every documented key (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`, `Home`, `End`, `*`, `Enter`, `Space`, typeahead, modified keys ignored).
  - Single-select and multi-select (`Space` toggles without modifiers) in real Chromium.
  - RTL tree fixture verifying `ArrowLeft` expands/enters child and `ArrowRight` collapses/moves to parent.
  - Focus recovery when collapsing an ancestor of the focused item via pointer click on `<GhostTreeTrigger action="toggle">`.
  - Axe-core zero violations across collapsed and expanded states (`nested-interactive`, `aria-required-children`, `aria-required-parent`, accessible names).
- **Type tests (**`packages/vue/type-tests/`**):**
  - Positive and negative compile-time checks for `GhostTree`, `GhostTreeItem` (requiring `value: string`), `GhostTreeTrigger`, `GhostTreeGroup`, and `useGhostTree`.

## Documentation plan

- Canonical spec at `docs/components/tree-spec.md` and public component guide at `docs/components/tree.md`.
- Five executable examples under `examples/tree/`:
  - `examples/tree/basic.vue` — single-selection file/folder hierarchy with expand/collapse and keyboard navigation.
  - `examples/tree/multi-select.vue` — `selectionMode="multiple"` with independent focus and `Space` toggling plus controlled `v-model` and `v-model:expanded`.
  - `examples/tree/split-trigger.vue` — split `<GhostTreeTrigger action="toggle">` chevron and `<GhostTreeTrigger action="select">` label with `expandOnClick=false`.
  - `examples/tree/rtl.vue` — `dir="rtl"` localized hierarchy demonstrating flipped `ArrowLeft`/`ArrowRight` expansion and traversal.
  - `examples/tree/themed.vue` — `@ghostvue/themes` styled tree with depth indentation and collapsible height motion.
- Playground reference section in `apps/playground/src/App.vue` exercising single, multi-select, RTL, and dynamic node insertion/removal.

## Compatibility and release impact

- Additive minor exports in `@ghostvue/vue` and `@ghostvue/themes`.
- Requires a minor Changeset (`.changeset/gho-105-ghost-tree.md`) for both `@ghostvue/vue` and `@ghostvue/themes`.
- Updates row 46 (`GhostTree`) in `docs/roadmap.md` via `packages/vue/registry/tree.registry.json` and `pnpm registries:write`.

## Open architectural questions

None. All design and behavioral contracts required by `GHO-105` are resolved above.
