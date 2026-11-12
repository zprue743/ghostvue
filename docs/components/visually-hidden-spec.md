# GhostVisuallyHidden specification

**Status:** Approved for issue #2 implementation scope on 2026-08-16.
Rebased onto ADRs 0002–0005 as `GhostVisuallyHidden` / `useGhostVisuallyHidden`.

## Purpose and user problems

`GhostVisuallyHidden` renders content that assistive technology can reach but sighted
users do not see. It solves the recurring problem of interfaces that convey
meaning through position, iconography, or visual grouping alone, where the
missing text must exist in the accessibility tree without disturbing the visual
design.

The immediate consumer is compact tabular UI: icon-only row actions that need a
name, and column headers that a sighted reader infers from context. The same
primitive covers skip links, supplementary instructions attached through
`aria-describedby`, and visually hidden live regions.

## Non-goals

- It is not a way to remove content. Content that should be gone for everyone
  belongs behind `v-if`, `display: none`, or the `hidden` attribute.
- It is not a substitute for correct semantics. A form control needs a real
  `<label>`; hiding a paragraph next to an input does not create that
  relationship.
- It is not a tooltip, a truncation utility, a disclosure, or an animation
  primitive.
- It provides no privacy or security property. The content is present in the DOM
  and readable by anyone who inspects the page.
- It does not own live-region timing. Consumers that use it as an `aria-live`
  container control when the text changes.
- It ships no visual styling beyond the declarations required to hide content,
  and it does not enforce touch-target size for revealed focusable content.

## Public API

### Props and configuration

| Prop        | Type                         | Default  | Contract                                                                                                           |
| ----------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `as`        | `GhostVisuallyHiddenElement` | `'span'` | Selects the rendered root element so the result is valid HTML in its parent context. Never an interactive element. |
| `focusable` | `boolean`                    | `false`  | When `true`, the content becomes visible while focus is inside it and hides again when focus leaves.               |

```ts
type GhostVisuallyHiddenElement = 'span' | 'div' | 'p' | 'li' | 'td' | 'th'
```

The union is closed rather than `keyof HTMLElementTagNameMap`. It admits the
elements whose parent contexts actually occur — phrasing content, flow content,
list items, and table cells — while excluding interactive, void, and metadata
elements, which would either break the hiding contract or produce content that
cannot hold children. Widening the union later is additive; narrowing it is not.

Named ESM exports: `GhostVisuallyHidden`, `useGhostVisuallyHidden`, and the types
above. Headless behavior lives in the composable; the SFC is a thin unstyled
root that spreads `rootProps` onto `as`.

Native attributes and event listeners fall through to the single root element.
That fallthrough, not a set of dedicated props, is how consumers attach `id`,
`role`, `lang`, `aria-live`, `aria-atomic`, `data-*`, and anything else an
accessibility tool requires. `useGhostId` is not used: the component does not
generate ids. Reveal is derived from real focus, so `useControllableState` is
not used.

### v-model contracts

There is no model. Reveal state, where it exists, is derived from real focus and
is never consumer-owned.

### Events, callbacks, slots, and exposed methods

The default slot supplies the content and is the only slot. The component
declares no events; native listeners attach to the root element and receive
native events.

No methods are exposed. Unlike `GhostButton`, the root is never interactive, so there
is no imperative `focus()` or `blur()` contract worth publishing. Consumers that
need the element can attach a plain template ref to the component's root through
normal Vue attribute fallthrough.

## State model

The component has two states: hidden and revealed. Hidden is the only state when
`focusable` is `false`, which is the default and the ordinary case.

When `focusable` is `true`, the component transitions to revealed while focus is
inside its subtree and back to hidden when focus leaves. Focus presence is
tracked from `focusin` and `focusout`, which bubble, so a focusable descendant
such as the anchor in a skip link drives the transition. Focus presence is
tracked regardless of `focusable`, and `focusable` only gates whether that
presence produces a reveal; gating the tracking itself would strand a stale
"focused" reading if `focusable` changed while the subtree held focus.

Moving focus between two descendants dispatches `focusout` and then `focusin`
synchronously. Vue's scheduler coalesces the resulting render, so the content
does not flicker between the two events.

### Loading, empty, disabled, read-only, and error states

None apply. The component has no loading, disabled, read-only, or error
semantics, and adding them would duplicate state its content already owns.

An empty default slot renders an empty element. That is permitted and inert
rather than an error, because a consumer may legitimately render a live region
whose text arrives later. It is not useful on its own, and the documentation
says so.

### Async behavior

The component performs no asynchronous work and owns no races, cancellation, or
announcements. A consumer using it as a live region owns the timing of its own
text changes.

## Consumer data

The component accepts no data props and mutates nothing. Slot content is
rendered by the consumer's own template and is never inspected, copied, or
transformed.

## Accessibility contract

### Semantics and relationships

The root is one of the elements in `GhostVisuallyHiddenElement` and defaults to
`<span>`. The component adds no `role` and never sets `aria-hidden`, because
removing the content from the accessibility tree would invert its entire
purpose.

Hiding uses the clip technique:

```css
position: absolute;
width: 1px;
height: 1px;
margin: -1px;
padding: 0;
border: 0;
overflow: hidden;
clip: rect(0 0 0 0);
clip-path: inset(50%);
white-space: nowrap;
```

Every declaration is load-bearing. `position: absolute` with `margin: -1px`
removes the box from layout flow so surrounding content does not shift. The
`1px` dimensions are deliberate rather than `0`, because some browser and
screen-reader combinations drop zero-area elements from the accessibility tree.
`clip-path: inset(50%)` is the modern clip and `clip: rect(0 0 0 0)` remains for
engines that never implemented `clip-path` on this case. `overflow: hidden` with
`white-space: nowrap` prevents a long string from wrapping inside the 1px box and
producing scrollable overflow.

Four common alternatives are rejected. `display: none` and `visibility: hidden`
remove content from assistive technology entirely. `width: 0` and `height: 0`
risk the same accessibility-tree removal as any zero-area box.
`text-indent: -9999px` breaks in right-to-left writing modes and can create
enormous scrollable areas.

The style sets no `font-size`, `line-height`, `letter-spacing`, or
`word-spacing`. Their absence is part of the contract: setting any of them would
conflict with the text-resize and text-spacing criteria below, and their absence
is asserted by test rather than left to inspection.

### Keyboard interaction

The component adds no key handling and intercepts no keys. With `focusable`
content, tab order is determined entirely by the focusable descendants the
consumer supplies and their document position. Because the element remains in
normal document order, a skip link placed first in the document is the first
element reached by `Tab`.

### Focus behavior

The root element is never itself focusable and never receives a `tabindex`. The
component does not move, trap, or restore focus.

With `focusable`, the hiding style is removed while focus is inside the subtree,
so the focused control becomes visible and can display a focus indicator. The
component does not supply that indicator; the consumer owns visible focus
styling, as it does everywhere else in this library.

With `focusable` left at its default, a focusable descendant would be reachable
by keyboard while remaining invisible. That is a real failure mode, and the
documentation states plainly that focusable content requires `focusable`.

### Assistive technology expectations

Assistive technology encounters ordinary content at its document position, with
no added role and no announcement of its own. Screen readers read it in sequence
with surrounding content; when the element contributes to an accessible name,
name computation includes it because it is neither `aria-hidden` nor
`display: none`.

Automated checks cannot establish that the hidden text is correct, adequate, or
appropriately terse. That judgment, and confirmation of announcement order and
verbosity across screen readers, requires human review.

## Rendering and customization

The default slot and attribute fallthrough are the customization API. The
component renders exactly one element and no wrappers, so there is no internal
structure to depend on.

Stable styling hooks follow ADR 0004:

- class `ghost-visually-hidden`
- `data-part="root"`
- `data-state="hidden"` while hidden; the attribute is omitted while revealed

There is no themed wrapper in `@ghostvue/themes`. Hiding is the behavior; a
theme cannot restyle this into visibility without breaking the contract.

The hiding declarations are applied inline. This makes the component work with no
consumer setup, no stylesheet import, and no bundler configuration, which matters
because the library ships no CSS pipeline and headless behavior must never depend
on a theme. The cost is specificity: a consumer stylesheet cannot override the
hiding without `!important`. The escape hatch is Vue's own attribute merging — a
`style` binding passed by the consumer merges after the component's own and wins
on conflicting declarations. That behavior is intentional, tested, and
documented rather than incidental.

## Environment behavior

### SSR and hydration

Rendering is a pure function of props and slot content. Setup reads no browser
globals, registers no lifecycle hooks, and produces identical markup on server
and client. A `focusable` instance renders hidden on the server, which is correct
because nothing is focused before hydration.

One consequence follows and is documented: a server-rendered `focusable` instance
does not reveal on focus until Vue hydrates and its listeners are attached. A
`:focus-within` rule would not have this gap, but it would require the CSS
delivery pipeline this library deliberately does not have. The window is small,
affects only the skip-link pattern, and degrades to content that is present and
operable but not yet visible.

### Mobile and touch

Hidden content is not a touch target and needs no target size. Revealed
`focusable` content is reached through an external keyboard or a screen reader's
own navigation, and the consumer owns its size and spacing once visible.

## Performance

Rendering is constant-time and allocates one element. The style object is a
frozen module-level constant, so it is shared across every instance and every
render rather than rebuilt.

The component registers no global listeners, timers, observers, or registries.
Its `focusin` and `focusout` listeners are template-bound, so Vue attaches and
removes them with the element and there is no cleanup obligation to get wrong.

## Composition

`useGhostVisuallyHidden` owns the clip style, focus tracking, and `data-part` /
`data-state` bindings. `GhostVisuallyHidden` spreads those onto the `as` element.
The behavior stays in `packages/vue` because its slot, attribute-fallthrough, and
dynamic-root contracts are Vue-specific. Per
`docs/agents/ARCHITECTURE_RULES.md`, the style constant is not promoted to
`core`: no non-Vue consumer exists, and being framework-independent is explicitly
not sufficient justification.

The machine-readable contract is
`packages/vue/manifests/ghost-visually-hidden.manifest.json`.

## Test plan

Automated coverage is split by what each level can honestly establish. jsdom
applies no CSS layout and computes no accessible names, so unit tests assert the
style contract and the accessibility-tree invariants; perception and naming are
proven in a real browser.

### Required Vue component tests

Vitest with Vue Test Utils, mapped to WCAG 2.1 success criteria:

| Criterion                        | Assertion                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1.3.1 Info and Relationships (A) | no `aria-hidden`, no `hidden` attribute, and no `display: none` or `visibility: hidden` in style |
| 1.3.2 Meaningful Sequence (A)    | slot content serializes at its authored position between sibling nodes                           |
| 1.4.4 Resize Text (AA)           | the style sets no `font-size` and no zero dimensions                                             |
| 1.4.10 Reflow (AA)               | the style sets `overflow: hidden` and `white-space: nowrap` on a 1px box                         |
| 1.4.12 Text Spacing (AA)         | the style sets no `line-height`, `letter-spacing`, or `word-spacing`                             |
| 2.1.1 Keyboard (A)               | with `focusable`, `focusin` removes the hiding style and `focusout` restores it                  |
| 2.4.7 Focus Visible (AA)         | the same reveal path, so a focused descendant can display an indicator                           |
| 4.1.2 Name, Role, Value (A)      | adds no `role`; forwards `id`, `role`, `lang`, and `aria-*` unchanged                            |
| 4.1.3 Status Messages (AA)       | `aria-live`, `aria-atomic`, and `role="status"` fall through unmodified and appear in SSR output |

Behavior tests beyond the criteria: each `as` member renders that tag as the sole
root; `renderToString` emits deterministic hidden markup, including for
`focusable`; consumer `style` fallthrough merges last and wins; `class` and
`data-*` fall through; toggling `focusable` while focus is inside the subtree
resolves correctly in both directions; unmounting detaches listeners.

### Required browser tests

Playwright against the built playground, carrying what jsdom cannot:

| Criterion                       | Assertion                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content (A)      | an icon-only button resolves by its accessible name, computed by the browser from hidden text     |
| 1.3.1 / 4.1.2                   | an axe scan of a page using the component reports zero violations                                 |
| 2.4.1 Bypass Blocks (A)         | `Tab` from the document start focuses the skip link, which becomes visible; tabbing away hides it |
| 2.1.1 Keyboard (A) / 2.4.7 (AA) | the same path driven by real keyboard input, asserting focus and visibility together              |
| 1.4.10 Reflow (AA)              | at a 320px viewport the document does not scroll horizontally                                     |

Perception itself is asserted directly: the hidden element's bounding box is at
most 1px in each dimension while its role query still resolves.

### Required framework-neutral unit tests

None. The component owns no framework-neutral logic.

### Required compile-time tests

None yet. The public API declares no generic or inference contract; `as` is a
closed union checked by `vue-tsc` at ordinary call sites.

### Required regression fixtures

None at introduction. Fixes add their own.

### Not automatable

Whether the hidden text is correct, sufficient, and appropriately terse
(1.3.1 semantics, 2.4.6 Headings and Labels, 3.3.2 Labels or Instructions);
announcement order and verbosity across NVDA, JAWS, and VoiceOver; and whether
hiding content is the right choice for a given interface at all. Per
`docs/standards/accessibility.md`, axe is a baseline and not evidence of an
accessible component.

## Documentation plan

Publish `docs/components/visually-hidden.md` with an API reference, a minimal
example, the icon-only and table-header patterns, the skip-link pattern, live
regions, an explicit "when not to use this" section, the consumer `style`
override, and accessibility and SSR guidance including the pre-hydration reveal
gap. Mirror the same examples in the playground so browser tests exercise them.

## Compatibility and release impact

Additive; a minor Changeset for `@ghostvue/vue`. The public contract comprises the
`as` union and its default, the `focusable` behavior, `useGhostVisuallyHidden`,
single-root attribute fallthrough, the `ghost-visually-hidden` class, `data-part`
/ `data-state` hooks, and the guarantee that the content stays in the
accessibility tree.

Future changes require compatibility review even when prop names are unchanged:
altering the hiding declarations, changing the default root element, narrowing
the `as` union, adding a wrapper element, changing reveal timing, or setting any
attribute the component currently leaves to fallthrough.

## Open architectural questions

None blocking. One deferral remains:

- **A `:focus-within` implementation.** It would close the pre-hydration reveal
  gap and lower specificity, but it requires a CSS delivery pipeline and would
  make consumers import a stylesheet. Revisit only if the library adopts one for
  other reasons.
