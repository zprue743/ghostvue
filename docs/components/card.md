# GhostCard

`GhostCard` is a composable surface with optional **header**, **content**, and
**footer** parts. Use it for dashboard tiles, catalog items, and settings panels.
The consumer owns layout inside each part; the primitive supplies stable hooks and
optional ambient spotlight via `useGhostInteractiveSurface`.

Import from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for
default surface chrome.

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

| Prop      | Type                                                            | Default     | Description                                |
| --------- | --------------------------------------------------------------- | ----------- | ------------------------------------------ |
| `as`      | `'div' \| 'article' \| 'section' \| 'aside' \| 'a' \| 'button'` | `'article'` | Root element.                              |
| `effects` | `('spotlight')[]`                                               | `[]`        | Ambient spotlight; empty keeps card inert. |

| Slot      | Description                  |
| --------- | ---------------------------- |
| `header`  | Optional top region          |
| `default` | Body (`data-part="content"`) |
| `footer`  | Optional bottom region       |

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

See the [specification](./card-spec.md) for the full contract.
