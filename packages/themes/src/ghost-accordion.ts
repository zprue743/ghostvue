import { defineComponent, h, type PropType } from 'vue'

import {
  GhostAccordion as GhostUnstyledAccordion,
  type GhostAccordionContentElement,
  type GhostAccordionContentExposed,
  type GhostAccordionExposed,
  type GhostAccordionHeadingLevel,
  type GhostAccordionItemProps,
  type GhostAccordionTriggerElement,
  type GhostAccordionTriggerExposed,
  type GhostAccordionType,
  type GhostAccordionValue,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostAccordion} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostAccordion = defineComponent({
  name: 'GhostAccordion',
  inheritAttrs: false,
  props: {
    type: {
      type: String as PropType<GhostAccordionType>,
      default: 'single',
    },
    collapsible: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [String, Array] as PropType<GhostAccordionValue>,
      default: undefined,
    },
    defaultValue: {
      type: [String, Array] as PropType<GhostAccordionValue>,
      default: undefined,
    },
    headingLevel: {
      type: Number as PropType<GhostAccordionHeadingLevel>,
      default: 3,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledAccordion,
        {
          ...attrs,
          type: props.type,
          collapsible: props.collapsible,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          headingLevel: props.headingLevel,
          disabled: props.disabled,
          'onUpdate:modelValue': (next: GhostAccordionValue) => {
            emit('update:modelValue', next)
          },
        },
        slots,
      )
  },
})

export { GhostAccordionItem } from './ghost-accordion-item'
export { GhostAccordionTrigger } from './ghost-accordion-trigger'
export { GhostAccordionContent } from './ghost-accordion-content'

export type {
  GhostAccordionContentElement,
  GhostAccordionContentExposed,
  GhostAccordionExposed,
  GhostAccordionHeadingLevel,
  GhostAccordionItemProps,
  GhostAccordionTriggerElement,
  GhostAccordionTriggerExposed,
  GhostAccordionType,
  GhostAccordionValue,
}
