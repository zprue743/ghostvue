import { describe, expect, it } from 'vitest'

import { measureScrollOverflow } from './measure-scroll-overflow'

function stubElement(metrics: {
  clientHeight: number
  clientWidth: number
  scrollHeight: number
  scrollWidth: number
}): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperties(element, {
    clientHeight: { get: () => metrics.clientHeight },
    clientWidth: { get: () => metrics.clientWidth },
    scrollHeight: { get: () => metrics.scrollHeight },
    scrollWidth: { get: () => metrics.scrollWidth },
  })
  return element
}

describe('measureScrollOverflow', () => {
  it('reports none when metrics fit', () => {
    const element = stubElement({
      clientHeight: 100,
      clientWidth: 100,
      scrollHeight: 100,
      scrollWidth: 100,
    })

    expect(measureScrollOverflow(element, 'both')).toBe('none')
  })

  it('respects orientation when measuring axes', () => {
    const element = stubElement({
      clientHeight: 100,
      clientWidth: 100,
      scrollHeight: 200,
      scrollWidth: 200,
    })

    expect(measureScrollOverflow(element, 'vertical')).toBe('vertical')
    expect(measureScrollOverflow(element, 'horizontal')).toBe('horizontal')
    expect(measureScrollOverflow(element, 'both')).toBe('both')
  })
})
