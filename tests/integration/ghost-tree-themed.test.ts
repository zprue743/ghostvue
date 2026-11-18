import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
  type GhostTreeExposed,
  type GhostTreeGroupExposed,
  type GhostTreeItemExposed,
  type GhostTreeSelectPayload,
  type GhostTreeTogglePayload,
  type GhostTreeTriggerExposed,
  type GhostTreeValue,
} from '../../packages/themes/src/index'

function themedFixture(rootProps: Record<string, unknown> = {}) {
  const refs = {
    tree: ref<GhostTreeExposed | null>(null),
    item: ref<GhostTreeItemExposed | null>(null),
    trigger: ref<GhostTreeTriggerExposed | null>(null),
    group: ref<GhostTreeGroupExposed | null>(null),
  }
  const component = defineComponent({
    setup: () => () =>
      h(
        GhostTree,
        {
          ref: refs.tree,
          'aria-label': 'Themed files',
          class: 'consumer-tree',
          ...rootProps,
        },
        () => [
          h(
            GhostTreeItem,
            {
              ref: refs.item,
              value: 'docs',
              class: 'consumer-item',
              style: { color: 'red' },
            },
            () => [
              h(GhostTreeTrigger, { ref: refs.trigger }, () => 'Docs'),
              h(
                GhostTreeGroup,
                { ref: refs.group, class: 'consumer-group' },
                () => [
                  h(
                    GhostTreeItem,
                    { value: 'readme', textValue: 'Readme' },
                    () =>
                      h(GhostTreeTrigger, { action: 'select' }, () => 'Readme'),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
  })
  return { component, refs }
}

describe('themed GhostTree', () => {
  it('marks every part as themed, merges consumer class/style, and exposes elements', async () => {
    const { component, refs } = themedFixture()
    const wrapper = mount(component, { attachTo: document.body })
    const root = wrapper.get('[role="tree"]')
    expect(root.attributes('data-themed')).toBe('')
    expect(root.classes()).toEqual(
      expect.arrayContaining(['ghost-tree', 'consumer-tree']),
    )
    const item = wrapper.get('[data-ghost-tree-value="docs"]')
    expect(item.attributes('data-themed')).toBe('')
    expect(item.classes()).toEqual(
      expect.arrayContaining(['ghost-tree-item', 'consumer-item']),
    )
    expect(item.attributes('style')).toContain('--ghost-tree-level: 1')
    expect(item.attributes('style')).toContain('color: red')
    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('data-themed')).toBe('')
    expect(item.attributes('aria-labelledby')).toBe(trigger.attributes('id'))
    const group = wrapper.get('[role="group"]')
    expect(group.attributes('data-themed')).toBe('')
    expect(group.classes()).toContain('consumer-group')
    expect(item.attributes('aria-controls')).toBe(group.attributes('id'))

    expect(refs.tree.value?.element).toBe(root.element)
    expect(refs.item.value?.element).toBe(item.element)
    expect(refs.trigger.value?.element).toBe(trigger.element)
    expect(refs.group.value?.element).toBe(group.element)

    refs.tree.value?.focus()
    expect(document.activeElement).toBe(item.element)
    refs.tree.value?.blur()
    refs.trigger.value?.focus()
    expect(document.activeElement).toBe(item.element)
    refs.trigger.value?.blur()
    refs.item.value?.focus()
    refs.item.value?.blur()
    refs.group.value?.focus()
    refs.group.value?.blur()
    expect(document.activeElement).toBe(document.body)

    await trigger.trigger('click')
    await nextTick()
    expect(item.attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('forwards props and every event through the themed root', async () => {
    const events: {
      model: GhostTreeValue[]
      expanded: string[][]
      select: GhostTreeSelectPayload[]
      toggle: GhostTreeTogglePayload[]
    } = { model: [], expanded: [], select: [], toggle: [] }
    const { component } = themedFixture({
      selectionMode: 'multiple',
      dir: 'rtl',
      loop: true,
      allowDeselect: true,
      expandOnClick: true,
      defaultExpanded: [],
      'onUpdate:modelValue': (value: GhostTreeValue) =>
        events.model.push(value),
      'onUpdate:expanded': (value: string[]) => events.expanded.push(value),
      onSelect: (payload: GhostTreeSelectPayload) =>
        events.select.push(payload),
      onToggle: (payload: GhostTreeTogglePayload) =>
        events.toggle.push(payload),
    })
    const wrapper = mount(component, { attachTo: document.body })
    const root = wrapper.get('[role="tree"]')
    expect(root.attributes('aria-multiselectable')).toBe('true')
    expect(root.attributes('data-dir')).toBe('rtl')
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await nextTick()
    expect(events.model).toEqual([['docs']])
    expect(events.expanded).toEqual([['docs']])
    expect(events.select).toEqual([{ value: 'docs', selected: true }])
    expect(events.toggle).toEqual([{ value: 'docs', expanded: true }])
    wrapper.unmount()
  })

  it('server-renders themed branch ARIA through the wrapper names', async () => {
    const { component } = themedFixture({ disabled: true })
    const html = await renderToString(h(component))
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="ghost-tree-group-')
    expect(html).toContain('aria-labelledby="ghost-tree-trigger-')
    expect(html).toContain('aria-disabled="true"')
  })
})
