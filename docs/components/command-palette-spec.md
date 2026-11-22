---
schemaVersion: 1.0.0
component: GhostCommandPalette
components:
  - GhostCommandPalette
  - GhostCommandPaletteTrigger
  - GhostCommandPaletteOverlay
  - GhostCommandPaletteContent
  - GhostCommandPaletteTitle
  - GhostCommandPaletteInput
  - GhostCommandPaletteList
  - GhostCommandPaletteItem
  - GhostCommandPaletteGroup
  - GhostCommandPaletteLabel
  - GhostCommandPaletteEmpty
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests: []
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

# GhostCommandPalette specification

**Status:** Proposed for [GHO-104](https://linear.app/ghost-vue/issue/GHO-104).
**Approved direction (Zac, 2026-11-17, Option A):** compose existing
`GhostDialog` with `useGhostCombobox` to deliver grouped command results, keyboard
highlight selection, and empty/loading presentation following the WAI-ARIA APG
[Combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)
pattern. Consumers own filtering, async result updates, command execution, and
shortcut registration. The palette emits the selected command's stable identity
and requests close on selection, subject to controlled-state ownership. Examples
may demonstrate Cmd/Ctrl+K without installing a global listener. No global
command registry and no built-in fuzzy search.

**Dependencies:** [GhostDialog specification](/specs/dialog) (GHO-28),
[GhostCombobox specification](/specs/combobox) (GHO-32), and
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md).

## Purpose and user problems

`GhostCommandPalette` is a **modal command surface** for power-user workflows:
jumping to pages, running editor actions, switching themes, or invoking app
verbs from a single searchable list. Users open the palette (commonly via a
button or a documented keyboard chord such as Cmd/Ctrl+K), type to narrow
results, move through grouped commands with arrow keys, and activate a command
with Enter or pointer selection.

Applications need predictable overlay behavior (modal focus trap, scroll lock,
background isolation, focus restoration) without reimplementing combobox
semantics, live-region announcements, or stale async guards. The palette is a
**composition component**: it coordinates a `GhostDialog` modal shell with
`useGhostCombobox` combobox state behind a purpose-built part tree so consumers
render commands as compound children rather than wiring Dialog and combobox
behavior manually for every app.

## Non-goals

- A global command or shortcut registry, default Cmd/Ctrl+K listener, or
  framework-wide keybinding engine.
- Built-in fuzzy search, internal filtering, query highlighting, or ranking.
- Executing commands inside the component (consumers handle `command` events).
- Persisted selection / form submit integration (`name`, hidden mirrors, or
  `modelValue` commit semantics like `GhostCombobox`).
- Multi-select or toggle commands.
- Creatable options, free-text values, or tag editing.
- Replacing `GhostDropdownMenu` action menus or `GhostCombobox` form fields.
- Virtualization implementation or bundled virtualizer dependency.
- Changing `GhostDialog` or `GhostCombobox` public contracts (including
  `GhostComboboxContent` floating behavior). The palette reuses documented
  dialog parts and `useGhostCombobox`; it does **not** mount
  `GhostComboboxContent` or call `useFloating` for the command list.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostCommandPalette` — renderless root providing `useGhostDialog` and
  `useGhostCombobox` context, coordinating dialog open state, search/loading,
  command selection, and polite announcements
- `GhostCommandPaletteTrigger` — optional control that opens the palette
  (wraps dialog trigger semantics)
- `GhostCommandPaletteOverlay` — modal backdrop while `open` and `modal=true`
- `GhostCommandPaletteContent` — modal dialog surface hosting the combobox
  (`role="dialog"`, `aria-modal="true"`)
- `GhostCommandPaletteTitle` — accessible dialog name (`h2`, linked via
  `aria-labelledby`)
- `GhostCommandPaletteInput` — combobox query field (`role="combobox"`)
- `GhostCommandPaletteList` — palette-owned listbox surface inside the dialog
  (always expanded while the dialog is open; no portal, no `useFloating`, and
  no dependency on `GhostComboboxContent`)
- `GhostCommandPaletteItem` — one selectable command (`role="option"`)
- `GhostCommandPaletteGroup` — optional `role="group"` wrapper for related
  commands
- `GhostCommandPaletteLabel` — group label (`id` for `aria-labelledby` on the
  group)
- `GhostCommandPaletteEmpty` — visible when the palette is open, not loading,
  and zero command items are registered
- `useGhostCommandPalette` — composable exposing reactive open/search/loading
  state, `close()`, `open()`, and `focusInput()`
- `useGhostCommandPaletteAsyncSearch` — thin re-export or alias of
  `useGhostComboboxAsyncSearch` documenting stale-response protection for async
  command lists (same `begin` / `isLatest` contract tied to root `search` events)
- Types: `GhostCommandPaletteProps`, `GhostCommandPaletteSlotProps`,
  `GhostCommandPaletteCommandPayload`, part prop/exposed/context types for each
  part listed above, `UseGhostCommandPaletteOptions`,
  `UseGhostCommandPaletteReturn`, `GhostCommandPaletteContext`,
  `UseGhostCommandPaletteAsyncSearchReturn`

Themed exports from `@ghostvue/themes`:

- The same part names with default modal shell, input, list, group, item, and
  empty styles via `--ghost-*` tokens (mirrors dialog + combobox theming
  patterns)

### Command identity and group semantics

Each `GhostCommandPaletteItem` **must** declare a stable string **`id`** that
uniquely identifies the command within the palette instance for the current
render (collisions are a development warning). The `id` is the command's
**public identity**: it is the only value emitted on selection. Optional
`textValue` supplies plain-text copy for announcements and the closed-state
label when applicable; when omitted, the item's default slot text content is
used.

`GhostCommandPaletteGroup` wraps related items. Groups are **presentational and
semantic only**: the component does not filter or sort by group. Each group
should include a `GhostCommandPaletteLabel` with a stable `id` so
`aria-labelledby` links the group to its name. Groups do not nest in v1. Item
order in the DOM is highlight traversal order (same contract as
`GhostComboboxOption`).

### Props and configuration

#### `GhostCommandPalette` (root)

| Prop            | Type                   | Default     | Contract                                                                                                     |
| --------------- | ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `open`          | `boolean \| undefined` | `undefined` | Controlled dialog open state. Omit for uncontrolled.                                                         |
| `defaultOpen`   | `boolean`              | `false`     | Initial open in uncontrolled mode.                                                                           |
| `search`        | `string \| undefined`  | `undefined` | Controlled query text. Omit for uncontrolled search.                                                         |
| `defaultSearch` | `string`               | `''`        | Initial query when `search` is omitted.                                                                      |
| `loading`       | `boolean`              | `false`     | Shows loading presentation; announces via polite live region; sets `aria-busy` on the listbox.               |
| `modal`         | `boolean`              | `true`      | Passed through to dialog: focus trap, scroll lock, inert siblings, overlay.                                  |
| `disabled`      | `boolean`              | `false`     | Prevents opening and disables input/items/trigger.                                                           |
| `closeOnSelect` | `boolean`              | `true`      | When `true`, requests dialog close after a successful command selection (see Selection versus close timing). |
| `closeOnEscape` | `boolean`              | `true`      | Whether `Escape` closes the dialog (combobox list close is subsumed by dialog close).                        |

`search` updates on input `input` events (every keystroke). Root increments an
internal `searchRequestId` on each change and emits `search` with payload
`{ query: string, requestId: number }` (same monotonic contract as
`GhostCombobox`).

#### `GhostCommandPaletteTrigger`

Same contract as `GhostDialogTrigger` (`as`, `disabled`).

#### `GhostCommandPaletteOverlay` / `GhostCommandPaletteContent`

Same portal, modal, dismissal, and focus-target contracts as
`GhostDialogOverlay` / `GhostDialogContent`, with these palette-specific
defaults:

- `GhostCommandPaletteContent` sets `initialFocus` to resolve the command
  input when not overridden.
- `GhostCommandPaletteContent` default `closeOnOutsideClick` is `true` for
  `role="dialog"`.
- `GhostCommandPaletteList` renders in normal document flow inside content.
  Because `GhostComboboxContent` always anchors with `useFloating`, the palette
  list is a **separate part** that reads the same `useGhostCombobox` context and
  renders listbox semantics without importing or wrapping `GhostComboboxContent`.

Optional `returnFocus` / `initialFocus` on content follow
[`GhostDialogContent`](/specs/dialog) (GHO-209): resolvers run at activation and
close, supporting shortcut openers that are not the visible trigger.

#### `GhostCommandPaletteTitle`

Same as `GhostDialogTitle` (`as` default `'h2'`). Recommended for modal
palettes; `aria-label` on content remains an escape hatch (see Open questions).

#### `GhostCommandPaletteInput`

Same presentation props as `GhostComboboxInput` (`as`, `disabled`, placeholder
via root or prop). Keyboard handling lives in **`GhostComboboxInput.vue`**
(`handleKeydown`), not in `useGhostCombobox` (which exposes `moveActive`,
`select`, and related APIs only).

`GhostCommandPaletteInput` **copies** that keydown handler so Arrow keys, `Home`,
`End`, `Escape`, and IME composition guards stay aligned with the combobox input.
**It does not import `GhostComboboxInput`** (palette avoids mounting combobox
chrome parts). `Enter` must **not** call `context.select()`: it reads
`activeOptionValue` and invokes palette `activateCommand(id)` instead.

Palette `activateCommand` emits `command`, optionally requests dialog close, and
never calls `select()`, never assigns combobox `modelValue`, and never replaces
the search query with the item's `textValue` (so consumers do not get spurious
`update:search` / `search` emissions or stale selected state on the next open).

#### `GhostCommandPaletteList`

Hosts the listbox (`role="listbox"`, `aria-labelledby` → input id,
`aria-busy` when loading). Static layout inside the dialog only: no
`placement`, `offset`, `flip`, `shift`, `strategy`, `portal`, or `portalTo`
props and no positioned `left`/`top` styles. Accepts consumer `class` / `style`
merge for scrollable max-height styling.

#### `GhostCommandPaletteItem`

| Prop        | Type      | Default     | Contract                                                                                      |
| ----------- | --------- | ----------- | --------------------------------------------------------------------------------------------- |
| `id`        | `string`  | (required)  | Stable command identity; registry `value` for highlight; emitted on `command`.                |
| `disabled`  | `boolean` | `false`     | Excluded from keyboard highlight and activation; `aria-disabled` / `data-state="disabled"`.   |
| `textValue` | `string`  | `undefined` | Plain label for AT and announcements; falls back to flattened default slot text when omitted. |

Primary pointer activation on an enabled item calls the same `activateCommand(id)`
path as `Enter` on a highlighted item (never `select()`).

#### `GhostCommandPaletteGroup` / `GhostCommandPaletteLabel`

Same group/label contract as `GhostComboboxGroup` / `GhostComboboxLabel`.

#### `GhostCommandPaletteEmpty`

Renders when the dialog is open, `loading` is `false`, and registered item
count is zero. No ARIA role (plain message); root live region announces the
empty result when appropriate.

### v-model contracts

| Role   | Prop     | Emit            | Uncontrolled initial |
| ------ | -------- | --------------- | -------------------- |
| Open   | `open`   | `update:open`   | `defaultOpen`        |
| Search | `search` | `update:search` | `defaultSearch`      |

There is **no** selection `modelValue`. Command choice is an event, not persisted
widget state. The palette does **not** call `useGhostCombobox`'s `select()` on
activation; combobox selection state must remain unset so reopening shows an
empty query (subject to consumer-controlled `search`) with no option marked
selected.

Open and search use `useControllableState`. Switching controlled ↔ uncontrolled
after setup is unsupported ([GHOST001](../warnings.md#ghost001)).

### Command activation (not `select()`)

`GhostComboboxInput` wires `Enter` to `context.select(active)`; `select()` in
`use-ghost-combobox.ts` commits `modelValue`, copies the option label into the
search field, and closes the list. That behavior is correct for form comboboxes
but wrong for a command palette: activation would emit `update:search` /
`search` (triggering consumer refetches) and leave a committed selection visible
on the next open.

Palette activation uses a dedicated **`activateCommand(id)`** path on the palette
root (invoked from `GhostCommandPaletteInput` on `Enter` and from
`GhostCommandPaletteItem` on pointer activation):

1. No-op when `disabled`, item disabled, or missing id.
2. Emit `command` with `{ id }` synchronously.
3. Do **not** call `select()`, do **not** mutate combobox selection / `modelValue`.
4. Do **not** write the item's `textValue` into `search` (query text stays as
   typed until close cleanup or explicit consumer control).
5. When `closeOnSelect` is `true`, continue with dialog close and search reset
   per [Selection versus close timing](#selection-versus-close-timing-and-controlled-rejection).

Highlight APIs (`moveActive`, `setActiveOptionByValue`, registry keyed by item
`id`) still use `useGhostCombobox`; only the commit primitive differs.

### Events, slots, and exposed methods

- `update:open` — `[open: boolean]` when the dialog should open or close.
- `update:search` — `[search: string]` on query changes.
- `search` — `{ query: string, requestId: number }` after each query change
  (alongside `update:search`).
- `command` — `GhostCommandPaletteCommandPayload`:

```ts
interface GhostCommandPaletteCommandPayload {
  /** Stable command identity from the selected item's `id` prop. */
  id: string
}
```

Emitted **synchronously** when the user activates an enabled item (Enter with
highlight on that item, or primary pointer activation). Not emitted for disabled
items or when the palette is `disabled`. Consumers run side effects here.

- Default slot receives `{ open, search, loading, close, focusInput }`.
- Each part exposes `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`.
- Root / `useGhostCommandPalette`: `open()`, `close()`, `focusInput()`.

Slots on items and groups allow icons, shortcuts (`GhostKbd`), and secondary
description text; these are consumer markup, not parsed by the palette.

### Selection versus close timing and controlled rejection

On successful command activation:

1. Emit `command` with the item's `id` (step 1 always runs).
2. When `closeOnSelect` is `true`, request dialog close: emit `update:open`
   with `false` (uncontrolled internal state updates when not controlled).
3. Reset transient **search** to `defaultSearch` (`''` by default) as part of
   close cleanup (emit `update:search` and `search` with a new `requestId` when
   the query actually changes).
4. Dialog focus restoration runs via `GhostDialogContent` / `useFocusScope`
   (`returnFocus` resolver or saved opener).

When the parent **controls** `open` and rejects close (keeps `open === true`
after step 2):

- The `command` event has already fired; consumers must treat execution as
  idempotent if needed.
- Focus remains on the combobox input unless the consumer moves it.
- Search reset on close is **skipped** while the dialog stays open (the query
  stays as typed so the user can pick another command). See Open questions for
  whether an alternate reset-on-select mode is needed.

When the parent controls `search` and rejects a search reset during close, the
parent's `search` wins (same pattern as combobox controlled rejection).

`closeOnSelect: false` supports multi-invocation sessions (for example,
preview-then-confirm flows); Escape and explicit `close()` still dismiss.

## State model

| Surface | `data-part` | Notable state                                                 |
| ------- | ----------- | ------------------------------------------------------------- |
| Trigger | `trigger`   | `data-state="open" \| "closed"`                               |
| Overlay | `overlay`   | `data-state="open"` while mounted                             |
| Content | `content`   | `data-state="open"`; dialog role                              |
| Input   | `input`     | `data-state="open"` while dialog open                         |
| List    | `list`      | `data-part="list"`; hosts listbox                             |
| Item    | `item`      | `data-state="disabled"` when disabled; highlight via combobox |
| Empty   | `empty`     | visible per empty contract                                    |

- Dialog states: `'closed'` and `'open'` (`v-if` unmount on close, matching
  `GhostDialog`).
- While the dialog is **open**, the internal combobox list is **held open**
  (`open === true` on the composed combobox). Closing the dialog tears down the
  list.
- Highlight: `aria-activedescendant` on the input references the active item;
  keyboard moves among **enabled** registered items in DOM order.

### Loading, empty, disabled, and overlapping states

| State             | Precedence / behavior                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disabled          | Blocks open, search, and selection; `aria-disabled` on input and trigger.                                                                                              |
| Loading           | Hides `GhostCommandPaletteEmpty`; polite "Loading results" announcement; listbox `aria-busy="true"`.                                                                   |
| Empty             | Open + `!loading` + zero registered items → show `GhostCommandPaletteEmpty`.                                                                                           |
| Loading ∧ results | When `loading` is `true` **and** items remain mounted, keep showing items (stale results) while announcing loading; consumer may clear items concurrently (see async). |

Disabled items remain visible but cannot be highlighted or activated.

### Async behavior

The palette does not await fetches. Consumers:

1. Listen to `search` / `update:search`.
2. Set `loading` while fetching.
3. Call `begin(payload.requestId)` from `useGhostCommandPaletteAsyncSearch`,
   then update command children only when `isLatest(payload.requestId)` is true.

Stale responses must not replace newer results, clear `loading`, or mount items
for an outdated query. Documentation and examples must include an
out-of-order response test (fast-then-slow race) mirroring
`GhostCombobox` async examples.

When options unregister during async replacement, highlight and announcements
update without emitting `command` or changing prior emissions.

## Consumer data

Commands are **compound children**, not object-array props. Consumers:

- Render `GhostCommandPaletteItem` nodes (possibly inside groups) for each
  command surfaced for the current query.
- Own filtering: mount/unmount or `v-if` items based on `search` and app logic.
- Own execution in the `command` handler (navigation, mutations, toasts).
- Own shortcut registration: global or local `keydown` listeners call `open()`;
  the palette does not register listeners.

Optional consumer convention (not enforced): keep a static command catalog in
application code keyed by the same `id` strings passed to items.

The component does not mutate consumer-owned catalogs or filter strings.

## Accessibility contract

### Semantics and relationships

- `GhostCommandPaletteTrigger`: `type="button"` when `as="button"`,
  `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` → content id.
- `GhostCommandPaletteContent`: `role="dialog"`, `aria-modal="true"` when
  `modal=true`, labelled by `GhostCommandPaletteTitle` or consumer
  `aria-label` / `aria-labelledby`.
- `GhostCommandPaletteInput`: `role="combobox"`, `aria-autocomplete="list"`,
  `aria-expanded="true"` while dialog open, `aria-controls` → listbox id,
  `aria-activedescendant` when highlight present.
- Listbox: `role="listbox"`, `aria-labelledby` → input id, `aria-busy` when
  loading. When open, not loading, and zero items, drop listbox role and show
  empty message as plain text (combobox pattern).
- Items: `role="option"`, not `aria-selected` persistently (no committed
  selection); disabled items use `aria-disabled="true"`.
- Groups: `role="group"` + `aria-labelledby` → label id.
- Polite live region on root announces loading transitions and result counts
  when not loading (count = registered **enabled** items, matching combobox).

Development: reuse `GHOST002` when dialog content lacks an accessible name.

### Keyboard interaction

Palette input keeps focus; the list does not take roving tabindex (APG combobox).
Input key handling is implemented in **`GhostCommandPaletteInput`** (copied from
`GhostComboboxInput.vue`); `useGhostCombobox` supplies highlight movement only.

| Key                     | Where (focus on input, dialog open) | Behavior                                                                            |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `ArrowDown` / `ArrowUp` | Input                               | `moveActive`; updates `aria-activedescendant` among enabled items.                  |
| `Enter`                 | Input                               | `activateCommand(highlighted id)` → `command` + optional close; **not** `select()`. |
| `Escape`                | Input / dialog                      | Dialog `closeOnEscape` closes palette; clears highlight; no `command`.              |
| Printable keys          | Input                               | Updates search; consumer updates items.                                             |
| `Home` / `End`          | Input                               | First / last enabled item highlight.                                                |
| `Tab` / `Shift+Tab`     | Inside dialog                       | Loops within modal dialog when `modal=true`.                                        |

IME composition guard matches `GhostComboboxInput` (`isComposing`, `keyCode` 229):
arrow keys, `Home`/`End`, `Enter`, and `Escape` do not move highlight or activate
until composition completes.

Documented **application** shortcut (for example Mod+K) is implemented in
examples via an explicit listener that calls `open()`; the palette does not
intercept keys while closed.

### Focus behavior

**Entry:** Opening moves focus to the command input via dialog `initialFocus`
(after `focusReady` / portal placement per dialog spec).

**While open:** Focus stays on the input for typing and list navigation
(`aria-activedescendant`). Pointer activation on items does not move persistent
focus to the list (mousedown prevention on non-focusable list chrome matches
combobox).

**Exit:** On close (selection with `closeOnSelect`, Escape, outside click,
`close()`), `useFocusScope` restores focus per `returnFocus` or the element that
was focused before open (including shortcut openers without a trigger).

**Cross-overlay:** Nested portaled overlays inside a modal palette follow
[ADR 0012](../adr/0012-modal-overlays.md) and the dialog e2e contract: a
portaled `GhostPopover` opened from a palette item owns `Tab` while focus is
outside the dialog root; inline (`portal=false`) popovers keep Tab bounded
inside the modal dialog.

**Combobox focus departure (GHO-166):** Focus moving to an external element
while the dialog remains open is uncommon for palettes; if focus leaves the
composed combobox widget without closing the dialog, apply the combobox focus-
departure close contract **only to the list subtree**, or keep the dialog open
with input blurred — resolution required (Open questions). Minimum v1 behavior:
closing the dialog always clears search and restores focus; partial widget focus
loss without dialog close is undefined unless resolved before implementation.

### Assistive technology expectations

- Opening announces dialog name (title).
- Result count announces when the item set stabilizes and `loading` is false.
- Loading announces on transition to `loading=true`.
- Empty state announces when the registry is empty and not loading.
- Activating a command does not require a separate "selected" announcement;
  consumers may announce action outcomes after `command`.

## Rendering and customization

Stable `data-part` hooks: `trigger`, `overlay`, `content`, `title`, `input`,
`list`, `item`, `group`, `label`, `empty`. `data-state` mirrors dialog/combobox
where applicable.

Themed classes: `.ghost-command-palette-content`, `.ghost-command-palette-input`,
`.ghost-command-palette-list`, `.ghost-command-palette-item`, etc., using
`--ghost-*` tokens (scrim/elevation from dialog; list/input from combobox).

Consumer `class` / `style` merge on all parts. Highlighted item styling uses
focus-ring token inset on the active item (same rationale as themed combobox).

List region should support `overflow: auto` with a documented max-height token
for long command sets.

## Environment behavior

### SSR and hydration

`useGhostId` for dialog and combobox ids. Closed palette: SSR outputs trigger
only (dialog/combobox subtrees unmounted). `defaultOpen: true` is supported with
`expectSsrHydration` coverage for initially open palette (input + inline list).

### Mobile and touch

Modal layout; virtual keyboard edits the input; list scrolls inside content.
Outside tap dismisses when `closeOnOutsideClick` is enabled.

## Performance

No global listeners when closed. Filtering is O(n) consumer render cost. Item
registry bookkeeping matches combobox (insertion-ordered map, O(1) per item
update). Large command sets should use consumer-driven virtualization with stable
`id` values and mounted-slice highlight rules (document pattern; no built-in
virtualizer). No internal fuzzy search.

## Composition

Internal implementation **composes** (does not fork):

- `GhostDialog` / `useGhostDialog` — overlay, content, focus trap, scroll lock,
  inert, dismissal (`GhostCommandPalette*` dialog parts delegate here)
- `useGhostCombobox` at the palette root — search, highlight, item registry,
  `aria-activedescendant`, polite live region, `searchRequestId` (without
  mounting `GhostCombobox` / `GhostComboboxContent` and **without** calling
  `select()` on activation)
- Palette-owned parts (`GhostCommandPaletteInput`, `GhostCommandPaletteList`,
  `GhostCommandPaletteItem`, group/label/empty) consume that context. Input
  keyboard behavior is **copied** from `GhostComboboxInput.vue`. The list part
  renders listbox markup in-flow without `useFloating` or `GhostComboboxContent`.
- `useControllableState`, `useGhostId`
- `useGhostComboboxAsyncSearch` (exposed as palette async helper)
- Palette root `activateCommand(id)` — emits `command`; never `select()`;

Palette root synchronizes dialog `open` with list availability while the dialog is
open. Item `id` values register as combobox option values for highlight only.

No `useRovingFocus` on the list. No new overlay primitives. No **public**
changes to `GhostCombobox` or `GhostComboboxContent` (palette does not mount
them; copying input keydown does not change combobox exports).

## Test plan

- **Vue unit:** `v-model:open` and `v-model:search`; monotonic `search.requestId`;
  `useGhostCommandPaletteAsyncSearch` stale discard; highlight + Enter/Escape;
  Enter / pointer activation never calls `select()`; search text unchanged on
  `command`; no combobox selection after close/reopen; disabled items skip
  `command`; `command` payload `id`; `closeOnSelect` true/false;
  loading hides empty; empty visibility; controlled `open` rejection after
  `command` keeps palette open without duplicate `command` on same activation;
  controlled `search` rejection on close; search reset when close succeeds;
  dialog `disabled` / `modal=false` passthrough; item registry order after
  filter/reorder; cleanup on unmount; collision warning for duplicate `id`
- **SSR:** `expectSsrHydration` for closed and `defaultOpen` palettes
- **E2E + axe:** keyboard-only activation path, `aria-activedescendant` sync,
  grouped labels, loading/empty announcements, focus trap and restore (trigger
  and programmatic opener), overlay/Escape dismiss, async example race,
  cross-overlay Tab with nested portaled popover inside modal palette, IME guard
  smoke (reuse combobox IME spec patterns where applicable)
- **Visual:** `command-palette/themed` via `pnpm test:visual:docker` after
  implementation
- **Types:** consumer compile fixture importing all exported types

## Documentation plan

After implementation (not in this spec-only PR):

- `docs/components/command-palette.md` API reference with `<GhostExample />`
  entries under `examples/command-palette/`:
  - `basic` — static grouped commands
  - `async` — `useGhostCommandPaletteAsyncSearch` + stale-response demo
  - `shortcut` — Mod+K listener calling `open()` without global registry
  - `themed` — token styling
- Playground section; manifests via `pnpm manifests:write`; roadmap row update to
  reference approved spec; sidebar via `apps/docs/.vitepress/docs-nav.ts` if
  needed; spec route `/specs/command-palette` from this file

## Compatibility and release impact

Additive **minor** Changesets for `@ghostvue/vue` and `@ghostvue/themes` when
implemented. No breaking changes to Dialog or Combobox.

## Open architectural questions

Decisions below need **Zac sign-off** before implementation. This spec does not
pre-decide them silently.

1. **Dedicated parts vs documented composition.** Option A approved Dialog +
   combobox behavior via `useGhostCombobox`. Should v1 ship only the dedicated
   `GhostCommandPalette*` tree (recommended), or also export a documented
   "manual compose" recipe without a root coordinator?

2. **`GhostCommandPaletteTitle` requirement.** Always require a title (or
   explicit `aria-label`) for modal palettes, or allow icon-only chrome with a
   visually hidden default title?

3. **Search reset when `closeOnSelect` is rejected.** When controlled `open`
   stays `true` after `command`, should search clear anyway, or only clear on
   successful dialog close (current draft: only on close)?

4. **Focus departure without dialog close.** If focus leaves the input while the
   dialog stays open, should the dialog close (strict modal) or follow combobox
   GHO-166 departure rules (risky inside modals)?

5. **Group separators.** Add an optional `GhostCommandPaletteSeparator` part for
   visual grouping, or rely on spacing/labels only?

6. **Footer / hint region.** Optional slot for "↑↓ navigate · ↵ select" hints,
   or leave entirely to consumer layout inside content?

7. **Cancellable `command`.** Should consumers be able to call
   `event.preventDefault()` on a cancellable command event to veto close and
   side effects, or is `command` always fire-and-forget?

8. **i18n (GHO-43).** Follow `GhostComboboxMessages` pattern for loading/empty/
   results announcement strings on the palette root?

9. **Virtualization.** Document-only pattern vs first-class `virtualized` boolean
   mirroring combobox?

10. **`textValue` vs `id`.** Is `id` always sufficient for consumer handlers, with
    `textValue` only for AT (recommended), or should `command` also emit
    `textValue` for convenience?
