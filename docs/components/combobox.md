# GhostCombobox

`GhostCombobox` is an editable list-autocomplete combobox for filters, async
lookups, and form fields. Import headless parts from `@ghostvue/vue` or themed
wrappers from `@ghostvue/themes`. Filtering and fetching are consumer-owned: the
component renders whatever options you mount and emits the current query.

<GhostExample id="combobox/assignee-search" />

The **Assignee** field searches a local people directory that answers
asynchronously. Before you type it suggests the issue's team; each query then
shows a visual **Searching…** row while the listbox is `aria-busy`, followed by
matching people, a "No one matches" message, or, with **Simulate offline** on,
an error. Shorter queries answer more slowly, so typing quickly makes an older
request finish last; `useGhostComboboxAsyncSearch` drops that stale response so
the list always matches the input. Focus stays on the input the whole time:
`ArrowDown` / `ArrowUp` move the highlight through `aria-activedescendant`,
`Home` / `End` jump to the ends, `Enter` assigns, and `Escape` closes. The
choice shows in the **Current assignee** panel and the polite status line;
**Unassign** clears it and returns focus to the search. A `messages` object
words the combobox's own announcements ("3 people found", "Could not load
people"). The search and the assignee panel stack in narrow previews and sit
side by side from about 32rem.

## Basic use

<GhostExample id="combobox/basic" />

The input is `role="combobox"`; suggestions live in a portaled listbox, and the
input's `aria-controls` names that `role="listbox"` element.

## Async search

<GhostExample id="combobox/async" />

Listen for `search` (with `requestId`), call `begin(payload.requestId)` at fetch
start, and use `isLatest(payload.requestId)` before applying results so
stale responses do not overwrite newer results.
Clear `loading` only for the latest request, too; otherwise a stale response
ends the loading state while a newer search is still running.

Filtering or replacing results never clears the selection. A selected value whose
option is no longer rendered stays selected, keeps submitting with the form, and
keeps its last known label; no `update:modelValue` is emitted.

## Multiple selection

<GhostExample id="combobox/multi" />

Set `multiple` to toggle string values without closing the listbox.

## Field integration

<GhostExample id="combobox/field" />

Spread `GhostFieldControl` slot props onto `GhostComboboxInput`. The field's
`invalid` and `required` state combine with the root's own `invalid` and
`required` props into `aria-invalid` and `aria-required` on the input.

## Forms and reset

<GhostExample id="combobox/form" />

`defaultValue` is the form-reset seed. Set `name` on the root so a visually hidden
input submits the selection and participates in native `required` validation.

## Themed use

<GhostExample id="combobox/themed" />

The themed input shows a muted placeholder, a stronger border on hover, the
token focus ring for keyboard focus and while the list is open, a danger
border with `aria-invalid`, and the disabled action tokens. None of these
states change the control's size. The list is capped to the viewport width and
long option text wraps.

## API

### `GhostCombobox`

| Prop            | Type                              | Default     | Description                                    |
| --------------- | --------------------------------- | ----------- | ---------------------------------------------- |
| `modelValue`    | `string \| string[] \| undefined` | `undefined` | Controlled selection; `undefined` clears.      |
| `defaultValue`  | same                              | `undefined` | Uncontrolled seed and reset value.             |
| `multiple`      | `boolean`                         | `false`     | Multi-select toggles membership in `string[]`. |
| `search`        | `string \| undefined`             | `undefined` | Controlled query in the input.                 |
| `defaultSearch` | `string`                          | `''`        | Initial query when `search` is omitted.        |
| `name`          | `string`                          | `undefined` | Submit input name.                             |
| `disabled`      | `boolean`                         | `false`     | Disables input, trigger, and options.          |
| `required`      | `boolean`                         | `false`     | Required when `name` is set.                   |
| `invalid`       | `boolean`                         | `false`     | `aria-invalid` on the input.                   |
| `loading`       | `boolean`                         | `false`     | Hides empty slot; sets listbox `aria-busy`.    |
| `open`          | `boolean \| undefined`            | `undefined` | Controlled listbox open state.                 |
| `defaultOpen`   | `boolean`                         | `false`     | Initial open state.                            |
| `placeholder`   | `string`                          | `undefined` | Input placeholder (wins over the input's own). |

### Events

- `update:modelValue`, `update:search`, `update:open`
- `search` — `{ query: string, requestId: number }` on each query change

### Keyboard and IME

While an input method editor is composing (Japanese, Chinese, Korean, and
similar input), arrow keys, `Enter`, and `Escape` belong to the IME's candidate
list: the combobox does not move the highlight, select, or close until the
composition is committed. Your own `@keydown` handlers on `GhostComboboxInput`
still receive those events.

### Focus and dismissal

The list closes when focus leaves the whole widget: the input, the optional
`GhostComboboxTrigger`, and the content, whether it is portaled or rendered
inline with `:portal="false"`. This covers `Tab`, `Shift+Tab`, and focus moved
by your code (`element.focus()` elsewhere or `blur()`). Focus stays where it
went; it is not pulled back to the input. Moving between the input and the
trigger, selecting an option with the pointer, or pressing a non-focusable part
of the list (a group label, padding) does not close it.

Leaving also clears the unfinished query. In single mode the input shows the
committed option's label again (or becomes empty when nothing is selected); in
multiple mode the query becomes empty. The selection never changes. When the
query changes, `update:search` and `search` are emitted so filtered or async
results match the query on the next open.

With a controlled `open` or `search`, the combobox only requests the change
(`update:open` with `false`, `update:search`). If the parent keeps its value,
the list stays as the parent renders it.

### Parts

- `GhostComboboxInput`, `GhostComboboxTrigger`, `GhostComboboxContent`
- `GhostComboboxOption`, `GhostComboboxGroup`, `GhostComboboxLabel`, `GhostComboboxEmpty`
- `useGhostCombobox`, `useGhostComboboxAsyncSearch`

### Localization (`messages`)

Pass a reactive `messages` (`GhostComboboxMessages`) object to `GhostCombobox` or
`useGhostCombobox` to override internal announcements and native validation
strings without a global locale provider:

- `loading`: live-region announcement while `loading` is `true` (default `'Loading results'`)
- `empty`: live-region announcement when open with zero enabled options (default `'No results available'`)
- `results`: `(count: number) => string` formatter when open with results (default `` `${count} results available` ``)
- `required`: native `setCustomValidity` message when `required` is `true` and empty (default `'Select a value.'`)

See the [specification](/specs/combobox) for keyboard, highlight, portal, and
SSR behavior.
