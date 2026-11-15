# GhostTable specification

**Status:** Proposed for GHO-85. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostTable` is a set of semantic table primitives for **static** tabular
content: invoices, settings matrices, and documentation tables before a
DataTable exists. Sighted users get predictable structure and themed defaults.
Assistive technology reads native table semantics, header `scope` relationships,
and captions without grid or interactive widget roles.

The immediate consumers are read-only summary tables, spec comparison tables, and
empty or populated table shells that DataTable will later reuse for markup and
styling hooks.

## Non-goals

- Sorting, filtering, pagination, row selection, column resizing, or
  virtualization.
- `role="grid"`, `role="row"`, or other ARIA table substitutes when native
  elements already express the structure.
- Data fetching, loading orchestration, or empty-state policy (compose
  `GhostEmptyState` inside `GhostTableBody` when needed).
- Sticky headers, frozen columns, or scroll-synced footers (DataTable /
  `GhostScrollArea` territory).
- Implicit horizontal overflow on the `<table>` itself. Wide tables opt into an
  explicit scroll container on the root primitive.

## Public API

### Props and configuration

Headless `@ghostvue/vue` primitives and composables:

| Component              | Native element | Behavioral props                                     |
| ---------------------- | -------------- | ---------------------------------------------------- |
| `GhostTable`           | `table`        | `containHorizontal?: boolean` (default `false`)      |
| `GhostTableCaption`    | `caption`      | none                                                 |
| `GhostTableHead`       | `thead`        | none                                                 |
| `GhostTableBody`       | `tbody`        | none                                                 |
| `GhostTableFoot`       | `tfoot`        | none                                                 |
| `GhostTableRow`        | `tr`           | none                                                 |
| `GhostTableHeaderCell` | `th`           | `scope?: 'col' \| 'row' \| 'colgroup' \| 'rowgroup'` |
| `GhostTableCell`       | `td`           | none                                                 |

```ts
type GhostTableHeaderScope = 'col' | 'row' | 'colgroup' | 'rowgroup'
```

Named ESM exports: each `GhostTable*` SFC, matching `useGhostTable*` composable,
and the types above.

`GhostTable.containHorizontal` when `true` renders:

1. An outer `div` with `data-part="scroll-container"` and class
   `ghost-table-scroll-container` (overflow is applied only in themed CSS on this
   part).
2. The native `<table>` child with `data-part="root"`.

When `false`, only the `<table>` is rendered. The table never receives
`overflow-x` from GhostVue.

Native attributes and listeners fall through to the **native table element** for
`GhostTable` (and to each part's native host). The root owns `data-part`,
`data-ghost-table`, and the optional scroll wrapper; consumers must not rely on
wrapper presence unless `containHorizontal` is `true`.

`GhostTableHeaderCell` owns the `scope` attribute when the prop is set. Omit
`scope` when the header relationship is obvious from structure alone, or set it
explicitly for row headers, `colgroup` / `rowgroup` spans, and audits.

### v-model contracts

There is no model.

### Events, callbacks, slots, and exposed methods

Each part exposes a **default slot** for cell or row content. No component
events. No keyboard handlers.

`GhostTable` exposes:

| Member    | Type                       | Contract                   |
| --------- | -------------------------- | -------------------------- |
| `element` | `HTMLTableElement \| null` | The `<table>` after mount. |

Other parts expose `element` as their native host (`HTMLTableCaptionElement`,
`HTMLTableSectionElement`, `HTMLTableRowElement`, `HTMLTableCellElement`).

### Themed `@ghostvue/themes` `GhostTable`

Wraps the unstyled root in `.ghost-themed-scope` and loads default table CSS.
Sub-parts remain unstyled imports from `@ghostvue/vue`; recipes target
`data-part` under `.ghost-themed-scope`. No extra behavioral props.

## State model

Stateless presentational markup. No `data-state`.

## Consumer data

Consumers own row and column data. Primitives do not mutate arrays or accept
column definitions.

## Accessibility contract

### Semantics and relationships

Follow native HTML table semantics and the
[WAI-ARIA table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
guidance for **static** tables: use `<caption>` when the table needs an
accessible name, mark header cells with `<th>` and `scope` when relationships
are not implicit, and keep **all** body rows inside `GhostTableBody` so DOM
order matches what assistive technology expects.

| Part                    | Implicit role             | Notes                                                 |
| ----------------------- | ------------------------- | ----------------------------------------------------- |
| `table`                 | table                     | No redundant `role`.                                  |
| `caption`               | caption                   | First child of `table` when present.                  |
| `thead`/`tbody`/`tfoot` | rowgroup                  | Explicit sections; avoids implicit `tbody` insertion. |
| `tr`                    | row                       |                                                       |
| `th`                    | columnheader or rowheader | Determined by `scope` and placement.                  |
| `td`                    | cell                      |                                                       |

The scroll container is presentational layout only: no `role`, no
`aria-*`. Focusable controls inside cells follow normal tab order.

### Keyboard interaction

None added by the primitives. Interactive content inside cells uses native
control behavior.

### Focus behavior

The table is not a single tab stop. Nothing traps focus.

### Assistive technology expectations

Headers associate with data cells through `scope` and table structure. Caption
text names the table when provided.

## Rendering and customization

Stable styling hooks (ADR 0004; not a new GHO-38 contract):

- Root table: class `ghost-table`, `data-part="root"`, `data-ghost-table`
- Optional wrapper: class `ghost-table-scroll-container`, `data-part="scroll-container"`
- Sections and cells: class `ghost-table-{part}` (`ghost-table-head`,
  `ghost-table-body`, `ghost-table-foot`, `ghost-table-row`,
  `ghost-table-header-cell`, `ghost-table-cell`, `ghost-table-caption`)

Themed CSS uses `--ghost-*` tokens only:

- `--ghost-border-default`, `--ghost-border-hairline-width`
- `--ghost-space-inset-sm` / `--ghost-space-inset-md` for cell padding
- `--ghost-surface-fg`, `--ghost-text-muted`, `--ghost-type-*` for typography
- Header row: subtle background via `--ghost-surface-muted-bg`

## Environment behavior

### SSR and hydration

Markup is deterministic from props and slot structure. **Consumers must wrap
rows in `GhostTableHead` / `GhostTableBody` / `GhostTableFoot`.** Browsers
implicitly insert `<tbody>` around bare `<tr>` children, which causes classic
hydration mismatches; the primitives do not auto-insert sections.

Integration tests use `expectSsrHydration` on a fully composed table.

### Mobile and touch

Horizontal scrolling when `containHorizontal` is enabled uses native overflow
scrolling on the scroll container. Touch targets inside cells are owned by
nested controls.

## Performance

Constant-time rendering per part. No listeners or virtualizers.

## Composition

Each part has a thin SFC and composable that sets `data-part` and class hooks.
`GhostTable` optionally adds the scroll wrapper. DataTable may compose these
primitives later without changing their public API.

Manifests: one JSON file per exported SFC under `packages/vue/manifests/`, plus
`packages/themes/manifests/ghost-table.manifest.json`.

## Test plan

- Vue tests: default hooks on every part, `scope` on header cells, attribute
  fallthrough, `containHorizontal` wrapper presence, deterministic SSR strings.
- Composable tests: binding objects for each `useGhostTable*`.
- Integration: `expectSsrHydration` on caption + thead + tbody + row grid.
- Browser: playground section with semantic headers, `containHorizontal`, axe
  on the table region.
- Visual baselines: registered examples via `pnpm test:visual:docker`.

## Documentation plan

`docs/components/table.md` with basic static table, row headers, horizontal
containment, composable usage, themed example, styling hooks, and accessibility
notes (caption, scope, explicit `tbody`).

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking. GHO-38 styling hooks remain undecided; this uses existing
`data-part` / `data-ghost-table` only.
