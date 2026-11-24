# GhostBreadcrumb

`GhostBreadcrumb` implements the WAI-ARIA APG breadcrumb pattern with compound
list, item, link, page, separator, and ellipsis parts. Import from `@ghostvue/vue`
for headless markup, or from `@ghostvue/themes` for default trail styling.

## Workspace breadcrumb trail

<GhostExample id="breadcrumb/workspace-trail" />

A page header pairs a themed `GhostBreadcrumb` trail with a
`GhostBreadcrumbEllipsis` popover for collapsed middle ancestors and
`GhostBreadcrumbPage` for the current route.

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
ellipsis default slot. Attributes such as `class` and `style` land on the
ellipsis host element. The popover content is portaled to `body`; the themed
part marks both the trigger and that content with `data-themed`, so the menu
gets the elevated popover surface without a `.ghost-theme` ancestor.

## Custom separators

Use the separator slot for non-default glyphs:

```vue
<GhostBreadcrumbSeparator aria-hidden="true">/</GhostBreadcrumbSeparator>
```

Decorative separators are always `aria-hidden="true"`.

## API

See the [specification](/specs/breadcrumb). Generated manifests live under
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

Follow the [breadcrumb specification](/specs/breadcrumb#accessibility-contract)
for landmark naming, current-page semantics, and ellipsis keyboard support.
