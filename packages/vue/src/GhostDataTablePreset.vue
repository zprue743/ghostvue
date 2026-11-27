<script
  setup
  lang="ts"
  generic="
    TColumns extends readonly DataTableTableColumnRef[] =
      readonly DataTableColumnDef<unknown>[],
    TLayout extends GhostDataTablePresetLayoutSlotName = never
  "
>
import {
  computed,
  inject,
  nextTick,
  useAttrs,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import type { VNodeChild } from 'vue'

import GhostCheckbox from './GhostCheckbox.vue'
import GhostEmptyState from './GhostEmptyState.vue'
import GhostInput from './GhostInput.vue'
import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableHead from './GhostTableHead.vue'
import GhostTableHeaderCell from './GhostTableHeaderCell.vue'
import GhostTableRow from './GhostTableRow.vue'
import GhostVisuallyHidden from './GhostVisuallyHidden.vue'
import {
  DataTableCellContent as CellContent,
  renderDataTable,
  renderDataTableCell,
  type DataTableRenderedCell,
} from './data-table-render'
import type {
  DataTableColumnDef,
  DataTableDetailRowProps,
  DataTableExpandButtonProps,
  DataTableRowId,
  DataTableSelectionCheckboxProps,
  DataTableSlotRow,
  GhostDataTableSlotProps,
} from './ghost-data-table'
import type { GhostCheckboxExposed } from './ghost-checkbox'
import type {
  GhostDataTablePresetBulkActionsSlotProps,
  GhostDataTablePresetFooterSlotProps,
  GhostDataTablePresetLayoutSlotName,
  GhostDataTablePresetProps,
  GhostDataTablePresetSearchSlotProps,
  GhostDataTablePresetSlots,
} from './ghost-data-table-preset'
import {
  ghostDataTableContextKey,
  type DataTableTableColumnRef,
} from './ghost-data-table-table'

/*
 * Batteries-included default child of GhostDataTable (spec example (a′)).
 * Use it instead of a manual `#default` composition, not next to one: both
 * would render a table for the same root.
 *
 * Accessibility choices (spec "Accessibility contract", reference axe gate):
 * - The selection `<th>` holds only the select-all checkbox, so it is named
 *   with `aria-label`; the expansion `<th>` holds visually hidden text. No
 *   `<th>` is ever empty, and sortable headers keep `aria-sort` on the `<th>`.
 * - Checkbox and expand button names land on the focusable control through
 *   the root's prop helpers, which also own `aria-expanded`, `aria-controls`,
 *   and the focus-on-collapse button id.
 * - The search field is a labelled `type="search"` input outside any
 *   toolbar, so it stays its own Tab stop. It commits through the root's
 *   `setGlobalFilter`, so server filtering resets to page 1 and emits one
 *   `stateChange`. Debouncing stays consumer-owned via `#search`.
 *
 * `disabled` and `loading` come from the parent root: the root disables the
 * sort, selection, and expand controls and sets `aria-busy`; the preset also
 * disables its search field so a disabled table emits nothing.
 *
 * Several root nodes (toolbar, search, table), so attributes such as `class`
 * or `aria-label` are forwarded to GhostTable explicitly.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<GhostDataTablePresetProps<TColumns, TLayout>>(),
  {
    emptyTitle: 'No results',
    emptyHeadingLevel: 3,
    searchLabel: 'Search',
    selectionHeaderLabel: 'Selection',
    expansionHeaderLabel: 'Details',
    // Explicit `undefined` keeps an omitted boolean from casting to `false`,
    // so the "any filterable column" default can apply.
    showGlobalFilter: undefined,
    selectAllLabel: 'Select all rows',
    rowSelectionLabel: (rowId: DataTableRowId) => `Select row ${String(rowId)}`,
    rowExpansionLabel: (rowId: DataTableRowId) =>
      `Show details for ${String(rowId)}`,
  },
)

defineSlots<GhostDataTablePresetSlots<TColumns, NoInfer<TLayout>>>()

// Cell and detail slots are looked up at runtime (their row type is the
// root's hidden `TData`); `defineSlots` carries the consumer-facing types.
const slots = useSlots()
const attrs = useAttrs()

const context = inject(ghostDataTableContextKey, null)
if (!context) {
  throw new Error('GhostDataTablePreset must be used inside GhostDataTable')
}
const table = context

interface PresetRowExtra {
  isSelected: boolean
  isExpanded: boolean
  toggleSelected: (value?: boolean) => void
  toggleExpanded: () => void
  selectionProps: DataTableSelectionCheckboxProps | undefined
  expandProps: DataTableExpandButtonProps | undefined
  detailRowProps: DataTableDetailRowProps
  detailSlotProps: { row: unknown; rowId: DataTableRowId; rowIndex: number }
}

function renderPreset<TData>(
  bindings: GhostDataTableSlotProps<TData>,
  ids: readonly string[] | undefined,
) {
  const selection = table.rowSelectionEnabled()
  const expansion = table.rowExpansionEnabled()
  const base = renderDataTable(
    bindings,
    ids,
    (row: DataTableSlotRow<TData>): PresetRowExtra => ({
      isSelected: row.isSelected,
      isExpanded: expansion && row.isExpanded,
      toggleSelected: row.toggleSelected,
      toggleExpanded: row.toggleExpanded,
      selectionProps: selection
        ? bindings.getRowSelectionCheckboxProps(row.rowId, {
            label: props.rowSelectionLabel(row.rowId),
          })
        : undefined,
      expandProps: expansion
        ? bindings.getRowExpandButtonProps(row.rowId, {
            label: props.rowExpansionLabel(row.rowId),
          })
        : undefined,
      detailRowProps: row.detailRowProps,
      detailSlotProps: {
        row: row.row,
        rowId: row.rowId,
        rowIndex: row.rowIndex,
      },
    }),
  )
  return {
    ...base,
    selectAll: selection
      ? {
          props: bindings.getHeaderSelectionCheckboxProps({
            label: props.selectAllLabel,
          }),
          state: bindings.headerSelectionState,
          toggle: bindings.toggleAllRowsSelected,
        }
      : undefined,
    expansion,
    /** Data columns plus the selection and expansion columns. */
    columnCount:
      base.headers.length + (selection ? 1 : 0) + (expansion ? 1 : 0),
  }
}

const rendered = computed(() => {
  const ids = props.columns?.map((column) => column.id)
  return table.withBindings((bindings) => renderPreset(bindings, ids))
})

// Consumer attributes override the root's, as fallthrough would. The root
// props carry no `class` or `style`, so a spread merges nothing away.
const tableProps = computed(() => ({
  ...rendered.value.tableRootProps,
  ...attrs,
  containHorizontal: props.containHorizontal,
  ...(props.scrollLabel === undefined
    ? {}
    : { scrollLabel: props.scrollLabel }),
}))

const searchVisible = computed(
  () => props.showGlobalFilter ?? table.hasGlobalFilterColumns(),
)

const layoutSlots = computed(() => new Set<string>(props.layoutSlots))

function hasLayoutSlot(name: GhostDataTablePresetLayoutSlotName): boolean {
  return layoutSlots.value.has(name) && Boolean(slots[name])
}

function clearSelection(): void {
  if (table.rowSelectionEnabled() && !table.disabled())
    table.resetRowSelection()
}

const selectedCount = computed(() => table.selectedRowIds().length)
const bulkActionsSlotProps = computed<GhostDataTablePresetBulkActionsSlotProps>(
  () => ({
    selectedRowIds: table.selectedRowIds(),
    selectedCount: selectedCount.value,
    clearSelection,
  }),
)
const footerSlotProps = computed<GhostDataTablePresetFooterSlotProps>(() =>
  table.withBindings(({ pagination, pageCount, rowCount, setPageIndex }) => ({
    pagination,
    pageCount,
    rowCount,
    setPageIndex,
  })),
)

const bulkActions = useTemplateRef<HTMLElement>('bulkActions')
const selectAll = useTemplateRef<GhostCheckboxExposed>('selectAll')
watch(selectedCount, (count, previous) => {
  const bar = bulkActions.value
  if (
    count !== 0 ||
    previous === 0 ||
    !bar?.contains(bar.ownerDocument.activeElement)
  )
    return
  // Read focus before Vue removes the slot. Respect a consumer that moves it elsewhere.
  void nextTick(() => {
    const input = selectAll.value?.element
    if (
      input?.isConnected &&
      !input.disabled &&
      input.ownerDocument.activeElement === input.ownerDocument.body
    ) {
      input.focus()
    }
  })
})

/*
 * The field shows the root's global filter as text. A non-text filter (set by
 * the app, matched with `===`) has no faithful text form, so the field shows
 * it only when it is a number or boolean and is empty otherwise.
 */
function filterText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

const searchSlotProps = computed((): GhostDataTablePresetSearchSlotProps => {
  return {
    value: filterText(table.globalFilter()),
    setValue: (next: string) => {
      table.setGlobalFilter(next)
    },
    label: props.searchLabel,
    disabled: table.disabled(),
  }
})

function renderCell(cell: DataTableRenderedCell): VNodeChild {
  // The opt-in list owns the name even while its layout region is hidden.
  if (layoutSlots.value.has(cell.columnId)) return cell.render()
  return renderDataTableCell(slots, cell)
}

function renderDetail(row: PresetRowExtra): VNodeChild {
  return slots['detail']?.(row.detailSlotProps)
}
</script>

<template>
  <slot name="toolbar" />
  <div
    v-if="
      searchVisible ||
      hasLayoutSlot('toolbarStart') ||
      hasLayoutSlot('toolbarEnd')
    "
    class="ghost-data-table-header"
    data-part="header"
  >
    <div v-if="hasLayoutSlot('toolbarStart')" data-part="toolbar-start">
      <CellContent :render="() => slots['toolbarStart']?.()" />
    </div>
    <div v-if="searchVisible" data-part="search">
      <slot name="search" v-bind="searchSlotProps">
        <label>
          <span>{{ searchSlotProps.label }}</span>
          <GhostInput
            type="search"
            :model-value="searchSlotProps.value"
            :disabled="searchSlotProps.disabled"
            @update:model-value="searchSlotProps.setValue"
          />
        </label>
      </slot>
    </div>
    <div v-if="hasLayoutSlot('toolbarEnd')" data-part="toolbar-end">
      <CellContent :render="() => slots['toolbarEnd']?.()" />
    </div>
  </div>
  <div
    v-if="
      rendered.selectAll && selectedCount > 0 && hasLayoutSlot('bulkActions')
    "
    ref="bulkActions"
    class="ghost-data-table-bulk-actions"
    data-part="bulk-actions"
  >
    <CellContent :render="() => slots['bulkActions']?.(bulkActionsSlotProps)" />
  </div>
  <GhostTable v-bind="tableProps">
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell
          v-if="rendered.selectAll"
          scope="col"
          :aria-label="selectionHeaderLabel"
        >
          <GhostCheckbox
            ref="selectAll"
            v-bind="rendered.selectAll.props"
            :model-value="rendered.selectAll.state.allSelected"
            :indeterminate="rendered.selectAll.state.someSelected"
            @update:model-value="rendered.selectAll.toggle"
          />
        </GhostTableHeaderCell>
        <GhostTableHeaderCell v-if="rendered.expansion" scope="col">
          <GhostVisuallyHidden>{{ expansionHeaderLabel }}</GhostVisuallyHidden>
        </GhostTableHeaderCell>
        <GhostTableHeaderCell
          v-for="header in rendered.headers"
          :key="header.id"
          v-bind="header.headerCellProps"
        >
          <button
            v-if="header.canSort"
            data-part="sort-button"
            v-bind="header.sortButtonProps"
            @click="header.toggleSort"
          >
            {{ header.label }}
          </button>
          <template v-else>{{ header.label }}</template>
        </GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow v-if="rendered.rows.length === 0">
        <GhostTableCell :colspan="rendered.columnCount">
          <GhostEmptyState :heading-level="emptyHeadingLevel">
            <template #title>{{ emptyTitle }}</template>
          </GhostEmptyState>
        </GhostTableCell>
      </GhostTableRow>
      <template v-for="row in rendered.rows" :key="row.rowId">
        <GhostTableRow v-bind="row.rowProps">
          <GhostTableCell v-if="row.selectionProps">
            <GhostCheckbox
              v-bind="row.selectionProps"
              :model-value="row.isSelected"
              @update:model-value="row.toggleSelected"
            />
          </GhostTableCell>
          <GhostTableCell v-if="row.expandProps">
            <button
              data-part="expand-button"
              v-bind="row.expandProps"
              @click="row.toggleExpanded"
            >
              <span aria-hidden="true">{{ row.isExpanded ? '▾' : '▸' }}</span>
            </button>
          </GhostTableCell>
          <GhostTableCell v-for="cell in row.cells" :key="cell.columnId">
            <CellContent :render="() => renderCell(cell)" />
          </GhostTableCell>
        </GhostTableRow>
        <GhostTableRow v-if="row.isExpanded" v-bind="row.detailRowProps">
          <GhostTableCell :colspan="rendered.columnCount">
            <CellContent :render="() => renderDetail(row)" />
          </GhostTableCell>
        </GhostTableRow>
      </template>
    </GhostTableBody>
  </GhostTable>
  <div
    v-if="hasLayoutSlot('footer')"
    class="ghost-data-table-footer"
    data-part="footer"
  >
    <CellContent :render="() => slots['footer']?.(footerSlotProps)" />
  </div>
</template>
