# GhostCollapsible

`GhostCollapsible` is an in-flow disclosure primitive: a trigger expands or
collapses associated content following the
[WAI-ARIA APG Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
Import `GhostCollapsible`, `GhostCollapsibleTrigger`, and
`GhostCollapsibleContent` from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for default trigger and panel styling.

## Basic use

<GhostExample id="collapsible/basic" />

`GhostCollapsible` owns `open` via `useControllableState` and assigns
deterministic trigger/content ids via `useGhostId`. The content panel stays
mounted and uses the native `hidden` attribute when collapsed.

## Themed use

<GhostExample id="collapsible/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-collapsible-trigger` and `.ghost-collapsible-content` with surface
tokens. Optional height transitions respect `prefers-reduced-motion`; set
`disableAnimation` on content to skip them entirely.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

### `GhostCollapsible` (root)

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, toggle: () => void }`.

### `GhostCollapsibleTrigger`

Sets `type="button"` (when `as="button"`), `aria-expanded`, `aria-controls`,
`data-part="trigger"`, and `data-state="open" | "closed"`. Exposes
`{ element, focus, blur }`.

### `GhostCollapsibleContent`

Keeps the panel in the DOM with `hidden` when collapsed. Sets `data-part="content"`,
`data-state`, and `aria-labelledby` (pointing to the trigger unless
`aria-label` or `aria-labelledby` is provided). Exposes `{ element, focus, blur }`.

## Accessibility

- Disclosure semantics: no `aria-haspopup`, no focus move on toggle.
- Collapsed content is hidden with the native `hidden` attribute.
- Root and trigger `disabled` prevent activation.

## Specification

See [GhostCollapsible specification](./collapsible-spec.md).
