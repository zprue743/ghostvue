# GhostEmptyState

`GhostEmptyState` is a presentational block for regions with nothing to show:
an empty table body, a filter with no matches, or an unused panel. It provides
title, description, optional visual, and optional actions in a predictable
reading order. The consumer owns **why** the region is empty; there are no
built-in mode enums.

Import from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for
the default visual treatment.

## Basic use

<GhostExample id="empty-state/basic" />

When `as="section"` and the `#title` slot is present, the root links to the
heading with `aria-labelledby`. A default `div` root never sets `aria-labelledby`
(generic role cannot be named that way). The visual wrapper is `aria-hidden` so
icons do not duplicate the title in the accessibility tree.

## Filtered results with actions

<GhostExample id="empty-state/filtered" />

Actions stay in the `#actions` slot. Use native buttons and links; the empty
state does not wrap them in a toolbar role.

## Table body cell

<GhostExample id="empty-state/table-cell" />

The default root is a `div`, which is valid inside a `td`. Use `as="section"`
only when you need a landmark and the parent context allows it.

## API

| Prop           | Type                         | Default | Description                                 |
| -------------- | ---------------------------- | ------- | ------------------------------------------- |
| `as`           | `'div' \| 'section'`         | `'div'` | Root element.                               |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `3`     | Native heading level for the `#title` slot. |

| Slot          | Description                                      |
| ------------- | ------------------------------------------------ |
| `visual`      | Optional decorative graphic (`aria-hidden` wrap) |
| `title`       | Optional heading text                            |
| `description` | Optional supporting copy (`<div>` wrapper)       |
| `actions`     | Optional buttons or links                        |

Native attributes fall through to the root. The component sets `class`,
`data-ghost-empty-state`, `data-part="root"`, and `aria-labelledby` when
`as="section"` and a title is present.

The root exposes `element: HTMLElement | null` through a template ref.

## Composable

<GhostExample id="empty-state/composable" />

`useGhostEmptyState` returns `as`, `headingTag`, `titleId`, and `rootProps` for
custom hosts that still follow the part contract.

## Themed use

<GhostExample id="empty-state/themed" />

The themed wrapper sets `data-themed` on the inner root so default CSS applies
without an extra element between table structures.

## Accessibility

- Provide a `#title` when the empty region needs a programmatic name.
- Keep meaningful text in `#title` or `#description`; visuals are decorative.
- Do not use `role="status"` on the root; empty copy is static unless the
  consumer adds a live region.
- Pair with table captions or grid counts on the data widget, not inside this
  primitive.

See the [specification](./empty-state-spec.md) for the full contract.
