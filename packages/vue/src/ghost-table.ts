import type { HTMLAttributes, InjectionKey, Ref } from 'vue'

/** Shared {@link GhostTable} context for caption id registration. */
export interface GhostTableContext {
  captionId: Ref<string | undefined>
  setCaptionId(id: string | undefined): void
}

export const ghostTableContextKey = Symbol(
  'ghostTableContext',
) as InjectionKey<GhostTableContext>

/** Valid `scope` values for {@link GhostTableHeaderCell}. */
export type GhostTableHeaderScope = 'col' | 'row' | 'colgroup' | 'rowgroup'

/** Props for {@link GhostTable}. */
export interface GhostTableProps {
  /**
   * When true, wraps the table in a scroll container for explicit horizontal
   * overflow. The table itself never receives implicit overflow.
   * @default false
   */
  containHorizontal?: boolean
  /**
   * Accessible name for the horizontal scroll region. When omitted and a
   * {@link GhostTableCaption} is rendered, the scroll region uses `aria-labelledby`
   * on the caption id.
   */
  scrollLabel?: string
}

/** Props for {@link GhostTableHeaderCell}. */
export interface GhostTableHeaderCellProps {
  /** Header relationship for assistive technology. */
  scope?: GhostTableHeaderScope
}

/** Shared fallthrough for table section parts. */
export type GhostTableSectionProps = HTMLAttributes

export type GhostTableCaptionProps = HTMLAttributes
export type GhostTableRowProps = HTMLAttributes
export type GhostTableCellProps = HTMLAttributes

export interface UseGhostTableOptions {
  containHorizontal?: () => boolean | undefined
  scrollLabel?: () => string | undefined
  captionId?: () => string | undefined
}

export interface UseGhostTableHeaderCellOptions {
  scope?: () => GhostTableHeaderScope | undefined
}

/** Methods and state available from a template ref to {@link GhostTable}. */
export interface GhostTableExposed {
  /** The native table after mount, or `null` before mount and after unmount. */
  readonly element: HTMLTableElement | null
}

export interface GhostTableCaptionExposed {
  readonly element: HTMLTableCaptionElement | null
}

export interface GhostTableSectionExposed {
  readonly element: HTMLTableSectionElement | null
}

export interface GhostTableRowExposed {
  readonly element: HTMLTableRowElement | null
}

export interface GhostTableHeaderCellExposed {
  readonly element: HTMLTableCellElement | null
}

export interface GhostTableCellExposed {
  readonly element: HTMLTableCellElement | null
}
