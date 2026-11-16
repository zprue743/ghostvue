import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
  GhostPopover,
  GhostPopoverContent,
  GhostPopoverTrigger,
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from './index'

describe('themed floating content class merging', () => {
  it('merges consumer classes onto themed GhostPopoverContent', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostPopover,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Toggle'),
                h(
                  GhostPopoverContent,
                  {
                    portal: false,
                    class: ['consumer-surface', { 'extra-flag': true }],
                  },
                  () => 'Popover body',
                ),
              ],
            },
          ),
      }),
    )

    await flushPromises()
    await nextTick()

    const content = wrapper.get('[data-part="content"]')
    expect(content.attributes('data-themed')).toBe('')
    expect(content.classes()).toContain('ghost-popover-content')
    expect(content.classes()).toContain('consumer-surface')
    expect(content.classes()).toContain('extra-flag')
    wrapper.unmount()
  })

  it('merges consumer classes onto themed GhostTooltipContent', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostTooltip,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostTooltipTrigger, null, () => 'Anchor'),
                h(
                  GhostTooltipContent,
                  {
                    portal: false,
                    class: 'consumer-surface',
                  },
                  () => 'Tooltip hint',
                ),
              ],
            },
          ),
      }),
    )

    await flushPromises()
    await nextTick()

    const content = wrapper.get('[data-part="content"]')
    expect(content.attributes('data-themed')).toBe('')
    expect(content.classes()).toContain('ghost-tooltip-content')
    expect(content.classes()).toContain('consumer-surface')
    wrapper.unmount()
  })

  it('merges consumer classes onto themed GhostHoverCardContent', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostHoverCard,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostHoverCardTrigger, null, () => 'Anchor'),
                h(
                  GhostHoverCardContent,
                  {
                    portal: false,
                    class: { 'consumer-surface': true, ignored: false },
                  },
                  () => 'Hover card preview',
                ),
              ],
            },
          ),
      }),
    )

    await flushPromises()
    await nextTick()

    const content = wrapper.get('[data-part="content"]')
    expect(content.attributes('data-themed')).toBe('')
    expect(content.classes()).toContain('ghost-hover-card-content')
    expect(content.classes()).toContain('consumer-surface')
    expect(content.classes()).not.toContain('ignored')
    wrapper.unmount()
  })
})
