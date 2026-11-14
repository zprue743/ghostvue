# GhostKbd specification

**Status:** Proposed for [GHO-97](https://linear.app/ghost-vue/issue/GHO-97)
implementation scope. Spec and implementation are reviewed together.

## Purpose and user problems

`GhostKbd` displays keyboard input — a single key or a shortcut combination —
inline with surrounding copy. It is the chrome for command palettes, menu item
shortcuts, and documentation of hotkeys.

Consumers need native `<kbd>` semantics so assistive technology treats the
content as user input rather than decorated text, a way to describe combinations
without hand-rolling nested markup for every shortcut, and modifier labels that
match the reader's platform (`Ctrl` versus `⌘`) without breaking SSR.

## Non-goals

- It is not a hotkey manager. It does not listen for keys, register shortcuts,
  prevent browser defaults, or run commands.
- It is not a tooltip, menu, or command palette. Those compose `GhostKbd` as
  display content.
- It is not a compound widget. There is no public `GhostKbdKey` part component;
  combinations are either the `keys` prop or consumer-authored nested `<kbd>` /
  `GhostKbd` markup in the default slot.
- It does not localize labels beyond the Apple / PC modifier split. Translated
  words belong in the slot.
- It does not pick keycap glyphs from an icon font. Labels are text (and, for
  Apple modifiers, a short symbol with an accessible `abbr` title).
- The unstyled component ships no visual styles. Size and keycap chrome belong
  to the consuming design system or the themed wrapper.
- GHO-38 styling-hooks remain undecided. This component uses the existing
  `data-part` / `data-*` configuration attributes from ADR 0004; it does not
  introduce `pt`, CSS shadow parts, or a parallel hooks contract.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostKbd` / `useGhostKbd`:

| Prop       | Type                          | Default  | Contract                                                                                                                                                                                                                        |
| ---------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keys`     | `string \| readonly string[]` | omitted  | Key tokens rendered as nested `<kbd data-part="key">` elements. A string is one key; an array is a combination. Tokens are matched case-insensitively. Unknown tokens render as given, except a single letter is uppercased.    |
| `platform` | `'auto' \| 'apple' \| 'pc'`   | `'auto'` | Selects modifier labels. `'apple'` and `'pc'` are deterministic from the prop. `'auto'` uses the PC labels until after mount, then Apple labels when the browser looks like Apple. See [SSR and hydration](#ssr-and-hydration). |

Known tokens and aliases:

| Token                         | Canonical   | Apple label (abbr title) | PC label    |
| ----------------------------- | ----------- | ------------------------ | ----------- |
| `mod`                         | `mod`       | `⌘` (Command)            | `Ctrl`      |
| `meta`, `command`, `cmd`      | `meta`      | `⌘` (Command)            | `Win`       |
| `ctrl`, `control`             | `ctrl`      | `⌃` (Control)            | `Ctrl`      |
| `alt`, `option`               | `alt`       | `⌥` (Option)             | `Alt`       |
| `shift`                       | `shift`     | `⇧` (Shift)              | `Shift`     |
| `win`, `super`                | `win`       | `Super`                  | `Win`       |
| `enter`, `return`             | `enter`     | `⏎` (Return)             | `Enter`     |
| `esc`, `escape`               | `esc`       | `Esc`                    | `Esc`       |
| `tab`                         | `tab`       | `Tab`                    | `Tab`       |
| `space`                       | `space`     | `Space`                  | `Space`     |
| `backspace`                   | `backspace` | `⌫` (Backspace)          | `Backspace` |
| `delete`                      | `delete`    | `⌦` (Delete)             | `Delete`    |
| `up`, `down`, `left`, `right` | same        | `↑` `↓` `←` `→`          | same arrows |

`mod` is the platform primary modifier (Command on Apple, Control on PC). `meta`
is specifically Meta / Command / Windows and is **not** remapped to Control on
PC. The strings are not split on `+`, because `+` is a valid key.

Native phrasing attributes, including `id`, `lang`, `title`, `aria-*`, `class`,
and `data-*`, fall through to the root `<kbd>`. Named ESM exports: `GhostKbd`,
`useGhostKbd`, and the types above.

Themed `@ghostvue/themes` `GhostKbd` wraps the unstyled component and adds one
visual prop. Same `keys` / `platform` contract; this exists only on the themed
wrapper:

| Prop   | Type                   | Default | Contract                                                                                     |
| ------ | ---------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Type and inset scale. The default omits `data-size` so CSS can treat a missing hook as `md`. |

The themed wrapper wraps the unstyled root in `.ghost-themed-scope`
(`display: contents`) so default CSS can style that instance without forcing
every `.ghost-kbd` on the page. Kbd sizes use type and space tokens, not
`--ghost-control-size-*`: this is inline chrome, not a 40px control.

### v-model contracts

There is no model. Platform resolution is derived, never consumer-owned state.

### Events, callbacks, slots, and exposed methods

The default slot supplies key content. When `keys` is omitted, the slot is the
entire contents of the root `<kbd>` (consumers may nest `<kbd>` or `GhostKbd`).
When `keys` is set, each token becomes a nested key and the slot, if present,
is rendered after a separator as additional combination content — typically the
final letter: `<GhostKbd :keys="['mod']">K</GhostKbd>`.

No component-specific events are declared; native listeners attach to the root
`<kbd>` and receive the native event.

No methods are exposed. The root is not interactive, so there is no `focus()` /
`blur()` contract. Consumers that need the element attach a native `ref` through
the usual Vue component instance (`$el` is the root `kbd` because the unstyled
component has a single native root).

## State model

The component is display-only. The only derived value is the resolved platform
(`apple` or `pc`), which selects labels. It does not have open, pressed, disabled,
or loading states.

### Loading, empty, disabled, read-only, and error states

None apply. An empty slot and omitted `keys` render an empty `<kbd>`, which is
inert rather than an error (a shortcut label may arrive later). There is no
disabled or read-only semantics; hiding a shortcut is the consumer's `v-if`.

### Async behavior

The only deferred work is the `'auto'` platform read after mount. It does not
fetch, race, or announce. Explicit `'apple'` / `'pc'` never wait.

## Consumer data

`keys` is a list of tokens, not a live keymap and not consumer-owned records.
The component does not mutate the array. Slot content is rendered by the
consumer's template and is never inspected.

## Accessibility contract

### Semantics and relationships

The root is always a native `<kbd>`. Combinations from `keys` nest a `<kbd>` per
token (`data-part="key"`). That matches the HTML spec's model: the outer `kbd`
is the input, inner `kbd` elements are the individual keys. The component adds
no `role` and no ARIA state; the implicit HTML-AAM role is generic.

Separators between keys are a literal `+` in a `<span data-part="separator">`.
They stay in the accessibility tree so a combination is announced as
"Control plus K", not "Control K". Apple symbol labels wrap in
`<abbr :title="…">` so a screen reader that does not know `⌘` can still hear
"Command".

There is no APG widget pattern for `kbd`. The component follows native HTML
phrasing content and the names-and-descriptions practice: the accessible name
is the text (and abbr titles) inside the element.

### Keyboard interaction

None. `GhostKbd` is not a control and intercepts no keys. Documented shortcuts
are the consumer's responsibility.

### Focus behavior

The root is not focusable and receives no `tabindex`. The component does not
move, trap, or restore focus.

### Assistive technology expectations

Assistive technology encounters ordinary phrasing content at its document
position. A single key reads as its label. A combination reads through nested
`kbd` text and `+` separators. Automated checks cannot prove that the labels
match the actual shortcut; that judgment stays with the consumer.

## Rendering and customization

The default slot, `keys`, and attribute fallthrough are the customization API
for the unstyled component. Combinations from `keys` render nested `kbd` and
separator spans; that structure is a semantic contract, not an internal wrapper
to restyle around.

Stable styling hooks follow ADR 0004:

- class `ghost-kbd`
- `data-part="root"` on the outer `kbd`
- `data-part="key"` on each nested key `kbd`
- `data-part="separator"` on the `+` spans
- `data-platform="apple" | "pc"` reflecting the resolved platform (always set,
  including the SSR default of `pc` for `'auto'`)

There is no `data-state`. Consumers may set `data-size` on the unstyled root
when they style it themselves; the themed wrapper sets it from `size`.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a headless
`GhostKbd` on the same page stays unstyled when the stylesheet is loaded. Token
values inherit from the nearest `.ghost-theme` / `[data-ghost-theme]`. There is
no `pt` passthrough object.

When `keys` is set, the outer `kbd` is a combination cluster (no keycap of its
own in the default theme) and each `data-part="key"` is a keycap. When `keys` is
omitted, the root itself is the keycap so a slot-only `<GhostKbd>F5</GhostKbd>`
looks like one key.

## Environment behavior

### SSR and hydration

Setup reads no browser globals. `'auto'` resolves to `'pc'` during server
render and during the client's first render so markup matches. After `onMounted`,
`'auto'` may switch to `'apple'` when `navigator.platform` / `navigator.userAgent`
look like Mac, iPhone, iPad, or iPod. That update is a client-only correction,
not a hydration mismatch.

Explicit `'apple'` and `'pc'` are SSR-safe: labels are a pure function of props.

`navigator` is never read during `setup`, including in the browser, because a
client-only read there would disagree with the server HTML.

### Mobile and touch

`GhostKbd` is not a control and is not a touch target. The themed wrapper does
not enforce `--ghost-control-size-*` minimums. Coarse pointers do not change
labels; iOS still uses Apple modifier labels under `'auto'`.

## Performance

Rendering is linear in the number of keys (typically one to four). The
composable registers no global listeners, timers, observers, or registries. The
only lifecycle hook is `onMounted` for `'auto'` detection; it reads `navigator`
once and has nothing to clean up.

## Composition

`useGhostKbd` owns key-token resolution, platform selection, and `data-part` /
`data-platform` bindings. Unstyled `GhostKbd` spreads those onto a native
`<kbd>` and renders nested keys. Themed `GhostKbd` wraps that component.

Behavior stays in `packages/vue` because the slot, attribute-fallthrough, and
SFC contracts are Vue-specific. Platform detection is not promoted to `core`:
no non-Vue consumer exists, and being framework-independent is not sufficient
justification (`docs/agents/ARCHITECTURE_RULES.md`).

The machine-readable contracts are
`packages/vue/manifests/ghost-kbd.manifest.json` and
`packages/themes/manifests/ghost-kbd.manifest.json`.

## Test plan

- Vue tests cover slot-only native `<kbd>` markup, `keys` combinations and
  aliases, unknown tokens, `mod` versus `meta` on each platform, explicit
  `platform` labels, `'auto'` staying on PC through SSR/`renderToString`,
  `'auto'` switching after mount when `navigator` looks like Apple, the
  guarantee that `setup` does not read `navigator` even when it exists,
  nested `data-part` hooks, separator text, abbr titles on Apple symbols,
  attribute fallthrough, and empty content.
- Compile-time tests cover native phrasing attributes on `GhostKbdProps`.
- Browser tests cover registered examples (axe), native `kbd` in the
  accessibility tree, combination text, and themed keycap chrome. Visual
  baselines follow the examples registry.
- No framework-neutral unit tests: the component owns no core logic.
- No keyboard/focus suite: the component is not a widget.

## Documentation plan

Publish `docs/components/kbd.md` with an API reference, slot-only and `keys`
examples, platform guidance (including the SSR default), themed size, "when not
to use this", accessibility, and a pointer at this spec. Register executable
examples for basic, composable, combination, platform, and themed use. Add the
spec and docs pages to the sidebar.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises `keys`, `platform`, `useGhostKbd`, single-root
attribute fallthrough, nested `kbd` combination markup, `ghost-kbd` /
`data-part` / `data-platform`, and the themed `size` prop plus CSS custom
properties it consumes.

Future changes to token names, `'auto'` defaulting, separator text, nested
markup, or styling hooks require compatibility review.

## Open architectural questions

None blocking. Two deferrals stay out of this issue:

- **GHO-38 styling hooks.** Continue using `data-part` and configuration
  `data-*` attributes. Do not add `pt` or CSS shadow parts here.
- **A shared platform composable.** Only `GhostKbd` needs this detection today.
  Extract later if a second component needs the same SSR-safe split.
