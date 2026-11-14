# GhostToggleGroup specification

**Status:** Proposed for GHO-82. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostToggleGroup` groups related on/off toggle buttons so users can choose one
or several options from a small set—table density controls, layout switches,
segmented filters, and formatting toolbars. Applications need **toggle-button**
semantics (`aria-pressed`), not radio-group semantics, so a pressed option can
be toggled off and multiple options can stay on independently when configured.
The component composes `useControllableState`, `useGhostId`, and
`useRovingFocus` for APG-correct keyboard movement, controlled Vue models, and
SSR-safe ids without reimplementing roving tabindex.

## Non-goals

- Exclusive single-choice form controls with radio semantics (`GhostRadioGroup`).
- Arbitrary toolbar composites with menu buttons (`GhostToolbar`,
  `GhostDropdownMenu`).
- Form submission values for the group (toggle buttons are not submitted as a
  group; consumers own form wiring if needed).
- Animated segmented indicators, overflow “more” menus, or drag reordering.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostToggleGroup` (root `role="group"` host with roving focus)
- `GhostToggleGroupItem` (`aria-pressed` toggle control)
- `useGhostToggleGroup` (selection state, registries, toggle helpers)
- Types: `GhostToggleGroupProps`, `GhostToggleGroupItemProps`,
  `GhostToggleGroupExposed`, `GhostToggleGroupItemExposed`,
  `UseGhostToggleGroupOptions`, `UseGhostToggleGroupReturn`,
  `GhostToggleGroupType`, `GhostToggleGroupOrientation`,
  `GhostToggleGroupValue`

Themed exports from `@ghostvue/themes`:

- `GhostToggleGroup`, `GhostToggleGroupItem` (plus re-exported types and styles
  via `default.css`)

### Props and configuration

#### `GhostToggleGroup` (root)

| Prop           | Type                              | Default        | Contract                                                                                     |
| -------------- | --------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `type`         | `'single' \| 'multiple'`          | `'single'`     | Single allows zero or one pressed item; multiple allows any subset.                          |
| `modelValue`   | `string \| string[] \| undefined` | `undefined`    | Controlled selection. Omit for uncontrolled. Type must match `type`.                         |
| `defaultValue` | `string \| string[] \| undefined` | `undefined`    | Initial selection when uncontrolled. Multiple defaults to `[]` when omitted.                 |
| `orientation`  | `'horizontal' \| 'vertical'`      | `'horizontal'` | Drives roving arrow keys and optional `aria-orientation` on the group.                       |
| `dir`          | `'ltr' \| 'rtl' \| undefined`     | `undefined`    | Explicit text direction for horizontal roving.                                               |
| `as`           | `string \| Component`             | `'div'`        | Root element hosting items. Must remain focusable as a group container (not `button`).       |
| `disabled`     | `boolean`                         | `false`        | Disables interaction for all items (items still render; items’ own `disabled` also applies). |

#### `GhostToggleGroupItem`

| Prop       | Type                  | Default    | Contract                                                                                           |
| ---------- | --------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Element or component for the control.                                                              |
| `value`    | `string`              | required   | Stable id for selection and `v-model`.                                                             |
| `disabled` | `boolean`             | `false`    | Skips roving focus and ignores toggle. Native `disabled` on `<button>`; `aria-disabled` otherwise. |

Native attributes and listeners fall through to each part’s rendered root.

### v-model contracts

`GhostToggleGroup` owns `modelValue` via `useControllableState`:

- When `modelValue` is `undefined` (omitted), internal state starts at
  `defaultValue` when provided.
- In `type="single"` uncontrolled mode without `defaultValue`, no item is
  pressed initially.
- In `type="multiple"` uncontrolled mode without `defaultValue`, internal state
  is `[]`.
- `update:modelValue` emits on every user-driven toggle while uncontrolled;
  controlled consumers must apply the emitted value.
- **Single:** emitted value is `string | undefined` (pressing the active item
  clears selection).
- **Multiple:** emitted value is `string[]` (order follows registration order,
  not click order).
- `value` strings are opaque; duplicates among items are unsupported (last
  registration wins for roving maps).

### Events, callbacks, slots, and exposed methods

- `GhostToggleGroup` emits `update:modelValue` with
  `[value: string | string[] | undefined]`.
- `GhostToggleGroup` default slot holds items (no slot props).
- `GhostToggleGroup` and `GhostToggleGroupItem` expose
  `{ element: HTMLElement | null, focus(), blur() }`.

## State model

- **Single:** at most one pressed item; pressing the pressed item clears
  selection (`undefined`).
- **Multiple:** any subset; pressing toggles membership.
- `data-state="on" | "off"` on items mirrors pressed state.
- Group `disabled` prevents all toggles without removing items from the DOM.

### Loading, empty, disabled, read-only, and error states

Per-item `disabled` and group `disabled` only. No loading or read-only mode.

## Consumer data

The component does not mutate consumer collections. Item labels are slot
content.

## Accessibility contract

Uses [WAI-ARIA toggle button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
semantics inside a **group**, not `radiogroup` / `radio`.

### Semantics and relationships

- `GhostToggleGroup`: `role="group"`, optional `aria-orientation` when vertical,
  `aria-disabled="true"` when group disabled, `data-part="root"`, class
  `ghost-toggle-group`, `data-ghost-toggle-group`.
- `GhostToggleGroupItem`: native `button` (default) with `type="button"`,
  `aria-pressed="true" | "false"`, deterministic `id` from `useGhostId`
  (overridable via `id`), `data-part="item"`, class `ghost-toggle-group-item`,
  `data-ghost-toggle-group`, `data-ghost-toggle-group-value`.
- Consumers must label the group via `aria-label`, `aria-labelledby`, or visible
  text plus `aria-labelledby`. Each item is named by its visible content or
  `aria-label`.

### Keyboard interaction

Roving among items (`useRovingFocus` on the group root):

| Key          | Orientation | Behavior                           |
| ------------ | ----------- | ---------------------------------- |
| `ArrowRight` | horizontal  | Next enabled item (RTL: previous). |
| `ArrowLeft`  | horizontal  | Previous enabled item (RTL: next). |
| `ArrowDown`  | vertical    | Next enabled item.                 |
| `ArrowUp`    | vertical    | Previous enabled item.             |
| `Home`       | either      | First enabled item.                |
| `End`        | either      | Last enabled item.                 |

Activation (`GhostToggleGroupItem`):

| Key             | Behavior                                      |
| --------------- | --------------------------------------------- |
| `Space`/`Enter` | Toggles pressed state (native on `<button>`). |
| Click           | Toggles pressed state.                        |

Disabled items are skipped by roving focus and cannot be toggled.

### Focus behavior

- The **primary tab stop** is the first pressed enabled item in registration
  order; if none are pressed, the first enabled item. Other enabled items use
  `tabindex="-1"` (including native `<button>` hosts).
- Arrow keys move focus via `useRovingFocus`. When focus leaves the group, tab
  stops reset to the primary stop so a later `Tab` into the group focuses the
  expected pressed (or first) item, not the last arrow-focused item.
- Tab moves into and out of the group at the primary stop only.

### Assistive technology expectations

Screen readers announce the group label and each item as a toggle button with
pressed state via `aria-pressed`, distinguishing this widget from radio groups
where deselecting the checked option is not allowed.

## Rendering and customization

Stable hooks (not the undecided GHO-38 styling-hooks contract):

- `ghost-toggle-group`, `ghost-toggle-group-item` classes
- `data-part`, `data-state`, `data-ghost-toggle-group`,
  `data-ghost-toggle-group-value`
- Themed CSS under `.ghost-theme` / `.ghost-themed-scope` using existing
  `--ghost-*` semantic tokens (segmented control appearance)

## Environment behavior

### SSR and hydration

- `useGhostId` supplies deterministic SSR-safe ids.
- `useRovingFocus` attaches listeners only in `onMounted` (no `document` access
  during SSR setup).

### Mobile and touch

Pointer activation toggles items; no separate gesture model.

## Performance

Listeners are limited to roving `keydown`/`focusin` on the group root while
mounted.

## Composition

- `useGhostToggleGroup` + `useControllableState` for selection.
- `useGhostId` per item (when needed for labeling wiring).
- `useRovingFocus` on `GhostToggleGroup` root.
- Shared tab-stop sync helper modeled on tabs selection tab stops.

## Test plan

- **Unit (`GhostToggleGroup.test.ts`):** single/multiple toggle, deselect in
  single mode, group disabled, item disabled, horizontal/vertical arrows, RTL,
  Home/End, controlled/uncontrolled, `aria-pressed`, SSR without roving listeners.
- **Browser (`ghost-toggle-group.spec.ts`):** example gallery keyboard/pointer,
  Axe zero violations, `@component:GhostToggleGroup`.
- **Themed integration:** themed root ref reaches group element.
- **Type tests:** consumer fixtures for single vs multiple `v-model` when exports
  stabilize.

## Documentation plan

- `docs/components/toggle-group.md` with headless and themed examples.
- Registry entries for `toggle-group/basic`, `toggle-group/multiple`,
  `toggle-group/themed`.
- Playground `ToggleGroupReference` section with unique copy.
- Manifests via `pnpm manifests:write`.

## Compatibility and release impact

Additive `minor` Changeset for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None.
