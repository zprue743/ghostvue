# GhostTabs specification

**Status:** Proposed for GHO-29. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostTabs` groups related views behind a shared tab list so users can switch
panels without navigating away. Settings screens, record detail layouts, and
dashboard sections need one focusable tab strip, clear `tab` / `tabpanel`
semantics, and predictable arrow-key movement. The component composes
`useControllableState`, `useGhostId`, and `useRovingFocus` so applications get
APG-correct tabs with automatic or manual activation, horizontal or vertical
orientation, and controlled or uncontrolled selection without reimplementing
roving tabindex or SSR-safe IDs.

## Non-goals

- Accordion-style single-expand panels (`GhostAccordion` / `GhostCollapsible`).
- Toolbar or menubar composites (`GhostToolbar`, `GhostDropdownMenu`).
- Routed URL synchronization or deep-link tab state (consumer-owned).
- Animated panel transitions or lazy/async panel loading orchestration.
- Tab close buttons, overflow menus, or drag-and-drop reordering.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostTabs` (root state and context provider; renderless)
- `GhostTabsList` (`role="tablist"` host with roving focus)
- `GhostTabsTrigger` (`role="tab"` control)
- `GhostTabsContent` (`role="tabpanel"` region)
- `useGhostTabs` (composable returning selection state, registries, and helpers)
- Types: `GhostTabsProps`, `GhostTabsSlotProps`, `GhostTabsListProps`,
  `GhostTabsTriggerProps`, `GhostTabsContentProps`, `GhostTabsListExposed`,
  `GhostTabsTriggerExposed`, `GhostTabsContentExposed`, `GhostTabsExposed`,
  `UseGhostTabsOptions`, `UseGhostTabsReturn`, `GhostTabsActivationMode`,
  `GhostTabsOrientation`

Themed exports from `@ghostvue/themes`:

- `GhostTabs`, `GhostTabsList`, `GhostTabsTrigger`, `GhostTabsContent` (plus
  re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostTabs` (root)

| Prop             | Type                          | Default        | Contract                                                                                             |
| ---------------- | ----------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `modelValue`     | `string \| undefined`         | `undefined`    | Controlled selected tab `value`. Omit for uncontrolled mode.                                         |
| `defaultValue`   | `string \| undefined`         | `undefined`    | Initial selection when `modelValue` is omitted. When omitted, the first mounted trigger is selected. |
| `activationMode` | `'automatic' \| 'manual'`     | `'automatic'`  | Automatic selects on focus; manual requires click or Enter/Space on non-button hosts.                |
| `orientation`    | `'horizontal' \| 'vertical'`  | `'horizontal'` | Drives `aria-orientation` and roving arrow keys.                                                     |
| `dir`            | `'ltr' \| 'rtl' \| undefined` | `undefined`    | Optional explicit text direction for roving focus within the list.                                   |

#### `GhostTabsList`

| Prop | Type                   | Default | Contract                               |
| ---- | ---------------------- | ------- | -------------------------------------- |
| `as` | `GhostTabsListElement` | `'div'` | Element tag or component for the list. |

#### `GhostTabsTrigger`

| Prop       | Type                      | Default    | Contract                                                                                               |
| ---------- | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `as`       | `GhostTabsTriggerElement` | `'button'` | Element tag or component (for example `GhostButton`).                                                  |
| `value`    | `string`                  | required   | Stable id matching a `GhostTabsContent` `value`.                                                       |
| `disabled` | `boolean`                 | `false`    | Skips roving focus and prevents selection. Native `disabled` on `<button>`; `aria-disabled` otherwise. |

#### `GhostTabsContent`

| Prop    | Type                      | Default  | Contract                                |
| ------- | ------------------------- | -------- | --------------------------------------- |
| `as`    | `GhostTabsContentElement` | `'div'`  | Element tag or component for the panel. |
| `value` | `string`                  | required | Must match a trigger `value`.           |

Native attributes and listeners fall through to each part’s rendered root.

### v-model contracts

`GhostTabs` owns `modelValue` via `useControllableState`:

- When `modelValue` is `undefined` (omitted), internal state starts at
  `defaultValue` when provided; otherwise the first registered trigger value.
- `update:modelValue` emits on every user-driven or programmatic selection change
  while uncontrolled; controlled consumers must apply the emitted value.
- `value` strings are opaque to the component; consumers must keep trigger/content
  pairs consistent.

### Events, callbacks, slots, and exposed methods

- `GhostTabs` emits `update:modelValue` with `[value: string]`.
- `GhostTabs` default slot receives `{ modelValue: string | undefined }`.
- `GhostTabsList`, `GhostTabsTrigger`, and `GhostTabsContent` expose
  `{ element: HTMLElement | null, focus(), blur() }` matching other interactive
  parts. Renderless `GhostTabs` exposes `element: null`.

## State model

- Selection is a single `modelValue` string matching one trigger/content pair.
- Inactive panels use the native `hidden` attribute and `tabindex="-1"`; the
  active panel uses `tabindex="0"` for APG panel focus entry.
- `data-state="active" | "inactive"` on triggers and panels mirrors selection.

### Loading, empty, disabled, read-only, and error states

Only per-tab `disabled` on `GhostTabsTrigger` is supported. Disabled tabs are
skipped by `useRovingFocus` and cannot be selected.

## Consumer data

`GhostTabs` does not mutate consumer collections. Tab labels and panel bodies are
slot content.

## Accessibility contract

Follows [WAI-ARIA APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### Semantics and relationships

- `GhostTabsList`: `role="tablist"`, `aria-orientation`, `data-part="list"`,
  class `ghost-tabs-list`, `data-ghost-tabs`.
- `GhostTabsTrigger`: `role="tab"`, `aria-selected`, `aria-controls` → panel id
  when registered, deterministic `id` from `useGhostId` (overridable via `id`),
  `data-part="trigger"`, class `ghost-tabs-trigger`, `data-ghost-tabs`.
- `GhostTabsContent`: `role="tabpanel"`, `aria-labelledby` → trigger id when
  registered, panel `id` from `useGhostId`, `hidden` when inactive, `data-part="content"`,
  class `ghost-tabs-content`, `data-ghost-tabs`.

### Keyboard interaction

Roving among tabs (`useRovingFocus` on `GhostTabsList`):

| Key          | Orientation | Behavior                          |
| ------------ | ----------- | --------------------------------- |
| `ArrowRight` | horizontal  | Next enabled tab (RTL: previous). |
| `ArrowLeft`  | horizontal  | Previous enabled tab (RTL: next). |
| `ArrowDown`  | vertical    | Next enabled tab.                 |
| `ArrowUp`    | vertical    | Previous enabled tab.             |
| `Home`       | either      | First enabled tab.                |
| `End`        | either      | Last enabled tab.                 |

Activation (`GhostTabsTrigger`):

| Key             | `activationMode` | Behavior                                                                 |
| --------------- | ---------------- | ------------------------------------------------------------------------ |
| Focus           | `automatic`      | Selects the focused tab.                                                 |
| Click           | either           | Selects the tab.                                                         |
| `Enter`/`Space` | `manual`         | Selects when `as` is not a native `<button>` (buttons use native click). |

Disabled tabs are skipped by roving focus and cannot be activated.

### Focus behavior

- One tab stop in the tab list; arrows move roving `tabindex` among enabled tabs.
- Tab out of the list moves to the next document tab stop; Entering the active
  panel uses `tabindex="0"` on the visible `tabpanel`.
- Focus does not trap inside panels.

### Assistive technology expectations

Screen readers announce the tab list, selected tab, and associated panel via
`aria-selected`, `aria-controls`, and `aria-labelledby`.

## Rendering and customization

Stable hooks (not the undecided GHO-38 styling-hooks contract):

- `ghost-tabs-list`, `ghost-tabs-trigger`, `ghost-tabs-content` classes
- `data-part`, `data-state`, `data-ghost-tabs`
- Themed CSS under `.ghost-theme` / `.ghost-themed-scope` using existing
  `--ghost-*` semantic tokens

## Environment behavior

### SSR and hydration

- `useGhostId` supplies deterministic SSR-safe ids.
- `useRovingFocus` attaches listeners only in `onMounted` (no `document` access
  during SSR setup).
- Panels remain in the DOM with `hidden` when inactive so relationships hydrate.

### Mobile and touch

Pointer activation on triggers selects tabs; no separate gesture model.

## Performance

Global listeners are limited to roving `keydown`/`focusin` on the tab list
element while mounted.

## Composition

- `useGhostTabs` + `useControllableState` for selection.
- `useGhostId` per trigger and panel.
- `useRovingFocus` on `GhostTabsList`.

## Test plan

- **Unit (`GhostTabs.test.ts`):** horizontal/vertical arrows, RTL horizontal,
  Home/End, manual Enter/Space, disabled skip, `aria-controls` / `aria-labelledby`,
  SSR without roving listeners, controlled/uncontrolled selection.
- **Browser (`ghost-tabs.spec.ts`):** example gallery keyboard/pointer, Axe zero
  violations, `@component:GhostTabs`.
- **Themed integration:** themed root ref reaches list element.
- **Type tests:** optional consumer fixtures when exports stabilize.

## Documentation plan

- `docs/components/tabs.md` with headless and themed examples.
- Registry entries for `tabs/basic`, `tabs/manual`, `tabs/vertical`, `tabs/themed`.
- Playground `TabsReference` section with unique copy.
- Manifests via `pnpm manifests:write`.

## Compatibility and release impact

Additive `minor` Changeset for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None.
