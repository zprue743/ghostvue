---
schemaVersion: 1.0.0
component: GhostDataTableViewport
components:
  - GhostDataTableViewport
packages:
  - '@ghostvue/vue'
specStatus: proposed
manifests: []
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
unresolvedQuestions:
  - question: 'GHO-251 (0.3.0 DataTable virtualization): Zac sign-off required on V1–V8 (opt-in surface, pagination opt-out, aria-rowcount scope, scroll reset policy, measured mode in 0.3.0, in-house windowing vs adapter, document scrolling, viewport tab stop) before any implementation.'
    blocking: false
    reviewer: Zac
---

# GhostDataTable virtualization specification

> [!IMPORTANT]
> **Status:** Proposed ([GHO-251](https://linear.app/ghost-vue/issue/GHO-251),
> [#318](https://github.com/zprue743/ghostvue/issues/318)). This is a draft
> specification only. It is **held for Zac's approval before any
> implementation**. Targeted for `0.3.0`, after the
> [multi-column sort addendum](/specs/data-table#multi-column-sort-specification-gho-250-proposed-for-0-3-0)
> ([#317](https://github.com/zprue743/ghostvue/issues/317)) and before the
> treegrid / grid keyboard navigation spec
> ([#319](https://github.com/zprue743/ghostvue/issues/319)).

This addendum extends the approved [GhostDataTable specification](/specs/data-table)
(phase one, [ADR 0014](../adr/0014-datatable-phase-one-architecture.md)). Every
phase-one contract still applies unless a section below says otherwise. It
lives in its own file so it can be reviewed without touching the parent spec;
the parent's [Child work decomposition](/specs/data-table#child-work-decomposition)
row "**Deferred:** Virtualization spec" is the issue this file answers.

## Purpose and user problems

Phase one renders every row of the current page (`getRowModel()`), so DOM cost
is O(`pageSize`). That is the right default and stays the default. Some admin
surfaces cannot use small pages:

- Operational lists that users scan continuously (audit logs, ledgers,
  inventory) where page boundaries hide adjacent rows.
- Server pages of 500–5,000 rows chosen to reduce round trips.
- Local data sets of 10k+ rows where users expect one scrolling list with
  sort and filter.

Rendering thousands of `<tr>` nodes makes the first paint, every sort, and
every filter slow, and long tables stall scrolling on mid-range hardware.
Virtualization mounts only the rows near the visible area plus a small
overscan, and represents the rest with spacer rows, so DOM cost becomes
O(visible rows) regardless of row count.

The library contract this spec adds is **scroll plus accessibility**: which
element scrolls, which rows are mounted, how rows report their position to
assistive technology (`aria-rowcount`, `aria-rowindex`), and what happens to
focus when a focused row would scroll out of the mounted window. The table
stays a native `<table>` built from `GhostTable*` parts, with native `Tab`
order, exactly as ADR 0014 requires.

## Non-goals

- **Grid and treegrid keyboard navigation.** `role="grid"` /
  `role="treegrid"`, arrow-key cell movement, and single-Tab-stop roving row
  focus are [#319](https://github.com/zprue743/ghostvue/issues/319)'s scope.
  This spec only provides the hooks #319 will need (see
  [Relationship to #319](#relationship-to-319-grid-and-treegrid-navigation)).
- **Column virtualization.** All columns stay mounted. Wide tables keep
  horizontal scrolling.
- **Infinite loading and sparse server rows.** No placeholder rows for
  unloaded indices, no "load more on scroll end" event, no `rowCount` larger
  than the loaded rows inside one virtual list. Server mode windows the rows
  in `data` only.
- **Document (window) scrolling.** Only an element scroll container is
  supported in `0.3.0` (see [V7](#open-architectural-decisions-for-zac-0-3-0-sign-off)).
- **Sticky headers, frozen columns, and scroll-synced footers** as a shipped
  feature. They remain a separate deferred spec. This spec states only what
  virtualization requires of them.
- **Themed virtualization styling** in `@ghostvue/themes` (the themed wrapper,
  [#316](https://github.com/zprue743/ghostvue/issues/316), stays
  non-virtualized until a follow-up).
- **A public, general-purpose virtualizer export** shared by Tree, Combobox,
  and Command Palette. The windowing math is written so it can be extracted
  later ([performance standard](../standards/performance.md)), but `0.3.0`
  exports DataTable-specific API only.
- **New runtime dependencies.** No bundled third-party virtualizer (see
  [V6](#open-architectural-decisions-for-zac-0-3-0-sign-off)).
- **Smooth-scroll animation, scroll snapping, and scroll-position persistence**
  (URL or `history.state`). Restoring scroll on Back is consumer-owned through
  the exposed methods.
- **Print and find-in-page completeness.** Unmounted rows are not printed or
  found by the browser's find. Documented as a limitation.

## Public API

All additions are proposed for `@ghostvue/vue` and are additive. A table that
does not opt in renders and behaves exactly as in phase one.

### Opt-in surface (proposed, see V1)

Virtualization turns on when the table body is rendered inside a
**`GhostDataTableViewport`**, a new thin child of `GhostDataTable`. The
viewport is the vertical scroll container. It registers itself with the
parent root through the existing `ghostDataTableContextKey` provide/inject
channel, and the root's slot bindings switch to windowed output while a
viewport is registered.

Why a child component rather than a prop on the root:

- `GhostDataTable` is renderless (ADR 0014). Virtualization needs a real
  scroll element with a role, a name, a `tabindex`, and an inline overflow
  style. A component that owns that element keeps the root renderless.
- It follows the `GhostCommandPaletteList` precedent: the list part is the
  scroll host, and the consumer decides its size.
- Code splitting: the windowing code ships with the viewport. Tables that never
  import it do not pay for it in bundle size (`pnpm size` fixture per
  component).

```vue
<GhostDataTable
  :data="ledger"
  :columns="columns"
  :get-row-id="(row) => row.id"
  :enable-pagination="false"
  aria-label="Ledger entries"
>
  <GhostDataTableViewport :row-height="40" style="block-size: 32rem">
    <GhostDataTableTable :columns="columns" />
  </GhostDataTableViewport>
</GhostDataTable>
```

`enablePagination` is a proposed root option (see
[Pagination](#pagination-and-the-windowed-row-set) and V2).

### `GhostDataTableViewport` props

| Prop              | Type                    | Default             | Contract                                                                                                                                                                                        |
| ----------------- | ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowHeight`       | `number`                | required            | Data-row block size in CSS pixels. In `'fixed'` mode it is exact; in `'measured'` mode it is the estimate for rows not yet measured. Non-finite or `< 1` values fall back to `1` (dev warning). |
| `rowHeightMode`   | `'fixed' \| 'measured'` | `'fixed'`           | See [Row-height model](#row-height-model). Detail rows are always measured.                                                                                                                     |
| `overscan`        | `number`                | `5`                 | Extra data rows mounted on **each** side of the visible range. Normalized like `maxMultiSortColCount`: `Math.floor`, then minimum `1` (focus continuity needs at least one row).                |
| `initialRowCount` | `number`                | `20`                | Rows rendered before the viewport is measured: on the server and in the first client render. Same normalization, minimum `1`. See [SSR and hydration](#ssr-and-hydration).                      |
| `label`           | `string`                | inherits table name | Accessible name of the scroll region. Falls back to the root's `ariaLabelledby` (as `aria-labelledby`), then `ariaLabel`. Dev warning when no name resolves.                                    |
| `labelledby`      | `string`                | —                   | Id of a visible label for the region; wins over `label`.                                                                                                                                        |

Consumer `class` and `style` merge onto the viewport element and are never
overwritten (`mergeGhostTablePartAttrs` rules). The consumer must give the
viewport a bounded block size (`block-size`, `max-block-size`, or a flex/grid
track). An unbounded viewport mounts every row and logs one dev warning, so
the failure is visible rather than silently slow.

### `GhostDataTableViewport` slots and exposed members

- **Default slot:** the table (`GhostDataTableTable`, a manual `GhostTable`
  composition, or the preset's table). Only the table belongs inside. Search
  fields, toolbars, live regions, and pagers go outside the viewport so they
  do not scroll away.
- **Exposed** (template ref):

| Member                      | Signature                                                                                                                         | Contract                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `element`                   | `HTMLElement \| null`                                                                                                             | The scroll element after mount.                                                                                                                                                |
| `scrollToRow(rowId, opts?)` | `(rowId: DataTableRowId, opts?: { align?: 'start' \| 'center' \| 'end' \| 'nearest'; behavior?: 'auto' \| 'smooth' }) => boolean` | Scrolls a row of the windowed set into view and mounts it. Returns `false` (no scroll) when the id is not in the set. `align` defaults to `'nearest'`, `behavior` to `'auto'`. |
| `scrollToOffset(px, opts?)` | `(offset: number, opts?: { behavior?: 'auto' \| 'smooth' }) => void`                                                              | Sets the body scroll offset, clamped to the scrollable range. For consumer scroll restoration.                                                                                 |
| `getScrollOffset()`         | `() => number`                                                                                                                    | Current body scroll offset in pixels (0 before mount).                                                                                                                         |
| `range`                     | `Readonly<Ref<DataTableVirtualRange>>`                                                                                            | Current mounted window (below).                                                                                                                                                |

`behavior: 'smooth'` is downgraded to `'auto'` under
`prefers-reduced-motion: reduce` (see [Reduced motion](#reduced-motion)).

### Types (proposed)

```ts
/** Mounted window over the windowed row set, in display positions. */
interface DataTableVirtualRange {
  /** First mounted display index (0-based, inclusive). */
  start: number
  /** Last mounted display index plus one (exclusive). */
  end: number
  /** First and last display index intersecting the visible area. */
  visibleStart: number
  visibleEnd: number
  /** Rows in the windowed set (`getRowModel().length`). */
  count: number
}

/** One entry of `virtualItems`, in DOM order. */
type DataTableVirtualItem<TData> =
  | {
      type: 'row'
      key: DataTableRowId
      /** 0-based position in the windowed set (not `rowIndex`). */
      displayIndex: number
      row: DataTableSlotRow<TData>
    }
  | {
      type: 'spacer'
      /** Stable within one window: `'before'`, `'between'`, or `'after'`. */
      key: string
      /** Block size in CSS pixels. */
      size: number
      spacerProps: DataTableVirtualSpacerProps
    }

interface DataTableVirtualSpacerProps {
  'aria-hidden': 'true'
  'data-virtual-spacer': 'true'
  style: { blockSize: string }
}
```

`displayIndex` exists because phase-one `DataTableRow.rowIndex` is the index
in the consumer's `data` array (`use-ghost-data-table.ts` maps
`data.map((row, rowIndex) => …)`), not the sorted, filtered display position.
ARIA positions and scroll math use `displayIndex` only.

### Root slot binding additions

Additions to `GhostDataTableSlotProps<TData>`. When no viewport is registered
they have the values shown in the last column, so existing manual compositions
and renderers keep working without change.

| Binding              | Type                                      | Contract (viewport registered)                                                           | No viewport                      |
| -------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| `virtualItems`       | `DataTableVirtualItem<TData>[]`           | Mounted rows and spacer rows in DOM order. Render this instead of `rows` in the body.    | Every row of `rows`, no spacers  |
| `virtualRange`       | `DataTableVirtualRange`                   | Same as the viewport's `range`. Use it for consumer text such as "Rows 41–60 of 10,000". | Whole set (`start: 0`, `end: n`) |
| `headerRowProps`     | `{ 'aria-rowindex'?: number }`            | `aria-rowindex: 1` for the single header row. Bind it on the `<thead>` row.              | `{}`                             |
| `isVirtualized`      | `boolean`                                 | `true`.                                                                                  | `false`                          |
| `tableRootProps`     | existing; adds `'aria-rowcount'?: number` | Adds `aria-rowcount` (see [Row count and row index](#row-count-and-row-index)).          | unchanged                        |
| `getRowProps(rowId)` | existing; adds two attributes             | Adds `aria-rowindex` and `data-virtual-index` (the `displayIndex`).                      | unchanged                        |
| `row.detailRowProps` | existing; adds two attributes             | Adds `aria-rowindex` and `data-virtual-index` (parent row's `displayIndex`).             | unchanged                        |

`rows` keeps its phase-one meaning (every row of `getRowModel()`), so counts,
select-all, and consumer summaries are unchanged. Rendering `rows` instead of
`virtualItems` inside a viewport mounts every row; the viewport logs one dev
warning when the mounted row count exceeds the window by more than the
pinned-row allowance.

`GhostDataTableExposed<TData>` gains nothing: scroll methods live on the
viewport ref, which owns the scroll element.

### Root option addition (proposed, see V2)

| Option / Prop      | Type      | Default | Contract                                                                                                                                                                                                                     |
| ------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enablePagination` | `boolean` | `true`  | When `false` (local tables only), `getRowModel()` returns `getPrePaginationRowModel()`, the `pagination` v-model is ignored, and `pageCount` is `1`. Ignored with `manualPagination: true` (the server page is the row set). |

This option is useful without virtualization too, but it is proposed here
because a 10k-row local virtual list is the first concrete consumer.

### Renderer and preset changes

- **`GhostDataTableTable`** iterates `virtualItems` instead of `rows`, renders
  spacer items as `<tr v-bind="spacerProps"><td :colspan="columnCount" /></tr>`,
  and binds `headerRowProps` on the header row. Outside a viewport the output
  is byte-identical to phase one (`virtualItems` has no spacers and
  `headerRowProps` is empty).
- **`GhostDataTablePreset`** gains `virtualization?: GhostDataTablePresetVirtualization`
  (`{ rowHeight; rowHeightMode?; overscan?; initialRowCount?; label? }`). When
  set, the preset wraps only its `GhostTable` in a `GhostDataTableViewport`
  (toolbar and search stay outside). Consumer `class`/`style` for the viewport
  go through `virtualization.viewportAttrs` so the block size can be set
  without a manual composition.
- **Manual composition** wraps its own `GhostTable` in the viewport and renders
  `virtualItems` (example below).

```vue
<GhostDataTableViewport :row-height="40" style="block-size: 30rem">
  <GhostTable v-bind="tableRootProps">
    <GhostTableHead>
      <GhostTableRow v-bind="headerRowProps"><!-- headers --></GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <template v-for="item in virtualItems" :key="item.key">
        <GhostTableRow v-if="item.type === 'spacer'" v-bind="item.spacerProps">
          <GhostTableCell :colspan="headers.length + 2" />
        </GhostTableRow>
        <template v-else>
          <GhostTableRow v-bind="getRowProps(item.row.rowId)"><!-- cells --></GhostTableRow>
          <GhostTableRow v-if="item.row.isExpanded" v-bind="item.row.detailRowProps">
            <GhostTableCell :colspan="headers.length + 2">…</GhostTableCell>
          </GhostTableRow>
        </template>
      </template>
    </GhostTableBody>
  </GhostTable>
</GhostDataTableViewport>
```

### Standalone composable

For escape hatch (3) in the parent spec (`useGhostDataTable` without the
root), export `useGhostDataTableVirtualizer(table, options)`. It takes a
`UseGhostDataTableReturn` plus the viewport props above and returns
`{ viewportProps, setViewportElement, virtualItems, virtualRange,
getRowVirtualProps(rowId), headerRowProps, rowCountProps, scrollToRow,
scrollToOffset, getScrollOffset }`. `GhostDataTableViewport` is a thin
component over this composable, so both paths share one implementation. As
with the interaction helpers, focus pinning (below) is installed by the
component; standalone layouts get it by binding `viewportProps`, which carries
the `focusin`/`focusout` listeners.

## State model

### Windowed row set

The **windowed row set** is `getRowModel()`: the rows the body would render
in phase one. Virtualization never changes which rows are in the set, their
order, or any v-model. It only changes which members of the set are mounted.

- Sorting, filtering, pagination, selection, and expansion state machines are
  unchanged. Scrolling never writes a v-model and never emits `stateChange`.
- Scroll offset and measured heights are viewport-local state. They are not
  part of `DataTableQueryState` and are not controlled props.

### Row-height model

| Mode                | Data rows                                                                                                                                                                                                                      | Detail rows | Cost                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------- |
| `'fixed'` (default) | Exactly `rowHeight`. The consumer's CSS must make it true (`block-size` on rows, no wrapping). The viewport does not measure data rows. Dev builds sample mounted rows once per window change and warn on a mismatch over 1px. | Measured    | Range lookup O(1) plus O(e) for expanded rows above the range |
| `'measured'`        | Measured after mount with one `ResizeObserver`. Unmeasured rows use `rowHeight` as the estimate. Measurements are cached **by `rowId`**, so sort and filter keep them.                                                         | Measured    | Range lookup O(log n) over prefix sums                        |

- Measurement uses `getBoundingClientRect().height` on the `<tr>` (fractional
  pixels kept), found through `data-virtual-index` inside the viewport. No
  template refs are required of consumers.
- **Scroll anchoring:** when a mounted row above the first visible row
  changes size (measured mode, or any detail row), the viewport adjusts
  `scrollTop` by the delta in the same frame so the first visible row does not
  move. The viewport sets `overflow-anchor: none` so browser scroll anchoring
  does not apply a second correction.
- **Cache lifetime:** cached heights for ids no longer in the source `data`
  are dropped on a `data` reference change. A column-set change or viewport
  inline-size change clears the cache (wrapping may change).
- **Table layout:** different rows mounting under `table-layout: auto` would
  change column widths while scrolling. Virtualized tables must use
  `table-layout: fixed` with explicit column widths. `GhostDataTableTable` and
  the preset do not impose it (headless); the docs and the dev mismatch
  warning say so.

### Window computation

On each scroll frame (coalesced with `requestAnimationFrame`, one recompute
per frame at most) and on viewport resize:

1. `bodyOffset` = the scroll offset minus the block size of the content above
   the first body row (the header and caption), measured once per layout
   change.
2. `visibleStart`/`visibleEnd` = the data rows intersecting
   `[bodyOffset, bodyOffset + viewport block size)`; a detail row counts as part
   of its data row.
3. `start = max(0, visibleStart - overscan)`, `end = min(count, visibleEnd + overscan)`.
4. Pinned rows (below) are added outside `[start, end)`.
5. Spacers are emitted for every gap: `'before'`, `'between'` (only around a
   pinned row), and `'after'`. A gap of zero emits no spacer.

**Row groups:** a data row and its open detail row are mounted and unmounted
together, so `aria-controls` on the expand button always points at an
element that exists, and the phase-one focus-on-collapse rule still finds the
button.

### Focus retention (pinned rows)

A row is **pinned** while it contains `document.activeElement` (the data row
or its detail row). A pinned row stays mounted even when it leaves
`[start, end)`, in its correct DOM position between spacers, so DOM order
always equals display order and `aria-rowindex` stays truthful.

- The viewport tracks the focused row with `focusin` / `focusout` on the
  viewport element (no document-level listener).
- At most one row group is pinned. When focus leaves the table, or moves to
  another row, the old pin is released on the next window computation.
- If a pinned row leaves the windowed set (filter, sort into another page,
  `data` change), it unmounts. If focus was inside it, focus moves to the
  viewport element (a tab stop, see [Accessibility](#accessibility-contract)),
  never to `<body>`. This mirrors the phase-one rule that focus is restored to
  a known control, not dropped.
- **Focus-driven mounting:** on `focusin` inside a row at `displayIndex` _i_,
  the viewport synchronously ensures rows `i - 1` and `i + 1` are mounted (in
  the same tick, not on the next scroll frame). This keeps `Tab` and
  `Shift+Tab` from leaving the table early when the browser's
  focus-into-view scroll has not yet produced a scroll event.

### Scroll position across state changes (proposed, see V4)

| Event                                                 | Scroll offset                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `sorting` change                                      | Reset to the first body row (`0`), instant.                   |
| `globalFilter` / `columnFilters` change               | Reset to `0`, instant.                                        |
| Page change (`pagination.pageIndex`) or `pageSize`    | Reset to `0`, instant.                                        |
| `data` reference change with the same query (refresh) | Kept, then clamped to the new scrollable range.               |
| Expansion, selection                                  | Kept (scroll anchoring holds the first visible row in place). |
| `loading` toggles                                     | Kept; rows stay mounted with `aria-busy` on the table.        |
| Viewport resize                                       | Kept; the first visible row stays anchored.                   |

A reset never moves focus. Focus stays on the control the user activated (a
sort button in the header, a search field outside the viewport).

### Pagination and the windowed row set

- **Local, `enablePagination: true` (default):** the window covers the current
  page. Useful for large `pageSize` values (for example 500).
- **Local, `enablePagination: false`:** the window covers the whole filtered
  and sorted set. `GhostPagination` should not be rendered.
- **Server (`manualPagination: true`):** the window covers the loaded page in
  `data`. Page changes still emit one `stateChange` through `setPageIndex`.

### Selection and expansion

- Select-all, cross-page selection, pruning, and expansion rules are unchanged:
  they operate on ids, never on mounted DOM. Selecting all 10k rows does not
  mount them.
- A selected or expanded row that is not mounted keeps its state and renders
  `data-selected` / `data-expanded` when it mounts again.
- Expanding a row near the bottom of the viewport does not scroll; the detail
  row is measured on mount and the spacer after it shrinks.

### Server mode

Unchanged request flow: one `stateChange` per user action,
`useGhostDataTableServerRequest` guards stale responses. Virtualization adds
no fetch triggers. A response that replaces `data` for the same query keeps
the scroll offset; a new query resets it per the table above.

### Multi-column sort interaction

The sort header row is never virtualized, so sort buttons, `aria-sort`,
`data-sort-priority`, and `aria-describedby` targets from the
[multi-sort addendum](/specs/data-table#secondary-aria-sort-and-at-contract)
are always mounted. Its visually hidden description nodes and the
`sortAnnouncement` live region must render **outside the viewport**, not just
outside `<table>`, so they are never scrolled or clipped.

## Consumer data

- `getRowId` must return ids that are stable across sort, filter, and `data`
  refreshes (phase-one rule). Virtualization depends on it more: the
  measurement cache, pinned row, and `key`s of mounted rows are all keyed by
  `rowId`. An id that changes on refresh drops the row's measured height and
  the focus pin.
- The viewport never reads row objects. It reads `rowId` and `displayIndex`
  only, so consumer data stays unwatched and unmutated.
- Consumers own row and cell CSS that makes `'fixed'` mode true. Content that
  can wrap (long text, localized strings) needs `'measured'` mode.

## Accessibility contract

### Semantics

- The table stays a native `<table>` (`GhostTable`). No `role="grid"`,
  no `role="treegrid"`, no `aria-activedescendant`.
- **Viewport:** `<div role="region" tabindex="0" data-part="viewport">` with an
  accessible name (`aria-label` or `aria-labelledby`). This matches the
  `GhostTable` `containHorizontal` scroll container, which is always a named,
  focusable region. Inside a viewport, `GhostTable`'s `containHorizontal` must
  be `false` (the viewport scrolls both axes); nesting both creates two scroll
  regions and two tab stops, and logs a dev warning.
- **Spacer rows:** `<tr aria-hidden="true" data-virtual-spacer="true">` with one
  empty `<td colspan>`. They are hidden from the accessibility tree, carry no
  `aria-rowindex`, and are excluded from `aria-rowcount`.

### Row count and row index

When a viewport is registered and the windowed set is not empty:

- `aria-rowcount` on the `<table>` (through `tableRootProps`) =
  `headerRows + count + openDetailRows`, where `headerRows` is `1`, `count` is
  `getRowModel().length`, and `openDetailRows` is the number of expanded rows
  in the set. Detail rows are real `<tr>` rows, so they are counted.
- `aria-rowindex` is set on **every** mounted row:
  - Header row: `1` (`headerRowProps`).
  - Data row at `displayIndex` _i_: `2 + i + (expanded rows before i)`.
  - Detail row: its data row's index `+ 1`.
- The expanded-before prefix count is computed once per change to expansion
  or the row model (O(n)) and read in O(1) per mounted row.
- Values are **1-based** and **relative to the windowed set**: on server page
  3 the first data row is still `aria-rowindex="2"` (proposed; see V3).
- When the windowed set is empty, the body shows the phase-one empty state row,
  and both `aria-rowcount` and every `aria-rowindex` are omitted (all rows are
  present in the DOM).
- Without a viewport, no `aria-rowcount` / `aria-rowindex` is emitted: every
  row is in the DOM, which is the case where ARIA says they are unnecessary.

### Keyboard interaction

| Key                                   | Context                     | Behavior                                                                                                                                                  |
| ------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`                   | Controls in rows            | Native order through mounted controls. Focus-driven mounting keeps the next and previous row mounted, so tabbing reaches every row's controls in order.   |
| `Tab`                                 | Viewport element            | The viewport is one tab stop before the table's first control, so keyboard users can scroll a table that has no focusable cells.                          |
| `ArrowUp` / `ArrowDown`               | Viewport or a control in it | Native scrolling of the nearest scroll container (the viewport). Not intercepted. Arrow keys inside text inputs and other widgets keep their own meaning. |
| `PageUp` / `PageDown`, `Home` / `End` | Viewport element            | Native scrolling. `End` reaches the true end because the spacer after the window has the remaining height.                                                |
| `Space` / `Enter`                     | Sort, checkbox, expand      | Phase-one behavior, unchanged.                                                                                                                            |

The library does not intercept any key for virtualization. Grid-style arrow
navigation is #319's scope.

**Focus visibility:** when focus moves to a control in a row partly hidden
under a sticky header, the browser's focus scroll may leave it covered.
Consumers who make the header sticky must set `scroll-padding-block-start` on
the viewport to the header height (documented with the sticky-header recipe).
The viewport does not change `scroll-padding` itself.

### Assistive technology expectations

- **Table navigation** (NVDA `Ctrl+Alt+Arrow`, JAWS table keys, VoiceOver
  `VO+Arrow` in tables) moves through mounted rows and announces positions
  from `aria-rowindex` / `aria-rowcount` ("row 1,042 of 10,001") where the
  browser and screen reader support them. Support differs between pairings,
  so the AT review records what each required pairing actually announces.
- **Browse / virtual cursor mode** reads the DOM, so it reaches only mounted
  rows. When the virtual cursor leaves the last mounted row it leaves the
  table. This is inherent to DOM virtualization. The docs must say so and
  recommend:
  - pagination (the default) for tables that screen-reader users read row by
    row;
  - filters and search so users can narrow a large set instead of reading it;
  - a visible, consumer-owned row-range summary outside the viewport (bind
    `virtualRange` and `rowCount`).
- **No live announcements on scroll.** The viewport never writes to a live
  region. Mounting and unmounting rows is silent.
- `aria-busy` on the table while `loading` is unchanged.

### Reduced motion

- The library never animates scrolling on its own. Window updates, scroll
  resets, and anchoring corrections are instant.
- `scrollToRow` and `scrollToOffset` with `behavior: 'smooth'` use `'auto'`
  when `matchMedia('(prefers-reduced-motion: reduce)')` matches at call time
  (guarded for SSR, same pattern as `use-ghost-interactive-surface.ts`).

## Rendering and customization

- New part: `data-part="viewport"` and class `ghost-data-table-viewport` on the
  viewport element. Functional inline styles only: `overflow: auto`,
  `overflow-anchor: none` (`GhostScrollArea` precedent for functional overflow
  styles). Block size is consumer CSS.
- Spacer rows: `GhostTableRow` keeps `data-part="row"`; spacer props add
  `data-virtual-spacer="true"` and an inline `block-size`. Style selectors
  for real rows should exclude `[data-virtual-spacer]` (for example zebra
  striping must not count spacers; use `:nth-child` only with care).
- Mounted data and detail rows carry `data-virtual-index` (the
  `displayIndex`). It is a styling and measurement hook, not a stable id.
- `data-selected`, `data-expanded`, `data-detail-row`, `data-sort`, and every
  other phase-one hook are unchanged.
- **Sticky header recipe (docs only):** `th { position: sticky; inset-block-start: 0 }`
  inside the viewport works because the viewport is the scroll container. The
  shipped sticky-header feature remains the separate deferred spec.

## Environment behavior

### SSR and hydration

- The server has no viewport size and no measurements. It renders rows
  `[0, min(initialRowCount, count))` plus one `'after'` spacer sized
  `(count - rendered) × rowHeight` (detail rows of expanded rows in the
  rendered range use `rowHeight` as their estimate). The scrollbar therefore
  has the right order of magnitude from first paint.
- The first client render produces the same output, so hydration has zero
  mismatches. Measurement, `ResizeObserver`, and the scroll listener start in
  `onMounted`; the first real window is applied in the next frame.
- `aria-rowcount` and `aria-rowindex` are pure functions of the row model and
  expansion state, so they match between server and client.
- Viewport ids come from `useGhostId` where an id is needed.

### Browser-only behavior and cleanup

- One passive `scroll` listener on the viewport element, one
  `ResizeObserver` for the viewport, and (measured mode or open detail rows)
  one `ResizeObserver` for mounted rows. All are removed on unmount. No
  `window` or `document` listeners.
- Environments without `ResizeObserver` fall back to measuring on scroll and
  on window change only (no live resize tracking).

### Mobile and touch

Native momentum scrolling; listeners are passive and never call
`preventDefault`. During very fast flings a frame may show spacer area before
rows mount; `overscan` controls the trade-off. No scroll hijacking.

### RTL and writing modes

Virtualization is vertical (block axis) only, so it does not depend on text
direction. Horizontal-tb writing mode is assumed; vertical writing modes are
not supported (dev warning when the viewport's computed `writing-mode` is
vertical).

## Performance

**Budgets (proposed; gates follow the parent spec's policy of informational
until CI variance is known, except the deterministic checks):**

| Scenario                                                          | Budget                                                                             | Kind          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| Mounted data rows, 400px viewport, `rowHeight: 40`, `overscan: 5` | `≤ 10 + 2 × 5 + 1` (visible + overscan + one pinned row), independent of row count | Deterministic |
| Scroll frame                                                      | Zero sort, filter, `sortFn`, `filterFn`, or accessor calls                         | Deterministic |
| Scroll frame                                                      | At most one window recompute per animation frame                                   | Deterministic |
| Cell contexts                                                     | Built only for mounted rows (see below)                                            | Deterministic |
| Window recompute, 100k rows, measured mode                        | p95 < 1ms                                                                          | Informational |
| Scroll-to-paint, 10k rows × 8 columns, mid-range CI runner        | p95 < 16ms                                                                         | Informational |
| First render, 10k local rows, `enablePagination: false`           | Within 2× the phase-one 25-row page render                                         | Informational |

**Implementation requirement on phase-one code:** `useDataTableSlotBindings`
builds `cellsByRowId` for every row of `getRowModel()` (O(rows × columns)
allocations per row-model change). With a viewport registered this must become
lazy (per mounted row, memoized by `rowId` per row model) so a 10k-row set does
not allocate 10k × columns contexts. `rows[].cells` keeps its type; it becomes
a cached getter. The existing counters in
`use-ghost-data-table.counters.test.ts` must still pass unchanged.

**Measurement approach:** extend `tests/bench/data-table-processing.bench.ts`
(run with `pnpm bench:data-table`) with window recompute at 10k and 100k rows
in both modes, and add a Playwright performance trace for scroll-to-paint on
the virtual example (informational, not in `pnpm verify`).

**Bundle:** `GhostDataTableViewport` gets its own `pnpm size` fixture. Tables
that do not import it must show no size change beyond the `virtualItems`
passthrough in the root bindings.

## Composition

- Reuses `GhostDataTable` (root bindings, context channel), `GhostTable*`
  parts, `useGhostId`, `mergeGhostTablePartAttrs`, and the reduced-motion
  `matchMedia` pattern.
- Follows the consumer-mounted-slice rules of
  [Command Palette](/specs/command-palette) (C9) and
  [Combobox](/specs/combobox) (`virtualized`): stable ids, behavior defined
  over mounted items only. Unlike those, DataTable owns the windowing because
  the table's ARIA positions and spacer rows must stay consistent with the
  root's row model, which consumers cannot see.
- Does **not** use `GhostScrollArea` as the scroll element: that component
  only becomes a tab stop when it has no inner focusables, while a virtualized
  table needs a stable scroll tab stop and a scroll-offset API. The viewport
  copies its functional overflow styling approach instead.
- The windowing math (prefix sums, range lookup, anchoring) lives in an
  internal, DataTable-agnostic module in `packages/vue/src`, not exported, so a
  later Tree or Combobox virtualizer can extract it without a second
  implementation ([performance standard](../standards/performance.md),
  ADR 0014 option E).

### Relationship to #319 (grid and treegrid navigation)

#319 will move focus by arrow keys between rows that may not be mounted. It
builds on this spec's hooks rather than adding its own:

- `scrollToRow(rowId)` mounts and reveals a row before focus moves to it.
- Focus pinning keeps the active row mounted.
- `aria-rowindex` / `aria-rowcount` are already required by `grid` and
  `treegrid` when rows are missing from the DOM.

Anything about roving `tabindex`, cell focus, or `role` changes belongs in
#319.

## Test plan

- **Unit (windowing module):** fixed-mode range at top, middle, bottom, and
  past the end; overscan normalization (`0`, `-3`, `2.7`, `NaN`); measured-mode
  prefix sums with mixed measured and estimated rows; anchoring delta when a
  row above the viewport grows and shrinks; cache keyed by `rowId` survives a
  sort; cache pruning on `data` change; pinned row splits spacers into
  `before` / `between` / `after` with sizes summing to the total.
- **Unit (bindings):** `aria-rowcount` and `aria-rowindex` values with zero,
  one, and several expanded rows before the window; empty set omits both;
  no viewport means no new attributes; `displayIndex` differs from `rowIndex`
  after sort; `virtualRange` matches mounted items.
- **Unit (state):** scroll reset on sort, filter, page, and page-size change;
  scroll kept on `data` refresh, selection, expansion, and `loading`; no
  `stateChange` and no v-model write from any scroll; server page change still
  emits exactly one `stateChange`.
- **Counters (`use-ghost-data-table.counters.test.ts`):** 100 simulated scroll
  frames trigger zero sort, filter, `sortFn`, `filterFn`, and accessor calls;
  cell contexts are created only for mounted rows.
- **Vue:** `GhostDataTableTable` and the preset render byte-identical output
  outside a viewport; inside one they render spacer rows with
  `aria-hidden="true"`; SSR render plus hydration with `initialRowCount` and
  `defaultExpandedRowIds` produce zero hydration mismatches; dev warnings for
  unbounded viewport, missing name, nested `containHorizontal`, and `rows`
  rendered instead of `virtualItems`; listener and observer cleanup on
  unmount.
- **Type:** `DataTableVirtualItem` narrows on `type`; `GhostDataTableTable`
  slot `value` typing is unchanged inside a viewport.
- **Playwright (`tests/e2e/ghost-data-table-virtual.spec.ts`), 10k-row
  example:**
  - `Tab` from the first row checkbox through 60 rows: each checkbox is
    `toBeFocused()`, the viewport scrolls, and the mounted row count stays
    within budget. Same with `Shift+Tab` upward.
  - Focus a row checkbox, scroll it far out of view with the mouse wheel and
    with `scrollToOffset`: the checkbox stays `toBeFocused()`, `Space` toggles
    it, and its row has the correct `aria-rowindex`.
  - Filter out the focused row: focus lands on the viewport, not `<body>`.
  - `Enter` on a sort button resets the scroll to the top and keeps focus on
    the button.
  - Expand a row at the bottom edge; collapse it from inside the detail row;
    focus returns to the expand button (phase-one rule).
  - `End` on the viewport reaches the last row; `Home` returns to the first.
  - `page.emulateMedia({ reducedMotion: 'reduce' })`: `scrollToRow` with
    `behavior: 'smooth'` lands in the same frame.
  - Zero `@axe-core/playwright` violations with the viewport scrolled to the
    top, middle, and bottom, with a detail row open, and with the empty state.
- **Manual AT (before `stable`):** NVDA + Firefox and VoiceOver + Safari per
  [assistive-technology-review.md](../standards/assistive-technology-review.md):
  table navigation announces `aria-rowindex` of `aria-rowcount`; browse mode
  behavior at the window edge is recorded as observed; no announcements while
  scrolling. JAWS + Chrome is recorded when available.
- **Bench:** window recompute at 10k and 100k rows, both modes
  (informational).

## Documentation plan

- New section "Large data sets" in `docs/components/data-table.md`: when to
  prefer pagination, the virtual example, the `table-layout: fixed`
  requirement, fixed versus measured rows, the sticky-header recipe with
  `scroll-padding-block-start`, and the screen-reader browse-mode limitation.
- Executable examples: `examples/data-table/virtual-ledger.vue` (10k local
  rows, `enablePagination: false`, fixed rows, selection) and
  `examples/data-table/virtual-server-page.vue` (server page of 1,000 rows,
  measured rows, expansion).
- Manifest for `GhostDataTableViewport` (generated by `pnpm manifests:write`)
  and API tables via `pnpm docs:api:write`.
- Link this spec from the parent spec's child-work table (follow-up, kept out
  of this change to avoid conflicting with the open #316 spec edit).

## Compatibility and release impact

- Additive only: a new component, new optional slot bindings, new optional
  attributes that appear only inside a viewport, and the opt-in
  `enablePagination` option (default keeps phase-one behavior).
- `GhostDataTableTable` and `GhostDataTablePreset` switch from `rows` to
  `virtualItems` internally; the output is identical outside a viewport, which
  the Vue tests assert.
- `rows[].cells` becoming a lazy getter keeps its type and values; code that
  spreads `rows` entries into new objects still works.
- Changeset (minor, `@ghostvue/vue`) when implementation ships. This
  specification is docs-only and needs none.

## Open architectural decisions for Zac (`0.3.0` sign-off)

Implementation must not begin until Zac approves this spec and resolves:

1. **Opt-in surface (V1).**
   - **Recommended:** `GhostDataTableViewport` child component plus
     `useGhostDataTableVirtualizer` for standalone layouts; preset gets a
     `virtualization` prop.
   - **Alternative:** a `virtualization` prop on `GhostDataTable` with a
     `viewportProps` slot binding the consumer spreads on their own element
     (no new component, but every renderer must render the scroll element).
2. **Pagination opt-out (V2).**
   - **Recommended:** add `enablePagination` (default `true`) so local tables
     can window the full filtered set.
   - **Alternative:** no new option; consumers set `pageSize` to the row count.
3. **`aria-rowcount` scope (V3).**
   - **Recommended:** relative to the windowed set (the current page), so the
     DOM table and its ARIA positions describe the same rows.
   - **Alternative:** query-wide with server `rowCount`, offsetting
     `aria-rowindex` by `(pageIndex - 1) × pageSize`.
4. **Scroll reset policy (V4).**
   - **Recommended:** reset to the top on sort, filter, and page changes; keep
     on refresh, selection, and expansion.
   - **Alternative:** keep the offset on sort and filter, or keep the first
     visible row id anchored when it survives the change.
5. **Measured mode in `0.3.0` (V5).**
   - **Recommended:** ship both modes; `'fixed'` stays the default.
   - **Alternative:** ship `'fixed'` only and add `'measured'` after AT and
     performance evidence.
6. **In-house windowing versus an adapter (V6).**
   - **Recommended:** in-house, internal module, no new dependency.
   - **Alternative:** an optional peer adapter for a third-party virtual core,
     which needs a dependency-policy review.
7. **Document scrolling (V7).**
   - **Recommended:** element viewport only in `0.3.0`.
   - **Alternative:** add a `scrollElement: 'window'` mode, which needs a
     different focus and anchoring model.
8. **Viewport tab stop (V8).**
   - **Recommended:** always `tabindex="0"`, matching the `GhostTable`
     scroll container.
   - **Alternative:** a tab stop only when the table has no focusable controls,
     matching `GhostScrollArea`; saves one `Tab` press but makes keyboard
     scrolling depend on table content.
