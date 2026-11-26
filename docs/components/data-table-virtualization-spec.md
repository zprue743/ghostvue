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
  - question: 'GHO-251 (0.3.0 DataTable virtualization): Zac sign-off required on V1–V10 (opt-in surface, pagination opt-out, aria-rowcount scope, scroll reset policy, measured mode in 0.3.0, in-house windowing vs adapter, document scrolling, viewport tab stop, Tab traversal hint and probe limit, reverse entry mechanism) before any implementation.'
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

| Prop              | Type                                        | Default             | Contract                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rowHeight`       | `number`                                    | required            | Data-row block size in CSS pixels. In `'fixed'` mode it is exact; in `'measured'` mode it is the estimate for rows not yet measured. Non-finite or `< 1` values fall back to `1` (dev warning).                                                                                |
| `rowHeightMode`   | `'fixed' \| 'measured'`                     | `'fixed'`           | See [Row-height model](#row-height-model). Detail rows are always measured.                                                                                                                                                                                                    |
| `overscan`        | `number`                                    | `5`                 | Extra data rows mounted on **each** side of the visible range. Normalized like `maxMultiSortColCount`: `Math.floor`, then minimum `1` (focus continuity needs at least one row).                                                                                               |
| `initialRowCount` | `number`                                    | `20`                | Rows rendered before the viewport is measured: on the server and in the first client render. Same normalization, minimum `1`. See [SSR and hydration](#ssr-and-hydration).                                                                                                     |
| `label`           | `string`                                    | inherits table name | Accessible name of the scroll region. Falls back to the root's `ariaLabelledby` (as `aria-labelledby`), then `ariaLabel`. Dev warning when no name resolves.                                                                                                                   |
| `labelledby`      | `string`                                    | —                   | Id of a visible label for the region; wins over `label`.                                                                                                                                                                                                                       |
| `rowHasTabbable`  | `(row: DataTableSlotRow<TData>) => boolean` | —                   | Hint for [Tab traversal](#tab-traversal-across-unmounted-rows): whether the row group (data row plus open detail row) renders at least one tabbable control. Called only for unmounted rows; must be pure and cheap. When omitted, unmounted rows are probed by mounting them. |
| `tabSearchLimit`  | `number`                                    | `200`               | Most rows the probe may mount for one `Tab` / `Shift+Tab` press (or one reverse entry) when `rowHasTabbable` is omitted or wrong. Same normalization as `overscan`, minimum `1`. Rows the hint answers do not count.                                                           |

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
  (`{ rowHeight; rowHeightMode?; overscan?; initialRowCount?; label?; rowHasTabbable?; tabSearchLimit? }`). When
  set, the preset wraps only its `GhostTable` in a `GhostDataTableViewport`,
  which renders the focus catcher itself (toolbar and search stay outside).
  Consumer `class`/`style` for the viewport go through
  `virtualization.viewportAttrs` so the block size can be set
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
`{ viewportProps, focusCatcherProps, setViewportElement, virtualItems,
virtualRange, getRowVirtualProps(rowId), headerRowProps, rowCountProps,
scrollToRow, scrollToOffset, getScrollOffset }`. `GhostDataTableViewport` is a thin
component over this composable, so both paths share one implementation. As
with the interaction helpers, focus pinning (below) is installed by the
component; standalone layouts get it by binding `viewportProps`, which carries
the `focusin`/`focusout` listeners and the `keydown` listener for
[Tab traversal](#tab-traversal-across-unmounted-rows), and by rendering
`<span v-bind="focusCatcherProps" />` as the scroll element's last child, after
the table ([reverse entry](#reverse-entry-from-after-the-table)). Dev builds
warn when the catcher is missing or is not the last child. The composable
options accept `rowHasTabbable` and `tabSearchLimit`.

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
With an accurate `rowHasTabbable` hint, every key press moves focus exactly
once. Without one, crossing a long run can take extra key presses (see
[Probe without a hint](#probe-without-a-hint)), but the order guarantee still
holds, with the single exception stated in
[Reverse entry](#reverse-entry-from-after-the-table).

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
`disabled`, `tabindex` not negative, not `inert`, not hidden). Whether row
group _r_ is tabbable is decided as follows:

- mounted: read from the DOM;
- unmounted and in the known-empty set (below): no;
- unmounted, `rowHasTabbable` provided: its return value for _r_;
- unmounted, no hint: assumed yes (unknown until probed).

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
5. **Mounted target:** do nothing. DOM order equals display order and every
   row group between the focused stop and _j_ is either unmounted or has no
   control, so native `Tab` lands on _j_'s first (forward) or last (backward)
   tabbable control.
6. **Unmounted target:** call `preventDefault()`, mount _j_ as
   `scrollToRow(j, { align: 'nearest', behavior: 'auto' })` would (the focused
   row stays pinned meanwhile), and after that render move focus with
   `focus({ preventScroll: true })` to _j_'s first tabbable control (forward)
   or last (backward). If the mounted row group has no tabbable control (the
   hint was wrong, or there was no hint), _j_ joins the known-empty set and
   the search repeats from _j_ in the same direction (the probe).

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

- **Element:** `<span data-part="focus-catcher" aria-hidden="true">`, rendered
  as the viewport element's last child, after the `<table>` (outside the
  table, so it is not a row, has no `aria-rowindex`, and is not in
  `aria-rowcount`). It has no content, role, or name. Functional inline styles:
  zero inline and block size, `overflow: hidden`, `pointer-events: none`.
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
  rows are now known-empty, so the next `Shift+Tab` from that control
  continues past them. When `relatedTarget` is `null` or no longer tabbable
  (entry from browser UI, or the control was removed), focus moves to the
  viewport element instead, and the next `Shift+Tab` leaves the table. This
  is the one case where a press can skip controls. It needs all of: no
  accurate hint, a trailing run longer than `tabSearchLimit`, and an entry
  that has no previous control to return to. The dev warning below covers it.

**Known-empty set.** Row ids that were mounted and found to have no tabbable
control, so later searches skip them. An id is removed when that row mounts
again with a control or its expansion changes; the whole set is cleared on a
`data` reference change or a column-set change.

**Scroll behaviour.** Traversal and reverse entry scroll only to reveal an
unmounted target (step 6, redirect step 2) or to undo a failed probe,
instantly (never smooth, so reduced motion needs no special case), with
`align: 'nearest'`, so the target row ends just inside the viewport edge in
the key's direction. `scroll-padding-block-start` from the sticky-header
recipe applies. In steps 1–5 the browser's native focus scroll applies.

**Hint contract.** `rowHasTabbable(row)` receives the slot row
(`row.isExpanded` tells it whether the detail row counts). A wrong `true`
costs one probe step. A wrong `false` skips that row's controls while the row
is unmounted; that is a consumer bug, and dev builds warn when such a row
mounts with a tabbable control. Return `true` when unsure.

**Work per key press.** Steps 1–5: constant DOM work plus a scan over at most
`count` row ids and hint calls (the hint must be cheap). Step 6 or a reverse
entry with an accurate hint: one window mount and one `focus()` call. Without
a hint: at most `tabSearchLimit` probed rows, mounted one window at a time.
No sort, filter, or accessor calls in any case.

**Server mode and unloaded rows.** The search and the reverse entry cover the
windowed set only: the rows of the loaded `data` page. They never trigger a
fetch and never change the page. The last loaded row is the end of the data
for traversal, so `Tab` past it continues natively to controls after the
viewport (for example the pager), and `Shift+Tab` from the pager enters at the
last loaded row's last control. Sparse placeholder rows are a non-goal, so
there are no unloaded indices inside the set. While `loading` is true the
search runs over the current rows; a `data` change cancels a pending search or
reverse entry.

#### Probe without a hint

Each probe step mounts one window around the candidate row and reads the DOM.
Per key press (or reverse entry) the probe mounts at most `tabSearchLimit`
rows that the hint did not answer. When the probe reaches the end of the
windowed set, or the limit, without finding a control:

- focus stays on the control the key was pressed on (it never leaves the table
  early and never drops to `<body>`), and the viewport scrolls back to it with
  `align: 'nearest'`; for a reverse entry, see
  [Reverse entry](#reverse-entry-from-after-the-table);
- every probed row is now in the known-empty set, so the **next** press
  continues past them: after reaching the end, the next press finds no target
  (step 4) and native order continues to the next stop outside the body;
  after reaching the limit, the next press probes the following rows;
- a dev warning (once per viewport) names `rowHasTabbable` as the fix.

So without an accurate hint, crossing a run of control-less rows longer than
the mounted window costs one extra press per `tabSearchLimit` rows probed, plus
one at the end of the data. Apart from the reverse-entry case above, focus
order is never wrong.

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
  that decides whether the cell renders a control.
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
- **Focus catcher:** one `<span aria-hidden="true" data-part="focus-catcher">`
  after the `<table>`, as the viewport's last child. It is never a resting
  focus stop: it is tabbable only while focus is outside the viewport and
  redirects any focus it receives to the last stop in display order (see
  [Reverse entry](#reverse-entry-from-after-the-table)). Zero size with
  `pointer-events: none`, which `axe-core`'s `aria-hidden-focus` rule reports
  as "needs review" rather than a violation.

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

| Key                                   | Context                        | Behavior                                                                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`                   | Viewport, header, row controls | Display order through every row's controls, as if all rows were mounted. Native when the next control is mounted; otherwise the viewport mounts the target row and focuses it ([Tab traversal](#tab-traversal-across-unmounted-rows)).   |
| `Tab`                                 | Viewport element               | The viewport is one tab stop before the table's first control, so keyboard users can scroll a table that has no focusable cells.                                                                                                         |
| `Tab`                                 | Control before the table       | Native: lands on the viewport element at any scroll position. The next `Tab` reaches the first header control, or row 0's first control when the header has none ([forward entry](#forward-entry-from-before-the-table)).                |
| `Shift+Tab`                           | Control after the table        | Lands on the last control in display order (footer, else the last row with a control, mounted if needed, else the last header control, else the viewport), never a mid-table row ([reverse entry](#reverse-entry-from-after-the-table)). |
| `ArrowUp` / `ArrowDown`               | Viewport or a control in it    | Native scrolling of the nearest scroll container (the viewport). Not intercepted. Arrow keys inside text inputs and other widgets keep their own meaning.                                                                                |
| `PageUp` / `PageDown`, `Home` / `End` | Viewport element               | Native scrolling. `End` reaches the true end because the spacer after the window has the remaining height.                                                                                                                               |
| `Space` / `Enter`                     | Sort, checkbox, expand         | Phase-one behavior, unchanged.                                                                                                                                                                                                           |

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
- **`Tab` across unmounted rows** moves focus straight to the next control, so
  screen readers announce an ordinary focus change with that row's
  `aria-rowindex`. When a probe keeps focus in place, nothing is announced.
- **`Shift+Tab` into the table from after it** is expected to announce only
  the redirect target. The catcher is `aria-hidden`, has no name, and holds
  focus at most until the next render; the AT review records whether any
  pairing announces the transient focus.
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
  unmounted rows from the hint, the known-empty set, or "assumed yes"; no
  target at both ends; known-empty invalidation on expansion, `data`, and
  column changes; probe stops at `tabSearchLimit` (normalized like `overscan`)
  and at the end of the set; no sort, filter, or accessor calls. Start
  positions: `Tab` from the viewport element does nothing when the leading
  region has a control and searches from `0` when it has none; `Shift+Tab`
  from the first trailing-region control searches from `count - 1`.
- **Unit (focus catcher):** `tabindex` is `-1` after `focusin` anywhere in the
  viewport and `0` after `focusout` to outside or to `null`; reverse entry
  target order (last trailing control, else last row with a control, else last
  leading control, else the viewport element); with the hint, a mounted target
  is focused synchronously and an unmounted one after one render; probe limit
  returns focus to `relatedTarget` and restores the scroll offset, or focuses
  the viewport element when `relatedTarget` is `null` or detached; a row-model
  change during a pending entry moves focus to the viewport element, never
  leaving it on the catcher.
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
  unbounded viewport, missing name, nested `containHorizontal`, `rows`
  rendered instead of `virtualItems`, and a standalone layout without the
  focus catcher as the viewport's last child; the catcher is `tabindex="-1"`
  in SSR output and the first client render; listener and observer cleanup
  on unmount.
- **Type:** `DataTableVirtualItem` narrows on `type`; `GhostDataTableTable`
  slot `value` typing is unchanged inside a viewport.
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
    - Same fixture with a `<tfoot>` button: `Shift+Tab` from "Next page"
      focuses the footer button; the next `Shift+Tab` focuses row 9,999's link.
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
    top, middle, and bottom, with a detail row open, and with the empty state,
    run both with focus outside the viewport (catcher `tabindex="0"`) and
    inside it. The catcher's only allowed result is an `aria-hidden-focus`
    "incomplete" entry, which the test asserts by selector.
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
     scrolling depend on table content. It also removes the stop that makes
     forward entry land at the display start, so it would need a leading focus
     catcher mirroring the trailing one
     ([forward entry](#forward-entry-from-before-the-table)).
9. **Tab traversal hint and probe (V9).**
   - **Recommended:** ship
     [Tab traversal](#tab-traversal-across-unmounted-rows) with the optional
     `rowHasTabbable` hint and the mount-and-probe fallback capped by
     `tabSearchLimit` (default `200`), so the order guarantee holds with or
     without the hint and only the number of presses differs (except a reverse
     entry from browser UI past more than `tabSearchLimit` control-less
     trailing rows, which lands on the viewport element).
   - **Alternative:** require `rowHasTabbable` for tables where some rows have
     no controls and drop the probe. Smaller implementation, but without the
     hint the guarantee narrows to tables where every row has a control, and
     `Tab` can leave the table early otherwise (a dev warning would flag it).
10. **Reverse entry mechanism (V10).**
    - **Recommended:** the trailing focus catcher
      ([Reverse entry](#reverse-entry-from-after-the-table)): one `aria-hidden`
      zero-size element, tabbable only while focus is outside the viewport,
      that redirects to the last stop in display order. Focus on it can only
      mean backward sequential entry, so no input-modality tracking is needed.
    - **Alternative:** no extra element; the viewport's `focusin` listener
      detects focus arriving from an element after the viewport
      (`relatedTarget` and `compareDocumentPosition`) and redirects. It cannot
      tell `Shift+Tab` from a pointer click or script focus on a mid-table
      control (both arrive from outside with the same `relatedTarget`), so it
      needs pointer tracking and still lets the browser focus and scroll to the
      mid-table control before the redirect.
