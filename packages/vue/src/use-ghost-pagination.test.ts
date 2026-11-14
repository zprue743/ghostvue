import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useGhostPagination } from './use-ghost-pagination'

describe('useGhostPagination', () => {
  it('clamps page writes to pageCount', () => {
    const onChange = vi.fn()
    const api = useGhostPagination({
      pageCount: () => 3,
      defaultPage: () => 2,
      onChange,
    })

    api.goToPage(99)
    expect(onChange).toHaveBeenCalledWith(3)
    expect(api.page.value).toBe(3)
  })

  it('honors controlled modelValue', () => {
    const model = ref(4)
    const api = useGhostPagination({
      pageCount: () => 10,
      modelValue: () => model.value,
      onChange: (next) => {
        model.value = next
      },
    })

    api.goToPage(6)
    expect(model.value).toBe(6)
    expect(api.page.value).toBe(6)
  })

  it('marks the current page with aria-current only', () => {
    const api = useGhostPagination({
      pageCount: () => 5,
      defaultPage: () => 2,
    })

    const current = api.pageButtonProps(2)
    const other = api.pageButtonProps(3)

    expect(current['aria-current']).toBe('page')
    expect(current['aria-disabled']).toBeUndefined()
    expect(current['data-disabled']).toBeUndefined()

    expect(other['aria-current']).toBeUndefined()
    expect(other['aria-disabled']).toBeUndefined()
  })

  it('marks inactive edge controls with aria-disabled', () => {
    const api = useGhostPagination({
      pageCount: () => 5,
      defaultPage: () => 1,
    })

    expect(api.firstProps.value['aria-disabled']).toBe('true')
    expect(api.previousProps.value['aria-disabled']).toBe('true')
    expect(api.nextProps.value['aria-disabled']).toBeUndefined()
    expect(api.lastProps.value['aria-disabled']).toBeUndefined()
  })

  it('marks last-page edge controls aria-disabled', () => {
    const api = useGhostPagination({
      pageCount: () => 5,
      defaultPage: () => 5,
    })

    expect(api.nextProps.value['aria-disabled']).toBe('true')
    expect(api.lastProps.value['aria-disabled']).toBe('true')
    expect(api.firstProps.value['aria-disabled']).toBeUndefined()
    expect(api.previousProps.value['aria-disabled']).toBeUndefined()
  })
})
