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
})
