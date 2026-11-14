import { computed, toValue, type ComputedRef } from 'vue'

import type {
  GhostTableHeaderScope,
  UseGhostTableHeaderCellOptions,
  UseGhostTableOptions,
} from './ghost-table'

export type GhostTablePart =
  | 'root'
  | 'scroll-container'
  | 'caption'
  | 'head'
  | 'body'
  | 'foot'
  | 'row'
  | 'header-cell'
  | 'cell'

const partClass: Record<Exclude<GhostTablePart, 'scroll-container'>, string> = {
  root: 'ghost-table',
  caption: 'ghost-table-caption',
  head: 'ghost-table-head',
  body: 'ghost-table-body',
  foot: 'ghost-table-foot',
  row: 'ghost-table-row',
  'header-cell': 'ghost-table-header-cell',
  cell: 'ghost-table-cell',
}

function tablePartProps(
  part: Exclude<GhostTablePart, 'root' | 'scroll-container'>,
) {
  return computed(() => ({
    class: partClass[part],
    'data-part': part,
  }))
}

export interface GhostTableRootProps {
  class: 'ghost-table'
  'data-part': 'root'
  'data-ghost-table': ''
}

export interface GhostTableScrollContainerProps {
  class: 'ghost-table-scroll-container'
  'data-part': 'scroll-container'
}

/**
 * Root and optional horizontal scroll-container bindings for {@link GhostTable}.
 */
export function useGhostTable(options: UseGhostTableOptions = {}): {
  containHorizontal: ComputedRef<boolean>
  tableProps: ComputedRef<GhostTableRootProps>
  scrollContainerProps: ComputedRef<GhostTableScrollContainerProps>
} {
  const containHorizontal = computed(() =>
    Boolean(toValue(options.containHorizontal)),
  )

  const tableProps = computed((): GhostTableRootProps => ({
    class: 'ghost-table',
    'data-part': 'root',
    'data-ghost-table': '',
  }))

  const scrollContainerProps = computed((): GhostTableScrollContainerProps => ({
    class: 'ghost-table-scroll-container',
    'data-part': 'scroll-container',
  }))

  return { containHorizontal, tableProps, scrollContainerProps }
}

export function useGhostTableCaption() {
  return { rootProps: tablePartProps('caption') }
}

export function useGhostTableHead() {
  return { rootProps: tablePartProps('head') }
}

export function useGhostTableBody() {
  return { rootProps: tablePartProps('body') }
}

export function useGhostTableFoot() {
  return { rootProps: tablePartProps('foot') }
}

export function useGhostTableRow() {
  return { rootProps: tablePartProps('row') }
}

export interface GhostTableHeaderCellRootProps {
  class: 'ghost-table-header-cell'
  'data-part': 'header-cell'
  scope?: GhostTableHeaderScope
}

export function useGhostTableHeaderCell(
  options: UseGhostTableHeaderCellOptions = {},
): {
  rootProps: ComputedRef<GhostTableHeaderCellRootProps>
} {
  const rootProps = computed((): GhostTableHeaderCellRootProps => {
    const scope = toValue(options.scope)
    const base: GhostTableHeaderCellRootProps = {
      class: 'ghost-table-header-cell',
      'data-part': 'header-cell',
    }
    if (scope) {
      base.scope = scope
    }
    return base
  })

  return { rootProps }
}

export function useGhostTableCell() {
  return { rootProps: tablePartProps('cell') }
}
