import {
  createVNode,
  defineComponent,
  h,
  mergeProps,
  resolveDynamicComponent,
  shallowRef,
  type SetupContext,
} from 'vue'

import {
  GhostDataTable as UnstyledDataTable,
  type GhostDataTableEmits,
  type GhostDataTableExposed,
  type GhostDataTableProps,
  type GhostDataTableSlotProps,
} from '@ghostvue/vue'

/** Density of the themed DataTable. */
export type GhostDataTableSize = 'sm' | 'md'

/** Surface treatment of the themed DataTable. */
export type GhostDataTableVariant = 'plain' | 'card'

/** DataTable behavior with optional visual settings. */
export interface GhostDataTableThemedProps<
  TData,
> extends GhostDataTableProps<TData> {
  /** Cell and control density. @default 'md' */
  size?: GhostDataTableSize
  /** Container surface. @default 'plain' */
  variant?: GhostDataTableVariant
  /** Pin column headings to the block start of the nearest scroll container. @default false */
  stickyHeader?: boolean
}

/** The root element and the headless table's public commands. */
export interface GhostDataTableThemedExposed<
  TData,
> extends GhostDataTableExposed<TData> {
  /** The themed container after mount. */
  readonly element: HTMLElement | null
}

// The generic setup signature includes the listener types so consumers can
// infer event payloads while the runtime treats them as emitted events.
type TableListeners = {
  [Event in keyof GhostDataTableEmits as `on${Capitalize<Event>}`]?: (
    ...args: GhostDataTableEmits[Event]
  ) => void
}

const propOptions = {
  data: null,
  columns: null,
  getRowId: null,
  manualSorting: Boolean,
  manualFiltering: Boolean,
  manualPagination: Boolean,
  rowCount: null,
  pageCount: null,
  enableRowSelection: Boolean,
  enableRowExpansion: Boolean,
  // The inner root owns this default. Preserve omission when forwarding it.
  allowMultipleExpanded: { type: Boolean, default: undefined },
  loading: Boolean,
  disabled: Boolean,
  ariaLabel: String,
  ariaLabelledby: String,
  sorting: null,
  defaultSorting: null,
  columnFilters: null,
  defaultColumnFilters: null,
  globalFilter: null,
  defaultGlobalFilter: null,
  pagination: null,
  defaultPagination: null,
  selectedRowIds: null,
  defaultSelectedRowIds: null,
  expandedRowIds: null,
  defaultExpandedRowIds: null,
  size: null,
  variant: null,
  stickyHeader: Boolean,
} satisfies Record<keyof GhostDataTableThemedProps<unknown>, unknown>

const emits = {
  'update:sorting': null,
  'update:columnFilters': null,
  'update:globalFilter': null,
  'update:pagination': null,
  'update:selectedRowIds': null,
  'update:expandedRowIds': null,
  stateChange: null,
} satisfies Record<keyof GhostDataTableEmits, null>

// Vue infers the generic row type from setup. Attach runtime validators
// separately so runtime prop constructors cannot narrow that inference.
const DataTable = Object.assign(
  defineComponent(
    <TData>(
      props: GhostDataTableThemedProps<TData> & TableListeners,
      { attrs, emit, expose, slots }: SetupContext,
    ) => {
      const inner = shallowRef<GhostDataTableExposed<TData> | null>(null)
      const element = shallowRef<HTMLElement | null>(null)
      const exposed: GhostDataTableThemedExposed<TData> = {
        get element() {
          return element.value
        },
        toggleAllRowsSelected: (value) =>
          inner.value?.toggleAllRowsSelected(value),
        toggleRowSelected: (id, value) =>
          inner.value?.toggleRowSelected(id, value),
        toggleRowExpanded: (id, value) =>
          inner.value?.toggleRowExpanded(id, value),
        resetRowSelection: () => inner.value?.resetRowSelection(),
        retry: () => inner.value?.retry(),
        setSorting: (value) => inner.value?.setSorting(value),
        toggleSorting: (id) => inner.value?.toggleSorting(id),
        setGlobalFilter: (value) => inner.value?.setGlobalFilter(value),
        setColumnFilter: (id, value) => inner.value?.setColumnFilter(id, value),
        setColumnFilters: (value) => inner.value?.setColumnFilters(value),
        setPagination: (value) => inner.value?.setPagination(value),
        setPageIndex: (page) => inner.value?.setPageIndex(page),
        setPageSize: (size) => inner.value?.setPageSize(size),
        getRowModel: () => inner.value?.getRowModel() ?? [],
        getPrePaginationRowModel: () =>
          inner.value?.getPrePaginationRowModel() ?? [],
        getSelectedRowModel: () => inner.value?.getSelectedRowModel() ?? [],
      }
      expose(exposed)

      function forward<Event extends keyof GhostDataTableEmits>(event: Event) {
        return (...args: GhostDataTableEmits[Event]) => {
          emit(event, ...args)
        }
      }

      const listeners = {
        'onUpdate:sorting': forward('update:sorting'),
        'onUpdate:columnFilters': forward('update:columnFilters'),
        'onUpdate:globalFilter': forward('update:globalFilter'),
        'onUpdate:pagination': forward('update:pagination'),
        'onUpdate:selectedRowIds': forward('update:selectedRowIds'),
        'onUpdate:expandedRowIds': forward('update:expandedRowIds'),
        onStateChange: forward('stateChange'),
      } satisfies Required<TableListeners>

      return () => {
        const { size, variant, stickyHeader, ...behavior } = props
        return h(
          'div',
          mergeProps(attrs, {
            ref: element,
            class: 'ghost-data-table ghost-themed-scope',
            'data-part': 'root',
            'data-themed': '',
            'data-size': size === 'sm' ? size : undefined,
            'data-variant': variant === 'card' ? variant : undefined,
            'data-sticky-header': stickyHeader ? '' : undefined,
            'data-state': props.disabled ? 'disabled' : undefined,
          }),
          [
            createVNode(
              resolveDynamicComponent(UnstyledDataTable),
              { ...behavior, ...listeners, ref: inner },
              slots,
            ),
          ],
        )
      }
    },
    { name: 'GhostDataTable', inheritAttrs: false },
  ),
  { props: propOptions, emits },
)

/** Optional theme shell around the renderless DataTable root. */
// The generic setup overload has no slot or exposed-value inference. The
// runtime forwards the headless slot unchanged and exposes the typed object above.
export const GhostDataTable = DataTable as (new <TData>(
  ...args: ConstructorParameters<typeof DataTable<TData>>
) => InstanceType<typeof DataTable<TData>> &
  GhostDataTableThemedExposed<TData> & {
    $slots: { default?: (bindings: GhostDataTableSlotProps<TData>) => unknown }
  }) &
  Pick<typeof DataTable, 'props' | 'emits'>
