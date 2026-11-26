# GhostCard

`GhostCard` is a composable surface with optional **header**, **content**, and
**footer** parts. Use it for dashboard tiles, catalog items, and settings panels.
The consumer owns layout inside each part; the primitive supplies stable hooks and
optional ambient spotlight via `useGhostInteractiveSurface`.

Import from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for
default surface chrome.

## Project summary cards

<GhostExample id="card/project-summary" />

A responsive two-column grid (`@container ghost-demo`) pairs an action card
(with `GhostButton` actions in `#footer`) alongside a navigational `as="a"` card
with `interactive="spotlight"` and no nested interactive elements.

## Basic use

<GhostExample id="card/basic" />

Parts render only when their slots have content. The default root is `article`.

## Actions in the footer

<GhostExample id="card/actions" />

Keep the root non-interactive when footer actions need their own tab stops.

## Clickable (navigational) card

<GhostExample id="card/link" />

When `as="a"` with `href`, the **entire card** is one link. Do not nest buttons
or other links in header, content, or footer—that violates the interactive
content model and fails accessibility checks. Secondary actions belong on a
sibling surface or outside the link card.

### Accessible patterns

1. **Navigate:** `as="a"` + `href` on the root; slots contain only static markup.
2. **Act in place:** default `article` / `div` root; put `GhostButton` or links
   in `#footer` or `#content`.
3. **Spotlight only:** `effects={['spotlight']}` or themed `interactive="spotlight"`
   adds decoration; it does not make the card focusable.

## Ambient spotlight

<GhostExample id="card/interactive" />

Pointer tracking uses `data-interactive-state` so a future `data-state` on the
card is reserved for consumer semantics.

## API

<!-- @generated docs-api:vue/ghost-card begin -->

<!-- Source: packages/vue/manifests/ghost-card.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop      | Type               | Default     | Description                                                                       |
| --------- | ------------------ | ----------- | --------------------------------------------------------------------------------- |
| `as`      | `GhostCardElement` | `"article"` | Root element. Use `a` only when the whole card navigates without nested controls. |
| `effects` | `'spotlight'[]`    | `"[]"`      | Ambient spotlight recipes. Empty list keeps the card inert.                       |

| Slot      | Slot props | Description                                         |
| --------- | ---------- | --------------------------------------------------- |
| `default` | —          | Primary body; rendered in data-part="content".      |
| `footer`  | —          | Optional bottom region for actions on static roots. |
| `header`  | —          | Optional top region.                                |

<!-- @generated docs-api:vue/ghost-card end -->

<!-- @generated docs-api:themes/ghost-card begin -->

<!-- Source: packages/themes/manifests/ghost-card.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostCard` API, which it forwards:

| Prop          | Type          | Default | Description                           |
| ------------- | ------------- | ------- | ------------------------------------- |
| `interactive` | `'spotlight'` | `null`  | Opt-in ambient spotlight on the card. |

<!-- @generated docs-api:themes/ghost-card end -->

Native attributes fall through to the root. The component sets `class`,
`data-ghost-card`, `data-part="root"`, and spotlight hooks when enabled.

The root exposes `element: HTMLElement | null` through a template ref.

## Composable

<GhostExample id="card/composable" />

`useGhostCard` returns `as`, `rootProps`, and `isActionRoot` for custom hosts.

## Themed use

<GhostExample id="card/themed" />

The themed wrapper accepts `interactive="spotlight"` and sets `data-themed` on
the inner root.

## Accessibility

- Prefer native `article`, `a`, or `button` over invented roles.
- Never nest interactive elements inside an `a` or `button` card root.
- The spotlight glow is `aria-hidden`; reduced motion disables tracking.

See the [specification](/specs/card) for the full contract.
