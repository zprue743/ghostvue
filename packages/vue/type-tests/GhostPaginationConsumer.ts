import type { GhostPagination, GhostPaginationProps } from '../src'

import { useGhostPagination } from '../src/use-ghost-pagination'

export function useGhostPaginationHeadless() {
  return useGhostPagination({
    pageCount: () => 5,
    onChange: (page: number) => {
      void page
    },
  })
}

const nativeProps = {
  pageCount: 10,
  modelValue: 2,
} satisfies GhostPaginationProps

const componentProps: InstanceType<typeof GhostPagination>['$props'] = {
  ...nativeProps,
  'onUpdate:modelValue': (page: number) => {
    void page
  },
}

void componentProps
