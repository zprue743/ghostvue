# GhostKbd

`GhostKbd` displays a keyboard key or shortcut combination with native `<kbd>`
semantics. Import it from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for default keycap chrome.

## Command shortcut sheet

<GhostExample id="kbd/command-shortcuts" />

A shortcut list pairs `GhostKbd` combinations with a `GhostSegmentedControl`
to preview Apple (`⌘`) and PC (`Ctrl`) modifier labels.

## Basic use

<GhostExample id="kbd/basic" />

The root is always a native `<kbd>`. Slot content is the ordinary way to show a
single already-localized key.

Headless use of the same contract without the SFC:

<GhostExample id="kbd/composable" />

## API

<!-- @generated docs-api:vue/ghost-kbd begin -->

<!-- Source: packages/vue/manifests/ghost-kbd.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type                          | Default  | Description                                                                                                                                                                                              |
| ---------- | ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keys`     | `readonly string[] \| string` | `"[]"`   | Key tokens rendered as nested kbd elements. A string is one key; an array is a combination. Tokens are matched case-insensitively. Unknown tokens render as given, except a single letter is uppercased. |
| `platform` | `GhostKbdPlatform`            | `"auto"` | Modifier label set. auto uses PC labels until after mount, then Apple labels when the browser looks like Apple. Explicit apple and pc are deterministic from the prop.                                   |

| Slot      | Slot props | Description                                                                                                                                                 |
| --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | —          | Key content. When keys is omitted, this is the entire kbd contents. When keys is set, this is appended after a plus separator as extra combination content. |

<!-- @generated docs-api:vue/ghost-kbd end -->

All native phrasing attributes and event listeners fall through to the root
`kbd`. The default slot is the only content slot. When `keys` is set, the slot
is appended after a `+` as extra combination content.

There is no model and no exposed `focus()` / `blur()` contract: this is
display-only.

Known tokens include `mod`, `meta` / `command` / `cmd`, `ctrl` / `control`,
`alt` / `option`, `shift`, `win` / `super`, `enter` / `return`, `esc` /
`escape`, `tab`, `space`, `backspace`, `delete`, and arrow keys. `mod` is the
platform primary modifier (Command on Apple, Control on PC). `meta` is
specifically Meta / Command / Windows and stays `Win` on PC. Unknown tokens
render as given; a single letter is uppercased. Combinations are arrays —
strings are not split on `+`.

## Combinations

<GhostExample id="kbd/combination" />

Each token becomes a nested `<kbd data-part="key">`. Separators are a literal
`+` so assistive technology reads "Control plus K".

## Platform-aware labels

<GhostExample id="kbd/platform" />

Pass `platform="apple"` or `platform="pc"` when the label set must not depend on
the browser — documentation screenshots, SSR that should show Command, or a
settings page that previews both. `'auto'` is for product UI that should match
the reader.

`'auto'` never reads `navigator` during `setup`. Server HTML and the first
client render use PC labels (`Ctrl`, `Alt`, `Win`). After mount, Apple browsers
update to symbols (`⌘`, `⌥`) with `abbr` titles. That sequence avoids a
hydration mismatch.

## Themed use

<GhostExample id="kbd/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

<!-- @generated docs-api:themes/ghost-kbd begin -->

<!-- Source: packages/themes/manifests/ghost-kbd.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostKbd` API, which it forwards:

| Prop   | Type                   | Default | Description                                                                              |
| ------ | ---------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `"md"`  | Type and inset scale. The default omits data-size so CSS can treat a missing hook as md. |

<!-- @generated docs-api:themes/ghost-kbd end -->

The default omits `data-size`. Sizes use type and space tokens, not control
minimums: `GhostKbd` is inline chrome, not a 40px action.

A slot-only instance is itself a keycap. A `keys` combination drops chrome on
the outer `kbd` and paints each nested key instead.

You can also import the stylesheet and wrap unstyled kbd elements in
`.ghost-theme` when you want a region of headless components to pick up the
defaults. See the [default theme guide](../themes/default.md).

## When not to use it

- **Listening for shortcuts.** `GhostKbd` does not register hotkeys or run
  commands. Display the shortcut here; handle the key elsewhere.
- **A tooltip, menu, or command palette.** Compose those from overlay
  primitives and put `GhostKbd` inside them.
- **Translated prose for modifiers.** Put the words in the slot and omit
  `keys`, or pass already-localized tokens as unknown strings.

## Styling

The unstyled component renders one native `<kbd>` with class `ghost-kbd`,
`data-part="root"`, and `data-platform="apple" | "pc"`. Combinations add
`data-part="key"` and `data-part="separator"`. There is no `data-state`.

```css
.ghost-kbd[data-platform='apple'] {
  /* Applies after auto detection or an explicit apple platform. */
}
```

## Accessibility and environment behavior

The component adds no role, no ARIA state, and no keyboard handling. Assistive
technology reads the text inside the native `kbd`, including `+` separators and
`abbr` titles on Apple symbols.

SSR markup is deterministic from props. `'auto'` equals `'pc'` until `onMounted`.
Setup does not read browser globals. No listeners, timers, or observers require
cleanup.

See the [GhostKbd specification](/specs/kbd) for the complete behavior and
compatibility contract.
