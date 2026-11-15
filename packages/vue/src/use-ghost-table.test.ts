import { describe, expect, it } from 'vitest'

import {
  mergeGhostTablePartAttrs,
  useGhostTable,
  useGhostTableBody,
  useGhostTableCaption,
  useGhostTableCell,
  useGhostTableFoot,
  useGhostTableHead,
  useGhostTableHeaderCell,
  useGhostTableRow,
} from './use-ghost-table'

describe('useGhostTable', () => {
  it('exposes root hooks and optional scroll container', () => {
    const contained = useGhostTable({ containHorizontal: () => true })
    expect(contained.containHorizontal.value).toBe(true)
    expect(contained.tableProps.value).toEqual({
      class: 'ghost-table',
      'data-part': 'root',
      'data-ghost-table': '',
    })
    expect(contained.scrollContainerProps.value).toMatchObject({
      class: 'ghost-table-scroll-container',
      'data-part': 'scroll-container',
      tabindex: 0,
      role: 'region',
    })
  })

  it.each([
    ['caption', useGhostTableCaption, 'ghost-table-caption'],
    ['head', useGhostTableHead, 'ghost-table-head'],
    ['body', useGhostTableBody, 'ghost-table-body'],
    ['foot', useGhostTableFoot, 'ghost-table-foot'],
    ['row', useGhostTableRow, 'ghost-table-row'],
    ['cell', useGhostTableCell, 'ghost-table-cell'],
  ] as const)('sets %s part hooks', (_name, factory, className) => {
    const { rootProps } = factory()
    expect(rootProps.value.class).toBe(className)
    expect(rootProps.value['data-part']).toBe(_name)
  })

  it('sets scope on header cells when provided', () => {
    const { rootProps } = useGhostTableHeaderCell({ scope: () => 'row' })
    expect(rootProps.value).toEqual({
      class: 'ghost-table-header-cell',
      'data-part': 'header-cell',
      scope: 'row',
    })
  })

  it('sets scroll region aria-label from scrollLabel', () => {
    const { scrollContainerProps } = useGhostTable({
      containHorizontal: () => true,
      scrollLabel: () => 'Scrollable table',
    })
    expect(scrollContainerProps.value['aria-label']).toBe('Scrollable table')
    expect(scrollContainerProps.value['aria-labelledby']).toBeUndefined()
  })

  it('sets scroll region aria-labelledby from captionId', () => {
    const { scrollContainerProps } = useGhostTable({
      containHorizontal: () => true,
      captionId: () => 'rates-caption',
    })
    expect(scrollContainerProps.value['aria-labelledby']).toBe('rates-caption')
  })

  it('merges consumer and part classes', () => {
    const merged = mergeGhostTablePartAttrs(
      { class: 'is-selected', id: 'row-1' },
      { class: 'ghost-table-row', 'data-part': 'row' },
    )
    expect(merged.class).toEqual(['is-selected', 'ghost-table-row'])
    expect(merged.id).toBe('row-1')
    expect(merged['data-part']).toBe('row')
  })

  it('omits scope when unset', () => {
    const { rootProps } = useGhostTableHeaderCell()
    expect(rootProps.value.scope).toBeUndefined()
  })
})
