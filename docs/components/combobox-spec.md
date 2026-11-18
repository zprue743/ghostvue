# GhostCombobox specification

**Status:** Proposed for GHO-32. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostCombobox` is an accessible **editable** combobox with **list autocomplete**
from the WAI-ARIA APG
[Combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)
pattern. Users type in a text field, see a positioned list of suggestions, and pick
one or more values. It targets filter fields, async lookups, and form fields
composed with `GhostField`.

Filtering and fetching are **consumer-owned**: the component renders whatever
options are in the tree, emits the current query, and never filters option text
internally. Loading and empty surfaces are first-class. Assistive technology users
get combobox + listbox semantics, `aria-activedescendant` highlight sync,
result-count and loading announcements via a polite live region, and labeled
options inside `GhostField`. The control participates in native HTML forms via
hidden submit input(s) and `useNativeFormReset`, consistent with `GhostSelect`.

## Non-goals

- Internal filtering, fuzzy match, or highlight rendering of query substrings.
- Built-in data fetching, debouncing, or caching (helpers document async patterns).
- Creatable options, free-text values without a matching option, or inline tag
  chip editing (follow-ups).
- Replacing `GhostSelect` select-only UX or changing `GhostSelect` behavior.
- `GhostDropdownMenu` action-menu semantics.
- A bundled virtualizer dependency or DOM recycling implementation.
- Changing overlay primitive public APIs or inventing a new styling-hooks
  contract (GHO-38).

## Public API

### Parts and exports

Headless `@ghostvue/vue`:

- `GhostCombobox` — root provider, value model, search request generation, live
  region, form submit input(s)
- `GhostComboboxInput` — editable `role="combobox"` text field
- `GhostComboboxTrigger` — optional companion control (e.g. open chevron) that
  toggles the listbox; not the combobox itself
- `GhostComboboxContent` — portaled listbox surface
- `GhostComboboxOption` — `role="option"` item
- `GhostComboboxGroup` — optional `role="group"` wrapper
- `GhostComboboxLabel` — group label (`id` for `aria-labelledby`)
- `GhostComboboxEmpty` — visible when the list is open, not loading, and zero
  registered options
- `useGhostCombobox` — state, registry, keyboard highlight, form helpers
- `useGhostComboboxAsyncSearch` — tracks the root-emitted `search.requestId` so
  stale fetch responses never apply after a newer query
- Types for props, exposed refs, context, and composable options

Themed `@ghostvue/themes`:

- The same part names with default input, list surface, and option styles

### Props and configuration

#### `GhostCombobox` (root)

| Prop            | Type                              | Default     | Contract                                                                                                                           |
| --------------- | --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`    | `string \| string[] \| undefined` | `undefined` | Controlled selection. Shape follows `multiple`.                                                                                    |
| `defaultValue`  | same                              | `undefined` | Uncontrolled initial selection. Form reset restores `defaultValue`.                                                                |
| `multiple`      | `boolean`                         | `false`     | Multi-select toggles membership in `string[]`; single keeps `string`.                                                              |
| `search`        | `string \| undefined`             | `undefined` | Controlled query text in the input. Omit for uncontrolled search field.                                                            |
| `defaultSearch` | `string`                          | `''`        | Initial query when `search` is omitted.                                                                                            |
| `name`          | `string`                          | `undefined` | Hidden input `name` for native submit. When omitted, no submit mirror.                                                             |
| `disabled`      | `boolean`                         | `false`     | Disables input, trigger, and options.                                                                                              |
| `required`      | `boolean`                         | `false`     | Native `required` on submit mirror when `name` is set.                                                                             |
| `invalid`       | `boolean`                         | `false`     | Sets `aria-invalid` on the combobox input.                                                                                         |
| `open`          | `boolean \| undefined`            | `undefined` | Controlled listbox open state.                                                                                                     |
| `defaultOpen`   | `boolean`                         | `false`     | Initial open when `open` is omitted.                                                                                               |
| `loading`       | `boolean`                         | `false`     | Announces loading and sets `aria-busy` on the listbox while true.                                                                  |
| `placeholder`   | `string`                          | `undefined` | Passed through to the input when no selection label occupies the field.                                                            |
| `allowDeselect` | `boolean`                         | `false`     | Single mode: re-selecting the active option clears selection.                                                                      |
| `virtualized`   | `boolean`                         | `false`     | Documents windowed lists: highlight moves only among **mounted** options; consumer renders a slice and keeps ids stable per value. |

`GhostFieldControl` slot props spread onto `GhostComboboxInput`.

#### `GhostComboboxInput`

| Prop       | Type                  | Default   | Contract                                                              |
| ---------- | --------------------- | --------- | --------------------------------------------------------------------- |
| `as`       | `string \| Component` | `'input'` | Native `input` uses `type="text"`. Combobox host (`role="combobox"`). |
| `disabled` | `boolean`             | `false`   | Combines with root `disabled`.                                        |

#### `GhostComboboxTrigger`

| Prop       | Type                  | Default    | Contract                                                |
| ---------- | --------------------- | ---------- | ------------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | `type="button"` on native button; toggles listbox open. |
| `disabled` | `boolean`             | `false`    | Combines with root `disabled`.                          |

#### `GhostComboboxContent`

Same floating/portal props as `GhostSelectContent` (`placement`, `offset`, `flip`,
`shift`, `strategy`, `portal`, `portalTo`).

#### `GhostComboboxOption`

Same as `GhostSelectOption`: `value`, `disabled`, `textValue`, optional `as`.

#### `GhostComboboxGroup` / `GhostComboboxLabel`

Same group/label contract as `GhostSelectGroup` / `GhostSelectLabel`.

#### `GhostComboboxEmpty`

Renders when `open && !loading && optionCount === 0` (registered enabled +
disabled options count toward “has options”; empty slot only when registry empty).

### v-model contracts

| Role      | Prop         | Emit                | Uncontrolled initial |
| --------- | ------------ | ------------------- | -------------------- |
| Selection | `modelValue` | `update:modelValue` | `defaultValue`       |
| Search    | `search`     | `update:search`     | `defaultSearch`      |
| Open      | `open`       | `update:open`       | `defaultOpen`        |

`search` updates on input `input` events (every keystroke). Root increments an
internal `searchRequestId` on each change and emits `search` with payload
`{ query: string, requestId: number }`.

Both selection and open use `useControllableState`. Switching controlled ↔
uncontrolled after setup is unsupported ([GHOST001](../warnings.md#ghost001)).

### Events, slots, and exposed methods

- `search` — `{ query, requestId }` after each query change (alongside
  `update:search`).
- Default slot holds input, optional trigger, content, empty, and options.
- Each part exposes `{ element, focus(), blur() }`.
- Root exposes `element` on the combobox input; `focus()` focuses the input.

### `useGhostComboboxAsyncSearch`

Returns `{ begin(requestId), isLatest(requestId) }`. The root owns the monotonic
`searchRequestId` and emits it on every `search` event. At the start of an async
handler, call `begin(payload.requestId)`. When the fetch completes, apply options
and clear `loading` only when `isLatest(payload.requestId)` is still true. Stale
responses must not touch `loading`, options, or any other UI state.

## State model

| Surface | Attribute / state                                          |
| ------- | ---------------------------------------------------------- |
| Input   | `data-part="input"`, `data-state="open" \| "closed"`       |
| Trigger | `data-part="trigger"`, `data-state="open" \| "closed"`     |
| Content | `data-part="content"`, `data-state`, `data-placement`      |
| Listbox | `data-part="listbox"`                                      |
| Option  | `data-part="option"`, `data-state="checked" \| "disabled"` |
| Empty   | `data-part="empty"`                                        |

Open content stays mounted while closed with `hidden` / `inert` (options register).
Floating and dismiss layers attach while open.

Highlight: `activeOptionValue` drives `aria-activedescendant` on the input,
referencing the active option element id. Keyboard moves highlight among enabled
registered options; pointer hover may move highlight (optional, matches APG).
Arrow, `Home`, and `End` traverse those options in their rendered DOM order, not
the order they registered in, so keyed reordering, insertion before existing
options, and filtering then restoring results keep `aria-activedescendant`
moving in visual order.

### Loading, empty, disabled, read-only, and error states

| State    | Precedence / behavior                                                            |
| -------- | -------------------------------------------------------------------------------- |
| Disabled | Blocks open, search, and selection; `aria-disabled` on input.                    |
| Loading  | `GhostComboboxEmpty` hidden; live region “Loading results”; listbox `aria-busy`. |
| Empty    | Open + !loading + zero options → show `GhostComboboxEmpty`.                      |
| Invalid  | Root `invalid` → `aria-invalid` on input.                                        |
| Required | Empty selection fails constraint validation on submit mirror.                    |

### Async behavior

The component does not await fetches. Consumers:

1. Listen to `search` / `update:search`.
2. Set `loading` while fetching.
3. Call `begin(payload.requestId)` then, after the fetch, update options only when
   `isLatest(payload.requestId)`.

Stale responses must not replace newer results: the helper’s `isLatest` gate is
the supported contract; tests demonstrate a fast-then-slow race.

### Option removal

Consumer filtering, async result replacement, reordering, and virtualization
unmount options routinely. Unregistering an option only removes it from the live
registry (highlight, result count, `aria-activedescendant`). It never changes the
selection: uncontrolled single and multiple values stay selected and keep
submitting through the form mirror(s), and the closed single-mode input keeps the
last registered `textValue` for the selected value. No `update:modelValue` is
emitted. The selection changes only through explicit user selection or
deselection, native form reset, or the parent's controlled `modelValue`.

## Consumer data

Options are compound children (`GhostComboboxOption`), identified by stable string
`value`. `textValue` drives display after selection in single mode. The component
does not read arbitrary object arrays.

## Accessibility contract

### Semantics

- `GhostComboboxInput`: `role="combobox"`, `aria-autocomplete="list"`,
  `aria-expanded`, `aria-controls` → listbox id, `aria-activedescendant` when
  highlight present, `aria-invalid`, `aria-required` when applicable.
- Listbox: `role="listbox"`, `aria-labelledby` → input id, `aria-busy` when loading.
- Options: `role="option"`, `aria-selected` (true for each selected value in
  multiple mode).
- Polite live region on root announces loading transitions and
  “N results available” when not loading and open (result count = registered
  enabled options).

### Keyboard

| Key                     | Where (focus on input) | Behavior                                                              |
| ----------------------- | ---------------------- | --------------------------------------------------------------------- |
| `ArrowDown` / `ArrowUp` | Input                  | Opens if closed; moves `aria-activedescendant` among enabled options. |
| `Enter`                 | Input                  | Selects highlighted option (toggle in multiple); single closes list.  |
| `Escape`                | Input                  | Closes list; clears highlight.                                        |
| Printable keys          | Input                  | Updates search; consumer replaces options.                            |
| `Home` / `End`          | Input (open)           | First / last enabled option highlight.                                |

Keys that belong to an active IME composition are not combobox commands:
while `isComposing` is `true`, or the keydown reports the legacy `keyCode` 229
(WebKit dispatches the composition-confirming keydown after `compositionend`
with `isComposing === false`), arrow keys, `Home` / `End`, `Enter`, and `Escape`
do not open the list, move the highlight, select, or close. Consumer `onKeydown`
handlers still receive these events, `Escape` is left unprevented, and the
dismissable layer applies the same guard, so cancelling a composition never
closes the popup. Composition text still reaches the input through `input`
events and updates the search like ordinary typing.

`GhostComboboxTrigger` is a single tab stop; activation toggles open without
stealing combobox role.

Listbox does not use roving `tabindex`; focus remains on the input.

### Focus

Tab order: input (and trigger when present). On open, focus stays on input.
On close, focus remains on input. Outside dismiss restores focus per
`useDismissableLayer` / `useFocusScope` (`trapped: false`).

#### Focus departure (GHO-166)

The **widget** is the combobox input, the optional `GhostComboboxTrigger`, and
the owned `GhostComboboxContent` surface, whether it renders inline
(`portal: false`) or portaled. When keyboard focus (`Tab` / `Shift+Tab`) or
programmatic focus (`element.focus()` elsewhere, `input.blur()`) leaves the
complete widget:

- The root **requests close**: `update:open` is emitted with `false`. Focus is
  not restored to the input; it stays wherever it went.
- The selection does not change and no `update:modelValue` is emitted.
- The **transient search is cleared**. Single selection resets the query to the
  committed selected option's label (or `''` when nothing is selected), so the
  closed input shows the committed value. Multiple selection resets the query
  to `''`. A reset that changes the query emits `update:search` and `search`
  (with a new `requestId`) so consumer filtering and async results follow the
  visible query; an unchanged query emits nothing.
- Controlled `open`, `search`, and `modelValue` remain parent-owned. When the
  parent rejects the update (keeps `open` true or keeps its `search`), the
  controlled value wins and the popup stays as the parent renders it.

These are **internal** transitions and never dismiss:

- Focus moving between the input, the trigger, and focusable elements inside
  the content (inline or portaled), including the transient focus an option
  receives while it is pressed before focus returns to the input.
- Pointer presses that start inside the widget (option selection, pressing
  non-focusable content padding, group labels, or the trigger in browsers that
  do not focus buttons on click). Pressing a non-focusable part of the content
  prevents the `mousedown` default so focus stays on the input (the listbox
  never takes focus, per APG); otherwise focus would fall to `body` or a
  focusable page ancestor where later departures could not be observed.
  Focusable content descendants (options, consumer buttons) keep the default.
- The window or tab losing focus while the input stays the document's active
  element.

Pointer presses outside the widget keep the existing outside-pointer dismissal
(`useDismissableLayer`); when such a press moves focus out of the widget, the
search reset above also applies.

### Virtualization

When `virtualized` is true, consumers render a window of `GhostComboboxOption`
nodes. Highlight APIs (`moveActive`, `setActiveOptionByValue`) only consider
**currently registered** options. Documentation shows pairing with an external
virtualizer: pass stable `value` / `textValue` and keep `aria-activedescendant`
in sync by remounting options for the visible slice. Traversal follows the DOM
order of the mounted slice, so render the window in list order (an item that
remounts when scrolling back is still reached in its visual position). Ordering
is resolved per key press over the mounted options only; it is not a registry
performance optimization for very large unvirtualized lists.

## Rendering and customization

`data-part`, `data-state`, `data-placement`, classes `ghost-combobox-content`,
`ghost-combobox-input`. Themed CSS uses `--ghost-*` tokens only (mirrors Select).
Content merges consumer `class` (string, array, or object) and `style` with
`ghost-combobox-content` and its floating position styles, portaled or inline.

## Environment behavior

### SSR and hydration

`useGhostId` for input, listbox, options, live region. Closed combobox: SSR
outputs input, closed listbox shell, optional options, submit mirror when `name`
set. `expectSsrHydration` covers closed default.

### Mobile and touch

Pointer selection on options; dismiss on outside tap. Virtual keyboard edits the
input; listbox scrolls in content.

## Performance

Floating/dismiss listeners only while open. No internal filtering. Virtualization
is consumer-driven via `virtualized` flag and documented highlight contract.

Option registration, unregistration, and disabled / `textValue` updates do
constant work each: the registry keeps one insertion-ordered record map and a
running disabled count, so mounting, filtering, restoring, or reordering _n_
options costs O(_n_) bookkeeping, and the open-listbox result announcement reads
that count instead of rescanning options. Each option's own state re-evaluates
only when that option changes. `optionOrder` / `optionCount` and the
announcement stay synchronous after every call. Rendering _n_ option components
is still O(_n_), so very large lists should virtualize. Measure with
`pnpm bench:registry` (`tests/bench/select-combobox-registry.bench.ts`, not part
of `pnpm verify`).

## Composition

- `useControllableState` — selection, search, open
- `useGhostId` — ids
- `useNativeFormReset` + hidden submit mirror
- `useFloating`, `GhostPortal`, `useDismissableLayer`, `useFocusScope` — overlay
- No `useRovingFocus` on the list (input keeps focus)
- `useGhostComboboxAsyncSearch` — stale fetch guard

## Test plan

- **Vue unit:** v-model single/multiple, search emit + requestId monotonic,
  `useGhostComboboxAsyncSearch` stale discard, highlight/Enter/Escape, loading +
  empty, required validation, form reset, controlled parent ignoring updates,
  virtualized highlight among mounted subset, timer/listener cleanup on unmount,
  selection + label + FormData preserved when options unmount (filtering,
  out-of-order async replacement, reorder, remount) without emits, Arrow /
  `Home` / `End` in DOM order after keyed reorder, insertion, filter + restore,
  disabled toggles, and a virtualized window scrolling back; IME composition
  (`isComposing` and `keyCode` 229) leaves ArrowUp/Down, `Home` / `End`,
  `Enter`, `Escape`, and printable keys to the input method without model,
  search, or open-state changes, still calls consumer `onKeydown`, and normal
  keys resume afterwards; focus departure (GHO-166): focus moving to an
  external element or `blur()` closes and emits `update:open` `false` without
  restoring focus, single resets search to the committed label and multiple to
  `''` without selection emits, internal input → trigger and option pointer
  selection stay open, window blur keeps the list open, controlled `open` and
  `search` rejection keep the parent's values
- **SSR:** `expectSsrHydration` closed combobox
- **E2E + axe:** keyboard path on playground demo, async example smoke,
  `aria-activedescendant` in rendered order after list changes, Chromium
  DevTools-protocol IME composition plus WebKit-style `keyCode` 229 keys
  (`tests/e2e/ime-composition.spec.ts`); focus departure (GHO-166) with real
  `Tab` / `Shift+Tab` and external `focus()` asserting the focused destination,
  `aria-expanded`, and popup visibility for inline and portaled content,
  input → trigger internal moves, option pointer selection, single vs multiple
  search reset, and controlled `open` rejection
- **Manual:** Manual IME validation (automation cannot drive a real input method editor):
  with a Japanese, Chinese, or Korean IME on macOS Safari, macOS Chrome, Windows
  Chrome/Edge, and Firefox, compose text, move through candidates with the arrow
  keys, confirm with `Enter`, and cancel with `Escape`; the widget state must not
  change until the composition is committed, and the first keys after commit must
  behave normally.
- **Visual:** `combobox/themed` via `pnpm test:visual:docker`
- **Types:** consumer compile fixture

## Documentation plan

`docs/components/combobox.md`, examples `basic`, `async`, `multi`, `field`, `form`,
`themed`; playground section; manifests via `pnpm manifests:write`; roadmap status
via registry only.

## Compatibility and release impact

Additive Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking.

## Follow-ups

- Creatable options and inline multi-value tags.
- [GHO-43](https://linear.app/ghost-vue/issue/GHO-43): i18n for polite
  announcement strings (`loading`, `empty`, `results` callback) and required
  validation (`required`) is exposed via reactive `messages`
  (`GhostComboboxMessages`) on `GhostCombobox`, `useGhostCombobox`, and the
  themed wrapper, keeping English defaults.

### Form submit (multiple)

`multiple` with `name` renders one visually hidden `input[type=text]` per selected
value, each sharing the same `name` (native `<select multiple>` semantics). Values
containing commas are submitted without encoding ambiguity. Required validation uses
a single empty mirror when nothing is selected.
