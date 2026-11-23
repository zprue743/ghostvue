# GhostCommandPalette

`GhostCommandPalette` is a modal command surface for jumping to pages, running
editor actions, or switching settings from one searchable list. It composes the
`GhostDialog` shell (focus trap, scroll lock, inert background, dismissal, and
focus restoration) with `useGhostCombobox` (item registry, keyboard highlight,
loading and empty announcements). It follows the APG
[combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)
pattern inside a modal dialog. Import the parts from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for the default scrim, elevation-4
surface, input, and option styles.

<GhostExample id="command-palette/themed" />

You own the data and the behavior: you filter the items, load async results,
run the command in a `command` handler, and register any keyboard shortcut. The
palette ships no global listener, command registry, or fuzzy search.

## Basic use

<GhostExample id="command-palette/basic" />

Render `GhostCommandPaletteItem` children for the commands that match the
current query. Every item needs a stable, unique `id`. That `id` is the only
value the `command` event carries (`{ id }`), so key your handlers and your
command catalog by it. Two items with the same `id` log
[GHOST006](../warnings.md#ghost006) in development.

`GhostCommandPaletteGroup` with a `GhostCommandPaletteLabel` names a set of
related commands. `GhostCommandPaletteSeparator` draws a divider with
`role="none"`, so it is never a highlight or focus target. Groups never filter
or sort, and they do not nest. Item order in the DOM is the highlight order.

### Activation and close

`Enter` on the highlighted item, or a primary click, emits `command`
synchronously. The event is not cancelable. With `closeOnSelect` (the default)
the palette then requests close: it emits `update:open` with `false`, and
uncontrolled palettes close. Focus returns to the opener.

Activation never commits a selection and never copies the item's text into the
query. The query stays as typed for as long as the palette stays open, which
covers `closeOnSelect: false` and a controlled `open` that the parent keeps
`true`. When the palette actually closes, the query resets to `defaultSearch`
and `update:search` and `search` are emitted once, so your filtered or async
results match what the input shows on the next open. A parent that controls
`search` can keep its own value.

### Accessible name

The palette must have a name. Render `GhostCommandPaletteTitle`, or pass
`aria-label` or `aria-labelledby` to `GhostCommandPaletteContent`. Without
either, development builds log [GHOST002](../warnings.md#ghost002). There is no
hidden default title. For a design without a visible heading, render the title
inside `GhostVisuallyHidden`. When the input has no `aria-label` of its own, it
is labelled by the title as well.

## Async search

<GhostExample id="command-palette/async" />

Each query change emits `search` with `{ query, requestId }`. The `requestId`
increases monotonically, including the reset on close. Pass it to `begin()`
from `useGhostCommandPaletteAsyncSearch`, and apply a response only while
`isLatest(requestId)` is true. A slow response for an older query then never
replaces newer results or clears `loading` early. The example answers shorter
queries more slowly, so typing quickly resolves out of order.

While `loading` is true the list keeps any mounted items (stale results), sets
`aria-busy`, hides `GhostCommandPaletteEmpty`, and announces "Loading results".
When loading ends with no items, the list drops its listbox role and the empty
message reads as plain text.

## Keyboard shortcut

<GhostExample id="command-palette/shortcut" />

The palette does not intercept keys while it is closed. Register the shortcut
yourself, for example a `keydown` listener for Mod+K that calls the exposed
`open()` or sets `v-model:open`. Focus returns to whatever was focused when the
shortcut fired. Use `returnFocus` on `GhostCommandPaletteContent` to send it
somewhere else.

## Large command sets

<GhostExample id="command-palette/virtualized" />

There is no `virtualized` prop. You decide which items are mounted, so the
same rules cover a capped slice (as in the example) and a scroll virtualizer:

- Keep each command's `id` stable while the mounted slice changes.
- The keyboard highlight, `aria-activedescendant`, and the result-count
  announcement only cover mounted items. Unmounting the highlighted item clears
  the highlight; it never emits `command`.
- Say how many matches are hidden in your own text outside the list, and keep
  the query narrowing the results.

## Themed use

The themed example shows `GhostKbd` hints inside items and a key-hint footer.
The palette has no footer slot: render your own markup after
`GhostCommandPaletteList`, outside the listbox.

Importing from `@ghostvue/themes` loads `default.css`. The themed overlay and
content set `data-themed`, so the portaled palette uses `--ghost-scrim`, the
elevation-4 surface tokens, the control tokens for the input, and the combobox
option recipe for items. The highlighted item draws the token focus ring inset,
because DOM focus stays in the input. Set
`--ghost-command-palette-list-max-size` to change how tall the list grows
before it scrolls (default `min(50dvh, 22rem)`).

## API

### `GhostCommandPalette` (root)

| Prop            | Type                    | Default          | Description                                                   |
| --------------- | ----------------------- | ---------------- | ------------------------------------------------------------- |
| `open`          | `boolean \| undefined`  | `undefined`      | Controlled open state. Omit for uncontrolled.                 |
| `defaultOpen`   | `boolean`               | `false`          | Initial open state.                                           |
| `search`        | `string \| undefined`   | `undefined`      | Controlled query.                                             |
| `defaultSearch` | `string`                | `''`             | Initial query and the value it resets to on close.            |
| `loading`       | `boolean`               | `false`          | Hides empty, sets `aria-busy`, and announces loading.         |
| `modal`         | `boolean`               | `true`           | Focus trap, scroll lock, inert background, and overlay.       |
| `disabled`      | `boolean`               | `false`          | Blocks opening, typing, and activation.                       |
| `closeOnSelect` | `boolean`               | `true`           | Requests close after a command.                               |
| `closeOnEscape` | `boolean`               | `true`           | Whether `Escape` closes the palette.                          |
| `messages`      | `GhostComboboxMessages` | English defaults | Overrides the loading, empty, and result-count announcements. |

Events: `update:open`, `update:search`, `search` (`{ query, requestId }`), and
`command` (`{ id }`). The default slot receives
`{ open, search, loading, close, focusInput }`. A template ref exposes
`open()`, `close()`, `focusInput()`, and the `{ element, focus, blur }`
contract for the input.

`useGhostCommandPalette(options)` returns the same state and methods for a
custom root. `useGhostCommandPaletteAsyncSearch()` returns `{ begin, isLatest }`.

### Parts

- `GhostCommandPaletteTrigger`: same contract as `GhostDialogTrigger` (`as`,
  `disabled`). It is optional, and the root `disabled` disables it.
- `GhostCommandPaletteOverlay`: modal backdrop (`as`, `portal`, `portalTo`).
- `GhostCommandPaletteContent`: the `role="dialog"` surface. It takes `as`,
  `closeOnEscape` (overrides the root), `closeOnOutsideClick` (default `true`),
  `portal`, `portalTo`, `focusReady`, `initialFocus` (defaults to the input),
  and `returnFocus`. It also hosts the polite live region.
- `GhostCommandPaletteTitle`: the accessible name (`as`, default `h2`).
- `GhostCommandPaletteInput`: the `role="combobox"` query field (`as`,
  `disabled`). `placeholder` and other attributes fall through.
- `GhostCommandPaletteList`: the in-flow listbox. Style its height and
  scrolling with `class` or `style`.
- `GhostCommandPaletteItem`: `id` (required), `disabled`, `textValue`, and `as`.
- `GhostCommandPaletteGroup`, `GhostCommandPaletteLabel`,
  `GhostCommandPaletteEmpty`, and `GhostCommandPaletteSeparator`.

Every part merges your `class` and `style` and exposes
`{ element, focus, blur }`. Styling hooks: `data-part` (`trigger`, `overlay`,
`content`, `title`, `input`, `list`, `item`, `group`, `label`, `separator`,
`empty`), `data-state` (`open` on the trigger and input, `active` or `disabled`
on items), and `data-highlighted` on the highlighted item.

## Accessibility

| Key                     | Behavior                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `ArrowDown` / `ArrowUp` | Moves the highlight among enabled items (wraps); focus stays in the input. |
| `Home` / `End`          | Highlights the first or last enabled item.                                 |
| `Enter`                 | Activates the highlighted command.                                         |
| `Escape`                | Closes the palette (unless `closeOnEscape` is `false`) and restores focus. |
| `Tab` / `Shift+Tab`     | Cycles inside a modal palette.                                             |
| Printable keys          | Edit the query; you update the items.                                      |

- Focus moves to the input on open and stays there. The highlighted item is
  referenced with `aria-activedescendant` and reports `aria-selected="true"`;
  pressing items, labels, or separators does not move focus.
- Arrow keys, `Home`, `End`, `Enter`, and `Escape` belong to an active input
  method editor (IME) composition. The palette ignores them until the
  composition ends.
- The polite live region inside the content announces "Loading results", the
  enabled result count, or "No results available". Override the strings with
  `messages`.
- A modal palette stays open while a nested portaled overlay (for example a
  `GhostPopover` opened from an item) takes focus. A non-modal palette
  (`modal: false`) closes when focus leaves it, without pulling focus back,
  following the combobox focus-departure rules. A modal palette never closes
  on focus departure.

## Specification

See the [GhostCommandPalette specification](/specs/command-palette) for the
full contract and resolved decisions.
