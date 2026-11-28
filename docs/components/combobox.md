# GhostCombobox

`GhostCombobox` is an editable list-autocomplete combobox for filters, async
lookups, and form fields. The examples on this page import the styled parts
from `@ghostvue/themes`. Filtering and fetching are consumer-owned: the
component renders whatever options you mount and emits the current query.
Teams that bring their own design system can start from
[Advanced: headless composition](#advanced-headless-composition).

<GhostExample id="combobox/assignee-search" />

The **Assignee** field imports every part from `@ghostvue/themes` and searches
a local people directory that answers asynchronously. Before you type it
suggests the issue's team; each query then shows a visual **Searching…** row
while the listbox is `aria-busy`, followed by matching people, a "No one
matches" message, or, with **Simulate offline** on, an error. Shorter queries
answer more slowly, so typing quickly makes an older request finish last;
`useGhostComboboxAsyncSearch` drops that stale response so the list always
matches the input. Focus stays on the input the whole time: `ArrowDown` /
`ArrowUp` move the highlight through `aria-activedescendant`, `Home` / `End`
jump to the ends, `Enter` assigns, and `Escape` closes. The choice shows in the
**Current assignee** panel and the polite status line; **Unassign** clears it
and returns focus to the search. A `messages` object words the combobox's own
announcements ("3 people found", "Could not load people"). The search and the
assignee panel stack in narrow previews and sit side by side from about 32rem.

## Async search

The assignee search above is the async recipe. Listen for `search` (with
`requestId`), call `begin(payload.requestId)` at fetch start, and use
`isLatest(payload.requestId)` before applying results so stale responses do
not overwrite newer results. Clear `loading` only for the latest request, too;
otherwise a stale response ends the loading state while a newer search is
still running.

```ts
const { begin, isLatest } = useGhostComboboxAsyncSearch()

async function onSearch({ query, requestId }: GhostComboboxSearchPayload) {
  begin(requestId)
  loading.value = true
  const people = await searchPeople(query)
  // A newer query owns the list and the loading state.
  if (!isLatest(requestId)) return
  loading.value = false
  results.value = people
}
```

While `loading` is `true`, `GhostComboboxEmpty` stays hidden and the listbox
is `aria-busy`, so render your own visual loading row (the example uses
`GhostSpinner`). Once the latest request answers with nothing,
`GhostComboboxEmpty` shows your no-results message and the combobox announces
`messages.empty`.

Filtering or replacing results never clears the selection. A selected value whose
option is no longer rendered stays selected, keeps submitting with the form, and
keeps its last known label; no `update:modelValue` is emitted.

## Forms and reset

<GhostExample id="combobox/review-request-form" />

Set `name` on the root and visually hidden inputs submit the selection with
the surrounding `<form>`. **Request review** reads `new FormData(form)` and
lists what a server would receive under **Submitted form data**.
`defaultValue` (`default-value`) is the form-reset seed: toggle some labels,
then press **Reset** and the labels return to **Bug**, the reviewer clears,
and both queries empty.

**Reviewer** sets `required` on the root. The form uses `novalidate` to skip
the browser's bubbles but still calls `form.checkValidity()`. The empty
combobox fails native validation, its input gets `aria-invalid` without extra
wiring, and the example shows a field error and moves focus to the input.
Both lists filter on the client and show a `GhostComboboxEmpty` message when
nothing matches.

### Field integration

Spread `GhostFieldControl` slot props onto `GhostComboboxInput`, as both fields
above do. The field's `invalid` and `required` state combine with the root's
own `invalid` and `required` props into `aria-invalid` and `aria-required` on
the input.

### Multiple selection

**Labels** sets `multiple`. The value is a `string[]`; choosing an option with
`Enter` or a click toggles it without closing the list or clearing the query,
and the form submits one `labels` entry per selected value. With no labels, the
form still submits one empty `labels` entry. The example shows the selection
as badges outside the input, because in multiple mode the input holds only the
query. [`GhostSelect`](./select.md) stays single-value; reach for a multiple
combobox when people pick several values.

## Themed use

<GhostExample id="combobox/themed" />

The themed input shows a muted placeholder, a stronger border on hover, the
token focus ring for keyboard focus and while the list is open, a danger
border with `aria-invalid`, and the disabled action tokens. None of these
states change the control's size. The list is capped to the viewport width and
long option text wraps.

## Advanced: headless composition {#advanced-headless-composition}

This section is for teams that bring their own design system and style the
parts themselves. Import the same parts from `@ghostvue/vue`; behavior, ARIA,
and form participation are identical, but nothing is painted, so each sample
brings its own consumer CSS for the list surface and option states.

### Headless combobox {#basic-use}

<GhostExample id="combobox/basic" />

The input is `role="combobox"`; suggestions live in a portaled listbox, and the
input's `aria-controls` names that `role="listbox"` element.

### Headless async search {#headless-async-search}

<GhostExample id="combobox/async" />

The smallest `useGhostComboboxAsyncSearch` wiring: the `loading` prop, an
empty state, and the stale-response guard, with no visual loading row. The headless `combobox/multi`,
`combobox/field`, and `combobox/form` fixtures are on the
[GhostCombobox reference page](/reference/vue/ghost-combobox).

## API

### `GhostCombobox`

<!-- @generated docs-api:vue/ghost-combobox begin -->

<!-- Source: packages/vue/manifests/ghost-combobox.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop            | Type                    | Default | Description                                    |
| --------------- | ----------------------- | ------- | ---------------------------------------------- |
| `allowDeselect` | `boolean`               | `false` | Declared prop `allowDeselect`.                 |
| `defaultOpen`   | `boolean`               | `false` | Initial open state.                            |
| `defaultSearch` | `string`                | `""`    | Initial query when `search` is omitted.        |
| `defaultValue`  | `GhostComboboxValue`    | —       | Uncontrolled seed and reset value.             |
| `disabled`      | `boolean`               | `false` | Disables input, trigger, and options.          |
| `form`          | `string`                | —       | Declared prop `form`.                          |
| `invalid`       | `boolean`               | `false` | `aria-invalid` on the input.                   |
| `loading`       | `boolean`               | `false` | Hides empty slot; sets listbox `aria-busy`.    |
| `messages`      | `GhostComboboxMessages` | —       | Declared prop `messages`.                      |
| `modelValue`    | `GhostComboboxValue`    | —       | Controlled selection; `undefined` clears.      |
| `multiple`      | `boolean`               | `false` | Multi-select toggles membership in `string[]`. |
| `name`          | `string`                | —       | Submit input name.                             |
| `open`          | `boolean`               | —       | Controlled listbox open state.                 |
| `placeholder`   | `string`                | —       | Input placeholder (wins over the input's own). |
| `required`      | `boolean`               | `false` | Required when `name` is set.                   |
| `search`        | `string`                | —       | Controlled query in the input.                 |
| `virtualized`   | `boolean`               | `false` | Declared prop `virtualized`.                   |

| Event    | Payload                                 | Description          |
| -------- | --------------------------------------- | -------------------- |
| `search` | `{ query: string; requestId: number; }` | Emitted as `search`. |

| Slot      | Slot props | Description        |
| --------- | ---------- | ------------------ |
| `default` | —          | Container content. |

<!-- @generated docs-api:vue/ghost-combobox end -->

<!-- @generated docs-api:themes/ghost-combobox begin -->

<!-- Source: packages/themes/manifests/ghost-combobox.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostCombobox` API, which it forwards.

<!-- @generated docs-api:themes/ghost-combobox end -->

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
