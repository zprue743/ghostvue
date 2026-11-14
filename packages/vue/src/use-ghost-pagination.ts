import { computed, toValue, type ComputedRef } from 'vue'

import { getPaginationRange } from './get-pagination-range'
import type {
  GhostPaginationControlProps,
  GhostPaginationEllipsisMarkerProps,
  GhostPaginationListProps,
  GhostPaginationRootProps,
  UseGhostPaginationOptions,
} from './ghost-pagination'
import { useControllableState } from './use-controllable-state'

function resolvePageCount(count: number | undefined): number {
  if (count == null || !Number.isFinite(count)) return 1
  return Math.max(1, Math.floor(count))
}

function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(pageCount, Math.max(1, Math.floor(page)))
}

function defaultPageLabel(page: number): string {
  return `Page ${String(page)}`
}

/**
 * Controlled page index, ellipsis range, and navigation control metadata for
 * {@link GhostPagination}.
 */
export function useGhostPagination(options: UseGhostPaginationOptions): {
  page: ComputedRef<number>
  pageCount: ComputedRef<number>
  range: ComputedRef<ReturnType<typeof getPaginationRange>>
  isDisabled: ComputedRef<boolean>
  rootProps: ComputedRef<GhostPaginationRootProps>
  listProps: ComputedRef<GhostPaginationListProps>
  firstProps: ComputedRef<GhostPaginationControlProps>
  previousProps: ComputedRef<GhostPaginationControlProps>
  nextProps: ComputedRef<GhostPaginationControlProps>
  lastProps: ComputedRef<GhostPaginationControlProps>
  pageButtonProps: (page: number) => GhostPaginationControlProps
  ellipsisMarkerProps: ComputedRef<GhostPaginationEllipsisMarkerProps>
  goToPage: (target: number) => void
} {
  const pageCount = computed(() => resolvePageCount(toValue(options.pageCount)))

  const page = useControllableState({
    prop: () => toValue(options.modelValue),
    defaultValue: () =>
      clampPage(toValue(options.defaultPage) ?? 1, pageCount.value),
    onChange: (next) => {
      options.onChange?.(clampPage(next, pageCount.value))
    },
  })

  const effectivePage = computed(() => clampPage(page.value, pageCount.value))
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const showEdges = computed(() => toValue(options.showEdges) !== false)

  const ariaLabel = computed(() => toValue(options.ariaLabel) ?? 'Pagination')
  const getPageLabel = computed(() => {
    const custom = toValue(options.getPageLabel)
    return custom ?? defaultPageLabel
  })
  const previousLabel = computed(
    () => toValue(options.previousLabel) ?? 'Previous page',
  )
  const nextLabel = computed(() => toValue(options.nextLabel) ?? 'Next page')
  const firstLabel = computed(() => toValue(options.firstLabel) ?? 'First page')
  const lastLabel = computed(() => toValue(options.lastLabel) ?? 'Last page')
  const ellipsisLabel = computed(
    () => toValue(options.ellipsisLabel) ?? 'More pages',
  )

  const range = computed(() =>
    getPaginationRange({
      page: effectivePage.value,
      pageCount: pageCount.value,
      siblingCount: toValue(options.siblingCount) ?? 1,
      boundaryCount: toValue(options.boundaryCount) ?? 1,
    }),
  )

  function goToPage(target: number): void {
    if (isDisabled.value) return
    const next = clampPage(target, pageCount.value)
    if (next === effectivePage.value) return
    page.value = next
  }

  function makeControl(
    part: GhostPaginationControlProps['data-part'],
    label: string,
    target: number,
    inactive: boolean,
    current = false,
  ): GhostPaginationControlProps {
    const globallyDisabled = isDisabled.value
    const visuallyDisabled = !globallyDisabled && inactive
    return {
      type: 'button',
      disabled: globallyDisabled ? true : undefined,
      'aria-disabled': visuallyDisabled ? 'true' : undefined,
      'data-disabled': globallyDisabled || visuallyDisabled ? '' : undefined,
      'aria-label': label,
      'aria-current': current ? 'page' : undefined,
      'data-part': part,
      onClick: (event: MouseEvent) => {
        if (event.defaultPrevented || globallyDisabled || visuallyDisabled) {
          return
        }
        goToPage(target)
      },
    }
  }

  const rootProps = computed((): GhostPaginationRootProps => ({
    class: 'ghost-pagination',
    'data-ghost-pagination': '',
    'data-part': 'root',
    'data-state': isDisabled.value ? 'disabled' : undefined,
    'aria-label': ariaLabel.value,
  }))

  const listProps = computed((): GhostPaginationListProps => ({
    'data-part': 'list',
    class: 'ghost-pagination__list',
    role: 'list',
  }))

  const firstProps = computed(() =>
    makeControl(
      'first',
      firstLabel.value,
      1,
      !showEdges.value || effectivePage.value <= 1,
    ),
  )
  const previousProps = computed(() =>
    makeControl(
      'previous',
      previousLabel.value,
      effectivePage.value - 1,
      effectivePage.value <= 1,
    ),
  )
  const nextProps = computed(() =>
    makeControl(
      'next',
      nextLabel.value,
      effectivePage.value + 1,
      effectivePage.value >= pageCount.value,
    ),
  )
  const lastProps = computed(() =>
    makeControl(
      'last',
      lastLabel.value,
      pageCount.value,
      !showEdges.value || effectivePage.value >= pageCount.value,
    ),
  )

  function pageButtonProps(target: number): GhostPaginationControlProps {
    const label = getPageLabel.value(target)
    return makeControl(
      'page',
      label,
      target,
      target === effectivePage.value,
      target === effectivePage.value,
    )
  }

  const ellipsisMarkerProps = computed(
    (): GhostPaginationEllipsisMarkerProps => ({
      role: 'img',
      'aria-label': ellipsisLabel.value,
      'data-part': 'ellipsis',
    }),
  )

  return {
    page: effectivePage,
    pageCount,
    range,
    isDisabled,
    rootProps,
    listProps,
    firstProps,
    previousProps,
    nextProps,
    lastProps,
    pageButtonProps,
    ellipsisMarkerProps,
    goToPage,
  }
}
