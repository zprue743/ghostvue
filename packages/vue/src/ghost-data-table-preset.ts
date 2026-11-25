import type { DataTableRowId } from './ghost-data-table'
import type { GhostEmptyStateHeadingLevel } from './ghost-empty-state'
import type {
  DataTableColumnRow,
  DataTableTableColumnRef,
  GhostDataTableTableProps,
  GhostDataTableTableSlots,
} from './ghost-data-table-table'

/*
 * GhostDataTablePreset (GHO-246; spec "Default rendering convenience" and
 * example (a′)). The batteries-included headless renderer: global search,
 * selection and expansion columns, sort buttons, empty row, and detail rows,
 * wired through the same root bindings as GhostDataTableTable and a manual
 * composition. Unstyled; it ships from `@ghostvue/vue` only.
 */

/** Props of the `#detail` slot: the expanded row. */
export interface GhostDataTablePresetDetailSlotProps<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
}

/** Props of the `#search` slot, which replaces the default search field. */
export interface GhostDataTablePresetSearchSlotProps {
  /** Current global filter as text (`''` when cleared). */
  value: string
  /** Commits a global filter through the root (resets the page on server filtering). */
  setValue: (value: string) => void
  /** The preset's `searchLabel`. */
  label: string
  /** `true` while the parent `GhostDataTable` is disabled. */
  disabled: boolean
}

/**
 * Slots of {@link GhostDataTablePreset}: one optional cell slot per column id
 * (typed like {@link GhostDataTableTableSlots}), plus `detail`, `toolbar`,
 * and `search`. Those three names are reserved, so avoid them as column ids.
 */
export type GhostDataTablePresetSlots<
  TColumns extends readonly DataTableTableColumnRef[],
> = GhostDataTableTableSlots<TColumns> & {
  /** Content of an expanded row's detail `<tr>` (one cell spanning the row). */
  detail?: (
    props: GhostDataTablePresetDetailSlotProps<
      DataTableColumnRow<TColumns[number]>
    >,
  ) => unknown
  /** Rendered before the search field and the table. */
  toolbar?: () => unknown
  /** Replaces the default search field (for example to debounce input). */
  search?: (props: GhostDataTablePresetSearchSlotProps) => unknown
}

/** Props for {@link GhostDataTablePreset}. */
export interface GhostDataTablePresetProps<
  TColumns extends readonly DataTableTableColumnRef[],
> extends GhostDataTableTableProps<TColumns> {
  /**
   * Visible title of the `GhostEmptyState` shown when no rows render.
   * @default 'No results'
   */
  emptyTitle?: string
  /**
   * Heading level of the empty-state title. Match the page outline (axe
   * `heading-order`): one below the nearest heading above the table.
   * @default 3
   */
  emptyHeadingLevel?: GhostEmptyStateHeadingLevel
  /** Visible label of the default search field. @default 'Search' */
  searchLabel?: string
  /**
   * Accessible name of the selection column header (`aria-label` on the
   * `<th>`, which holds only the select-all checkbox). @default 'Selection'
   */
  selectionHeaderLabel?: string
  /**
   * Accessible name of the expansion column header (visually hidden text in
   * the `<th>`). @default 'Details'
   */
  expansionHeaderLabel?: string
  /**
   * Shows the search field (or `#search` slot). Defaults to `true` when any
   * column takes part in the global filter (an accessor and
   * `enableColumnFilter !== false`).
   */
  showGlobalFilter?: boolean | undefined
  /** Accessible name of the select-all checkbox. @default 'Select all rows' */
  selectAllLabel?: string
  /**
   * Accessible name of a row's selection checkbox.
   * @default (rowId) => `Select row ${rowId}`
   */
  rowSelectionLabel?: (rowId: DataTableRowId) => string
  /**
   * Accessible name of a row's expand button.
   * @default (rowId) => `Show details for ${rowId}`
   */
  rowExpansionLabel?: (rowId: DataTableRowId) => string
}
