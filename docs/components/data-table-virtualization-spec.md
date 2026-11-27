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
  - question: 'GHO-251 (0.3.0 DataTable virtualization): Zac sign-off required on V1–V11 (opt-in surface, pagination opt-out, aria-rowcount scope, scroll reset policy, measured mode in 0.3.0, in-house windowing vs adapter, document scrolling, viewport tab stop, Tab traversal hint, probe limit and per-press mount bound, probe-result invalidation, and continuation freshness across a capped probe, reverse entry mechanism, positive tabindex inside the viewport) before any implementation.'
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
order, exactly as ADR 0014 requires. The one addition is
[Tab traversal across unmounted rows](#tab-traversal-across-unmounted-rows):
when the next control in `Tab` order is in a row that is not mounted, the
viewport mounts that row and moves focus to it, and `Shift+Tab` into the table
from the control after it enters at the last control in display order, so the
order stays the same as in a fully rendered table at any scroll position.

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
viewport is registered. Registration happens in the viewport's `setup`, which
runs after the root has already evaluated its own slot, so on the server
(which never re-renders the root) and in the first client render the root's
bindings still hold their no-viewport values. Anything rendered inside the
viewport therefore reads the windowed bindings from the
[viewport's own scoped slot](#ghostdatatableviewport-slots-and-exposed-members),
which is evaluated after registration; the root's copies are for content
outside the viewport, such as a row-range summary, and update after mount.

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

| Prop              | Type                                        | Default             | Contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowHeight`       | `number`                                    | required            | Data-row block size in CSS pixels. In `'fixed'` mode it is exact; in `'measured'` mode it is the estimate for rows not yet measured. Non-finite or `< 1` values fall back to `1` (dev warning).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `rowHeightMode`   | `'fixed' \| 'measured'`                     | `'fixed'`           | See [Row-height model](#row-height-model). Detail rows are always measured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `overscan`        | `number`                                    | `5`                 | Extra data rows mounted on **each** side of the visible range. Normalized like `maxMultiSortColCount`: `Math.floor`, then minimum `1` (focus continuity needs at least one row).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `initialRowCount` | `number`                                    | `20`                | Rows rendered before the viewport is measured: on the server and in the first client render. Same normalization, minimum `1`. See [SSR and hydration](#ssr-and-hydration).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `label`           | `string`                                    | inherits table name | Accessible name of the scroll region. Falls back to the root's `ariaLabelledby` (as `aria-labelledby`), then `ariaLabel`. Dev warning when no name resolves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `labelledby`      | `string`                                    | —                   | Id of a visible label for the region; wins over `label`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `rowHasTabbable`  | `(row: DataTableSlotRow<TData>) => boolean` | —                   | Hint for [Tab traversal](#tab-traversal-across-unmounted-rows): whether the row group (data row plus open detail row) renders at least one tabbable control (`tabindex` `0`, see [Terms](#tab-traversal-across-unmounted-rows)) **now**. Called fresh at every search for unmounted rows, and for rows a probe window of the current search mounted (to decide [coverage](#probe-results-and-freshness)), never for rows mounted throughout the press; may read reactive state outside `data` (permissions, flags); must be pure and cheap. When provided it is authoritative for unmounted rows and no probe results are cached beyond the [continuation](#probe-results-and-freshness), which covers only rows the hint answered `true` in that search that were then read empty ([covered rows](#probe-results-and-freshness)). When omitted, unmounted rows are probed by mounting them and empty results are cached (see [Probe results and freshness](#probe-results-and-freshness)). |
| `tabSearchLimit`  | `number`                                    | `200`               | Most **empty rows one `Tab` / `Shift+Tab` press (or one reverse entry) may inspect by probing**. Same normalization as `overscan`, minimum `1`. Every row the search reads with no tabbable control after the press opened its first probe window counts once (a **probed row**: the candidate, an overscan neighbour, or a row that was mounted when the key was pressed, whether a window kept or remounted it), whether the hint said `true` or there was no hint. Only rows read before the first probe window (still mounted from press start, read straight from the DOM) are exempt; rows the hint answers `false` (never mounted), mounted rows the search never reads, and the target do not count. It is not a cap on mounted rows; the separate [per-press mount bound](#probe-without-a-hint) is at most `tabSearchLimit` probe windows plus one settle scroll, so at most `(tabSearchLimit + 1) × (visible rows + 2 × overscan)` row mounts per press.                         |
| `footerRowCount`  | `number`                                    | `0`                 | Number of `<tr>` rows the consumer renders in `<tfoot>`. Used for `aria-rowcount` and the footer rows' `aria-rowindex` (see [Row count and row index](#row-count-and-row-index)), so it must be known before mount (SSR). Normalized with `Math.floor`, minimum `0`. Dev builds count the rendered `<tfoot>` rows after mount and warn on a mismatch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

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
- **Default slot props** (`GhostDataTableViewportSlotProps<TData>`):
  `virtualItems`, `virtualRange`, `headerRowProps`, `tableRootProps`,
  `getRowProps`, `getFooterRowProps`, and `isVirtualized` (always `true`),
  with the contracts in [Root slot binding additions](#root-slot-binding-additions).
  The viewport computes them after it has registered, so they are windowed
  from the first render on the server and on the client: rows
  `[0, min(initialRowCount, count))` plus the `'after'` spacer, and
  `tableRootProps` with `aria-rowcount` (see
  [SSR and hydration](#ssr-and-hydration)). This is the SSR-safe source for
  manual compositions; the root's copies are not (see
  [Opt-in surface](#opt-in-surface-proposed-see-v1)). `GhostDataTableTable`
  and the preset read the same values through the injected context, which
  they also evaluate inside the viewport, so they need no slot props.
- **Exposed** (template ref):

| Member                             | Signature                                                                                                                         | Contract                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`                          | `HTMLElement \| null`                                                                                                             | The scroll element after mount.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scrollToRow(rowId, opts?)`        | `(rowId: DataTableRowId, opts?: { align?: 'start' \| 'center' \| 'end' \| 'nearest'; behavior?: 'auto' \| 'smooth' }) => boolean` | Scrolls a row of the windowed set into view and mounts it. Returns `false` (no scroll) when the id is not in the set. `align` defaults to `'nearest'`, `behavior` to `'auto'`.                                                                                                                                                                                                                                                                     |
| `scrollToOffset(px, opts?)`        | `(offset: number, opts?: { behavior?: 'auto' \| 'smooth' }) => void`                                                              | Sets the body scroll offset, clamped to the scrollable range. For consumer scroll restoration.                                                                                                                                                                                                                                                                                                                                                     |
| `getScrollOffset()`                | `() => number`                                                                                                                    | Current body scroll offset in pixels (0 before mount).                                                                                                                                                                                                                                                                                                                                                                                             |
| `range`                            | `Readonly<Ref<DataTableVirtualRange>>`                                                                                            | Current mounted window (below).                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `invalidateTabbableCache(rowIds?)` | `(rowIds?: readonly DataTableRowId[]) => void`                                                                                    | Forgets cached probe results for the given rows, or for all rows when omitted, and drops a pending [continuation](#probe-results-and-freshness), exhausted or not, whatever ids are passed. Call it without `rowHasTabbable`, or with a hint that may answer `true` for an empty row, whenever a row starts or stops rendering a control for a reason other than a `data`, column-set, or expansion change. Never mounts, scrolls, or moves focus. |

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

/** Default slot props of `GhostDataTableViewport`, computed after registration. */
type GhostDataTableViewportSlotProps<TData> = Pick<
  GhostDataTableSlotProps<TData>,
  | 'virtualItems'
  | 'virtualRange'
  | 'headerRowProps'
  | 'tableRootProps'
  | 'getRowProps'
  | 'getFooterRowProps'
> & { isVirtualized: true }
```

`displayIndex` exists because phase-one `DataTableRow.rowIndex` is the index
in the consumer's `data` array (`use-ghost-data-table.ts` maps
`data.map((row, rowIndex) => …)`), not the sorted, filtered display position.
ARIA positions and scroll math use `displayIndex` only.

### Root slot binding additions

Additions to `GhostDataTableSlotProps<TData>`. When no viewport is registered
they have the values shown in the last column, so existing manual compositions
and renderers keep working without change.

| Binding                | Type                                          | Contract (viewport registered)                                                                                                                                      | No viewport                      |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `virtualItems`         | `DataTableVirtualItem<TData>[]`               | Mounted rows and spacer rows in DOM order. Render this instead of `rows` in the body.                                                                               | Every row of `rows`, no spacers  |
| `virtualRange`         | `DataTableVirtualRange`                       | Same as the viewport's `range`. Use it for consumer text such as "Rows 41–60 of 10,000".                                                                            | Whole set (`start: 0`, `end: n`) |
| `headerRowProps`       | `{ 'aria-rowindex'?: number }`                | `aria-rowindex: 1` for the single header row. Bind it on the `<thead>` row.                                                                                         | `{}`                             |
| `isVirtualized`        | `boolean`                                     | `true`.                                                                                                                                                             | `false`                          |
| `tableRootProps`       | existing; adds `'aria-rowcount'?: number`     | Adds `aria-rowcount` (see [Row count and row index](#row-count-and-row-index)).                                                                                     | unchanged                        |
| `getRowProps(rowId)`   | existing; adds two attributes                 | Adds `aria-rowindex` and `data-virtual-index` (the `displayIndex`).                                                                                                 | unchanged                        |
| `row.detailRowProps`   | existing; adds two attributes                 | Adds `aria-rowindex` and `data-virtual-index` (parent row's `displayIndex`).                                                                                        | unchanged                        |
| `getFooterRowProps(k)` | `(k: number) => { 'aria-rowindex'?: number }` | `aria-rowindex` of the _k_-th footer row (0-based), after the last logical body row. `{}` when _k_ is outside `[0, footerRowCount)`. Bind it on each `<tfoot>` row. | `{}`                             |

**Root versus viewport bindings:** on the client, the root's bindings switch
to the values in the middle column once the viewport has registered and the
root re-renders. On the server and in the first client render they still have
the no-viewport values, because the root's slot runs before the viewport's
`setup`. Inside a viewport, bind the viewport's slot props instead (same names
and contracts); a manual composition that destructures `virtualItems` or
`tableRootProps` from the root's slot would render every row, without
`aria-rowcount`, on the server (on the client, the existing dev warning for
mounted rows beyond the window fires). Root bindings outside the viewport (for example
`virtualRange` in a "Rows 41–60 of 10,000" summary) are server-rendered with
the no-viewport values and update after mount; they cause no hydration
mismatch because the first client render matches the server.

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
  `headerRowProps` is empty). It renders no `<tfoot>`, so it needs no
  `footerRowCount`; tables with a footer use a manual composition.
- **`GhostDataTablePreset`** gains `virtualization?: GhostDataTablePresetVirtualization`
  (`{ rowHeight; rowHeightMode?; overscan?; initialRowCount?; label?; rowHasTabbable?; tabSearchLimit?; viewportAttrs? }`,
  where `viewportAttrs?: Pick<HTMLAttributes, 'class' | 'style'>` (Vue's `HTMLAttributes`);
  no `footerRowCount`, because the preset renders no `<tfoot>`). When
  set, the preset wraps only its `GhostTable` in a `GhostDataTableViewport`,
  which renders the focus catcher itself (toolbar and search stay outside).
  The preset forwards the viewport's `invalidateTabbableCache` on its own
  template ref.
  Consumer `class`/`style` for the viewport go through the typed
  `virtualization.viewportAttrs` field, so the block size the viewport
  requires can be set without a manual composition and without an
  excess-property error. The preset merges them with the viewport's own
  `class` and functional inline styles (it never overwrites them). It accepts
  only `class` and `style`; the viewport's role, name, `tabindex`, and
  listeners are not consumer-overridable through it.
- **Manual composition** wraps its own `GhostTable` in the viewport and renders
  `virtualItems` from the viewport's scoped slot (example below), not from the
  root's slot. A composition that renders a `GhostTableFoot` passes
  `footerRowCount` to the viewport and binds `getFooterRowProps(k)` from the
  same slot on each footer row.

```vue
<GhostDataTableViewport
  v-slot="{ virtualItems, headerRowProps, tableRootProps, getRowProps }"
  :row-height="40"
  style="block-size: 30rem"
>
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
`{ viewportProps, focusCatcherProps, setViewportElement, virtualItems,
virtualRange, getRowVirtualProps(rowId), headerRowProps, rowCountProps,
getFooterRowProps(k), scrollToRow, scrollToOffset, getScrollOffset, invalidateTabbableCache }`. `GhostDataTableViewport` is a thin
component over this composable, so both paths share one implementation. As
with the interaction helpers, focus pinning (below) is installed by the
component; standalone layouts get it by binding `viewportProps`, which carries
the `focusin`/`focusout` listeners and the `keydown` listener for
[Tab traversal](#tab-traversal-across-unmounted-rows), and by rendering
`<span v-bind="focusCatcherProps" />` as the scroll element's last child, after
the table ([reverse entry](#reverse-entry-from-after-the-table)). Dev builds
warn when the catcher is missing or is not the last child. The composable
options accept `rowHasTabbable`, `tabSearchLimit`, and `footerRowCount`.

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
  the same tick, not on the next scroll frame). This keeps the common case
  (every row has a control, such as a selection checkbox) on native `Tab`
  order when the browser's focus-into-view scroll has not yet produced a
  scroll event. It guarantees only the adjacent rows. When the next control
  is further away (a run of rows without controls that reaches past the
  mounted window), the
  [Tab traversal](#tab-traversal-across-unmounted-rows) rule below applies.

### Tab traversal across unmounted rows

**Guarantee:** with a viewport registered, sequential focus navigation visits
the stops of the table in display order, the same order a fully rendered table
would have. This covers `Tab` and `Shift+Tab` pressed inside the viewport and
both entries from outside it: `Tab` from the control before the table and
`Shift+Tab` from the control after it, at any scroll position. Focus never
skips a control, never lands on a control further into the table than the
first one in the key's direction, and never leaves the table while a stop in
that direction is left. This holds for runs of rows without controls of any
length, including runs longer than `overscan` and longer than the viewport.
The stops it covers are the elements that are tabbable per
[Terms](#tab-traversal-across-unmounted-rows), which requires an effective
`tabindex` of `0`. Positive `tabindex` inside the viewport is unsupported
([Positive `tabindex`](#positive-tabindex)); such elements are not stops and
the guarantee says nothing about when native order visits them.
With an accurate `rowHasTabbable` hint, every key press moves focus exactly
once. Whenever the viewport cancels a press, it moves focus itself, including
to a target that a probe mounted as an overscan neighbour, so a cancelled
press never strands focus while a target is reachable. Without one, crossing a long run can take extra key presses (see
[Probe without a hint](#probe-without-a-hint)), and leaving the table forward
after a probe that reached the end of the rows takes one more press when that
press's rescan finds no new candidate, and otherwise a bounded number of
further presses ([End of search](#end-of-search)). The order guarantee still holds,
with three exceptions, each needing a change the viewport cannot observe or
an entry with nowhere to return to:

- the reverse-entry case stated in
  [Reverse entry](#reverse-entry-from-after-the-table);
- without a hint, a row whose controls changed for a reason the viewport
  cannot see while its cached empty result was not invalidated;
- with an unsure or wrong hint, or without one, a row that is covered by a
  pending
  [continuation](#probe-results-and-freshness), and that gains a control
  before the next press of that chain without any invalidation trigger
  firing. Focus can pass it at most once: the press that ends the chain moves
  focus past it or out of the table and consumes the continuation, so every
  later search reads the row fresh (with a hint) or from the known-empty set
  (without one). With a hint, a row is covered only when the search that
  covered it called the hint for it and got `true`
  ([covered rows](#probe-results-and-freshness)). A row the hint answered
  `false`, a row no probe has mounted, and a row that stayed mounted
  throughout the press that read it empty (its hint never called) are never
  covered, so this exception never applies to them: the next press asks the
  hint again whenever such a row is unmounted.

See [Probe results and freshness](#probe-results-and-freshness) for all three
freshness rules.

**Display order.** The viewport element wraps the whole `<table>`. The header
is inside the viewport and scrolls with the body unless the consumer makes it
sticky (the [sticky-header recipe](#rendering-and-customization) keeps it
inside the viewport). The stops, in display order, are:

1. the viewport element (always a tab stop, see V8);
2. the tabbable controls of the **leading region**: everything inside the
   `<table>` before the first body row (`<caption>` and `<thead>`, including
   sort buttons and the select-all checkbox);
3. the tabbable controls of each row group, by `displayIndex`;
4. the tabbable controls of the **trailing region**: everything inside the
   `<table>` after the last body row (`<tfoot>`, when rendered).

The leading and trailing regions are never virtualized, so they are always
mounted. DOM order inside the viewport equals display order for every mounted
element. The [trailing focus catcher](#reverse-entry-from-after-the-table) is
not a stop.

**Terms.** A row group is a data row plus its open detail row. A control is
_tabbable_ when it matches the phase-one tabbable query (focusable, not
`disabled`, not `inert`, not hidden) **and its effective `tabIndex` is
exactly `0`** (a native control without a `tabindex` attribute, or an explicit
`tabindex="0"`). Negative and positive values are both excluded; positive
values are unsupported inside the viewport (see
[Positive `tabindex`](#positive-tabindex)). "In display order" always means
this set in DOM order, which equals display order inside the viewport. Whether
row group _r_ is tabbable is decided as follows:

- mounted: read from the DOM;
- unmounted, `rowHasTabbable` provided: its return value for _r_, called at
  search time (the known-empty set is not used in this mode);
- unmounted, no hint, in the known-empty set: no;
- unmounted, no hint, otherwise: assumed yes (unknown until probed).

A search resumed from a [continuation](#probe-results-and-freshness) uses one
more source, checked before the hint: an unmounted row in the continuation's
**covered set** is not tabbable. Only
[covered rows](#probe-results-and-freshness) are in it: with a hint, probed
rows for which the covering search called the hint and got `true`; without
one, every probed row. Every other unmounted row in the span, including rows
the hint answered `false` and probed rows that stayed mounted throughout the
press that read them (no hint call), is decided by the list above again, so
the hint is called fresh for it, and a covered
row that is mounted is read from the DOM like any other mounted row.

<a id="positive-tabindex"></a>

**Positive `tabindex`.** Native sequential navigation visits every element with
a positive `tabindex` before all elements with `tabindex` `0` in the document.
A mounted row control with `tabindex="1"` would therefore come before the
viewport element in native order, and would drop out of that position when its
row is virtualized out, so no display order can hold for it at every scroll
position. Positive `tabindex` is **unsupported** for any element inside the
viewport (leading region, row groups, trailing region):

- Such elements are not stops. Step 1, the target search, the reverse-entry
  redirect, and the hint contract ignore them: a row group whose only control
  has a positive `tabindex` is not tabbable, and `rowHasTabbable` should
  answer `false` for it.
- For presses inside the table this matches native behaviour: from a
  `tabindex="0"` stop, native `Tab` and `Shift+Tab` move to the next or
  previous `tabindex="0"` element in DOM order and never to a positive one
  (positive elements come before the whole zero sequence, so they are reached
  only past its start, which is never inside the viewport). What cannot be made
  to match is entry into that sequence: whether a positive element is visited
  depends on whether its row is mounted. The guarantee does not cover it, in
  either entry direction.
- Dev builds warn once per viewport, naming the element, when a mounted row
  group, the leading region, or the trailing region contains an element whose
  `tabIndex` is greater than `0`. Row groups are checked when they mount (each
  window change); the leading and trailing regions after mount and when they
  re-render. The viewport never rewrites a consumer's `tabindex`.
- Positive `tabindex` outside the viewport is out of scope: it changes where
  the page's zero sequence starts, not the order inside or into the table.
  "The control before (or after) the table" means the neighbouring
  `tabindex="0"` stop in DOM order.

The alternative of supporting positive values is
[V11](#open-architectural-decisions-for-zac-0-3-0-sign-off).

**Mechanism inside the viewport.** The viewport has one `keydown` listener on
its element (no document listener). It reacts only to `Tab` and `Shift+Tab`
without `Alt`, `Ctrl`, or `Meta`, when the event target is the viewport
element, a control in the leading or trailing region, or a control in a body
row group, and `defaultPrevented` is false (so widgets in cells that own `Tab`
keep it). On such a key press:

1. **Same region.** If the focused row group, leading region, or trailing
   region has another tabbable control in the key's direction, do nothing.
   Native `Tab` moves to it.
2. **Start position.**
   - `Tab` from the viewport element: if the leading region has a tabbable
     control, do nothing. Native `Tab` reaches its first control, which comes
     before every body row in display order, so a body row is never focused
     ahead of a mounted sort button. Otherwise search forward from `0`.
   - `Tab` from the last control of the leading region: search forward from
     `0`.
   - `Tab` from row group _i_: search forward from `i + 1`.
   - `Shift+Tab` from row group _i_: search backward from `i - 1`.
   - `Shift+Tab` from the first control of the trailing region: search
     backward from `count - 1`.
   - `Tab` from the trailing region, and `Shift+Tab` from the leading region
     or the viewport element: do nothing. No body row lies in that direction,
     so native order (to the next control after the viewport, the previous
     leading control, the viewport element, or the control before the table)
     is already correct.
3. **Find the target** _j_: the first row group from the start position, in
   the key's direction, that is tabbable per the terms above. This is a
   synchronous scan over row ids and, for unmounted rows, the hint. It mounts
   nothing.
4. **No target:** do nothing. No body row in that direction has a control, so
   native order is the correct next stop. Forward: the first trailing-region
   control, or else the first tabbable after the viewport, such as a pager
   (the focus catcher is not tabbable while focus is inside the viewport).
   Backward: the last leading-region control, or else the viewport element.
5. **Mounted target:** if the press has not been cancelled yet, do nothing.
   DOM order equals display order and every row group between the focused
   stop and _j_ is either unmounted or has no control, so native `Tab` lands
   on _j_'s first (forward) or last (backward) tabbable control. Once step 6
   has cancelled the press, this step never applies; see the rule after
   step 6.
6. **Unmounted target:** call `preventDefault()`, mount _j_ as
   `scrollToRow(j, { align: 'nearest', behavior: 'auto' })` would (the focused
   row stays pinned meanwhile), and after that render move focus with
   `focus({ preventScroll: true })` to _j_'s first tabbable control (forward)
   or last (backward). If the mounted row group has no tabbable control, the
   search repeats from _j_ in the same direction (the probe). Without a hint,
   _j_ joins the known-empty set. With a hint (a wrong or unsure `true`), _j_
   is skipped for the rest of this search, and nothing about it outlives the
   search except the continuation. A probe that stops at
   `tabSearchLimit` or reaches the end of the windowed set without a target
   follows [End of search](#end-of-search). Each such mount is one **probe
   window**, counted toward the [per-press mount bound](#probe-without-a-hint).

**A cancelled press is finished explicitly.** After step 6 calls
`preventDefault()`, the browser will not move focus for that press, so every
later outcome of the same search is carried out by the viewport, never left to
native order. When the repeated search finds a target _j_ that is already
mounted (because a probe window mounted it as an overscan neighbour, because it
is in the pinned or visible window, or because any other render mounted it),
the viewport focuses _j_'s first (forward) or last (backward) tabbable control
with `focus({ preventScroll: true })` after the current render and reveals the
row with `align: 'nearest'`, exactly as for an unmounted target. That reveal is
the press's one **settle scroll** (it may mount rows beyond the probe window,
counted in the [per-press mount bound](#probe-without-a-hint)); it starts no
further probe. Likewise, a cancelled search that ends without a target
follows [End of search](#end-of-search) (focus the trailing or leading
control or the viewport element, or keep focus on the origin), never step 4's
native order. So a cancelled press either moves focus exactly once or, at a
limit or an exhausted end, keeps it on the origin by rule; it never leaves focus
at the origin while a target was reachable. The reverse-entry redirect always
focuses explicitly, so this rule already holds there.

`Tab` / `Shift+Tab` presses that arrive while a step 6 search or a reverse
entry is pending are prevented and dropped, so one press moves focus at most
once. A pending search is cancelled when focus moves by other means (pointer,
script), the row model changes, or the viewport unmounts. A cancelled search
leaves focus where it is, except that focus is never left on the focus
catcher: a cancelled reverse entry moves it to the viewport element.

#### Forward entry from before the table

The viewport element is always a tab stop (V8) and is the first tabbable
element in the viewport's DOM, so `Tab` from the control before the table
always lands on the viewport element natively, whatever the scroll position
and whichever rows are mounted. The next `Tab` follows step 2: the first
leading-region control (for example the first sort button), or row 0's first
control when the leading region has none (mounted by step 6 when the viewport
is scrolled away from the top). No leading catcher is needed. If V8's
alternative is chosen (a tab stop only when the table has no controls), a
leading catcher that mirrors the trailing one below is required, and the
alternative must say so.

#### Reverse entry from after the table

`Shift+Tab` from the control after the table (for example a pager button)
never reaches the viewport's `keydown` listener, because the event target is
outside the viewport. Natively it would land on the last tabbable element in
the viewport's DOM, which, while the viewport is scrolled away from the end, is
a control in a mounted row in the middle of the table. The **trailing focus
catcher** makes this entry follow display order:

- **Element:** `<span data-part="focus-catcher">`, rendered as the viewport
  element's last child, after the `<table>` (outside the table, so it is not a
  row, has no `aria-rowindex`, and is not in `aria-rowcount`). It has no
  content, role, or name, and it is **not** `aria-hidden`: it is tabbable
  while focus is outside the viewport, and a tabbable element hidden from the
  accessibility tree fails `axe-core`'s `aria-hidden-focus` rule and would make
  a reverse entry briefly focus an element that assistive technology cannot
  see. An empty generic element with no name is skipped by browse mode, so
  leaving it exposed adds nothing to the reading order. It also gets no
  `role="none"` or `role="presentation"`, which a focusable element ignores
  (`presentation-role-conflict`). Functional inline styles: zero inline and
  block size, `overflow: hidden`, `pointer-events: none`.
- **Tab index:** `0` only while focus is outside the viewport; `-1` while
  focus is anywhere inside it. The existing viewport `focusin` listener sets
  `-1`; the `focusout` listener sets `0` when the new focus target
  (`relatedTarget`) is not inside the viewport. So `Tab` and `Shift+Tab`
  inside the table never stop on it, and `Tab` out of the table skips it. The
  server render and the first client render use `-1`, so there is no stop
  before the handler exists.
- **How it is reached:** while focus is outside, the catcher is the last
  tabbable element in the viewport's DOM, so only backward sequential
  navigation from after the viewport reaches it: `Shift+Tab` from the next
  control, or from browser UI when the table is last on the page. Pointers
  cannot focus it (zero size, `pointer-events: none`). Forward navigation from
  before the table reaches the viewport element first. Focusing it from
  consumer script is unsupported.
- **Redirect:** the viewport's `focusin` listener (no extra listener) treats
  focus on the catcher as a reverse entry and moves focus to the last stop in
  display order:
  1. the last tabbable control of the trailing region, if any;
  2. else the backward search of steps 3, 5, and 6 from `count - 1` (hint,
     known-empty set, and probe apply), focusing _j_'s last tabbable control;
  3. else the last tabbable control of the leading region;
  4. else the viewport element (no stop in the table has a control).

  A mounted target is focused synchronously inside the `focusin` handler with
  `focus({ preventScroll: true })`, and its row is then revealed with
  `align: 'nearest'`. An unmounted target is mounted first; focus stays on
  the catcher only until that render (one flush, before paint) and then moves.
  The catcher is a transient redirect target, never a resting focus stop: no
  key press is handled while it holds focus (presses are dropped as above),
  and it never keeps focus after the redirect resolves or is cancelled.
  Because it is in flow at the end of the scroll content, the browser's
  native focus scroll moves toward the end of the body, where the target
  usually is.

- **Probe limit during reverse entry** (no hint, or a wrong one, and more than
  `tabSearchLimit` trailing rows without a control): the same rule as a probe
  from a control applies. Focus returns to the control the key was pressed on
  (the catcher's `relatedTarget`, when it is still connected and tabbable),
  and the viewport returns to its scroll offset before the entry. The probed
  rows are now known-empty (without a hint) and covered by a continuation
  keyed to that control (both modes), so the next `Shift+Tab` from that
  control continues past them. A reverse-entry probe that reaches row `0`
  without a target never needs another press: the redirect goes on to steps 3
  and 4 above (the last leading-region control, else the viewport element),
  which are mounted. When `relatedTarget` is `null` or no longer tabbable
  (entry from browser UI, or the control was removed), focus moves to the
  viewport element instead, and the next `Shift+Tab` leaves the table. This
  is the one case where a press can skip controls. It needs all of: no
  accurate hint, a trailing run longer than `tabSearchLimit`, and an entry
  that has no previous control to return to. The dev warning below covers it.

**Known-empty set.** Without a hint, the ids of
[probed rows](#probe-without-a-hint) (read without a tabbable control after a
probe window opened), so later searches skip them. Its lifetime and
invalidation are defined in
[Probe results and freshness](#probe-results-and-freshness).

**Scroll behaviour.** Traversal and reverse entry scroll only to reveal an
unmounted target (step 6, redirect step 2) or to undo a failed probe,
instantly (never smooth, so reduced motion needs no special case), with
`align: 'nearest'`, so the target row ends just inside the viewport edge in
the key's direction. `scroll-padding-block-start` from the sticky-header
recipe applies. In steps 1–5 the browser's native focus scroll applies.

**Hint contract.** `rowHasTabbable(row)` receives the slot row
(`row.isExpanded` tells it whether the detail row counts) and returns a
`boolean`: whether the row group renders a control that is tabbable per
[Terms](#tab-traversal-across-unmounted-rows) (`tabindex` `0`; a control with
a positive `tabindex` does not count). It answers for the row's current state: the viewport calls it at
search time for every unmounted row the search reaches, on every press and
entry, and never caches its answer, so it may read reactive state outside
`data` (permissions, feature flags, a store) without the viewport watching
that state. A wrong `true` costs one probe step in each search that reaches
the row. A wrong `false` skips that row's controls while the row is
unmounted; that is a consumer bug, and dev builds warn when such a row mounts
with a tabbable control. Return `true` when unsure. An unsure `true` keeps the
order guarantee, but the hint then cannot tell the viewport that a row a probe
just found empty has gained a control, so freshness of the rows a capped
probe covered rests on the
[continuation's triggers](#probe-results-and-freshness), not on the hint.
Rows the hint answered `false`, and rows whose hint the covering search never
called, are never covered: a resumed search asks the hint about them again
whenever they are unmounted.

**Work per key press.** Steps 1–5: constant DOM work plus a scan over at most
`count` row ids and hint calls (the hint must be cheap). Step 6 or a reverse
entry with an accurate hint: one probe window (the target's) and one `focus()`
call, no settle scroll. Without an accurate hint, or with wrong `true` answers:
at most `tabSearchLimit` empty rows inspected, at most `tabSearchLimit` probe
windows, and at most one settle scroll, so at most
`(tabSearchLimit + 1) × (visible rows + 2 × overscan)` row mounts (see
[Probe without a hint](#probe-without-a-hint)). A resumed search rescans the span
from its start position without re-mounting covered rows: an O(1) set lookup
per covered row, one hint call per other unmounted row (no mount, and not
counted toward `tabSearchLimit`), and a DOM read for mounted rows, so the scan
stays O(`count`) like steps 1–5. An exhausted continuation mounts nothing and
calls `focus()` on nothing unless an uncovered unmounted row is a candidate
again (its hint now answers `true`, or, without a hint, it is neither covered
nor known-empty), which includes a retained or other
[DOM-read row](#end-of-search) of the earlier probe: the press then probes it
as a fresh search would.
Otherwise the press falls through to native order. Reaching the end of the rows
adds at most one `focus()` call (on a trailing or leading control, or the
viewport element) and one scroll back.
No sort, filter, or accessor calls in any case.

**Server mode and unloaded rows.** The search and the reverse entry cover the
windowed set only: the rows of the loaded `data` page. They never trigger a
fetch and never change the page. The last loaded row is the end of the data
for traversal, so `Tab` past it continues natively to controls after the
viewport (for example the pager), and `Shift+Tab` from the pager enters at the
last loaded row's last control. Sparse placeholder rows are a non-goal, so
there are no unloaded indices inside the set. While `loading` is true the
search runs over the current rows; a `data` change cancels a pending search or
reverse entry and drops any continuation, exhausted or not, so the first press
after a new page arrives searches that page fresh. The end of the loaded page
is the end of the set for [End of search](#end-of-search): a probe that reaches
it records an exhausted continuation, and the next `Tab` reaches the pager
natively when its rescan finds no new candidate (otherwise it probes that
candidate first, with the same bound).

#### Probe without a hint

The same rules apply whether there is no hint or a hint that answered `true`
(wrong or unsure) for the probed rows. Each probe step mounts one **probe
window** around an unmounted candidate row, as
`scrollToRow(candidate, { align: 'nearest' })` would, and reads the DOM. Two
separate quantities are bounded per key press (or reverse entry):

- **Empty rows inspected (`tabSearchLimit`).** Once the press has opened its
  first probe window, the counter advances once for every row the search then
  reads with no tabbable control, whatever mounted it: the window's candidate,
  an overscan neighbour, a row that was mounted when the key was pressed and
  that the window kept, or such a row that an earlier window of the press
  unmounted and a later one remounted. These are the press's **probed rows**.
  With a hint, the search also calls it for each probed row that has not
  stayed mounted continuously since the key was pressed (a candidate is asked
  before its window opens; a neighbour a window mounted, or a row a window
  remounted, just before it is read). A row that stayed mounted throughout is
  read from the DOM without a hint call. The answer never changes the count
  or overrides the DOM (a row read with a control is the target, and a
  `false` answer for it logs the wrong-`false` dev warning); it only decides
  whether the row is [covered](#probe-results-and-freshness). A `false`
  answer exempts only a row the search skips while it is unmounted: that row
  is never mounted or read, so it does not count. A row that a probe window
  mounts incidentally (an overscan neighbour) or that stayed mounted is read
  from the DOM, and if it reads empty it counts whatever the hint answers
  for it.
  Only the rows the search reads before its first probe window are exempt:
  they were mounted when the key was pressed, nothing has moved the window
  yet, and reading them is the constant-cost DOM work of steps 1–5. The
  search stops as soon as the counter equals `tabSearchLimit`, without reading
  further mounted rows. Unmounted rows the hint answered `false` (skipped
  without mounting), mounted rows the search never read, and the target do
  not count. So a probe window can never
  open for a candidate the search has already passed, and a candidate that
  was mounted at press start but must be remounted always counts: the
  exemption ends with the first window, before any window can unmount it.
- **Window mounts.** At most `tabSearchLimit` probe windows, then at most one
  **settle scroll**: revealing a target that is already mounted (the
  cancelled-press rule), scrolling back to the origin
  ([End of search](#end-of-search) at the limit, or forward without a trailing
  control), or restoring the scroll offset after a capped reverse entry. A
  target that was the last probe window's candidate is already revealed by
  that window and needs no settle scroll. The window bound follows from the
  counter: every probe window except the last has an empty candidate, read
  after the first window opened, so it counts, and the search stops when the
  count reaches `tabSearchLimit`.
- **Total mounting.** Each window holds at most `visible rows + 2 × overscan`
  rows (the rows intersecting the viewport at that offset plus overscan on
  each side, the mounted-row budget in [Performance](#performance) without the
  pinned row). Each window replaces the previous one (only the origin stays
  pinned), so at any moment the mounted rows stay within that budget, and the
  row mounts during one press (a row that unmounts and mounts again counts
  each time) are at most
  `(tabSearchLimit + 1) × (visible rows + 2 × overscan)`. With
  `tabSearchLimit: 1`, a press can mount one whole window and one settle
  scroll's worth of rows while inspecting a single empty row; that is
  intended and within the bound.

The viewport mounts rows for a search only through probe windows and the
settle scroll.

#### End of search

A probe stops without a target in one of two ways. In both, every probed row
is now in the known-empty set (without a hint), and in both modes the search
records a [continuation](#probe-results-and-freshness) keyed to the focus
origin (the control the key was pressed on, or for a reverse entry the
catcher's `relatedTarget`) and the key's direction. A dev warning (once per
viewport) names `rowHasTabbable` as the fix, or an accurate answer instead of
`true` when a hint is already provided.

- **Limit reached** (the press inspected `tabSearchLimit` empty rows): focus
  stays on the origin (it never leaves the table early and never drops to
  `<body>`), and the viewport scrolls back to it with `align: 'nearest'`. The
  continuation covers this press's probed rows. The next press of the
  same key from the same origin rescans from the same start position: it
  passes covered rows without mounting them, asks the hint again about every
  other row, and probes only rows that are neither covered nor answered
  `false`, so it reaches rows past the last covered one. For a reverse entry,
  see
  [Reverse entry](#reverse-entry-from-after-the-table).
- **End reached** (the probe passed the last row in the key's direction). The
  correct next stop is outside the body, so the viewport goes to it directly
  when it is inside the viewport, and otherwise records the end:
  - **Forward, trailing region has a tabbable control:** focus moves to its
    first one, in the same press. No continuation is needed.
  - **Forward, no trailing-region control:** the next stop is after the
    viewport, which the viewport does not look for (no document query). Focus
    stays on the origin and the viewport scrolls back to it, as at the limit,
    and the continuation is recorded as **exhausted**. Every row from the
    start position to the end is then in one of three groups: covered,
    answered `false` while unmounted, or read empty from the DOM without
    being covered. The third group are the probe's **DOM-read rows**: with a
    hint, its **retained rows** (probed rows that stayed mounted throughout
    the press, read empty, hint never called), and in both modes, rows read
    before the first probe window. They keep a fresh hint (no probe result
    suppresses a later hint call for them, see
    [Probe results and freshness](#probe-results-and-freshness)), so a
    settle scroll that unmounts one makes it a candidate again when its hint
    answers `true` (without a hint, when it is not known-empty). The next
    `Tab` from the same origin rescans the span without mounting a covered
    row:
    - **Exit.** If the rescan finds no candidate (no uncovered unmounted
      row's hint now answers `true`, and, without a hint, every uncovered
      unmounted row is known-empty), in particular no retained or other
      DOM-read row that is now unmounted and answers `true`, it finds no
      target (step 4) and native order leaves the table, with zero probe
      windows. That press never
      re-probes, so it exits with an unsure hint, a wrong hint, or no hint.
    - **Retry.** Otherwise the first such candidate is evaluated under
      step 6, as in a fresh or resumed search: the press is cancelled and a
      probe window mounts it. If it has a control, it is the target. If it
      reads empty (with no change between presses it is always a DOM-read
      row), it is probed (counted toward `tabSearchLimit`) and covered, and
      the same search continues from it in the same direction: a row the
      window mounted (focused by the
      [cancelled-press rule](#tab-traversal-across-unmounted-rows)) or any
      later row with a control is the target and is focused in the same
      press. Only when that search hits `tabSearchLimit`, or reaches the end
      without a target and without a trailing-region control, does focus
      stay on the origin with a new continuation whose covered set is the
      union, exactly as a resumed capped press does; at the end with a
      trailing-region control, focus moves to it in the same press.

    The retries are bounded. With no change to `data`, permissions, or other
    row state and no user scroll between presses, every hint answer stays
    the same, so a retry's candidate is always a DOM-read row of the
    exhausted probe (with a hint, one whose hint answers `true`): every other
    row of the span is covered or answers `false` again (without a hint, is
    known-empty). Each retry opens a window for at least one of them and
    covers it, covered rows accumulate, and a covered row is never a
    candidate again. A DOM-read row was mounted when that probe's key was
    pressed (every empty row the search mounts or remounts is covered,
    or, with a hint, answered `false`), so there are at most
    `visible rows + 2 × overscan` of them, and the forward exit takes at most
    that many retries plus the exit press. Every retry that keeps focus on the
    origin is such a press: a retry whose continued search finds a target
    moves focus and ends the chain, which is only possible after a change. A
    change between presses that turns a row into a target, whether the retry
    candidate itself, a row its probe window mounts, or a later row, makes
    that retry focus it, as a fresh search would.

  - **Backward** (in-table `Shift+Tab`, or a reverse entry): focus moves in the
    same press to the last leading-region control, else the viewport element.
    Both are mounted, so backward traversal never needs an extra press to
    leave a fully probed gap; from there `Shift+Tab` follows step 2 (nothing
    to search) and native order continues.

So without an accurate hint, crossing a run of control-less rows longer than
the mounted window costs one extra press per `tabSearchLimit` empty rows
inspected, and
leaving the table forward past a fully probed trailing run with no
trailing-region control costs one extra press when no DOM-read row of that
probe (a retained row or a row read before its first window) becomes a
candidate again, and, with no change between presses, at most one more press
per such row otherwise. A press after an exhausted probe never re-probes a
covered row; with no change between presses, it probes only DOM-read rows that
a settle scroll unmounted. Apart from the three exceptions in the
[guarantee](#tab-traversal-across-unmounted-rows), focus order is never
wrong.

#### Probe results and freshness

Whether a row renders a control can change while the row is unmounted, without
any change to `data`, the column set, or expansion: a reactive permission, a
feature flag, per-row state kept in a store, or slot content toggled by other
consumer state. The rules below say which source wins.

- **With `rowHasTabbable`: the hint is authoritative and fresh for its
  answers.** For unmounted rows the hint's current answer is the only source.
  There is no known-empty set in this mode: a row the hint answers `false`, or
  answers `true` and that has a control, is always evaluated fresh, so a row
  that gains a control while unmounted is reached as soon as the hint returns
  `true` for it, with no invalidation. The one probe result that outlives a
  search is the continuation below, which covers only rows for which the
  covering search itself called the hint, got `true`, and then read the row
  empty. A retained row (mounted throughout the press, read empty, hint never
  called) counts toward `tabSearchLimit` but never suppresses a later hint
  call. (When the `rowHasTabbable` prop
  changes from absent to provided, the set is cleared and stops being used.)
- **Continuation (both modes).** When a probe stops without a target
  ([End of search](#end-of-search)), it records a continuation: the focus
  origin, the key direction, the start position, and the **covered set**: the
  ids of this search's **covered rows**. With a hint, a covered row is a
  [probed row](#probe-without-a-hint) for which this search called the hint
  and got `true`; without a hint, every probed row is covered (freshness there
  rests on the known-empty set's triggers anyway). Rows the hint answered
  `false`, rows the search never reached, and, with a hint, probed rows that
  stayed mounted throughout the press (read empty from the DOM, hint never
  called) are not in it. Those retained rows still count toward
  `tabSearchLimit`, so the budget is unchanged; they just cannot suppress a
  fresh hint on the next press. The continuation
  is **exhausted** when the probe reached the end of the set. The next press
  of the same key from the same origin rescans from the same start position
  (see [Terms](#tab-traversal-across-unmounted-rows)): covered rows are
  passed without mounting while unmounted and read from the DOM while
  mounted, and every other row is evaluated fresh, so a hint answer that
  flipped from `false` to `true` is read on that press. Because covered rows
  are never re-probed, each capped press probes new rows, which is what lets a
  run of wrong or unsure `true` answers longer than the limit be crossed, and
  what makes the press after a fully probed trailing run leave the table once
  its rescan finds no new candidate (a retained or other DOM-read row that a
  settle scroll unmounted and whose hint answers `true` is probed and covered
  first, within
  the bound in [End of search](#end-of-search)). The
  continuation is used at most once. A resumed search that stops again records
  a new one with the same origin, direction, and start position, whose covered
  set is the old covered set plus its own covered rows, so progress accumulates
  across any number of capped presses. It is dropped when:
  - focus moves by other means than the press that consumes it, or the key
    direction changes;
  - the row model, expansion, or column set changes, or `data` changes;
  - a covered row mounts (by scrolling, `scrollToRow`, or another search) and
    the DOM shows a tabbable control;
  - `invalidateTabbableCache` is called, with or without ids;
  - the `rowHasTabbable` function or `tabSearchLimit` changes;
  - the viewport unmounts.

  It is not a cache of row contents or hint answers: it only covers rows
  probed in the current chain of presses from one origin, and only until the
  next press.

- **Freshness across a capped or completed probe.** The hint alone cannot
  keep a continuation fresh. A row the hint answers `true` (unsure or wrong)
  and that the probe found empty looks the same to the viewport before and
  after it gains a control, because the hint's answer does not change and the
  row is unmounted. So if such a row gains a control between the press that
  recorded the continuation and the next press, and none of the triggers
  above fire, the chain skips it: a resumed search passes it (and, if it stops
  again, carries it in the new covered set), and an exhausted continuation
  exits the table. This is the third exception
  to the [guarantee](#tab-traversal-across-unmounted-rows). It applies only to
  covered rows: a row inside the span that the hint answered `false`, or that
  the covering search read while it stayed mounted, is asked again on every
  resumed press on which it is unmounted, so the hint's freshness holds for it. Focus
  passes a covered row at most once: the press that ends the chain moves focus
  past it (or out of the table) and consumes the continuation, so the
  following search in either direction calls the hint again and re-probes the
  row. Consumers prevent it
  in one of two ways: a hint that answers accurately for that state (it then
  answered `false` before the change, so the row was never covered, and
  answers `true` after), or a call to `invalidateTabbableCache` when the state
  changes, which drops the continuation. Re-probing covered rows on every
  resume would keep the guarantee exact but makes work per press grow with the
  run; see [V9](#open-architectural-decisions-for-zac-0-3-0-sign-off).
- **Without a hint: the known-empty set.** It holds the ids of
  [probed rows](#probe-without-a-hint) (rows a search read with no tabbable
  control after its first probe window), and it is consulted only for
  unmounted rows.
  It persists across presses and entries on purpose: clearing it per press
  would make every press re-probe the same rows, so a run longer than
  `tabSearchLimit` could never be crossed. An id is removed when:
  - its row mounts (by scrolling, `scrollToRow`, or another search) and the
    DOM shows a tabbable control, since mounted rows are always read from the
    DOM;
  - its row's expansion changes;
  - `invalidateTabbableCache(rowIds)` names it.

  The whole set is cleared on a `data` reference change, a column-set change,
  `invalidateTabbableCache()` with no argument, and when `rowHasTabbable`
  becomes provided.

- **Stale results without a hint.** If a row in the known-empty set gains a
  control while it is unmounted and none of the triggers above fire, `Tab` and
  `Shift+Tab` skip that row until it mounts again or is invalidated. Unlike the
  continuation case above, this lasts until a trigger fires, and the
  library cannot detect it. Consumers without a hint must call
  `invalidateTabbableCache(rowIds?)` (on the viewport ref, the preset ref, or
  the composable) whenever such state changes, with the affected ids, or with
  no argument when they are unknown. The recommended fix is to pass
  `rowHasTabbable` reading the same state, which needs no invalidation. Dev
  builds warn when a row in the set mounts with a tabbable control, naming
  both fixes.

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
  only, so consumer data stays unwatched and unmutated. The one exception is
  passing slot rows to the consumer's own `rowHasTabbable` hint during
  [Tab traversal](#tab-traversal-across-unmounted-rows).
- Tables where some rows have no tabbable control (no selection column, links
  only in some rows) should pass `rowHasTabbable`, derived from the same data
  and state (permissions, flags) that decides whether the cell renders a
  control. Without a hint, or with a hint that answers `true` when unsure,
  consumers must call `invalidateTabbableCache` when state outside `data`
  changes which rows render a control
  ([Probe results and freshness](#probe-results-and-freshness)).
- Controls inside the viewport (header, rows, detail rows, footer) must not
  use a positive `tabindex`. Use `tabindex="0"` (or a native control) and
  order controls in the DOM. Positive values are unsupported, are not stops
  in the viewport's order, and log a dev warning when mounted
  ([Positive `tabindex`](#positive-tabindex)).
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
- **Footer rows:** `<tfoot>` rows stay native rows of the table, always
  mounted, each with `aria-rowindex` after the last logical body row and
  counted in `aria-rowcount` (see [Row count and row index](#row-count-and-row-index)).
- **Spacer rows:** `<tr aria-hidden="true" data-virtual-spacer="true">` with one
  empty `<td colspan>`. They are hidden from the accessibility tree, carry no
  `aria-rowindex`, and are excluded from `aria-rowcount`.
- **Focus catcher:** one `<span data-part="focus-catcher">` after the
  `<table>`, as the viewport's last child. It is never a resting focus stop:
  it is tabbable only while focus is outside the viewport and redirects any
  focus it receives to the last stop in display order (see
  [Reverse entry](#reverse-entry-from-after-the-table)). It has no content,
  role, or name and is not `aria-hidden`, because it is tabbable at times and
  a focusable `aria-hidden` element is an `axe-core` `aria-hidden-focus`
  violation. Zero size with `pointer-events: none`.

### Row count and row index

When a viewport is registered and the windowed set is not empty:

- `aria-rowcount` on the `<table>` (through `tableRootProps`) =
  `headerRows + count + openDetailRows + footerRows`, where `headerRows` is
  `1`, `count` is `getRowModel().length`, `openDetailRows` is the number of
  expanded rows in the set, and `footerRows` is the viewport's
  `footerRowCount`. Detail rows and footer rows are real `<tr>` rows, so they
  are counted, as the
  [APG guidance](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/)
  for `aria-rowcount` requires (all rows of the table, not only body rows).
- `aria-rowindex` is set on **every** mounted row, in DOM order:
  - Header row: `1` (`headerRowProps`).
  - Data row at `displayIndex` _i_: `2 + i + (expanded rows before i)`.
  - Detail row: its data row's index `+ 1`.
  - Footer row _k_ (0-based, `getFooterRowProps(k)`):
    `headerRows + count + openDetailRows + 1 + k`. The first footer row
    follows the last logical body row, which is the last data row, or its
    detail row when that row is expanded, whether or not it is mounted. The
    last footer row's index equals `aria-rowcount`.
- Spacer rows and the focus catcher are never counted and never indexed.
- The expanded-before prefix count is computed once per change to expansion
  or the row model (O(n)) and read in O(1) per mounted row.
- Values are **1-based** and **relative to the windowed set**: on server page
  3 the first data row is still `aria-rowindex="2"`, and a footer row follows
  the last loaded row of that page (its detail row when expanded), not the
  server `rowCount` (proposed; see V3).
- When the windowed set is empty, the body shows the phase-one empty state row,
  and both `aria-rowcount` and every `aria-rowindex`, including the footer's,
  are omitted (all rows are present in the DOM).
- Footer rows are never virtualized, so they are always mounted, and their
  index changes only with `count`, expansion, or `footerRowCount`.
- Without a viewport, no `aria-rowcount` / `aria-rowindex` is emitted: every
  row is in the DOM, which is the case where ARIA says they are unnecessary.

### Keyboard interaction

| Key                                   | Context                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab`                   | Viewport, header, row controls | Display order through every row's controls, as if all rows were mounted. Native when the next control is mounted; otherwise the viewport mounts the target row and focuses it ([Tab traversal](#tab-traversal-across-unmounted-rows)). Once the viewport has cancelled a press it always focuses the target itself, even one a probe window already mounted. After a probe reaches the last row with no target and no footer control, focus stays and the next `Tab` leaves the table unless its rescan finds an unmounted retained row to probe first (a bounded number of retries); `Shift+Tab` past row 0 reaches the header or viewport in the same press ([End of search](#end-of-search)). |
| `Tab`                                 | Viewport element               | The viewport is one tab stop before the table's first control, so keyboard users can scroll a table that has no focusable cells.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Tab`                                 | Control before the table       | Native: lands on the viewport element at any scroll position. The next `Tab` reaches the first header control, or row 0's first control when the header has none ([forward entry](#forward-entry-from-before-the-table)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Shift+Tab`                           | Control after the table        | Lands on the last control in display order (footer, else the last row with a control, mounted if needed, else the last header control, else the viewport), never a mid-table row ([reverse entry](#reverse-entry-from-after-the-table)).                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ArrowUp` / `ArrowDown`               | Viewport or a control in it    | Native scrolling of the nearest scroll container (the viewport). Not intercepted. Arrow keys inside text inputs and other widgets keep their own meaning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `PageUp` / `PageDown`, `Home` / `End` | Viewport element               | Native scrolling. `End` reaches the true end because the spacer after the window has the remaining height.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Space` / `Enter`                     | Sort, checkbox, expand         | Phase-one behavior, unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

The only key the library handles for virtualization is `Tab` / `Shift+Tab`,
and only when the next control in display order is in an unmounted row (step 6
of [Tab traversal](#tab-traversal-across-unmounted-rows)) or when `Shift+Tab`
enters the table from after it (through the focus catcher). Arrow, paging, and
activation keys are never intercepted. Grid-style arrow navigation is #319's
scope.

**Focus visibility:** when focus moves to a control in a row partly hidden
under a sticky header, the browser's focus scroll may leave it covered.
Consumers who make the header sticky must set `scroll-padding-block-start` on
the viewport to the header height (documented with the sticky-header recipe).
The viewport does not change `scroll-padding` itself.

### Assistive technology expectations

- **Table navigation** (NVDA `Ctrl+Alt+Arrow`, JAWS table keys, VoiceOver
  `VO+Arrow` in tables) moves through mounted rows and announces positions
  from `aria-rowindex` / `aria-rowcount` ("row 1,042 of 10,001", or "of
  10,002" with one footer row, whose own position is announced as "row 10,002
  of 10,002") where the
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
- **`Tab` across unmounted rows** moves focus straight to the next control, so
  screen readers announce an ordinary focus change with that row's
  `aria-rowindex`. When a probe keeps focus in place, nothing is announced.
- **Positive `tabindex` is unsupported inside the viewport.** Keyboard and
  screen-reader users reach a control with a positive `tabindex` before the
  rest of the page only while its row is mounted, so its position in `Tab`
  order depends on scroll position. The docs tell consumers to use
  `tabindex="0"` and DOM order; dev builds warn
  ([Positive `tabindex`](#positive-tabindex)).
- **`Shift+Tab` into the table from after it** is expected to announce only
  the redirect target. The catcher has no role, name, or content (and is not
  `aria-hidden`, so focus never lands on an element missing from the
  accessibility tree), and holds focus at most until the next render; the AT
  review records whether any pairing announces the transient focus, for
  example as "blank".
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
- Focus catcher: `data-part="focus-catcher"` on a `<span>` after the table,
  with functional inline styles only (zero size, `overflow: hidden`,
  `pointer-events: none`). It must stay the viewport's last child; themes must
  not give it size or visible focus styles.
- Footer rows (`<tfoot>`) carry `aria-rowindex` from `getFooterRowProps(k)`
  and no `data-virtual-index`; they are never spacers and never unmounted.
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
  `(count - rendered + unrenderedOpenDetailRows) × rowHeight`, where
  `unrenderedOpenDetailRows` is the number of expanded rows in the set at
  display index `rendered` or later (for example from `defaultExpandedRowIds`).
  Each of those unrendered detail rows uses `rowHeight` as its
  pre-measurement estimate, the same estimate the first real window uses, so
  the scrollbar does not change size when that window is computed unless a
  measurement differs. Detail rows of expanded rows in the rendered range are
  rendered with their data rows (row groups) and also use `rowHeight` as their
  estimate until measured.
- The rendered window, the spacer, `aria-rowcount`, and `aria-rowindex` come
  from the viewport (its injected context for `GhostDataTableTable` and the
  preset, its scoped slot for manual compositions), which has registered
  before it renders. They do not depend on the root re-rendering, so a manual
  composition and an injected renderer produce the same server output. The
  root's own slot bindings keep their no-viewport values on the server (see
  [Root slot binding additions](#root-slot-binding-additions)).
- The first client render produces the same output, so hydration has zero
  mismatches. Measurement, `ResizeObserver`, and the scroll listener start in
  `onMounted`; the first real window is applied in the next frame.
- `aria-rowcount` and `aria-rowindex` are pure functions of the row model,
  expansion state, and `footerRowCount`, so they match between server and
  client. `initialRowCount` changes which body rows are rendered, never a
  count or an index: the footer rows render on the server with their final
  indices after the full set (for example `aria-rowindex="10002"` with 10,000
  rows and 20 rendered), not after the rendered rows.
- The focus catcher renders with `tabindex="-1"` on the server and in the
  first client render, and switches to `0` in `onMounted` when focus is
  outside the viewport, so hydration matches and there is no unhandled stop
  before hydration.
- Viewport ids come from `useGhostId` where an id is needed.

### Browser-only behavior and cleanup

- On the viewport element: one passive `scroll` listener, `focusin` /
  `focusout` listeners (focus pinning, catcher `tabindex`, reverse entry), and
  one `keydown` listener (Tab traversal only). The focus catcher has no
  listener of its own. One
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

| Scenario                                                          | Budget                                                                                                                                | Kind          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Mounted data rows, 400px viewport, `rowHeight: 40`, `overscan: 5` | `≤ 10 + 2 × 5 + 1` (visible + overscan + one pinned row), independent of row count                                                    | Deterministic |
| One `Tab` / `Shift+Tab` press or reverse entry                    | `≤ tabSearchLimit` probed rows and probe windows, `≤ 1` settle scroll, `≤ (tabSearchLimit + 1) × (visible + 2 × overscan)` row mounts | Deterministic |
| Scroll frame                                                      | Zero sort, filter, `sortFn`, `filterFn`, or accessor calls                                                                            | Deterministic |
| Scroll frame                                                      | At most one window recompute per animation frame                                                                                      | Deterministic |
| Cell contexts                                                     | Built only for mounted rows (see below)                                                                                               | Deterministic |
| Window recompute, 100k rows, measured mode                        | p95 < 1ms                                                                                                                             | Informational |
| Scroll-to-paint, 10k rows × 8 columns, mid-range CI runner        | p95 < 16ms                                                                                                                            | Informational |
| First render, 10k local rows, `enablePagination: false`           | Within 2× the phase-one 25-row page render                                                                                            | Informational |

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
- The Tab traversal target search (`rowHasTabbable`, known-empty set) is the
  same "next row with a focus target" lookup arrow-key navigation needs. When
  #319's grid mode is active it replaces Tab traversal (one tab stop, roving
  `tabindex`), the `keydown` handler above stays off, and the focus catcher
  is not rendered.
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
- **Unit (Tab traversal search):** target search forward and backward from a
  row, the header, and the viewport element; mounted rows read from the DOM,
  unmounted rows from a fresh hint call (never the known-empty set when a hint
  is provided), else the known-empty set, else "assumed yes"; no target at
  both ends; a hint whose answer flips between two presses is honored on the
  second press without invalidation; a wrong `true` is not recorded beyond
  the continuation; a continuation is recorded at the limit and at the end
  (exhausted) in both modes, keyed by origin and direction, with a covered set
  of probed rows only, and with a hint only those the search called the hint
  for and got `true` (hint-`false` rows, unreached rows, and retained rows
  that stayed mounted throughout the press are never in it, though retained
  rows count toward the limit); the hint is called for a probed neighbour or
  remounted row before it is read and never for a row mounted throughout; a
  retained row that is unmounted before the next press and whose hint then
  answers `true` is the target of that press, with zero probe windows counted
  against the limit; a resumed search rescans from the original start position, passes
  covered rows without mounting while unmounted (a mounted covered row with a
  control is the target), calls the hint again for every uncovered unmounted
  row without counting it toward the limit, and a chained stop records the
  union of both covered sets; a continuation is dropped on focus move, direction change,
  row-model, expansion, column, or `data` change, a covered row mounting with
  a control, `invalidateTabbableCache` with and without ids, a new
  `rowHasTabbable` function or `tabSearchLimit`, and unmount; an exhausted
  continuation whose rescan finds no candidate resolves to step 4 with zero
  mounts, and hint calls only for uncovered rows; an exhausted continuation
  whose rescan finds an unmounted retained row (or row read before the first
  window) with a `true` hint probes it, covers it if empty, and continues the
  same search, focusing a later target (including one its probe window
  mounted) in the same press and recording the union covered set only at the
  limit or at the end without a trailing-region control, and the press after
  that resolves to step 4 when no such row remains a candidate; a hint
  `false` exempts an unmounted skipped row from the count, but a row a probe
  window mounts and reads empty counts whatever the hint answers;
  forward end with a trailing-region control focuses it in the same press;
  backward end focuses the last leading control, else the viewport element,
  in the same press;
  known-empty removal on remount with a control, on expansion, and through
  `invalidateTabbableCache(ids)`, and clearing on `data`, column, hint-added,
  and `invalidateTabbableCache()`; probe stops at `tabSearchLimit` (normalized like `overscan`)
  and at the end of the set; per-press bounds: the counter advances for every
  row read empty after the first probe window, including rows mounted at
  press start that a window kept or remounted (not for rows read before the
  first window, hint-`false` rows, unread rows, or the target), the search
  stops the moment it equals `tabSearchLimit`, probe windows never exceed
  `tabSearchLimit`, at most one settle scroll runs, and row mounts (remounts
  counted each time) never exceed
  `(tabSearchLimit + 1) × (visible rows + 2 × overscan)`, checked for
  `tabSearchLimit` `1`, `2`, and `200` with `overscan` `1` and `5`; with
  `tabSearchLimit: 1` a press mounts one window, inspects one empty row, and
  scrolls back; a press that starts scrolled away from the pinned origin,
  with empty rows mounted ahead of the first unmounted candidate, counts
  those rows once a window has opened and opens no window beyond
  `tabSearchLimit` (the reviewer's scenario below, as a unit case on the
  search with a stub window); no sort, filter, or accessor calls. Tabbable: a control with
  `tabindex="0"` (explicit or native default) is a stop, `tabindex="-1"` and
  any positive value are not, so a row group whose only control has
  `tabindex="1"` is not a target and the search continues past it. Start
  positions: `Tab` from the viewport element does nothing when the leading
  region has a control and searches from `0` when it has none; `Shift+Tab`
  from the first trailing-region control searches from `count - 1`.
- **Unit (positive `tabindex` warning):** one dev warning, naming the element,
  when a mounted row group, a detail row, the leading region, or the trailing
  region contains an element with `tabindex="1"`; checked again when a new
  window mounts such a row and when the leading region re-renders with one; at
  most one warning per viewport; no warning for `tabindex="0"` or `"-1"`; no
  warning in production builds; the viewport never changes the attribute.
- **Unit (focus catcher):** the catcher renders with no `aria-hidden` and no
  `role`; `tabindex` is `-1` after `focusin` anywhere in the
  viewport and `0` after `focusout` to outside or to `null`; reverse entry
  target order (last trailing control, else last row with a control, else last
  leading control, else the viewport element); with the hint, a mounted target
  is focused synchronously and an unmounted one after one render; probe limit
  returns focus to `relatedTarget` and restores the scroll offset, or focuses
  the viewport element when `relatedTarget` is `null` or detached; a row-model
  change during a pending entry moves focus to the viewport element, never
  leaving it on the catcher.
- **Unit (bindings):** `aria-rowcount` and `aria-rowindex` values with zero,
  one, and several expanded rows before the window; `footerRowCount` `0`, `1`,
  and `2` (`aria-rowcount` grows by it; footer indices follow the last data
  row, or its detail row when the last row is expanded, and the last footer
  index equals `aria-rowcount`); `footerRowCount` normalization (`-1`, `1.7`,
  `NaN`); `getFooterRowProps(k)` is `{}` outside the range; footer indices in
  SSR output with `initialRowCount` smaller than `count`; the dev warning when
  the rendered `<tfoot>` row count differs; empty set omits all of them;
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
  `defaultExpandedRowIds` produce zero hydration mismatches; a manual
  composition that reads `virtualItems` and `tableRootProps` from the
  viewport's scoped slot server-renders `initialRowCount` rows, the `'after'`
  spacer, and `aria-rowcount`, the same body and attributes as
  `GhostDataTableTable` for the same data, and the root's own slot bindings in
  that SSR output still have their no-viewport values; with
  `initialRowCount: 20`, 100 rows, and `defaultExpandedRowIds` holding rows 5,
  40, and 90, the SSR `'after'` spacer is `(100 - 20 + 2) × rowHeight` (the
  two expanded rows beyond the rendered range add one estimated detail row
  each), and in fixed mode with detail rows exactly `rowHeight` tall the
  viewport's `scrollHeight` is unchanged after the first real window; dev
  warnings for
  unbounded viewport, missing name, nested `containHorizontal`, `rows`
  rendered instead of `virtualItems`, and a standalone layout without the
  focus catcher as the viewport's last child; the catcher is `tabindex="-1"`
  in SSR output and the first client render; listener and observer cleanup
  on unmount.
- **Type:** `DataTableVirtualItem` narrows on `type`; `GhostDataTableTable`
  slot `value` typing is unchanged inside a viewport;
  `GhostDataTablePresetVirtualization` accepts
  `viewportAttrs: { class: 'ledger', style: { blockSize: '32rem' } }` with no
  excess-property error and rejects other keys inside `viewportAttrs`. A Vue
  test renders the preset with that value and asserts the viewport element
  carries the consumer class and block size alongside its own class and
  functional styles.
- **Playwright (`tests/e2e/ghost-data-table-virtual.spec.ts`), 10k-row
  example:**
  - `Tab` from the first row checkbox through 60 rows: each checkbox is
    `toBeFocused()`, the viewport scrolls, and the mounted row count stays
    within budget. Same with `Shift+Tab` upward.
  - **Gap fixture** (`overscan: 5`, about 10 visible rows): rows 100–139 render
    no control (a 40-row gap, longer than `overscan` and than the mounted
    window); every other row has one link. A `focusin` recorder on `document`
    asserts that every focus target during each sequence is inside the
    viewport until the documented exit, so focus never leaves the table early.
    With an accurate `rowHasTabbable`:
    - `Tab` from row 99's link: one press focuses row 140's link, which is in
      view and has the `aria-rowindex` of display index 140.
    - `Shift+Tab` from row 140's link: one press focuses row 99's link.
    - Leading gap (rows 0–39 without controls, scrolled to row 200): `Shift+Tab`
      from row 40's link focuses the last header control; `Tab` from the last
      header control focuses row 40's link.
    - Trailing gap (the last 40 rows without controls): `Tab` from the last
      row control focuses the first element after the viewport.
    - `Tab` from the last header control while scrolled to row 5,000 focuses
      row 0's control (display order, not scroll position).
  - **Entry fixture** (10k rows, `overscan: 5`, sort buttons in the header and
    no select-all, one link per row, a "Before" button directly before the
    viewport and the pager's "Next page" button directly after it, accurate
    `rowHasTabbable`). Each case first scrolls the viewport to row 5,000 with
    `scrollToOffset`, so rows 0 and 9,999 are unmounted and a run of rows
    around 5,000 is mounted. The `focusin` recorder asserts that no control in
    a row between 1 and 9,998 receives focus during an entry, and that the
    focus catcher is never `document.activeElement` once each press settles.
    - `Tab` from "Before": the viewport element is `toBeFocused()`. Next `Tab`:
      the first sort button. `Tab` through the remaining sort buttons, then
      one more `Tab`: row 0's link is focused, in view, with
      `aria-rowindex="2"`.
    - Viewport element focused directly (`locator.focus()`), still at row
      5,000: `Tab` focuses the first sort button, not row 0's link and not a
      mounted row near 5,000.
    - `Shift+Tab` from "Next page": row 9,999's link is focused, in view, with
      `aria-rowindex="10001"`. Next `Shift+Tab`: row 9,998's link.
    - Same fixture with a `<tfoot>` row holding one button
      (`footerRowCount: 1`): `Shift+Tab` from "Next page" focuses the footer
      button; the next `Shift+Tab` focuses row 9,999's link. The `<table>` has
      `aria-rowcount="10002"`, row 9,999 has `aria-rowindex="10001"`, and the
      footer row has `aria-rowindex="10002"`, asserted while the viewport is
      at row 5,000 (row 9,999 unmounted, so only the table and footer values
      are read) and again at the end. Expanding row 9,999 makes them
      `aria-rowcount="10003"`, detail row `10002`, footer row `10003`;
      expanding row 0 instead while scrolled to row 5,000 gives the same
      `aria-rowcount` and footer values.
    - Trailing gap (the last 40 rows without controls): `Shift+Tab` from "Next
      page" focuses row 9,959's link. Without a hint and with
      `tabSearchLimit: 10`, focus returns to "Next page" (viewport back at row
      5,000) until the press that focuses row 9,959, after
      `ceil(40 / 10) + 1` presses in total.
    - No controls in the header or any row: `Shift+Tab` from "Next page"
      focuses the viewport element; `Tab` from "Before" focuses the viewport
      element and the next `Tab` focuses "Next page".
    - `Tab` from row 9,999's link focuses "Next page" (the catcher is skipped).
    - Server example (1,000-row page, scrolled to row 500): `Shift+Tab` from
      the pager focuses the last loaded row's control, and no `stateChange` is
      emitted.
  - **Gap fixture without a hint:** with the default `tabSearchLimit`, `Tab`
    from row 99 focuses row 140 in one press and `Shift+Tab` returns to row 99
    in one press. With `tabSearchLimit: 10`, `Tab` from row 99 keeps focus on
    row 99 (viewport scrolled back to it, focus never leaves the viewport)
    until the press that focuses row 140, after `ceil(40 / 10) + 1` presses in
    total; same for `Shift+Tab` from row 140 back to row 99. Trailing gap
    without a hint: the first `Tab` from the last row control keeps focus
    there, the next one leaves the table.
  - **Fully probed gaps with an unsure hint** (`rowHasTabbable: () => true`,
    default `tabSearchLimit`). A dev-only probe counter (probed rows: rows a
    search read empty after its first probe window, the unit `tabSearchLimit`
    counts) is read after every
    press; the permission fixture's cross-cap cases below read it too.
    Two more dev-only counters are read with it: **probe windows** (window
    mounts around an unmounted candidate) and **row mounts** (each time a row
    mounts during the press, remounts included, settle scroll included).
    Every press whose counters are asserted also asserts probe windows
    `≤ tabSearchLimit`, at most one settle scroll, and row mounts
    `≤ (tabSearchLimit + 1) × 4` (2 visible rows plus `2 × overscan`).
    **Probe-count setup:** every press whose counter is asserted runs with a
    viewport that shows 2 rows, `overscan: 1`, and a
    `scrollToRow(originRowId, { align: 'end' })` call (forward) or
    `{ align: 'start' }` call (backward) just before the press, so exactly
    one row after (or before) the origin is mounted when the press starts.
    That row is read from the DOM before any probe window and not counted,
    so probing starts one row later. A probe window around candidate _c_ then mounts _c_ and its
    overscan neighbour beyond it; a neighbour the search reads empty counts
    too, and a neighbour that is the target does not. Presses from other
    origins assert focus only.
    - **Overscan-mounted target** (regression for the cancelled-press rule):
      gap fixture variant where only rows 100–101 have no control (row 102
      has its link), unsure hint, probe-count setup. `Tab` from row 99's link:
      row 100 is mounted and read empty (not counted); row 101 is unmounted,
      so the press is cancelled and row 101 is probed (counter 1, one probe
      window, which mounts rows 101–102); row 102 is the target, already
      mounted by that window, so it is not counted. Exactly one press focuses
      row 102's link (`toBeFocused()`, in view, `aria-rowindex` of display
      index 102), counter 1, probe windows 1, one settle scroll (the reveal of
      row 102, which mounts row 103), row mounts 3, and focus never
      stays on row 99. Backward: `Shift+Tab` from row 102's link (`align:
'start'` setup, row 101 mounted and read empty, row 100 probed, row 99
      mounted by the same window, reveal mounts row 98) focuses row 99's link
      in one press with the same counts. Repeated without a hint (row 101,
      then row 100, joins the known-empty set), with the same counts. With an
      accurate hint (`false` for rows 100–101): `Tab` from row 99 asks the
      hint about row 101 only (row 100 is mounted and read from the DOM),
      mounts one probe window around row 102 (rows 101–103) and focuses row
      102's link: counter 0, probe windows 1, no settle scroll, row mounts 3.
    - **`tabSearchLimit: 1`** (gap fixture, rows 100–139 without controls, no
      hint, probe-count setup): each of the first 39 `Tab` presses from row
      99's link mounts one probe window, inspects exactly one empty row (rows
      101, 102, …, 139 in turn), stops without reading the mounted overscan
      neighbour, and scrolls back to row 99 (counter 1, probe windows 1, one
      settle scroll, row mounts `≤ 8`), keeping focus on row 99. The
      40th press focuses row 140's link. Same with an unsure hint.
    - **Scrolled away from the pinned origin** (regression for counting
      mounted candidates): `tabSearchLimit: 2`, `overscan: 1`, a viewport
      that shows 2 rows, rows 100–105 without controls, row 106 with its
      link, unsure hint. Focus row 99's link, then `scrollToOffset` so rows
      102–103 are visible (rows 101–104 mounted, row 99 pinned, row 100
      unmounted) before each press; no `scrollToRow` setup.
      - Press 1: row 100 is unmounted, so the first probe window opens
        around it (rows 99–102 mounted, rows 103–104 unmounted). Row 100
        reads empty (counter 1) and row 101, mounted since press start, reads
        empty after that window opened (counter 2), so the search stops at
        the limit before row 102. Probe windows 1 (no window ever opens for
        row 103 or row 105), one settle scroll back to row 99 (row mounts 2:
        row 100 by the window, row 98 by the settle), focus stays on row 99.
        The covered set is row 100 only: row 101 counts but stayed mounted
        throughout, so its hint was never called and it is not covered.
      - Press 2, after the same scroll-away: row 100 is covered and skipped;
        rows 101–104 are mounted and read before any probe window (exempt);
        row 105 is unmounted and opens the first probe window (rows 103–106
        mounted), reads empty (counter 1), and row 106, mounted by that
        window, is the target. One press focuses row 106's link: counter 1,
        probe windows 1, one settle scroll (revealing row 106, which mounts
        row 107), row mounts 3.
      - **Retained row gains a control** (regression for retained-row
        freshness): same fixture, but row 101 renders an Edit button when a
        reactive `permissions` set outside `data` contains its id; the hint
        returns `permissions.has(row101Id)` for row 101 and `true` for every
        other row. Press 1 as above (row 101's hint is not called; covered
        set row 100). Then `scrollToOffset` so rows 104–105 are visible (rows
        103–106 mounted, rows 100–102 unmounted, row 99 pinned) and grant the
        permission without any invalidation. Press 2 passes covered row 100,
        asks the hint about row 101, gets `true`, and focuses row 101's Edit
        button (in view, `aria-rowindex` of display index 101): counter +0,
        probe windows 1, no settle scroll. No-grant variant: press 2 skips row
        101 on its `false` without mounting it, probes row 102 (window around
        row 102, rows 101–104 mounted; counter 1) and reads row 103, mounted
        throughout (counter 2, not covered), and keeps focus on row 99 with
        covered set rows 100 and 102. Press 3 after the same scroll reads rows
        103–105 before any window (exempt) and reaches row 106's link
        natively: counter 0, probe windows 0.
      - Without the scroll-away (focus row 99, probe-count setup with
        `align: 'end'`), the same fixture needs 3 presses, each with probe
        windows 1 and counter 2 except the last (counter 1, focus on row
        106). Repeated without a hint, with the same counts.
      - **Retained rows in an exhausted trailing gap** (regression for the
        exhausted-probe rescan): same viewport as above (2 visible rows,
        `overscan` 1), default `tabSearchLimit`, a 106-row table whose rows
        0–99 have their link and rows 100–105 have no control, no `<tfoot>`,
        and an "After" button directly after the table. The hint returns
        `true` (unsure) for rows 100–102 and `false` for rows 103–105. Focus
        row 99's link and `scrollToOffset` so rows 102–103 are visible (rows
        101–104 mounted, row 99 pinned, row 100 unmounted) before press 1
        only; nothing changes `data`, the hint's answers, or the scroll offset
        afterwards.
        - Press 1: the hint is asked about row 100 (`true`), the first probe
          window opens around it (rows 99–102 mounted), row 100 reads empty
          (counter 1, covered), rows 101 and 102 stay mounted and read empty
          (counter 3, retained, hint never called), and rows 103–105 are
          skipped on their `false` without mounting. The end is reached:
          focus stays on row 99's link, and the settle scroll back to row 99
          mounts rows 98–101, unmounting row 102. Counter 3, probe windows 1,
          one settle scroll, row mounts 2 (row 100, then row 98), covered set
          row 100 only.
        - Press 2 (the retry): row 100 is covered and row 101 is mounted and
          read before any window (exempt); row 102 is unmounted, so its hint
          is called, answers `true`, and a probe window opens around it (rows
          100–103 mounted). Row 102 reads empty (counter 1, covered) and row
          103, mounted by that window, reads empty and counts although its
          hint answers `false` (counter 2, not covered). Rows 104–105 are
          skipped on `false`. Focus stays on row 99's link (not "After"), one
          settle scroll back to row 99 unmounts rows 102–103: counter 2,
          probe windows 1, row mounts 3 (rows 102, 103, 98), covered set rows
          100 and 102.
        - Press 3 (the exit): the rescan finds no candidate (rows 100 and 102
          covered, row 101 read from the DOM, rows 103–105 `false`), so native
          order focuses "After": counter 0, probe windows 0, no settle
          scroll, row mounts 0, and the hint is never called for row 100 or 102.
        - Exactly 3 presses, and a fourth is never needed: the retries stay
          within the two rows press 1 read from the DOM (rows 101 and 102).
          A `focusin` recorder on `document` shows focus only on row 99's
          link until "After". Variant with `rowHasTabbable` returning `false` for row 102
          too: press 2 is the exit (counter 0, probe windows 0).
        - **Retry reaches a newly mounted target** (regression for continuing
          the search after an empty retry candidate): same fixture, but row
          103 renders an Edit button when a reactive `permissions` set
          outside `data` contains its id, and the same hint function returns
          `permissions.has(row103Id)` for row 103 (initially `false`). Press
          1 as above. Grant the permission without any invalidation, keeping
          `data` and the hint function. Press 2: rows 100 and 101 as above;
          row 102 is unmounted with a `true` hint, so the press is cancelled
          and a probe window opens around it (rows 100–103 mounted). Row 102
          reads empty (counter 1, covered), and the search continues: row
          103, mounted by that window, gets a hint call (`true`) and shows its
          Edit button, so it is the target. Press 2 focuses row 103's Edit
          button (`toBeFocused()` on the real element, in view,
          `aria-rowindex` of display index 103), not row 99's link: counter
          1, probe windows 1, one settle scroll (the reveal of row 103, which
          mounts row 104), row mounts 3 (rows 102, 103, 104), and no
          continuation is recorded. Press 3 from row 103's Edit button skips
          rows 104–105 on `false` and focuses "After" natively (counter 0,
          probe windows 0).
    - Forward, entry fixture's trailing gap (rows 9,960–9,999 without
      controls), no `<tfoot>`: `Tab` from row 9,959's link keeps focus there
      (viewport back on row 9,959, probe counter 39: rows 9,961–9,999; probe
      windows 20, around rows 9,961, 9,963, …, 9,999; one settle scroll); the
      second `Tab` focuses
      "Next page" with the probe counter and probe windows unchanged. Exactly 2 presses, and a
      third attempt is never needed. With a `<tfoot>` button: one `Tab` from
      row 9,959's link focuses the footer button.
    - Forward, same, but `Shift+Tab` (row 9,958's link) then `Tab` back to row
      9,959 between the two presses: the direction change dropped the
      exhausted continuation, so the next `Tab` re-probes (counter +39) and
      keeps focus, and the one after it focuses "Next page".
    - Backward, gap fixture's leading gap (rows 0–39 without controls,
      scrolled to row 200): one `Shift+Tab` from row 40's link focuses the
      last header control. Without header controls: one `Shift+Tab` focuses
      the viewport element and the next one focuses "Before". Each press
      moves focus, and no press probes twice.
    - Reverse entry, **empty-rows fixture** (150 rows, none with a control,
      sort buttons in the header, scrolled to row 75): one `Shift+Tab` from
      "Next page" probes all 150 rows and focuses the last sort button; the
      catcher is never `document.activeElement` once the press settles.
      Without header controls: one `Shift+Tab` focuses the viewport element,
      and the next focuses "Before". Forward on the same fixture: `Tab` from
      the last sort button keeps focus (exhausted), the next `Tab` focuses
      "Next page".
    - Server example with the last 40 loaded rows without controls: `Tab`
      from the last control-bearing row keeps focus, the next `Tab` focuses
      the pager, and no `stateChange` is emitted. Replacing `data` between
      the two presses drops the exhausted continuation (the next `Tab`
      searches the new page).
  - **Permission fixture** (the gap fixture, plus an "Edit" button in row 120
    rendered only when a reactive `permissions` set outside `data` contains
    row 120's id; initially it does not). Each case asserts that the `data`
    array keeps its identity and no `stateChange` is emitted.
    - Hint reading `permissions`: `Tab` from row 99 focuses row 140. Scroll to
      row 5,000 with `scrollToOffset` (row 120 unmounted, row 140 pinned).
      Grant the permission. `Shift+Tab` focuses row 120's Edit button (in view,
      `aria-rowindex` of display index 120); `Shift+Tab` focuses row 99's link;
      `Tab` focuses row 120's Edit button; `Tab` focuses row 140's link.
      Revoking it again while row 120 is unmounted makes `Tab` from row 99
      focus row 140.
    - Unsure hint (`() => true`): `Tab` from row 99 probes rows 100–139 empty
      and focuses row 140. Scroll away, grant, and the same four presses reach
      row 120 in order: a fresh hint supersedes the earlier probe.
    - No hint: `Tab` from row 99 probes rows 100–139 into the known-empty set
      and focuses row 140. Scroll away, grant, call
      `invalidateTabbableCache([row120Id])`, then the same four presses reach
      row 120 in order. Repeated with `invalidateTabbableCache()`.
    - No hint, no invalidation (documented stale behaviour): after the grant,
      `Shift+Tab` from row 140 focuses row 99's link, skipping row 120.
      `scrollToRow(row120Id)` then mounts row 120, logs the stale-entry dev
      warning, and drops the entry, so `Tab` from row 99 focuses row 120's
      Edit button.
    - **Across the cap**, unsure hint (`() => true`) and `tabSearchLimit: 30`,
      and the probe-count setup above, so the first press probes rows 101–130
      (row 100 is mounted and read from the DOM) and row 120 is unmounted
      again once the viewport scrolls back to row 99:
      - Invalidated: `Tab` from row 99 keeps focus there (probe counter 30).
        Grant, then `invalidateTabbableCache([row120Id])`. The second `Tab`
        searches fresh and focuses row 120's Edit button (in view,
        `aria-rowindex` of display index 120, counter +19: rows 101–119); the
        third `Tab` focuses row 140's link. Repeated with
        `invalidateTabbableCache()`.
      - Revealed: same first press and grant, then `scrollToRow(row120Id)`
        without moving focus. The second `Tab` focuses row 120's Edit button,
        because the covered row is mounted and read from the DOM.
      - Not invalidated (documented covered-row skip): same first press and
        grant, nothing else. The second `Tab` rescans rows 101–130 without
        mounting them (all covered), probes rows 131–139 (counter +9), and
        focuses row 140's link, skipping row 120. Focus passes it once: the
        next
        `Shift+Tab` from row 140 searches fresh, probes rows 139–121, and
        focuses row 120's Edit button.
      - Accurate hint reading `permissions`, same `tabSearchLimit: 30`: the
        first `Tab` from row 99 focuses row 140 without probing; after
        scrolling away, granting, and `Shift+Tab`, row 120's Edit button is
        focused (no continuation involved).
      - **Accurate `false` inside an unsure span** (regression): the hint
        returns `permissions.has(row120Id)` for row 120 and `true` (unsure)
        for every other row; `tabSearchLimit: 30`, probe-count setup. `Tab`
        from row 99 probes rows 101–130 (row 120 is mounted as row 119's
        window neighbour and read empty, so it counts, but the hint answered
        `false` for it, so it is not covered), keeps focus on row 99, and
        records a covered set without row 120 (counter 30). Grant the permission. The
        second `Tab` asks the hint about row 120 again, gets `true`, and
        focuses row 120's Edit button (counter +0, `aria-rowindex` of display
        index 120). The third `Tab` focuses row 140's link. Without the grant,
        the second `Tab` passes the covered rows without mounting them, skips
        row 120 on its `false`, probes rows 131–139 (counter +9), and focuses
        row 140's link: progress is kept across the capped press.
      - **Accurate `false` inside a chained span**: same hint, but
        `tabSearchLimit: 10`, probe-count setup, without the grant. Presses
        1–3 keep focus on row 99 (counter +10 each: rows 101–110, then
        111–120, then 121–130), each recording the union covered set; press 2
        reads row 120 as row 119's window neighbour but never covers it.
        Grant, then press 4 focuses row 120's Edit button (counter +0).
        Without the grant, press 4 probes rows 131–139 (+9) and
        focuses row 140's link.
      - **Accurate `false` inside an exhausted span**: entry fixture's
        trailing gap (rows 9,960–9,999 without controls) with an Edit button
        in row 9,980 behind the permission; the hint returns the permission
        for row 9,980 and `true` otherwise; default `tabSearchLimit`, no
        `<tfoot>`, probe-count setup. `Tab` from row 9,959's link probes rows
        9,961–9,999 (row 9,980 is read as a window neighbour and counts, but
        its `false` keeps it out of the covered set) and keeps focus there
        (counter 39, exhausted). Grant. The second `Tab` focuses row 9,980's Edit button
        (counter +0). Without the grant, the second `Tab` focuses "Next page"
        (counter +0).
  - **Tabindex fixture** (gap fixture with rows 100–139 empty, accurate
    hint, scrolled to row 5,000 between cases):
    - Row 120 holds a `<span role="button" tabindex="0">`, and the hint
      answers `true` for it: `Tab` from row 99's link focuses the span, the
      next `Tab` focuses row 140's link, and `Shift+Tab` from row 140's link
      focuses the span, then row 99's link.
    - Entry fixture with every row link replaced by a
      `<span role="button" tabindex="0">`, scrolled to row 5,000: `Shift+Tab`
      from "Next page" focuses row 9,999's span; `Tab` from "Before" focuses
      the viewport element, then each sort button, then row 0's span (both
      entry directions follow display order with explicit `tabindex="0"`).
    - Row 120's control has `tabindex="1"` instead, and the hint answers
      `false` for it: once row 120 mounts, the positive-`tabindex` dev
      warning is logged exactly once (captured with `page.on('console')`),
      the attribute is unchanged, and `Tab` from row 99's link focuses row
      140's link (the element is not a stop of the viewport's order). No
      order through or into the table is asserted for the positive element
      itself (unsupported).
  - A cell widget that calls `preventDefault()` on `Tab` keeps it; the
    viewport does not move focus.
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
    top, middle, and bottom, with a detail row open, with the `<tfoot>`
    fixture, and with the empty state,
    run both with focus outside the viewport (catcher `tabindex="0"`) and
    inside it, with no exceptions for the catcher. The test also asserts
    that the catcher has no `aria-hidden` attribute and that axe reports no
    `aria-hidden-focus` or `presentation-role-conflict` result (violation or
    incomplete) for it while its `tabindex` is `0`.
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
     `aria-rowindex` by `(pageIndex - 1) × pageSize`. Footer rows would then
     follow the query-wide last row, which needs a detail-row count for
     unloaded pages that the table does not have.
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
     scrolling depend on table content. It also removes the stop that makes
     forward entry land at the display start, so it would need a leading focus
     catcher mirroring the trailing one
     ([forward entry](#forward-entry-from-before-the-table)).
9. **Tab traversal hint and probe (V9).**
   - **Recommended:** ship
     [Tab traversal](#tab-traversal-across-unmounted-rows) with the optional
     `rowHasTabbable` hint and the mount-and-probe fallback capped by
     `tabSearchLimit` (default `200`) empty rows inspected per press, with
     the separate per-press mount bound of at most `tabSearchLimit` probe
     windows plus one settle scroll ([Probe without a hint](#probe-without-a-hint)), so the order guarantee holds with or
     without the hint and only the number of presses differs (except a reverse
     entry from browser UI past more than `tabSearchLimit` control-less
     trailing rows, which lands on the viewport element; without a hint,
     rows whose controls changed outside `data` without
     `invalidateTabbableCache`; and, with an unsure hint or none, a covered
     row (probed and found empty) that gains a control between two presses of
     a capped or exhausted probe, which focus passes at most once; rows the
     hint answered `false` are asked again on every press).
   - **Alternative:** require `rowHasTabbable` for tables where some rows have
     no controls and drop the probe. Smaller implementation, but without the
     hint the guarantee narrows to tables where every row has a control, and
     `Tab` can leave the table early otherwise (a dev warning would flag it).
   - **Probe limit unit (part of V9, non-blocking).** Recommended:
     `tabSearchLimit` bounds empty rows inspected, and mounting is bounded
     separately by windows, as above. Alternative: a literal cap on rows
     mounted per press, which needs probe windows that shrink to the remaining
     allowance (down to the candidate alone, without overscan or a full
     viewport of rows), so a probed row could be focused while partly outside
     its window's overscan, and `tabSearchLimit: 1` could not mount a normal
     window at all.
   - **Probe cache without a hint (part of V9).** Recommended: keep the
     known-empty set across presses, with `invalidateTabbableCache(rowIds?)`
     for changes outside `data`
     ([Probe results and freshness](#probe-results-and-freshness)).
     Alternative: no persistent set, only the per-search record and the
     continuation. That removes stale skips and the invalidation
     API, but every crossing of a control-less run longer than
     `tabSearchLimit` costs extra presses each time, not only the first.
   - **Continuation freshness across a capped probe (part of V9,
     non-blocking).** Recommended: the continuation (including the exhausted
     form that makes the press after a fully probed trailing run leave the
     table once no retained or other DOM-read row is a candidate again),
     whose covered set holds only probed-and-empty rows (with a hint, only
     those the covering search asked the hint about and got `true`) and whose
     resumed search asks the hint again about every other row, dropped by the
     documented triggers, with the guarantee narrowed so focus can pass a
     covered row once when it gains a control unobservably ([Probe results and freshness](#probe-results-and-freshness)).
     Alternative: on resume, re-probe the covered rows before continuing,
     with the limit growing to _k_ × `tabSearchLimit` on the _k_-th
     consecutive press. That keeps the guarantee exact without
     `invalidateTabbableCache`, but work per press grows with the run and
     crossing a run of _n_ rows costs O(_n_²) probed rows in total. A
     second alternative is to keep probed rows mounted until the next press,
     which also keeps it exact but breaks the mounted-row budget by up to
     `tabSearchLimit` rows.
10. **Reverse entry mechanism (V10).**
    - **Recommended:** the trailing focus catcher
      ([Reverse entry](#reverse-entry-from-after-the-table)): one unnamed,
      zero-size element (not `aria-hidden`, because it is tabbable), tabbable
      only while focus is outside the viewport,
      that redirects to the last stop in display order. Focus on it can only
      mean backward sequential entry, so no input-modality tracking is needed.
    - **Alternative:** no extra element; the viewport's `focusin` listener
      detects focus arriving from an element after the viewport
      (`relatedTarget` and `compareDocumentPosition`) and redirects. It cannot
      tell `Shift+Tab` from a pointer click or script focus on a mid-table
      control (both arrive from outside with the same `relatedTarget`), so it
      needs pointer tracking and still lets the browser focus and scroll to the
      mid-table control before the redirect.
11. **Positive `tabindex` inside the viewport (V11, non-blocking).**
    - **Recommended:** unsupported
      ([Positive `tabindex`](#positive-tabindex)). Tabbable means an
      effective `tabindex` of `0`; positive elements are not stops, the
      viewport never rewrites them, and dev builds warn once when one mounts.
    - **Alternative:** support them by rewriting every positive `tabindex`
      inside the viewport to `0` while the row is mounted (restoring the
      consumer's value on unmount), so they join display order. It mutates
      consumer markup, silently discards the page-wide order the consumer
      asked for, and needs a `MutationObserver` to catch late changes.
      A second alternative is to treat positive elements as stops at their DOM
      position and intercept every `Tab` that would reach or leave one; it
      still cannot stop the browser from visiting a mounted one before the
      viewport on forward entry, so the guarantee would not hold either way.
