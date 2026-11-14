# GhostEmptyState specification

**Status:** Proposed for [GHO-77](https://linear.app/ghost-vue/issue/GHO-77)
implementation in the same pull request. Zac reviews the spec and the
implementation together.

## Purpose and user problems

`GhostEmptyState` is a presentational block for regions that have no content to
show yet: an empty DataTable body, a filter with no matches, or an unused panel
slot. Sighted users see a short title, optional supporting copy, optional
decorative visual, and optional actions. Assistive technology encounters the
same information in a predictable reading order with a real heading when a title
is provided.

The consumer owns **why** the region is empty (no rows vs no search hits vs
permission denied). This primitive supplies structure and accessibility hooks,
not fixed copy or mode enums.

## Non-goals

- Empty, loading, and error **orchestration** for DataTable or other widgets.
  The parent decides when to mount an empty state and what copy to show.
- Hard-coded cause modes (`variant="no-data"`, `type="filtered"`, etc.). Cause
  is expressed only through slot content and consumer markup.
- Live-region announcements. Empty copy is ordinary static text unless the
  consumer wraps it in their own live region.
- Replacing table captions, list counts, or grid `aria-rowcount`. Those stay on
  the data widget.
- `useControllableState` — there is no model.
- A parallel styling-hooks vocabulary. GHO-38 remains undecided; this component
  uses existing `data-part`, `data-ghost-empty-state`, and class hooks from ADR 0004.
- The unstyled component ships no layout or color styles. Spacing and typography
  belong to the themed wrapper or consumer CSS.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostEmptyState` / `useGhostEmptyState`:

| Prop           | Type                         | Default | Contract                                                                                                                              |
| -------------- | ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `3`     | Level of the native heading element wrapping the `#title` slot. Omitted title slot skips the heading entirely.                        |
| `as`           | `GhostEmptyStateElement`     | `'div'` | Root element. Use `section` when the empty region is a named document landmark; default `div` avoids nested landmarks in table cells. |

```ts
type GhostEmptyStateElement = 'div' | 'section'
type GhostEmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
```

Named ESM exports: `GhostEmptyState`, `useGhostEmptyState`, and the types above.
Headless behavior lives in the composable; the SFC renders the root, named slots,
and part wrappers.

Native attributes and event listeners fall through to the root.
`useGhostId('ghost-empty-state-title')` supplies the title heading `id` when the
`#title` slot is rendered. When `#title` is present **and** `as` is `section`, the
root receives `aria-labelledby` pointing at that id (the section becomes a named
region). The default `div` root never gets `aria-labelledby`: generic/div has no
nameable role and assistive technology would ignore it. When only `#description`
is present, or the root is a `div`, consumers name a landmark with fallthrough if
required (`aria-label`, or `as="section"` plus title).

The `#visual` wrapper is `aria-hidden="true"` whenever that slot has content,
so decorative icons do not duplicate the title in the accessibility tree.
Meaningful non-text content must include text in `#title` or `#description`.

### v-model contracts

There is no model. Mounting and copy are consumer-owned.

### Events, callbacks, slots, and exposed methods

| Slot          | Part element  | Contract                                                                                      |
| ------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `visual`      | `visual`      | Optional decorative graphic or icon. Wrapper is `aria-hidden="true"`.                         |
| `title`       | `title`       | Optional heading text. Rendered as `h{headingLevel}` with generated `id`.                     |
| `description` | `description` | Optional supporting copy. Rendered in a `<div>` so lists and blocks are valid.                 |
| `actions`     | `actions`     | Optional action controls (e.g. `GhostButton`). Not a tab stop itself; children are focusable. |

No default slot. No component-specific events. No methods are exposed. The root
is not interactive; consumers that need the element use a template ref on the
root via normal Vue fallthrough or `element` exposed member:

- `element: HTMLElement | null` — the root host after mount.

### Themed `@ghostvue/themes` `GhostEmptyState`

Wraps the unstyled component. No extra behavioral props. Sets `data-themed` on
the inner root (same pattern as `GhostSkeleton`) so recipes apply without an
extra wrapper between table structures. Visual layout uses token spacing and
muted foreground colors only.

## State model

Stateless presentational markup. No `data-state`.

### Loading, empty, disabled, read-only, and error states

None apply as component states. "Empty" is why the consumer mounted the block.
Loading and error belong to sibling primitives (`GhostSkeleton`, `GhostSpinner`,
consumer copy).

## Consumer data

No data props and no mutation. Slot content is consumer-owned.

## Accessibility contract

### Semantics and relationships

Reading order in the DOM: `#visual`, `#title`, `#description`, `#actions`.

The title uses a native heading (`h1`–`h6` from `headingLevel`). That satisfies
WCAG 1.3.1 for the primary label of the empty region.

The root is a `div` or `section` with **no** redundant `role`. When `#title` is
present and `as` is `section`, `aria-labelledby` references the heading id.
Default `div` roots omit it; the heading still provides document structure.
Consumers may add `role="region"` and naming via fallthrough when they own the
landmark contract.

The visual wrapper is `aria-hidden="true"` when present. Action slots host
native buttons and links from the consumer; this component does not wrap them in
a toolbar role.

### Keyboard interaction

The component adds no key handlers. Focus moves to actionable content in
`#actions` in document order. The root is not focusable and has no `tabindex`.

### Focus behavior

No focus trap, restoration, or roving focus. `useFocusScope` and
`useRovingFocus` are unused.

### Assistive technology expectations

Assistive technology reads the heading and description in order. Decorative
visuals are skipped. Automated checks cannot prove the copy matches the workflow;
that requires human review.

## Rendering and customization

Stable hooks:

- class `ghost-empty-state` on the root
- `data-ghost-empty-state=""` on the root
- `data-part="root" | "visual" | "title" | "description" | "actions"`
- themed: `data-themed` on the inner root

Themed CSS uses existing `--ghost-*` tokens for gap, type sizes, and muted
foreground on description. No new public tokens.

## Environment behavior

### SSR and hydration

Pure function of props and slot presence. `useGhostId` and `useId` are
SSR-stable. No browser globals in setup. Server and client markup match.

### Mobile and touch

Action targets in `#actions` follow consumer button sizes. The empty state does
not intercept pointer events.

## Performance

Constant-time render, one root and up to four part wrappers. No listeners or
timers.

## Composition

`useGhostEmptyState` owns root bindings and title id. Unstyled `GhostEmptyState`
composes slot wrappers. Themed wrapper forwards slots and sets `data-themed`.
DataTable composes this inside `td`/`div` as the consumer chooses; the primitive
does not know about tables.

Reuses `useGhostId` only.

## Test plan

- WCAG 1.3.1: heading level follows `headingLevel`; `aria-labelledby` on section
  only when title present; absent on div with title
- WCAG 2.1.1: actions slot buttons remain keyboard reachable
- WCAG 4.1.2: visual wrapper `aria-hidden`; root has no spurious role
- Rendering: reading order of parts; optional sections omitted when slots empty
- SSR: `renderToString` matches client structure
- Type tests: public props and exposed ref
- Browser: Axe on examples and playground section
- Integration: themed `element` ref reaches inner root

## Documentation plan

- API reference in `docs/components/empty-state.md`
- Examples: basic, filter-no-match, table cell, themed, composable
- Playground section with unique heading and legend text
- Roadmap status update for GHO-77

## Compatibility and release impact

New exports in `@ghostvue/vue` and `@ghostvue/themes`. Minor Changeset for both
packages.

## Open architectural questions

None. Compound subcomponents are out of scope for the first delivery; named
slots cover progressive composition without a provider tree.
