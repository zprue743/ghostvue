import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

import type { GhostPaginationRangeEntry } from './get-pagination-range'

/**
 * Unstyled {@link GhostPagination} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full nav contract for consumers.
 */
export interface GhostPaginationProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * Controlled current page (1-based). Omit for uncontrolled mode.
   */
  modelValue?: number | undefined

  /** Initial page when {@link modelValue} is omitted. @default 1 */
  defaultPage?: number

  /** Total pages. Values below `1` are treated as `1`. */
  pageCount: number

  /** Pages adjacent to the current page. @default 1 */
  siblingCount?: number

  /** Pages always visible at the start and end. @default 1 */
  boundaryCount?: number

  /** Render first and last controls. @default true */
  showEdges?: boolean

  /** Disable every control. @default false */
  disabled?: boolean

  /**
   * Accessible name for the navigation landmark.
   * @default 'Pagination'
   */
  ariaLabel?: string

  /** Accessible name formatter for numbered pages. */
  getPageLabel?: (page: number) => string

  /** Accessible name for the previous control. @default 'Previous page' */
  previousLabel?: string

  /** Accessible name for the next control. @default 'Next page' */
  nextLabel?: string

  /** Accessible name for the first control. @default 'First page' */
  firstLabel?: string

  /** Accessible name for the last control. @default 'Last page' */
  lastLabel?: string

  /** Accessible name for ellipsis list items. @default 'More pages' */
  ellipsisLabel?: string
}

/** Options for {@link useGhostPagination}. */
export interface UseGhostPaginationOptions {
  modelValue?: MaybeRefOrGetter<number | undefined>
  defaultPage?: MaybeRefOrGetter<number | undefined>
  pageCount: MaybeRefOrGetter<number>
  siblingCount?: MaybeRefOrGetter<number | undefined>
  boundaryCount?: MaybeRefOrGetter<number | undefined>
  showEdges?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  ariaLabel?: MaybeRefOrGetter<string | undefined>
  getPageLabel?: MaybeRefOrGetter<((page: number) => string) | undefined>
  previousLabel?: MaybeRefOrGetter<string | undefined>
  nextLabel?: MaybeRefOrGetter<string | undefined>
  firstLabel?: MaybeRefOrGetter<string | undefined>
  lastLabel?: MaybeRefOrGetter<string | undefined>
  ellipsisLabel?: MaybeRefOrGetter<string | undefined>
  onChange?: (page: number) => void
}

export interface GhostPaginationRootProps {
  class: 'ghost-pagination'
  'data-ghost-pagination': ''
  'data-part': 'root'
  'data-state': 'disabled' | undefined
  'aria-label': string
}

export interface GhostPaginationListProps {
  'data-part': 'list'
  class: 'ghost-pagination__list'
  role: 'list'
}

export interface GhostPaginationControlProps {
  type: 'button'
  disabled: boolean | undefined
  'data-disabled': '' | undefined
  'aria-label': string
  'aria-current': 'page' | undefined
  'data-part': 'first' | 'previous' | 'next' | 'last' | 'page'
  onClick: (event: MouseEvent) => void
}

export interface GhostPaginationEllipsisProps {
  'data-part': 'ellipsis'
  'aria-label': string
}

export interface GhostPaginationEllipsisGlyphProps {
  'aria-hidden': 'true'
}

export interface GhostPaginationExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export type { GhostPaginationRangeEntry }
