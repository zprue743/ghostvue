import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
  type GhostAccordionTriggerExposed,
} from '../../packages/themes/src/index'

describe('themed GhostAccordion', () => {
  it('exposes the inner trigger through the themed trigger wrapper', () => {
    const triggerRef = ref<GhostAccordionTriggerExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostAccordion,
          { type: 'single' },
          {
            default: () =>
              h(GhostAccordionItem, { value: 'lane' }, () => [
                h(
                  GhostAccordionTrigger,
                  { ref: triggerRef, 'data-themed': '' },
                  () => 'Lane schedule',
                ),
                h(GhostAccordionContent, null, () => 'Cutoff times'),
              ]),
          },
        ),
    })
    const wrapper = mount(host)
    const exposed = triggerRef.value
    expect(exposed?.element).toBe(wrapper.get('[data-part="trigger"]').element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
