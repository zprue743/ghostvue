# GhostBadge specification

**Status:** Proposed for [GHO-75](https://linear.app/ghost-vue/issue/GHO-75)
implementation scope. Approval is PR review of this spec together with the
implementation.

## Purpose and user problems

`GhostBadge` is a compact, non-interactive label for short status and metadata
values. Immediate DataTable consumers are cell statuses (`Active`, `Draft`),
numeric counts (`12`), and active-filter summaries (`Status: Open`). Sighted
users and assistive technology both get the same text; color and iconography
are supplementary, never the only encoding.

## Non-goals

- Interactive, toggle, link, menu, and dismissible behavior. A badge is not a
  button, chip-with-remove, or filter control. Those are later components.
- A fixed status vocabulary (`success`, `warning`, `info`, `pending`). Headless
  styling hooks and themed `tone` (color intent, matching `GhostButton`) are
  the customization API. Domain status strings belong in slot text.
- Live-region announcements. A badge that changes is still ordinary text; the
  consuming workflow owns `aria-live` if an update must be announced.
- Truncation, overflow tooltips, and max-width policy. Consumers own layout.
- Loading, disabled, and pending states. Badges do not represent actions.
- `useGhostId` and `useControllableState`. There is no generated id and no
  model.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostBadge` / `useGhostBadge`:

The unstyled component declares no behavioral props. Native span attributes,
including accessible-name, `lang`, `title`, `data-*`, and event attributes,
are included in the public type and fall through to the root `<span>`. Named
ESM exports: `GhostBadge`, `useGhostBadge`, and the types below.

The root is always a native `<span>`. Table cells, filter bars, and other
phrasing contexts are valid parents. Consumers that need a different tag spread
`useGhostBadge().rootProps` onto that element; widening the SFC with `as` is
not required for the DataTable cases.

Themed `@ghostvue/themes` `GhostBadge` wraps the unstyled component and adds
visual props. Same fallthrough; these exist only on the themed wrapper:

| Prop      | Type                                        | Default    | Contract                                                                                         |
| --------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `variant` | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'soft'`   | Visual treatment.                                                                                |
| `tone`    | `'accent' \| 'neutral' \| 'danger'`         | `'neutral'` | Semantic color intent, independent of `variant`. Not a status enum.                            |
| `size`    | `'sm' \| 'md'`                              | `'sm'`     | Compact type and padding. No control minimum size; badges are not touch targets.                 |

The themed wrapper sets matching `data-variant`, `data-tone`, and `data-size`
attributes on the inner span. Defaults omit the attribute so CSS can treat a
missing hook as the default (`soft` / `neutral` / `sm`). It also wraps the
span in `.ghost-themed-scope` (`display: contents`) so default CSS can style
that instance without forcing every `.ghost-badge` on the page.

`tone` is the same closed set as themed `GhostButton` (`accent`, `neutral`,
`danger`). Token ramps for `success`, `warning`, and `info` exist for later
action surfaces; exposing them here would bake a status vocabulary into the
first Badge API. Consumers encode domain status in text (and optional
`data-*` they own).

### v-model contracts

There is no model. The component is presentational.

### Events, callbacks, slots, and exposed methods

The default slot supplies badge content (text, optional decorative icon). No
component-specific events are declared; native listeners attach to the span
and receive the native event. Icon structure is marked with `data-part="icon"`
inside the default slot, not an extra Vue slot.

A component template ref exposes:

- `element: HTMLSpanElement | null`

The property is `null` before mount and after unmount. There is no `focus()` or
`blur()` contract: the root is not an interactive control. Consumers should not
depend on any markup beyond the root span (the themed wrapper's extra scope
span is not a public layout surface).

## State model

The component has no behavioral states. It renders slot content. There is no
`data-state` hook at introduction because nothing in the contract would set
it.

### Loading, empty, disabled, read-only, and error states

None apply. Adding them would duplicate state the surrounding table, filter
bar, or form already owns.

An empty default slot renders an empty span. That is permitted and inert
rather than an error. It is not useful on its own, and the documentation says
so.

### Async behavior

The component performs no asynchronous work and owns no races, cancellation, or
announcements.

## Consumer data

No consumer data is accepted or mutated. Slot content is the consumer's own
template.

## Accessibility contract

### Semantics and relationships

The root is always a native `<span>`. There is no APG Badge pattern; the
closest practice is
[Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).
The component adds no `role`. In particular it does not set `role="status"`
(that is a live region) or `role="img"` (the content is text, not a graphic).

Text in the default slot is the accessible name. Color and iconography must not
be the only encoding of meaning: a red badge still reads `Overdue`, not an
unlabeled mark. Decorative icons must be `aria-hidden`. Icon-only use requires
`aria-label`, `aria-labelledby`, or hidden text (for example
`GhostVisuallyHidden`).

### Keyboard interaction

The component adds no key handling and intercepts no keys. It is not a tab
stop. Keyboard interaction with surrounding table cells, buttons, and filters
is unchanged.

### Focus behavior

The root is not focusable and does not receive a `tabindex`. The component
does not move, trap, or restore focus. Visible focus indication on the themed
wrapper exists only so a consumer-supplied `tabindex` still meets 2.4.7; that
is not an invitation to make badges interactive.

### Assistive technology expectations

Assistive technology encounters ordinary phrasing content at its document
position, with no added role and no announcement of its own. Screen readers
read the text in sequence with surrounding content. Status changes are not
announced unless the consumer places the badge in a live region they own.

Automated checks cannot establish that the text is correct, adequate, or
appropriately terse. That judgment requires human review.

## Rendering and customization

The default slot and fallthrough attributes are the customization API for the
unstyled component. It ships no wrapper or visual styles.

Stable styling hooks follow ADR 0004 and do not invent a parallel contract
(GHO-38 remains undecided):

- class `ghost-badge`
- `data-part="root"` on the span
- `data-part="icon"` on consumer slot markup that opts into theme sizing
- no `data-state` at introduction
- no `data-ghost-*` hooks on the component (theme hosts already use
  `data-ghost-theme` / `data-ghost-density` / `data-ghost-mode`)

Consumers may also set `data-variant`, `data-tone`, and `data-size` on the
unstyled span when they style it themselves. The themed wrapper sets those
from visual props. Defaults omit the attribute.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostBadge` on the same page stays unstyled when the stylesheet is
loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`; `.ghost-themed-scope` is not a token host. There is no
`pt` passthrough object.

Themed values come from existing semantic `--ghost-*` tokens (action tones,
type, space, radius, focus). There are no per-component tokens. Compact
padding uses space tokens rather than `control-size-*-min`, because those
minima exist for interactive targets and would make table-cell badges too
tall. Corner radius uses `--ghost-radius-pill`. Hover, press, and selected
overlays are omitted: those imply an action.

## Environment behavior

### SSR and hydration

Rendering is deterministic from slot content and themed visual props. The
implementation does not access browser globals during setup. The exposed
element is `null` until mount, so server output and hydration do not depend
on it.

### Mobile and touch

The badge is not a touch target and does not enforce a 44px minimum. Applications
that wrap a badge in a control own that control's target size. There are no
gestures.

## Performance

Rendering is constant-time. The component creates no global listeners, timers,
observers, registries, or cleanup obligations.

## Composition

`useGhostBadge` owns the `ghost-badge` class and `data-part` binding. Unstyled
`GhostBadge` spreads those onto a native `<span>`. Themed `GhostBadge` wraps
that component. Behavior stays in `packages/vue` because its component, slot,
attribute-fallthrough, and template ref contracts are Vue-specific. No
framework-neutral core abstraction is needed.

Optional icons compose with `GhostVisuallyHidden` when the icon needs a name
that is not visible. The badge does not import `GhostButton` or overlay
primitives.

The machine-readable contracts are
`packages/vue/manifests/ghost-badge.manifest.json` and
`packages/themes/manifests/ghost-badge.manifest.json`.

## Test plan

- Vue tests cover defaults (native span, class, `data-part="root"`, no `role`,
  no `data-state`), slots, typed fallthrough attributes/listeners, decorative
  `data-part="icon"`, icon-only naming through forwarded attributes, exposed
  `element`, and SSR markup.
- Compile-time tests cover native attribute types on `GhostBadgeProps` and the
  exposed ref contract.
- Browser tests cover DataTable-like cell statuses, counts, and filter
  summaries; icon hooks; that the badge is not a tab stop; themed
  `data-variant` / `data-tone` / `data-size` (including omitted defaults);
  theme contrast for each tone/variant pair; forced-colors visibility; and an
  axe smoke check on registered examples.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered example snapshots, generated with
  `pnpm test:visual:docker` so they match CI.

## Documentation plan

Publish `docs/components/badge.md` with an API reference, headless and themed
examples, an icon example, a table-cell / count / filter pattern, an explicit
"not interactive / not a status enum" section, accessibility and SSR guidance,
and the themed wrapper path. Keep equivalent examples in the playground.
Document default theme tokens separately. Link this specification.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the unstyled span, `useGhostBadge`, single-root
attribute fallthrough, exposed `element`, `ghost-badge` / `data-part`, and the
themed visual props plus CSS custom properties.

Future changes to native semantics, adding `role` or `data-state`, adding a
status enum, making the root interactive, changing omitted-default attribute
behavior, or changing styling hooks require compatibility review.

Interactive and dismissible badges, and a richer tone set, are follow-ups
outside GHO-75.

## Open architectural questions

None blocking. GHO-38 (styling-hooks contract) stays undecided; this component
reuses `data-part` / class / omitted default `data-*` visual hooks from
`GhostButton` rather than inventing a new one.
