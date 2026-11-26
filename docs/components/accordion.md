# GhostAccordion

`GhostAccordion` coordinates multiple in-flow disclosure panels following the
[WAI-ARIA APG Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
Each panel reuses `GhostCollapsible` for open state and semantics. Import from
`@ghostvue/vue` for headless use or `@ghostvue/themes` for default styling.

## Release policy

<GhostExample id="accordion/deployment-faq" />

Multiple-expansion mode coordinates a controlled `string[]` of open section
values alongside external expand/collapse actions. The header adapts to the
preview width with `@container ghost-demo`.

## Basic use

<GhostExample id="accordion/basic" />

`type="single"` with `collapsible` keeps at most one panel open and allows
closing the active section. Optional Arrow/Home/End keys move focus among
direct headers without changing `tabindex`; every header stays in the tab sequence.

## Multiple expansion

<GhostExample id="accordion/themed" />

`type="multiple"` tracks a `string[]` of open item values. Themed examples load
`default.css` and reuse collapsible trigger and panel surfaces. The themed root
and items add `data-themed`, so loading the stylesheet does not restyle headless
accordions on the same page.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, and executable examples.

<!-- @generated docs-api:vue/ghost-accordion begin -->

<!-- Source: packages/vue/manifests/ghost-accordion.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                         | Default    | Description                                                |
| -------------- | ---------------------------- | ---------- | ---------------------------------------------------------- |
| `collapsible`  | `boolean`                    | `false`    | When `type` is `single`, allow closing the active panel.   |
| `defaultValue` | `GhostAccordionValue`        | —          | Initial expansion when `modelValue` is omitted.            |
| `disabled`     | `boolean`                    | `false`    | Disables toggling on every item when `true`.               |
| `headingLevel` | `GhostAccordionHeadingLevel` | `3`        | Heading level wrapping each accordion trigger (`h1`–`h6`). |
| `modelValue`   | `GhostAccordionValue`        | —          | Controlled expansion value. Omit for uncontrolled mode.    |
| `type`         | `GhostAccordionType`         | `"single"` | Single or multiple expanded panels.                        |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Accordion items. |

<!-- @generated docs-api:vue/ghost-accordion end -->

<!-- @generated docs-api:themes/ghost-accordion begin -->

<!-- Source: packages/themes/manifests/ghost-accordion.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostAccordion` API, which it forwards.

<!-- @generated docs-api:themes/ghost-accordion end -->

### `GhostAccordion` (root)

Emits `update:modelValue` with `string | string[] | undefined` depending on
`type`. Delegates optional arrow-key navigation among direct item triggers.

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
- Arrow keys, Home, and End optionally move focus among direct triggers (no roving
  `tabindex`).
- Non-collapsible single mode sets `aria-disabled="true"` on the open trigger.
- Root and item `disabled` prevent toggling.

## Specification

See [GhostAccordion specification](/specs/accordion).
