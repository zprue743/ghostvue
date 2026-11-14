# GhostAccordion

`GhostAccordion` coordinates multiple in-flow disclosure panels following the
[WAI-ARIA APG Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
Each panel reuses `GhostCollapsible` for open state and semantics. Import from
`@ghostvue/vue` for headless use or `@ghostvue/themes` for default styling.

## Basic use

<GhostExample id="accordion/basic" />

`type="single"` with `collapsible` keeps at most one panel open and allows
closing the active section. Arrow keys move focus between triggers on the
accordion root.

## Multiple expansion

<GhostExample id="accordion/themed" />

`type="multiple"` tracks a `string[]` of open item values. Themed examples load
`default.css` and reuse collapsible trigger and panel surfaces.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, and executable examples.

### `GhostAccordion` (root)

Emits `update:modelValue` with `string | string[] | undefined` depending on
`type`. Hosts vertical roving focus among item triggers.

### `GhostAccordionItem`

Wraps `GhostCollapsible` with controlled `:open` from the root `modelValue`.

### `GhostAccordionTrigger`

Renders a heading (`h1`–`h6` via root `headingLevel`) around
`GhostCollapsibleTrigger`.

### `GhostAccordionContent`

Proxies `GhostCollapsibleContent` with the same `hidden` and `aria-labelledby`
behavior.

## Accessibility

- Disclosure triggers sit in programmatic headings with `aria-expanded` and
  `aria-controls`.
- Arrow keys, Home, and End move focus among triggers via `useRovingFocus`.
- Root and item `disabled` prevent toggling.

## Specification

See [GhostAccordion specification](./accordion-spec.md).
