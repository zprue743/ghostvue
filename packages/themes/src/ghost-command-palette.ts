import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCommandPalette as GhostUnstyledCommandPalette,
  type GhostComboboxMessages,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteExposed,
  type GhostCommandPaletteSearchPayload,
  type GhostCommandPaletteSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostCommandPalette} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled
 * primitive, including the exposed `open()`, `close()`, and `focusInput()`.
 */
export const GhostCommandPalette = defineComponent({
  name: 'GhostCommandPalette',
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultOpen: { type: Boolean, default: false },
    search: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    defaultSearch: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    modal: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    closeOnSelect: { type: Boolean, default: true },
    closeOnEscape: { type: Boolean, default: true },
    messages: {
      type: Object as PropType<GhostComboboxMessages | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
    'update:search': (search: string) => typeof search === 'string',
    search: (payload: GhostCommandPaletteSearchPayload) =>
      typeof payload.requestId === 'number',
    command: (payload: GhostCommandPaletteCommandPayload) =>
      typeof payload.id === 'string',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostCommandPaletteExposed | null>(null)

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
      open() {
        inner.value?.open()
      },
      close() {
        inner.value?.close()
      },
      focusInput() {
        inner.value?.focusInput()
      },
    } satisfies GhostCommandPaletteExposed)

    // Same technique as the themed GhostTree: keeping the object-payload
    // forwarder out of the literal props object stops type-aware tooling from
    // resolving `h()` to the intrinsic-element overload.
    const eventForwarders: Record<string, unknown> = {
      onCommand: (payload: GhostCommandPaletteCommandPayload) => {
        emit('command', payload)
      },
    }

    return () =>
      h(
        GhostUnstyledCommandPalette,
        {
          ...attrs,
          ref: inner,
          open: props.open,
          defaultOpen: props.defaultOpen,
          search: props.search,
          defaultSearch: props.defaultSearch,
          loading: props.loading,
          modal: props.modal,
          disabled: props.disabled,
          closeOnSelect: props.closeOnSelect,
          closeOnEscape: props.closeOnEscape,
          messages: props.messages,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
          'onUpdate:search': (next: string) => {
            emit('update:search', next)
          },
          onSearch: (payload: GhostCommandPaletteSearchPayload) => {
            emit('search', payload)
          },
          ...eventForwarders,
        },
        slots as {
          default?: (slotProps: GhostCommandPaletteSlotProps) => unknown
        },
      )
  },
})

export type {
  GhostCommandPaletteCommandPayload,
  GhostCommandPaletteExposed,
  GhostCommandPaletteSearchPayload,
  GhostCommandPaletteSlotProps,
}
