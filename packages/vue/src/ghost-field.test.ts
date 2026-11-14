import { Comment, defineComponent, h, Text, type VNode } from 'vue'
import { describe, expect, it } from 'vitest'

import { vnodeListHasContent } from './ghost-field'

describe('vnodeListHasContent', () => {
  it('detects text and ignores comments', () => {
    const nodes: VNode[] = [
      { type: Comment, children: 'skip' } as VNode,
      { type: Text, children: '  hint  ' } as VNode,
    ]
    expect(vnodeListHasContent(nodes)).toBe(true)
  })

  it('returns false for empty text nodes', () => {
    const nodes: VNode[] = [{ type: Text, children: '   ' } as VNode]
    expect(vnodeListHasContent(nodes)).toBe(false)
  })

  it('walks nested vnode children', () => {
    const Host = defineComponent({ setup: () => () => h('span', 'nested') })
    const nodes: VNode[] = [h(Host)]
    expect(vnodeListHasContent(nodes)).toBe(true)
  })
})
