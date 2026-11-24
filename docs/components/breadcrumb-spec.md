---
schemaVersion: 1.0.0
component: GhostBreadcrumb
components:
  - GhostBreadcrumb
  - GhostBreadcrumbList
  - GhostBreadcrumbItem
  - GhostBreadcrumbLink
  - GhostBreadcrumbPage
  - GhostBreadcrumbSeparator
  - GhostBreadcrumbEllipsis
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Approved and implemented (`GhostBreadcrumb` on `feat/gho-99-breadcrumb`, GHO-99).'
manifests:
  - packages/vue/manifests/ghost-breadcrumb.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-list.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-item.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-link.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-page.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-separator.manifest.json
  - packages/vue/manifests/ghost-breadcrumb-ellipsis.manifest.json
  - packages/themes/manifests/ghost-breadcrumb.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# GhostBreadcrumb specification

**Status:** Approved and implemented (`GhostBreadcrumb` on `feat/gho-99-breadcrumb`, GHO-99).

## Purpose and user problems

`GhostBreadcrumb` exposes a composable navigation trail that helps people
orient within a hierarchy and jump to ancestor pages. The compound parts render
valid breadcrumb markup (`nav` → `ol` → `li`) with WAI-ARIA APG semantics,
decorative separators hidden from assistive technologies, and an optional
ellipsis disclosure so collapsed middle segments stay reachable by keyboard and
screen readers.

## Non-goals

- Application routing or automatic URL-derived trails.
- Command palettes, menus with typeahead, or `aria-haspopup="menu"` listboxes
  (ellipsis uses the existing `GhostPopover` disclosure pattern only).
- Progress or step indicators (`aria-current="step"`).
- Single-file convenience that hides the list/item structure.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostBreadcrumb` (landmark `nav` wrapper)
- `GhostBreadcrumbList` (`ol` trail container)
- `GhostBreadcrumbItem` (`li` segment wrapper)
- `GhostBreadcrumbLink` (ancestor anchor or polymorphic `as` host)
- `GhostBreadcrumbPage` (current page text with `aria-current="page"`)
- `GhostBreadcrumbSeparator` (decorative separator inside an item)
- `GhostBreadcrumbEllipsis` (popover disclosure for collapsed segments)
- `useGhostBreadcrumb` (root styling-hook bindings)
- Supporting types in `ghost-breadcrumb.ts`

Themed exports from `@ghostvue/themes`:

- The same part names with default trail styling via `ghost-breadcrumb.css`

### Props and configuration

#### `GhostBreadcrumb`

| Prop        | Type                  | Default        | Contract                            |
| ----------- | --------------------- | -------------- | ----------------------------------- |
| `as`        | `string \| Component` | `'nav'`        | Root landmark element.              |
| `ariaLabel` | `string`              | `'Breadcrumb'` | Accessible name for the navigation. |

Native attributes fall through to the root.

#### `GhostBreadcrumbList`

| Prop | Type                  | Default | Contract          |
| ---- | --------------------- | ------- | ----------------- |
| `as` | `string \| Component` | `'ol'`  | Ordered list host |

#### `GhostBreadcrumbItem`

| Prop | Type                  | Default | Contract                                                    |
| ---- | --------------------- | ------- | ----------------------------------------------------------- |
| `as` | `string \| Component` | `'li'`  | Must remain `li` for valid trail markup when using default. |

#### `GhostBreadcrumbLink`

| Prop | Type                  | Default | Contract                                                        |
| ---- | --------------------- | ------- | --------------------------------------------------------------- |
| `as` | `string \| Component` | `'a'`   | Ancestor link; consumer supplies `href` on `a` or button hosts. |

#### `GhostBreadcrumbPage`

| Prop | Type                  | Default  | Contract                                  |
| ---- | --------------------- | -------- | ----------------------------------------- |
| `as` | `string \| Component` | `'span'` | Current page; sets `aria-current="page"`. |

#### `GhostBreadcrumbSeparator`

| Prop | Type                  | Default  | Contract                                                        |
| ---- | --------------------- | -------- | --------------------------------------------------------------- |
| `as` | `string \| Component` | `'span'` | Decorative; always `aria-hidden="true"`. Default slot text `/`. |

#### `GhostBreadcrumbEllipsis`

| Prop    | Type     | Default                           | Contract                                            |
| ------- | -------- | --------------------------------- | --------------------------------------------------- |
| `label` | `string` | `'Show more breadcrumb segments'` | Accessible name for the disclosure trigger control. |

Default slot: popover body (typically a vertical list of `GhostBreadcrumbLink`
nodes). `icon` slot overrides the visible `…` trigger glyph.

### v-model contracts

None.

### Events, callbacks, slots, and exposed methods

- Each interactive part exposes `{ element, focus, blur }` where a focusable host
  exists (link, ellipsis trigger).
- `GhostBreadcrumb` and list/item/page/separator parts expose `element` when the
  host is a native element or themed wrapper with `.element`.

## State model

Static navigation; no internal selection state. `GhostBreadcrumbEllipsis`
delegates open state to nested `GhostPopover`.

## Consumer data

Consumers own href targets, segment labels, and which segments collapse into the
ellipsis popover.

## Accessibility contract

Follows [WAI-ARIA APG Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/).

### Semantics and relationships

- Root renders `nav` with `aria-label` (from `ariaLabel`).
- List renders `ol` with `data-part="list"`.
- Items render `li` with `data-part="item"`.
- Links render focusable ancestors without `aria-current`.
- Current page renders `aria-current="page"` on the page part only.
- Separators render `aria-hidden="true"` and must live inside an `li` (sibling to
  link/page content), never as direct children of `ol`.
- Ellipsis trigger is a `button` with an accessible name; collapsed links live
  in popover content and remain tabbable when the popover is open.

### Keyboard interaction

- Tab moves through ancestor links, the ellipsis trigger, and open popover links.
- `Enter` / `Space` on the ellipsis trigger toggles the popover (via `GhostPopover`).
- `Escape` closes the ellipsis popover and returns focus to its trigger.

### Focus behavior

Visible focus rings on links and the ellipsis trigger. Popover content receives
focus on open per `GhostPopover` defaults.

### Assistive technology expectations

The trail is announced as a navigation landmark. The current page is the last
segment with `aria-current="page"`. Separators are ignored.

## Rendering and customization

`data-part` values: `root`, `list`, `item`, `link`, `page`, `separator`,
`ellipsis`. Root sets `data-ghost-breadcrumb=""`. Classes: `ghost-breadcrumb`,
`ghost-breadcrumb-list`, etc., for unstyled layout hooks.
`GhostBreadcrumbEllipsis` forwards consumer attributes to its host span. When
the host carries `data-themed`, the part mirrors it onto the trigger and the
portaled popover content so theme rules reach the body-level panel.

## Environment behavior

### SSR and hydration

Markup is deterministic; ellipsis popover IDs come from `GhostPopover` /
`useGhostId`. SSR test ensures `nav`/`ol`/`li` structure and `aria-current` on
the current page hydrate without mismatch.

### Mobile and touch

Touch targets for links and ellipsis follow consumer/theme sizing.

## Performance

No observation or virtualization; intended for short trails (typically &lt; 10 segments).

## Composition

`GhostBreadcrumbEllipsis` composes `GhostPopover`, `GhostPopoverTrigger`, and
`GhostPopoverContent` internally.

## Test plan

- Unit: markup, `aria-label`, `aria-current`, separator `aria-hidden`, invalid
  `ol` structure avoided in docs/examples.
- Vue: compound mount, ellipsis opens and exposes links, custom separator slot.
- SSR hydration via `expectSsrHydration`.
- Browser: example keyboard/axe (`tests/e2e/ghost-breadcrumb.spec.ts`).
- Visual: themed example snapshots (`breadcrumb/basic`, `breadcrumb/collapsed`).
- Type tests: `GhostBreadcrumbConsumer.vue`.

## Documentation plan

- `docs/components/breadcrumb.md` with basic and collapsed examples.
- Roadmap row updated to merged when shipped.

## Compatibility and release impact

New experimental API on `@ghostvue/vue` and themed wrappers on `@ghostvue/themes`.
Changeset: minor.

## Open architectural questions

None; styling hooks follow existing `data-part` conventions (GHO-38).
