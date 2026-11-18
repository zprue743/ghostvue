import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import GhostTreeGroup from './GhostTreeGroup.vue'
import GhostTreeTrigger from './GhostTreeTrigger.vue'
import {
  resolveTreeHtmlElement,
  scanTreeItemSlot,
  type GhostTreeNodeRecord,
  type GhostTreeValue,
  type UseGhostTreeOptions,
  type UseGhostTreeReturn,
} from './ghost-tree'
import { useGhostTree } from './use-ghost-tree'

function withTree(options: UseGhostTreeOptions = {}): UseGhostTreeReturn {
  let tree: UseGhostTreeReturn | undefined
  mount(
    defineComponent({
      setup() {
        tree = useGhostTree(options)
        return () => h('div')
      },
    }),
  )
  if (!tree) {
    throw new Error('useGhostTree did not run')
  }
  return tree
}

function record(
  value: string,
  overrides: Partial<GhostTreeNodeRecord> = {},
): GhostTreeNodeRecord {
  return {
    value,
    parentValue: undefined,
    getElement: () => null,
    isDisabled: () => false,
    isExpandable: () => false,
    getTextValue: () => value,
    ...overrides,
  }
}

describe('useGhostTree selection', () => {
  it('selects uncontrolled single values and ignores reselection by default', () => {
    const onValueChange = vi.fn()
    const onSelect = vi.fn()
    const tree = withTree({ onValueChange, onSelect })
    tree.registerNode(record('a'))
    tree.select('a')
    tree.select('a')
    expect(tree.modelValue.value).toBe('a')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('keeps controlled selection when the parent rejects the update', () => {
    const onValueChange = vi.fn()
    const tree = withTree({ modelValue: () => 'a', onValueChange })
    tree.select('b')
    expect(onValueChange).toHaveBeenCalledWith('b')
    expect(tree.modelValue.value).toBe('a')
    expect(tree.isSelected('b')).toBe(false)
  })

  it('supports controlled undefined after a defined value', async () => {
    const model = ref<GhostTreeValue>('a')
    const tree = withTree({
      modelValue: model,
      allowDeselect: true,
      onValueChange: (next) => {
        model.value = next
      },
    })
    tree.select('a')
    await nextTick()
    expect(model.value).toBeUndefined()
    expect(tree.modelValue.value).toBeUndefined()
  })

  it('normalizes values to the selection mode without mutating input', () => {
    const initial = ['a']
    const onValueChange = vi.fn()
    const multiple = withTree({
      selectionMode: 'multiple',
      defaultValue: initial,
      onValueChange,
    })
    multiple.select('b')
    expect(onValueChange).toHaveBeenCalledWith(['a', 'b'])
    expect(initial).toEqual(['a'])

    const fromString = withTree({
      selectionMode: 'multiple',
      defaultValue: 'a',
    })
    expect(fromString.isSelected('a')).toBe(true)
    const fromArray = withTree({ defaultValue: ['a'] })
    expect(fromArray.isSelected('a')).toBe(false)
  })

  it('does not select disabled nodes or anything in a disabled tree', () => {
    const tree = withTree()
    tree.registerNode(record('a', { isDisabled: () => true }))
    tree.select('a')
    expect(tree.modelValue.value).toBeUndefined()
    const disabled = withTree({ disabled: true })
    disabled.select('b')
    expect(disabled.modelValue.value).toBeUndefined()
  })
})

describe('useGhostTree expansion', () => {
  it('expands and collapses with fresh arrays and toggle payloads', () => {
    const defaults = ['a']
    const onExpandedChange = vi.fn()
    const onToggle = vi.fn()
    const tree = withTree({
      defaultExpanded: defaults,
      onExpandedChange,
      onToggle,
    })
    tree.toggleExpanded('b')
    tree.setExpanded('b', true)
    tree.toggleExpanded('a')
    expect(tree.expanded.value).toEqual(['b'])
    expect(defaults).toEqual(['a'])
    expect(onExpandedChange).toHaveBeenCalledTimes(2)
    expect(onToggle.mock.calls).toEqual([
      [{ value: 'b', expanded: true }],
      [{ value: 'a', expanded: false }],
    ])
  })

  it('keeps controlled expansion when the parent rejects it', () => {
    const tree = withTree({ expanded: () => [] })
    tree.setExpanded('a', true)
    expect(tree.isExpanded('a')).toBe(false)
  })

  it('expands only closed enabled sibling branches with expandAllSiblings', () => {
    const onExpandedChange = vi.fn()
    const tree = withTree({ defaultExpanded: ['open'], onExpandedChange })
    const branch = { isExpandable: () => true }
    tree.registerNode(record('a', branch))
    tree.registerNode(record('open', branch))
    tree.registerNode(record('off', { ...branch, isDisabled: () => true }))
    tree.registerNode(record('leaf'))
    tree.registerNode(record('nested', { ...branch, parentValue: 'a' }))
    tree.expandAllSiblings('leaf')
    expect(onExpandedChange).toHaveBeenCalledTimes(1)
    expect(tree.expanded.value).toEqual(['open', 'a'])
    tree.expandAllSiblings('leaf')
    tree.expandAllSiblings('missing')
    expect(onExpandedChange).toHaveBeenCalledTimes(1)
  })
})

describe('useGhostTree tab stop and registry', () => {
  it('uses registration order and logical visibility', () => {
    const tree = withTree({ defaultValue: 'child' })
    tree.registerNode(record('parent', { isExpandable: () => true }))
    tree.registerNode(record('child', { parentValue: 'parent' }))
    // `child` is selected but its parent is collapsed.
    expect(tree.tabStopValue.value).toBe('parent')
    tree.setExpanded('parent', true)
    expect(tree.tabStopValue.value).toBe('child')
  })

  it('ignores a stale unregister after a value is re-registered', () => {
    const tree = withTree()
    const first = record('a')
    const unregisterFirst = tree.registerNode(first)
    tree.registerNode(record('a'))
    unregisterFirst()
    expect(tree.tabStopValue.value).toBe('a')
  })

  it('reports no navigable values for unmounted records', () => {
    const tree = withTree()
    tree.registerNode(record('a'))
    expect(tree.getNavigableValues()).toEqual([])
    expect(tree.focusNode('missing')).toBe(false)
  })

  it('resolves direction from an explicit value', () => {
    expect(withTree({ dir: 'rtl' }).dir.value).toBe('rtl')
    expect(withTree().dir.value).toBe('ltr')
  })
})

describe('scanTreeItemSlot', () => {
  it('finds the group and the first labelling trigger through elements and fragments', () => {
    const structure = scanTreeItemSlot([
      'text',
      null,
      h('div', [
        h(GhostTreeTrigger, { action: 'toggle', id: 'chevron' }),
        [h(GhostTreeTrigger, { id: 'label' })],
      ]),
      h(GhostTreeTrigger, { id: 'second' }),
      h(GhostTreeGroup, { id: 'children' }),
      h(GhostTreeGroup, { id: 'ignored' }),
    ])
    expect(structure).toEqual({
      hasGroup: true,
      groupId: 'children',
      hasLabelTrigger: true,
      labelTriggerId: 'label',
    })
  })

  it('does not descend into other components', () => {
    const Wrapper = defineComponent({
      name: 'ConsumerWrapper',
      setup:
        (_props, { slots }) =>
        () =>
          slots['default']?.(),
    })
    expect(
      scanTreeItemSlot([h(Wrapper, null, () => h(GhostTreeGroup))]),
    ).toEqual({
      hasGroup: false,
      groupId: undefined,
      hasLabelTrigger: false,
      labelTriggerId: undefined,
    })
    expect(scanTreeItemSlot(undefined).hasGroup).toBe(false)
  })
})

describe('resolveTreeHtmlElement', () => {
  it('resolves elements, exposed elements, and component $el', () => {
    const element = document.createElement('li')
    expect(resolveTreeHtmlElement(element)).toBe(element)
    expect(resolveTreeHtmlElement({ element })).toBe(element)
    expect(resolveTreeHtmlElement({ $el: element })).toBe(element)
    expect(resolveTreeHtmlElement({ $el: 'text' })).toBeNull()
    expect(resolveTreeHtmlElement(null)).toBeNull()
  })
})
