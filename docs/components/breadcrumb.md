# GhostBreadcrumb

`GhostBreadcrumb` implements the WAI-ARIA APG breadcrumb pattern with compound
list, item, link, page, separator, and ellipsis parts. Import from `@ghostvue/vue`
for headless markup, or from `@ghostvue/themes` for default trail styling.

## Basic trail

<GhostExample id="breadcrumb/basic" />

Ancestor segments use `GhostBreadcrumbLink`. The current page uses
`GhostBreadcrumbPage`, which sets `aria-current="page"`. Place
`GhostBreadcrumbSeparator` inside the same `GhostBreadcrumbItem` as the preceding
link so separators never become invalid direct children of the `ol`.

## Collapsed middle segments

<GhostExample id="breadcrumb/collapsed" />

`GhostBreadcrumbEllipsis` composes `GhostPopover` so middle segments stay
reachable by keyboard and assistive technologies. Put collapsed links in the
ellipsis default slot.

## Custom separators

Use the separator slot for non-default glyphs:

```vue
<GhostBreadcrumbSeparator aria-hidden="true">/</GhostBreadcrumbSeparator>
```

Decorative separators are always `aria-hidden="true"`.

## API

See the [specification](./breadcrumb-spec.md). Generated manifests live under
`packages/vue/manifests/ghost-breadcrumb*.manifest.json`.

| Part                       | Element | Key semantics                    |
| -------------------------- | ------- | -------------------------------- |
| `GhostBreadcrumb`          | `nav`   | `aria-label`                     |
| `GhostBreadcrumbList`      | `ol`    | ordered trail                    |
| `GhostBreadcrumbItem`      | `li`    | wraps segment + separator        |
| `GhostBreadcrumbLink`      | `a`     | ancestor hyperlink               |
| `GhostBreadcrumbPage`      | `span`  | `aria-current="page"`            |
| `GhostBreadcrumbSeparator` | `span`  | `aria-hidden`                    |
| `GhostBreadcrumbEllipsis`  | button  | popover with collapsed ancestors |

## Accessibility

Follow the [breadcrumb specification](./breadcrumb-spec.md#accessibility-contract)
for landmark naming, current-page semantics, and ellipsis keyboard support.
