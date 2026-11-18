import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTree as GhostUnstyledTree,
  type GhostTreeDirection,
  type GhostTreeElement,
  type GhostTreeExposed,
  type GhostTreeSelectionMode,
  type GhostTreeSelectPayload,
  type GhostTreeSlotProps,
  type GhostTreeTogglePayload,
  type GhostTreeValue,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTree} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostTree = defineComponent({
  name: 'GhostTree',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTreeElement>,
      default: 'ul',
    },
    selectionMode: {
      type: String as PropType<GhostTreeSelectionMode>,
      default: 'single',
    },
    modelValue: {
      type: [String, Array] as PropType<GhostTreeValue>,
      default: undefined,
    },
    defaultValue: {
      type: [String, Array] as PropType<GhostTreeValue>,
      default: undefined,
    },
    expanded: {
      type: Array as PropType<string[] | undefined>,
      default: undefined,
    },
    defaultExpanded: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    allowDeselect: { type: Boolean, default: false },
    expandOnClick: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },
    dir: {
      type: String as PropType<GhostTreeDirection | undefined>,
      default: undefined,
    },
    disabled: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (value: GhostTreeValue) =>
      value === undefined || typeof value === 'string' || Array.isArray(value),
    'update:expanded': (expanded: string[]) => Array.isArray(expanded),
    select: (payload: GhostTreeSelectPayload) => typeof payload === 'object',
    toggle: (payload: GhostTreeTogglePayload) => typeof payload === 'object',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostTreeExposed | null>(null)

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
    } satisfies GhostTreeExposed)

    // `select` / `toggle` share names with native DOM events. Keeping their
    // forwarders out of the literal props object stops TypeScript from
    // resolving `h()` to the intrinsic-element overload.
    const semanticEventForwarders: Record<string, unknown> = {
      onSelect: (payload: GhostTreeSelectPayload) => {
        emit('select', payload)
      },
      onToggle: (payload: GhostTreeTogglePayload) => {
        emit('toggle', payload)
      },
    }

    return () =>
      h(
        GhostUnstyledTree,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          selectionMode: props.selectionMode,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          expanded: props.expanded,
          defaultExpanded: props.defaultExpanded,
          allowDeselect: props.allowDeselect,
          expandOnClick: props.expandOnClick,
          loop: props.loop,
          dir: props.dir,
          disabled: props.disabled,
          'data-themed': '',
          'onUpdate:modelValue': (next: GhostTreeValue) => {
            emit('update:modelValue', next)
          },
          'onUpdate:expanded': (next: string[]) => {
            emit('update:expanded', next)
          },
          ...semanticEventForwarders,
        },
        slots as {
          default?: (slotProps: GhostTreeSlotProps) => unknown
        },
      )
  },
})

export type {
  GhostTreeDirection,
  GhostTreeExposed,
  GhostTreeSelectionMode,
  GhostTreeSelectPayload,
  GhostTreeSlotProps,
  GhostTreeTogglePayload,
  GhostTreeValue,
}
