import { computed, nextTick, watch } from 'vue'

import type {
  DataTableControlLabelOptions,
  DataTableExpandButtonOptions,
  DataTableExpandButtonProps,
  DataTableHeaderCellProps,
  DataTableInteractionState,
  DataTableRowId,
  DataTableSelectionCheckboxProps,
  DataTableSortButtonProps,
  UseGhostDataTableReturn,
} from './ghost-data-table'

/*
 * DataTable interaction prop helpers (GHO-236; spec "Renderless root slot
 * bindings" and "Accessibility contract"). Each helper returns plain
 * attributes for one focusable control, never listeners: consumers keep their
 * own `@click` / `@update:model-value`, so spreading the props next to a
 * handler can never toggle twice. Every accessible name and ARIA state lands
 * on the focusable control itself (the native `<button>` or the checkbox
 * `<input>`), never on a wrapper, so custom headers and localized labels keep
 * their names. The `GhostDataTable` slot getters delegate here, so the root
 * and standalone `useGhostDataTable` layouts share one contract.
 */

function withLabel<T extends object>(
  props: T,
  options: DataTableControlLabelOptions | undefined,
): T & { 'aria-label'?: string } {
  return options?.label ? { ...props, 'aria-label': options.label } : props
}

/**
 * Attributes for a column header cell (`<th>`): `scope="col"`, plus
 * `aria-sort` and the `data-sort` styling hook on the sorted column only.
 * Phase one sorts one column at a time, so every other header omits
 * `aria-sort` rather than announcing `none`.
 */
export function getDataTableHeaderCellProps(
  table: DataTableInteractionState,
  columnId: string,
): DataTableHeaderCellProps {
  const direction = table.getSortDirection(columnId)
  if (direction === false) return { scope: 'col' }
  return {
    scope: 'col',
    'aria-sort': direction === 'asc' ? 'ascending' : 'descending',
    'data-sort': direction,
  }
}

/**
 * Attributes for the sort `<button>` inside a header cell. `aria-label`
 * (from `options.label`) names the button; omit it when the button's visible
 * text is the name. The button never carries `aria-sort`: the sort state
 * belongs to its `<th>` ({@link getDataTableHeaderCellProps}). Disabled while
 * the table is disabled or the column cannot sort.
 */
export function getDataTableSortButtonProps(
  table: DataTableInteractionState,
  columnId: string,
  options?: DataTableControlLabelOptions,
): DataTableSortButtonProps {
  const props: DataTableSortButtonProps = { type: 'button' }
  if (table.disabled.value || !table.canSort(columnId)) props.disabled = true
  return withLabel(props, options)
}

const selectionInert = (table: DataTableInteractionState): boolean =>
  !table.rowSelectionEnabled.value || table.disabled.value

/**
 * Props for a row `GhostCheckbox`. `GhostCheckbox` forwards `aria-label` to
 * its native `<input type="checkbox">`, the focusable control. A selection
 * cell has no visible text, so pass `options.label` (for example
 * `Select invoice inv-2`). Bind `:model-value` and `@update:model-value`
 * from the row model yourself.
 */
export function getDataTableRowSelectionCheckboxProps(
  table: DataTableInteractionState,
  _rowId: DataTableRowId,
  options?: DataTableControlLabelOptions,
): DataTableSelectionCheckboxProps {
  return withLabel({ disabled: selectionInert(table) }, options)
}

/**
 * Props for the header select-all `GhostCheckbox`. Pair it with
 * `headerSelectionState` for `model-value` and `indeterminate`. The checkbox
 * label does not name its column: give the `<th>` its own name too
 * (`aria-label` or visible text) so the header cell is never empty.
 */
export function getDataTableHeaderSelectionCheckboxProps(
  table: DataTableInteractionState,
  options?: DataTableControlLabelOptions,
): DataTableSelectionCheckboxProps {
  return withLabel({ disabled: selectionInert(table) }, options)
}

/**
 * Attributes for a row expand `<button>`: `type="button"`, `aria-expanded`,
 * and `aria-controls` pointing at `options.detailRowId` while expanded (the
 * detail row is unmounted while collapsed, so the reference never dangles).
 * Native buttons activate on `Enter` and `Space`. `options.id` is the focus
 * target the root uses when the detail row collapses.
 */
export function getDataTableRowExpandButtonProps(
  table: DataTableInteractionState,
  rowId: DataTableRowId,
  options?: DataTableExpandButtonOptions,
): DataTableExpandButtonProps {
  const expanded = table.isRowExpanded(rowId)
  const props: DataTableExpandButtonProps = {
    type: 'button',
    'aria-expanded': expanded ? 'true' : 'false',
  }
  if (options?.id) props.id = options.id
  if (expanded && options?.detailRowId) {
    props['aria-controls'] = options.detailRowId
  }
  if (!table.rowExpansionEnabled.value || table.disabled.value) {
    props.disabled = true
  }
  return withLabel(props, options)
}

export interface DataTableDetailRowFocusOptions {
  detailRowId: (rowId: DataTableRowId) => string
  expandButtonId: (rowId: DataTableRowId) => string
}

/**
 * Focus on collapse (spec "Accessibility contract"): when a rendered detail
 * row goes away while focus is inside it (its own toggle, a programmatic
 * collapse, or `allowMultipleExpanded: false` closing it), move focus to that
 * row's expand button instead of letting the browser drop it on `<body>`.
 *
 * The watcher is `flush: 'pre'`, so it runs before the root re-renders and
 * the old detail row is still in the DOM to test `contains(activeElement)`.
 * Focus moves after the flush, once the row is gone. When the data row left
 * the view too (a filter or page change), its button no longer exists and
 * focus is left alone: there is no control to return to. Runs only in the
 * browser; the watcher never fires during SSR.
 */
export function useDataTableDetailRowFocus<TData>(
  table: UseGhostDataTableReturn<TData>,
  ids: DataTableDetailRowFocusOptions,
): void {
  const openDetailRowIds = computed(() =>
    table
      .getRowModel()
      .filter((entry) => table.isRowExpanded(entry.rowId))
      .map((entry) => entry.rowId),
  )

  watch(
    openDetailRowIds,
    (next, previous) => {
      if (typeof document === 'undefined') return
      const active = document.activeElement
      if (!active || active === document.body) return
      const stillOpen = new Set(next)
      for (const rowId of previous) {
        if (stillOpen.has(rowId)) continue
        const detailRow = document.getElementById(ids.detailRowId(rowId))
        if (!detailRow?.contains(active)) continue
        const buttonId = ids.expandButtonId(rowId)
        void nextTick(() => {
          document.getElementById(buttonId)?.focus()
        })
        return
      }
    },
    { flush: 'pre' },
  )
}
