import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref, type VNode } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostTree from './GhostTree.vue'
import GhostTreeGroup from './GhostTreeGroup.vue'
import GhostTreeItem from './GhostTreeItem.vue'
import GhostTreeTrigger from './GhostTreeTrigger.vue'
import {
  resolveTreeDir,
  type GhostTreeExposed,
  type GhostTreeItemExposed,
  type GhostTreeTriggerAction,
  type GhostTreeTriggerExposed,
  type GhostTreeGroupExposed,
  type GhostTreeValue,
} from './ghost-tree'

interface TreeNode {
  value: string
  label: string
  disabled?: boolean
  textValue?: string
  children?: TreeNode[]
}

const FILES: TreeNode[] = [
  {
    value: 'docs',
    label: 'Docs',
    children: [
      { value: 'readme', label: 'Readme' },
      {
        value: 'guides',
        label: 'Guides',
        children: [
          { value: 'intro', label: 'Intro' },
          { value: 'advanced', label: 'Advanced' },
        ],
      },
    ],
  },
  {
    value: 'src',
    label: 'Src',
    children: [
      { value: 'main', label: 'Main' },
      { value: 'utils', label: 'Utils' },
    ],
  },
  { value: 'license', label: 'License' },
]

function renderNodes(nodes: readonly TreeNode[]): VNode[] {
  return nodes.map((node) =>
    h(
      GhostTreeItem,
      {
        key: node.value,
        value: node.value,
        disabled: node.disabled ?? false,
        textValue: node.textValue,
      },
      {
        default: () => [
          h(GhostTreeTrigger, null, { default: () => node.label }),
          node.children
            ? h(GhostTreeGroup, null, {
                default: () => renderNodes(node.children ?? []),
              })
            : null,
        ],
      },
    ),
  )
}

const attached: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of attached.splice(0)) {
    wrapper.unmount()
  }
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('dir')
  vi.useRealTimers()
})

type TreeProps = Record<string, unknown>

function mountTree(
  props: TreeProps = {},
  nodes: TreeNode[] | Ref<TreeNode[]> = FILES,
) {
  const host = document.createElement('div')
  document.body.append(host)
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostTree,
            { 'aria-label': 'Files', ...props },
            {
              default: () =>
                renderNodes(Array.isArray(nodes) ? nodes : nodes.value),
            },
          )
      },
    }),
    { attachTo: host },
  )
  attached.push(wrapper)
  return wrapper
}

function item(value: string): HTMLElement {
  const element = document.querySelector(`[data-ghost-tree-value="${value}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing tree item ${value}`)
  }
  return element
}

function treeRoot(): HTMLElement {
  const element = document.querySelector('[role="tree"]')
  if (!(element instanceof HTMLElement)) {
    throw new Error('Missing tree root')
  }
  return element
}

function press(
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

/** Presses on the focused element, like a real keyboard. */
async function pressActive(
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) {
    throw new Error('Nothing focused')
  }
  const event = press(active, key, init)
  await nextTick()
  return event
}

function tabStops(): string[] {
  return [...document.querySelectorAll('[role="treeitem"][tabindex="0"]')].map(
    (element) => element.getAttribute('data-ghost-tree-value') ?? '',
  )
}

function focused(): string | null {
  return document.activeElement?.getAttribute('data-ghost-tree-value') ?? null
}

describe('GhostTree semantics', () => {
  it('renders tree, treeitem, trigger, and group roles with branch-only expansion state', () => {
    mountTree()
    const root = treeRoot()
    expect(root.tagName).toBe('UL')
    expect(root.getAttribute('data-part')).toBe('root')
    expect(root.hasAttribute('aria-multiselectable')).toBe(false)

    const docs = item('docs')
    expect(docs.tagName).toBe('LI')
    expect(docs.getAttribute('role')).toBe('treeitem')
    expect(docs.getAttribute('aria-expanded')).toBe('false')
    expect(docs.getAttribute('data-expanded')).toBe('false')
    expect(docs.getAttribute('aria-selected')).toBe('false')

    const group = document.getElementById(
      docs.getAttribute('aria-controls') ?? '',
    )
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.tagName).toBe('UL')
    expect(group?.hidden).toBe(true)
    expect(group?.getAttribute('data-state')).toBe('closed')

    const trigger = document.getElementById(
      docs.getAttribute('aria-labelledby') ?? '',
    )
    expect(trigger?.getAttribute('data-part')).toBe('trigger')
    expect(trigger?.tagName).toBe('SPAN')
    expect(trigger?.textContent).toBe('Docs')
    expect(trigger?.hasAttribute('tabindex')).toBe(false)
    expect(trigger?.hasAttribute('role')).toBe(false)
    expect(trigger?.getAttribute('data-state')).toBe('closed')
    expect(group?.getAttribute('aria-labelledby')).toBe(trigger?.id)

    const license = item('license')
    expect(license.hasAttribute('aria-expanded')).toBe(false)
    expect(license.hasAttribute('aria-controls')).toBe(false)
    expect(license.hasAttribute('data-expanded')).toBe(false)
  })

  it('exposes level hooks and merges consumer class, style, and click handlers', async () => {
    const onClick = vi.fn()
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Files', defaultExpanded: ['docs'] },
              {
                default: () =>
                  h(
                    GhostTreeItem,
                    {
                      value: 'docs',
                      class: 'consumer-item',
                      style: { color: 'red' },
                      onClick,
                    },
                    {
                      default: () => [
                        h(
                          GhostTreeTrigger,
                          { class: 'consumer-trigger' },
                          {
                            default: () => 'Docs',
                          },
                        ),
                        h(
                          GhostTreeGroup,
                          { class: 'consumer-group' },
                          {
                            default: () =>
                              h(
                                GhostTreeItem,
                                { value: 'readme' },
                                {
                                  default: () => 'Readme',
                                },
                              ),
                          },
                        ),
                      ],
                    },
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    const docs = item('docs')
    expect(docs.classList).toContain('ghost-tree-item')
    expect(docs.classList).toContain('consumer-item')
    expect(docs.style.color).toBe('red')
    expect(docs.style.getPropertyValue('--ghost-tree-level')).toBe('1')
    expect(docs.getAttribute('data-level')).toBe('1')
    expect(item('readme').getAttribute('data-level')).toBe('2')
    expect(item('readme').style.getPropertyValue('--ghost-tree-level')).toBe(
      '2',
    )
    expect(document.querySelector('.consumer-trigger')?.classList).toContain(
      'ghost-tree-trigger',
    )
    expect(document.querySelector('.consumer-group')?.classList).toContain(
      'ghost-tree-group',
    )
    // Triggerless leaf: no labelledby, name comes from its own content.
    expect(item('readme').hasAttribute('aria-labelledby')).toBe(false)

    item('docs').querySelector('span')?.click()
    await nextTick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps consumer aria-label instead of linking the trigger', () => {
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Files' },
              {
                default: () =>
                  h(
                    GhostTreeItem,
                    { value: 'a', 'aria-label': 'Custom', id: 'custom-item' },
                    {
                      default: () => [
                        h(
                          GhostTreeTrigger,
                          { id: 'custom-trigger' },
                          {
                            default: () => 'A',
                          },
                        ),
                        h(
                          GhostTreeGroup,
                          { id: 'custom-group', 'aria-label': 'A children' },
                          { default: () => null },
                        ),
                      ],
                    },
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    const a = item('a')
    expect(a.id).toBe('custom-item')
    expect(a.getAttribute('aria-label')).toBe('Custom')
    expect(a.hasAttribute('aria-labelledby')).toBe(false)
    expect(a.getAttribute('aria-controls')).toBe('custom-group')
    const group = document.getElementById('custom-group')
    expect(group?.getAttribute('aria-label')).toBe('A children')
    expect(group?.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('marks multiple selection, disabled root, and direction on the root', () => {
    mountTree({ selectionMode: 'multiple', disabled: true, dir: 'rtl' })
    const root = treeRoot()
    expect(root.getAttribute('aria-multiselectable')).toBe('true')
    expect(root.getAttribute('aria-disabled')).toBe('true')
    expect(root.hasAttribute('data-disabled')).toBe(true)
    expect(root.getAttribute('data-dir')).toBe('rtl')
    for (const element of document.querySelectorAll('[role="treeitem"]')) {
      expect(element.getAttribute('tabindex')).toBe('-1')
      expect(element.getAttribute('aria-disabled')).toBe('true')
    }
  })

  it('throws when parts are used outside their owners', () => {
    const silence = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    expect(() => mount(GhostTreeItem, { props: { value: 'x' } })).toThrow(
      'GhostTreeItem must be used inside GhostTree',
    )
    expect(() => mount(GhostTreeTrigger)).toThrow(
      'GhostTreeTrigger must be used inside GhostTreeItem',
    )
    expect(() => mount(GhostTreeGroup)).toThrow(
      'GhostTreeGroup must be used inside GhostTreeItem',
    )
    silence.mockRestore()
  })
})

describe('GhostTree roving tab stop', () => {
  it('has exactly one tab stop on the first visible item by default', () => {
    mountTree()
    expect(tabStops()).toEqual(['docs'])
  })

  it('places the tab stop on the selected visible item', () => {
    mountTree({ defaultValue: 'src' })
    expect(tabStops()).toEqual(['src'])
  })

  it('uses the first selected item in multiple mode and falls back when hidden', () => {
    mountTree({
      selectionMode: 'multiple',
      defaultValue: ['main', 'license'],
    })
    // `main` is inside collapsed `src`, so `license` is the first visible one.
    expect(tabStops()).toEqual(['license'])
  })

  it('falls back to the first item when the selected value is not rendered', async () => {
    mountTree({ defaultValue: 'missing' })
    await nextTick()
    expect(tabStops()).toEqual(['docs'])
  })

  it('has no tab stop for an empty tree', () => {
    mountTree({}, [])
    expect(tabStops()).toEqual([])
  })
})

describe('GhostTree keyboard navigation', () => {
  it('moves through visible items with ArrowDown/ArrowUp/Home/End without selecting', async () => {
    const wrapper = mountTree()
    item('docs').focus()
    await pressActive('ArrowDown')
    expect(focused()).toBe('src')
    expect(tabStops()).toEqual(['src'])
    await pressActive('ArrowDown')
    expect(focused()).toBe('license')
    const boundary = await pressActive('ArrowDown')
    expect(focused()).toBe('license')
    // At a boundary nothing moves, so native scrolling is preserved.
    expect(boundary.defaultPrevented).toBe(false)
    await pressActive('Home')
    expect(focused()).toBe('docs')
    await pressActive('End')
    expect(focused()).toBe('license')
    await pressActive('ArrowUp')
    expect(focused()).toBe('src')
    await pressActive('ArrowDown', { shiftKey: true })
    expect(focused()).toBe('license')
    const tree = wrapper.findComponent(GhostTree)
    expect(tree.emitted('update:modelValue')).toBeUndefined()
    expect(tree.emitted('update:expanded')).toBeUndefined()
  })

  it('wraps only when loop is enabled', async () => {
    mountTree({ loop: true })
    item('license').focus()
    await pressActive('ArrowDown')
    expect(focused()).toBe('docs')
    await pressActive('ArrowUp')
    expect(focused()).toBe('license')
  })

  it('expands, enters, returns to parent, and collapses with LTR arrows', async () => {
    const wrapper = mountTree()
    const tree = wrapper.findComponent(GhostTree)
    item('docs').focus()

    const expand = await pressActive('ArrowRight')
    expect(expand.defaultPrevented).toBe(true)
    expect(focused()).toBe('docs')
    expect(item('docs').getAttribute('aria-expanded')).toBe('true')
    expect(tree.emitted('update:expanded')).toEqual([[['docs']]])
    expect(tree.emitted('toggle')).toEqual([
      [{ value: 'docs', expanded: true }],
    ])

    await pressActive('ArrowRight')
    expect(focused()).toBe('readme')
    // Leaf: ArrowRight does nothing.
    const leaf = await pressActive('ArrowRight')
    expect(leaf.defaultPrevented).toBe(false)
    expect(focused()).toBe('readme')

    await pressActive('ArrowDown')
    expect(focused()).toBe('guides')
    await pressActive('ArrowLeft')
    expect(focused()).toBe('docs')
    await pressActive('ArrowLeft')
    expect(item('docs').getAttribute('aria-expanded')).toBe('false')
    expect(focused()).toBe('docs')
    // Root-level closed branch: nothing happens.
    const root = await pressActive('ArrowLeft')
    expect(root.defaultPrevented).toBe(false)
  })

  it('reverses horizontal arrows for dir="rtl"', async () => {
    mountTree({ dir: 'rtl' })
    item('docs').focus()
    await pressActive('ArrowLeft')
    expect(item('docs').getAttribute('aria-expanded')).toBe('true')
    await pressActive('ArrowLeft')
    expect(focused()).toBe('readme')
    await pressActive('ArrowRight')
    expect(focused()).toBe('docs')
    await pressActive('ArrowRight')
    expect(item('docs').getAttribute('aria-expanded')).toBe('false')
  })

  it('inherits rtl from an ancestor or the document element', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    mountTree()
    await nextTick()
    expect(treeRoot().getAttribute('data-dir')).toBe('rtl')
    item('docs').focus()
    await pressActive('ArrowLeft')
    expect(item('docs').getAttribute('aria-expanded')).toBe('true')
  })

  it('expands all closed sibling branches with * in one update', async () => {
    const wrapper = mountTree()
    const tree = wrapper.findComponent(GhostTree)
    item('license').focus()
    await pressActive('*')
    expect(tree.emitted('update:expanded')).toEqual([[['docs', 'src']]])
    expect(tree.emitted('toggle')).toHaveLength(2)
    expect(focused()).toBe('license')
    expect(item('docs').getAttribute('aria-selected')).toBe('false')
  })

  it('skips disabled items and closed subtrees', async () => {
    mountTree({}, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      {
        value: 'c',
        label: 'C',
        children: [{ value: 'c1', label: 'C1' }],
      },
      { value: 'd', label: 'D' },
    ])
    expect(item('b').getAttribute('tabindex')).toBe('-1')
    expect(item('b').getAttribute('aria-disabled')).toBe('true')
    expect(item('b').getAttribute('data-state')).toBe('disabled')
    item('a').focus()
    await pressActive('ArrowDown')
    expect(focused()).toBe('c')
    await pressActive('ArrowDown')
    expect(focused()).toBe('d')
  })

  it('moves from a child of a disabled open parent to the closest enabled ancestor', async () => {
    mountTree({ defaultExpanded: ['root', 'mid'] }, [
      {
        value: 'root',
        label: 'Root',
        children: [
          {
            value: 'mid',
            label: 'Mid',
            disabled: true,
            children: [{ value: 'leaf', label: 'Leaf' }],
          },
        ],
      },
    ])
    item('leaf').focus()
    await pressActive('ArrowLeft')
    expect(focused()).toBe('root')
  })

  it('ignores modifier chords, IME composition, and keys after a consumer preventDefault', async () => {
    const wrapper = mountTree()
    const tree = wrapper.findComponent(GhostTree)
    item('docs').focus()
    for (const init of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { isComposing: true },
      { keyCode: 229 },
    ] satisfies KeyboardEventInit[]) {
      const event = await pressActive('ArrowDown', init)
      expect(event.defaultPrevented).toBe(false)
      await pressActive('ArrowRight', init)
      await pressActive('s', init)
    }
    expect(focused()).toBe('docs')
    expect(tree.emitted('update:expanded')).toBeUndefined()

    item('docs').addEventListener('keydown', (event) => {
      event.preventDefault()
    })
    await pressActive('ArrowDown')
    expect(focused()).toBe('docs')
  })

  it('ignores every key when the root is disabled', async () => {
    mountTree({ disabled: true })
    item('docs').focus()
    const event = await pressActive('ArrowDown')
    expect(event.defaultPrevented).toBe(false)
    expect(focused()).toBe('docs')
  })
})

describe('GhostTree selection', () => {
  it('selects with Enter and Space in single mode and ignores reselection', async () => {
    const wrapper = mountTree()
    const tree = wrapper.findComponent(GhostTree)
    item('src').focus()
    const enter = await pressActive('Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(item('src').getAttribute('aria-selected')).toBe('true')
    expect(item('src').getAttribute('data-state')).toBe('checked')
    expect(item('src').hasAttribute('data-selected')).toBe(true)
    // Enter never toggles expansion.
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await pressActive(' ')
    expect(tree.emitted('update:modelValue')).toEqual([['src']])
    expect(tree.emitted('select')).toEqual([[{ value: 'src', selected: true }]])

    await pressActive('ArrowDown')
    const space = await pressActive(' ')
    expect(space.defaultPrevented).toBe(true)
    expect(item('license').getAttribute('aria-selected')).toBe('true')
    expect(item('src').getAttribute('aria-selected')).toBe('false')
  })

  it('clears selection on reactivation when allowDeselect is set', async () => {
    const wrapper = mountTree({ allowDeselect: true, defaultValue: 'src' })
    const tree = wrapper.findComponent(GhostTree)
    item('src').focus()
    await pressActive('Enter')
    expect(tree.emitted('update:modelValue')).toEqual([[undefined]])
    expect(tree.emitted('select')).toEqual([
      [{ value: 'src', selected: false }],
    ])
    expect(item('src').getAttribute('aria-selected')).toBe('false')
  })

  it('toggles independent nodes with Space in multiple mode without mutating consumer arrays', async () => {
    const value = ref<GhostTreeValue>(['license'])
    const original = value.value
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              {
                'aria-label': 'Files',
                selectionMode: 'multiple',
                defaultExpanded: ['src'],
                modelValue: value.value,
                'onUpdate:modelValue': (next: GhostTreeValue) => {
                  value.value = next
                },
              },
              { default: () => renderNodes(FILES) },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    item('src').focus()
    await pressActive(' ')
    expect(value.value).toEqual(['license', 'src'])
    expect(original).toEqual(['license'])
    // Selecting a parent never selects its children.
    expect(item('main').getAttribute('aria-selected')).toBe('false')
    await pressActive('ArrowDown')
    await pressActive(' ')
    await pressActive('ArrowDown')
    await pressActive('Enter')
    expect(value.value).toEqual(['license', 'src', 'main', 'utils'])
    await pressActive('ArrowUp')
    await pressActive('ArrowUp')
    await pressActive(' ')
    expect(value.value).toEqual(['license', 'main', 'utils'])
    // Selecting every child never selects the parent.
    expect(item('src').getAttribute('aria-selected')).toBe('false')
  })

  it('keeps rejected controlled selection and expansion in sync with props', async () => {
    const wrapper = mountTree({
      modelValue: 'docs',
      expanded: [] as string[],
    })
    const tree = wrapper.findComponent(GhostTree)
    item('src').focus()
    await pressActive('Enter')
    expect(tree.emitted('update:modelValue')).toEqual([['src']])
    expect(item('src').getAttribute('aria-selected')).toBe('false')
    expect(item('docs').getAttribute('aria-selected')).toBe('true')

    await pressActive('ArrowRight')
    expect(tree.emitted('update:expanded')).toEqual([[['src']]])
    expect(item('src').getAttribute('aria-expanded')).toBe('false')
    await nextTick()
    const group = document.getElementById(
      item('src').getAttribute('aria-controls') ?? '',
    )
    expect(group?.hidden).toBe(true)
    // The rejected branch stays closed, so a second press cannot enter it.
    await pressActive('ArrowRight')
    expect(focused()).toBe('src')
  })

  it('selects and toggles through the root slot helpers', async () => {
    let helpers:
      | {
          select: (value: string) => void
          toggleExpanded: (value: string) => void
          expandAllSiblings: (value: string) => void
          isSelected: (value: string) => boolean
          isExpanded: (value: string) => boolean
        }
      | undefined
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Files' },
              {
                default: (slot: NonNullable<typeof helpers>) => {
                  helpers = slot
                  return renderNodes(FILES)
                },
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    helpers?.select('license')
    helpers?.toggleExpanded('docs')
    await nextTick()
    expect(helpers?.isSelected('license')).toBe(true)
    expect(helpers?.isExpanded('docs')).toBe(true)
    helpers?.expandAllSiblings('docs')
    await nextTick()
    expect(helpers?.isExpanded('src')).toBe(true)
  })
})

describe('GhostTree pointer activation', () => {
  function mountActions(
    actions: GhostTreeTriggerAction[],
    rootProps: TreeProps = {},
  ) {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Files', ...rootProps },
              {
                default: () =>
                  h(
                    GhostTreeItem,
                    { value: 'docs' },
                    {
                      default: () => [
                        ...actions.map((action) =>
                          h(
                            GhostTreeTrigger,
                            { action, 'data-testid': action },
                            { default: () => action },
                          ),
                        ),
                        h(GhostTreeGroup, null, {
                          default: () =>
                            h(
                              GhostTreeItem,
                              { value: 'readme' },
                              {
                                default: () =>
                                  h(GhostTreeTrigger, null, {
                                    default: () => 'Readme',
                                  }),
                              },
                            ),
                        }),
                      ],
                    },
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    return wrapper.findComponent(GhostTree)
  }

  function clickTestId(id: string): void {
    const element = document.querySelector(`[data-testid="${id}"]`)
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing ${id}`)
    }
    element.click()
  }

  it('selects and toggles with the default "both" trigger and row clicks', async () => {
    const tree = mountActions(['both'])
    clickTestId('both')
    await nextTick()
    expect(tree.emitted('update:modelValue')).toEqual([['docs']])
    expect(tree.emitted('update:expanded')).toEqual([[['docs']]])
    // Clicks bubbling from a nested item never select or toggle the parent.
    item('readme').click()
    await nextTick()
    expect(tree.emitted('update:modelValue')).toEqual([['docs'], ['readme']])
    expect(tree.emitted('update:expanded')).toHaveLength(1)
    // Row click outside triggers behaves like "both".
    item('docs').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(tree.emitted('update:expanded')).toHaveLength(2)
  })

  it('splits toggle-only and select-only triggers', async () => {
    const tree = mountActions(['toggle', 'select'], { expandOnClick: false })
    clickTestId('toggle')
    await nextTick()
    expect(tree.emitted('update:expanded')).toEqual([[['docs']]])
    expect(tree.emitted('update:modelValue')).toBeUndefined()
    clickTestId('select')
    await nextTick()
    expect(tree.emitted('update:modelValue')).toEqual([['docs']])
    expect(tree.emitted('update:expanded')).toHaveLength(1)
    // The select trigger labels the item; the chevron does not.
    const label = document.querySelector('[data-testid="select"]')
    expect(item('docs').getAttribute('aria-labelledby')).toBe(label?.id)
  })

  it('only selects on row clicks when expandOnClick is false', async () => {
    const tree = mountActions(['both'], { expandOnClick: false })
    clickTestId('both')
    await nextTick()
    expect(tree.emitted('update:modelValue')).toEqual([['docs']])
    expect(tree.emitted('update:expanded')).toBeUndefined()
  })

  it('ignores clicks on disabled items', async () => {
    const tree = mountActions(['both'], { disabled: true })
    clickTestId('both')
    item('docs').click()
    await nextTick()
    expect(tree.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('GhostTree focus recovery and dynamic items', () => {
  it('moves focus to the closest visible ancestor when a controlled ancestor collapses', async () => {
    const expanded = ref(['docs', 'guides'])
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Files', expanded: expanded.value },
              { default: () => renderNodes(FILES) },
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    item('intro').focus()
    await nextTick()
    expanded.value = []
    await nextTick()
    expect(focused()).toBe('docs')
    expect(tabStops()).toEqual(['docs'])
  })

  it('recovers the tab stop to the next item when the focused item unmounts without emitting', async () => {
    const nodes = ref<TreeNode[]>([...FILES])
    const wrapper = mountTree({}, nodes)
    const tree = wrapper.findComponent(GhostTree)
    item('src').focus()
    await nextTick()
    nodes.value = nodes.value.filter((node) => node.value !== 'src')
    await nextTick()
    await nextTick()
    expect(focused()).toBe('license')
    expect(tabStops()).toEqual(['license'])
    expect(tree.emitted('update:modelValue')).toBeUndefined()
    expect(tree.emitted('update:expanded')).toBeUndefined()
  })

  it('recovers to the previous item when the last focused item unmounts', async () => {
    const nodes = ref<TreeNode[]>([...FILES])
    mountTree({}, nodes)
    item('license').focus()
    await nextTick()
    nodes.value = nodes.value.slice(0, 2)
    await nextTick()
    await nextTick()
    expect(focused()).toBe('src')
  })

  it('recovers out of a removed subtree when a focused descendant unmounts with its parent', async () => {
    const nodes = ref<TreeNode[]>([...FILES])
    mountTree({ defaultExpanded: ['docs'] }, nodes)
    item('readme').focus()
    await nextTick()
    nodes.value = nodes.value.filter((node) => node.value !== 'docs')
    await nextTick()
    await nextTick()
    expect(focused()).toBe('src')
  })

  it('navigates in rendered order after keyed reorder and insertion', async () => {
    const nodes = ref<TreeNode[]>([...FILES])
    mountTree({}, nodes)
    item('src').focus()
    await nextTick()
    nodes.value = [{ value: 'new', label: 'New' }, ...[...FILES].reverse()]
    await nextTick()
    // The roving stop survives the move; DOM focus may not (moving a focused
    // node is a remove + insert), so re-focus it like a user tabbing back.
    expect(tabStops()).toEqual(['src'])
    item('src').focus()
    await pressActive('ArrowDown')
    expect(focused()).toBe('docs')
    await pressActive('Home')
    expect(focused()).toBe('new')
  })

  it('preserves the tab stop when async children mount into an open branch', async () => {
    const nodes = ref<TreeNode[]>([
      { value: 'remote', label: 'Remote', children: [] },
      { value: 'local', label: 'Local' },
    ])
    mountTree({ defaultExpanded: ['remote'] }, nodes)
    item('local').focus()
    await nextTick()
    nodes.value = [
      {
        value: 'remote',
        label: 'Remote',
        children: [{ value: 'loaded', label: 'Loaded' }],
      },
      { value: 'local', label: 'Local' },
    ]
    await nextTick()
    expect(tabStops()).toEqual(['local'])
    await pressActive('ArrowUp')
    expect(focused()).toBe('loaded')
  })
})

describe('GhostTree typeahead', () => {
  it('matches visible labels, cycles repeated characters, and resets after 500ms', async () => {
    vi.useFakeTimers()
    mountTree({ defaultExpanded: ['src'] }, [
      { value: 'alpha', label: 'Alpha' },
      { value: 'apple', label: 'Apple' },
      {
        value: 'src',
        label: 'Src',
        children: [{ value: 'avocado', label: 'Avocado' }],
      },
      {
        value: 'closed',
        label: 'Closed',
        children: [{ value: 'apricot', label: 'Apricot' }],
      },
    ])
    item('alpha').focus()
    await pressActive('a')
    expect(focused()).toBe('apple')
    await pressActive('a')
    expect(focused()).toBe('avocado')
    // Collapsed descendants (`apricot`) are never matched.
    await pressActive('a')
    expect(focused()).toBe('alpha')
    vi.advanceTimersByTime(500)
    await pressActive('s')
    expect(focused()).toBe('src')
    await pressActive('r')
    // Extending the prefix keeps the active match.
    expect(focused()).toBe('src')
    vi.advanceTimersByTime(499)
    await pressActive('x')
    expect(focused()).toBe('src')
    vi.advanceTimersByTime(500)
    const ime = await pressActive('c', { isComposing: true })
    expect(ime.defaultPrevented).toBe(false)
    expect(focused()).toBe('src')
    await pressActive('c')
    expect(focused()).toBe('closed')
  })

  it('treats Space as part of an active query and uses textValue overrides', async () => {
    vi.useFakeTimers()
    const wrapper = mountTree({}, [
      { value: 'new-folder', label: 'New folder' },
      { value: 'new-file', label: 'New file' },
      { value: 'readme', label: '📄', textValue: 'Readme' },
    ])
    const tree = wrapper.findComponent(GhostTree)
    item('new-folder').focus()
    for (const key of ['n', 'e', 'w', ' ', 'f', 'i']) {
      await pressActive(key)
    }
    expect(focused()).toBe('new-file')
    expect(tree.emitted('update:modelValue')).toBeUndefined()
    vi.advanceTimersByTime(500)
    await pressActive('r')
    expect(focused()).toBe('readme')
    vi.advanceTimersByTime(500)
    // `*` inside an active query is a character, not sibling expansion.
    await pressActive('n')
    await pressActive('*')
    expect(tree.emitted('update:expanded')).toBeUndefined()
  })

  it('reads the item text excluding nested groups when there is no trigger', async () => {
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { 'aria-label': 'Plain' },
              {
                default: () => [
                  h(
                    GhostTreeItem,
                    { value: 'one' },
                    {
                      default: () => [
                        h('span', { 'aria-hidden': 'true' }, 'x'),
                        'Zebra',
                      ],
                    },
                  ),
                  h(GhostTreeItem, { value: 'two' }, { default: () => 'Yak' }),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    item('two').focus()
    await pressActive('z')
    expect(focused()).toBe('one')
  })
})

describe('GhostTree exposed refs', () => {
  it('exposes element, focus, and blur on every part', async () => {
    const treeRef = ref<GhostTreeExposed | null>(null)
    const itemRef = ref<GhostTreeItemExposed | null>(null)
    const triggerRef = ref<GhostTreeTriggerExposed | null>(null)
    const groupRef = ref<GhostTreeGroupExposed | null>(null)
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { ref: treeRef, 'aria-label': 'Files', defaultValue: 'b' },
              {
                default: () => [
                  h(GhostTreeItem, { value: 'a' }, { default: () => 'A' }),
                  h(
                    GhostTreeItem,
                    { ref: itemRef, value: 'b' },
                    {
                      default: () => [
                        h(
                          GhostTreeTrigger,
                          { ref: triggerRef },
                          {
                            default: () => 'B',
                          },
                        ),
                        h(
                          GhostTreeGroup,
                          { ref: groupRef },
                          {
                            default: () => null,
                          },
                        ),
                      ],
                    },
                  ),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    await nextTick()
    expect(treeRef.value?.element).toBe(treeRoot())
    treeRef.value?.focus()
    expect(focused()).toBe('b')
    treeRef.value?.blur()
    itemRef.value?.focus()
    expect(focused()).toBe('b')
    itemRef.value?.blur()
    expect(document.activeElement).toBe(document.body)
    triggerRef.value?.focus()
    expect(focused()).toBe('b')
    triggerRef.value?.blur()
    expect(triggerRef.value?.element?.getAttribute('data-part')).toBe('trigger')
    expect(groupRef.value?.element?.getAttribute('role')).toBe('group')
    groupRef.value?.focus()
    groupRef.value?.blur()
    expect(itemRef.value?.element).toBe(item('b'))
  })

  it('renders custom `as` targets', () => {
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTree,
              { as: 'div', 'aria-label': 'Div tree' },
              {
                default: () =>
                  h(
                    GhostTreeItem,
                    { as: 'div', value: 'a' },
                    {
                      default: () => [
                        h(
                          GhostTreeTrigger,
                          { as: 'div' },
                          { default: () => 'A' },
                        ),
                        h(
                          GhostTreeGroup,
                          { as: 'div' },
                          { default: () => null },
                        ),
                      ],
                    },
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    expect(treeRoot().tagName).toBe('DIV')
    expect(item('a').tagName).toBe('DIV')
  })
})

describe('resolveTreeDir', () => {
  it('prefers explicit, then closest [dir], then <html dir>, then ltr', () => {
    const outer = document.createElement('div')
    outer.setAttribute('dir', 'rtl')
    const auto = document.createElement('div')
    auto.setAttribute('dir', 'auto')
    const inner = document.createElement('div')
    outer.append(auto)
    auto.append(inner)
    document.body.append(outer)
    expect(resolveTreeDir('ltr', inner)).toBe('ltr')
    expect(resolveTreeDir(undefined, inner)).toBe('rtl')
    expect(resolveTreeDir(undefined, null)).toBe('ltr')
    document.documentElement.setAttribute('dir', 'rtl')
    expect(resolveTreeDir(undefined)).toBe('rtl')
  })
})
