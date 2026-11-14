import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostAccordion as GhostUnstyledAccordion,
  GhostAccordionContent as GhostUnstyledAccordionContent,
  GhostAccordionItem as GhostUnstyledAccordionItem,
  GhostAccordionTrigger as GhostUnstyledAccordionTrigger,
  type GhostAccordionHeadingLevel,
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

export const GhostAccordionItem = defineComponent({
  name: 'GhostAccordionItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () => h(GhostUnstyledAccordionItem, { ...attrs, ...props }, slots)
  },
})

export const GhostAccordionTrigger = defineComponent({
  name: 'GhostAccordionTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<string | object>,
      default: 'button',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostAccordionTriggerExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostAccordionTriggerExposed)

    return () =>
      h(
        GhostUnstyledAccordionTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})

export const GhostAccordionContent = defineComponent({
  name: 'GhostAccordionContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<string | object>,
      default: 'div',
    },
    disableAnimation: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledAccordionContent,
        {
          ...attrs,
          as: props.as,
          disableAnimation: props.disableAnimation,
          'data-themed': '',
        },
        slots,
      )
  },
})

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
} from '@ghostvue/vue'
