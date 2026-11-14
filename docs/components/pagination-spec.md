# GhostPagination specification

**Status:** Proposed for GHO-81. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostPagination` navigates a bounded sequence of pages (for example table
results or paged lists). It exposes first, previous, next, and last actions plus
numbered page controls with ellipsis when the page count is large. Consumers
own fetching, server totals, and page-size math; the component only maps user
intent to a page index.

## Non-goals

- Data loading, caching, optimistic updates, and error UI stay outside the
  component.
- Page size selection, “showing X–Y of Z results” copy, and URL/router
  synchronization are consumer-owned.
- Infinite scroll, load-more, and virtualized lists are separate patterns.
- Composing `GhostButton` is optional; headless pagination uses native
  `button` hosts with the same activation contract as other interactive parts.
- Custom per-page rendering beyond optional `page` / `ellipsis` slots is out of
  scope for the initial API.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostPagination` / `useGhostPagination`:

| Prop            | Type                       | Default           | Contract                                                                                                                     |
| --------------- | -------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`    | `number`                   | omitted           | Controlled current page (1-based). Omit for uncontrolled mode.                                                               |
| `defaultPage`   | `number`                   | `1`               | Initial page when `modelValue` is omitted. Later changes are ignored. Clamped to `[1, pageCount]`.                           |
| `pageCount`     | `number`                   | required          | Total pages. Values below `1` are treated as `1`.                                                                            |
| `siblingCount`  | `number`                   | `1`               | Pages shown on each side of the current page in the numeric range. Non-negative integers; invalid values fall back to `1`.   |
| `boundaryCount` | `number`                   | `1`               | Pages always visible at the start and end of the numeric range. Non-negative integers; invalid values fall back to `1`.      |
| `showEdges`     | `boolean`                  | `true`            | When `true`, render first and last controls in addition to previous and next.                                                |
| `disabled`      | `boolean`                  | `false`           | Disables all pagination controls. Current page semantics remain visible.                                                     |
| `ariaLabel`     | `string`                   | `'Pagination'`    | Accessible name for the root `navigation` landmark (`aria-label`).                                                           |
| `getPageLabel`  | `(page: number) => string` | omitted           | Optional formatter for numbered page accessible names. Default: `` `Page ${page}` ``. `aria-current` marks the current page. |
| `previousLabel` | `string`                   | `'Previous page'` | Accessible name for the previous control.                                                                                    |
| `nextLabel`     | `string`                   | `'Next page'`     | Accessible name for the next control.                                                                                        |
| `firstLabel`    | `string`                   | `'First page'`    | Accessible name for the first control when `showEdges` is `true`.                                                            |
| `lastLabel`     | `string`                   | `'Last page'`     | Accessible name for the last control when `showEdges` is `true`.                                                             |
| `ellipsisLabel` | `string`                   | `'More pages'`    | Accessible name for the ellipsis affordance (exposed on the list item; the glyph itself is `aria-hidden`).                   |

Named ESM exports: `GhostPagination`, `useGhostPagination`,
`getPaginationRange`, `GhostPaginationItem` (type), and related prop types.
`getPaginationRange` is a pure helper with unit tests; it is the only public
ellipsis implementation.

Native attributes and listeners fall through to the root `nav`. The component
owns list structure, control labels, `aria-current`, and disabled states on
items it renders. Do not redeclare `aria-*` as camelCase props.

Themed `@ghostvue/themes` `GhostPagination` wraps the unstyled component. Same
behavioral props; these exist only on the themed wrapper:

| Prop   | Type                   | Default | Contract                                                                               |
| ------ | ---------------------- | ------- | -------------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control sizing. The default omits `data-size` so CSS can treat a missing hook as `md`. |

The themed wrapper sets `data-size` on the inner root and wraps the instance in
`.ghost-themed-scope` (`display: contents`).

### v-model contracts

`v-model` binds `modelValue` / `update:modelValue` with a **1-based** page
number. `useControllableState` is the write path:

- Omitted `modelValue` is uncontrolled. Local state starts at `defaultPage`
  clamped to `[1, pageCount]` and updates immediately on activation.
- A defined `modelValue` is controlled. Activation emits `update:modelValue`
  with the target page and does not write local state synchronously.
- After emit, if the parent has not updated the prop yet, getters still read
  the previous controlled value (stale prop until re-render). Do not
  synchronously rewrite DOM checked/pressed state in that window; defer any
  focus or scroll reconciliation with `nextTick` when needed.
- When `pageCount` shrinks below the current page, clamp the effective page to
  `pageCount` for rendering and disabled logic without emitting until the user
  activates a control (consumers may react to `pageCount` separately).

### Events, callbacks, slots, and exposed methods

- Emits `update:modelValue` with `[page: number]` on user-driven page changes.
- Slots:
  - `page` — `{ page: number, current: boolean }` — optional custom content for
    a numbered page button (default: decimal page number as text).
  - `ellipsis` — `{ placement: 'start' | 'end' }` — optional custom ellipsis
    glyph (default: `…` with `aria-hidden` on the glyph).

Exposed instance API:

- `element: HTMLElement | null` — root `nav`
- `focus(options?: FocusOptions): void` — focuses the current page control if
  enabled, otherwise the first enabled control in the list
- `blur(): void`

## State model

Effective page is always clamped to `[1, pageCount]`. Edge controls and the
current page become visually inactive with `aria-disabled="true"` and
`data-disabled` when their action would not change the page, but they stay
focusable. Native `disabled` applies only when the whole component `disabled`
prop is `true`.

### Loading, empty, disabled, read-only, and error states

No loading or error states. `pageCount === 1` still renders a valid control set
with navigation actions disabled as appropriate. There is no read-only mode
beyond `disabled`.

### Async behavior

None. The consumer applies `update:modelValue` and performs fetches externally.

## Consumer data

No consumer-owned collections. `pageCount` is a number, not derived data.

## Accessibility contract

### Semantics and relationships

- Root: native `nav` with `aria-label` from `ariaLabel`.
- List: `ul` / `li` structure (`data-part="list"` / `data-part="item"`).
- Controls: native `button type="button"`.
- Current page: `aria-current="page"` on the active numbered button (name does
  not repeat “current page” in `aria-label`).
- Ellipsis: `role="img"` and `aria-label` on the ellipsis `span`; the glyph is
  `aria-hidden="true"`.

APG reference: no dedicated pagination pattern; behavior follows the
[navigation landmark](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
and link-button conventions for paged collections.

### Keyboard interaction

Each control remains a normal tab stop (no roving tabindex). `Enter` / `Space`
activate the focused control (native button behavior). Inactive controls still
receive focus but ignore activation.

### Focus behavior

When the current page changes, focus stays on the activated control. The exposed
`focus()` method targets the current page button when present.

### Assistive technology expectations

Control names convey destination (“Page 3”, “Next page”). The current page is
announced with `aria-current`. The component does not use a live region; result
counts and fetch status are consumer-owned.

## Rendering and customization

Stable styling hooks (ADR 0004):

- class `ghost-pagination` on `nav`; `data-ghost-pagination` on root
- `data-part`: `root` (nav), `list`, `item`, `first`, `previous`, `next`,
  `last`, `page`, `ellipsis`
- `data-state="disabled"` on the root while `disabled` is `true`
- `data-disabled` on individual disabled controls

The unstyled component sets minimal list layout (horizontal flex on the `ul`) so
examples render without the theme.

## Environment behavior

### SSR and hydration

Markup is deterministic from props. IDs are not generated (`useGhostId` unused).

### Mobile and touch

Native buttons satisfy target sizing when themed. No custom gestures.

## Performance

`getPaginationRange` is O(pageCount) worst case but typically outputs a small
fixed number of items. No virtualization.

## Composition

Reuses `useControllableState`. Does not reuse `GhostButton`
in the headless tree (keeps pagination self-contained); themed styles mirror
button tokens.

## Test plan

- Unit tests for `getPaginationRange` (boundaries, ellipsis placement, small
  counts, invalid counts).
- Vue tests for clamping, controlled/uncontrolled updates, disabled edges,
  `aria-current`, and emit timing.
- Browser tests: focus retention, activation, axe on playground and examples.
- Type tests: `GhostPaginationConsumer` covers props and `v-model`.

## Documentation plan

- API reference `docs/components/pagination.md`
- Examples: `pagination/basic`, `pagination/controlled`, `pagination/ellipsis`
- Playground section with unique group names and status text
- Roadmap status update for GHO-81

## Compatibility and release impact

New public API in `@ghostvue/vue` and `@ghostvue/themes`. Changeset: minor on both
packages.

## Open architectural questions

None. Whether themed pagination should share `GhostButton` visuals is deferred;
wrapper uses pagination-local CSS hooks aligned with button tokens.
