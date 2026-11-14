import { defineComponent, h, ref } from 'vue'

import {
  GhostField as GhostUnstyledField,
  type GhostFieldExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostField} wrapper. Behavior stays on the unstyled primitive. */
export const GhostField = defineComponent({
  name: 'GhostField',
  inheritAttrs: false,
  props: {
    id: {
      type: String,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    invalid: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostFieldExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostFieldExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledField,
          {
            ...attrs,
            ref: inner,
            id: props.id,
            disabled: props.disabled,
            invalid: props.invalid,
            required: props.required,
          },
          slots,
        ),
      ])
  },
})

export {
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  type GhostFieldControlSlotProps,
  type GhostFieldExposed,
  type GhostFieldLabelAssociate,
} from '@ghostvue/vue'
