import { computed, ref } from 'vue'

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

export function useGhostPaginationPageLabelVariants() {
  const direct = useGhostPagination({
    pageCount: 5,
    getPageLabel: (page: number) => `Page ${String(page)}`,
  })
  const labelRef = ref<((page: number) => string) | undefined>(
    (page: number) => `Ref ${String(page)}`,
  )
  const fromRef = useGhostPagination({
    pageCount: 5,
    getPageLabel: labelRef,
  })
  const fromComputed = useGhostPagination({
    pageCount: 5,
    getPageLabel: computed(() => (page: number) => `Computed ${String(page)}`),
  })
  const fromGetter = useGhostPagination({
    pageCount: 5,
    getPageLabel: () => (page: number) => `Getter ${String(page)}`,
  })
  const fromUndefinedGetter = useGhostPagination({
    pageCount: 5,
    getPageLabel: () => undefined,
  })
  return {
    direct,
    fromRef,
    fromComputed,
    fromGetter,
    fromUndefinedGetter,
  }
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
