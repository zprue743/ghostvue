import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostFileUpload as GhostUnstyledFileUpload,
  type GhostFileUploadEntry,
  type GhostFileUploadExposed,
  type GhostFileUploadMessages,
  type GhostFileUploadRejection,
  type GhostFileUploadSlotProps,
  type GhostFileUploadValidate,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostFileUpload} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled
 * primitive. The root only gains `data-themed`, which scopes
 * `ghost-file-upload.css` to the themed family.
 */
export const GhostFileUpload = defineComponent({
  name: 'GhostFileUpload',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Array as PropType<File[] | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: Array as PropType<File[]>,
      default: () => [],
    },
    accept: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    maxFiles: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    maxFileSize: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    validate: {
      type: Function as PropType<GhostFileUploadValidate | undefined>,
      default: undefined,
    },
    disabled: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    name: { type: String as PropType<string | undefined>, default: undefined },
    form: { type: String as PropType<string | undefined>, default: undefined },
    id: { type: String as PropType<string | undefined>, default: undefined },
    messages: {
      type: Object as PropType<Partial<GhostFileUploadMessages> | undefined>,
      default: undefined,
    },
    preventDocumentDrop: { type: Boolean, default: true },
  },
  emits: {
    'update:modelValue': (files: File[]) => Array.isArray(files),
    reject: (rejections: GhostFileUploadRejection[]) =>
      Array.isArray(rejections),
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostFileUploadExposed | null>(null)

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
      openPicker() {
        inner.value?.openPicker()
      },
      clear() {
        inner.value?.clear()
      },
    } satisfies GhostFileUploadExposed)

    return () =>
      h(
        GhostUnstyledFileUpload,
        {
          ...attrs,
          ref: inner,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          accept: props.accept,
          maxFiles: props.maxFiles,
          maxFileSize: props.maxFileSize,
          validate: props.validate,
          disabled: props.disabled,
          invalid: props.invalid,
          required: props.required,
          name: props.name,
          form: props.form,
          id: props.id,
          messages: props.messages,
          preventDocumentDrop: props.preventDocumentDrop,
          'data-themed': '',
          'onUpdate:modelValue': (files: File[]) => {
            emit('update:modelValue', files)
          },
          onReject: (rejections: GhostFileUploadRejection[]) => {
            emit('reject', rejections)
          },
        },
        slots as {
          default?: (slotProps: GhostFileUploadSlotProps) => unknown
        },
      )
  },
})

export type {
  GhostFileUploadEntry,
  GhostFileUploadExposed,
  GhostFileUploadMessages,
  GhostFileUploadRejection,
  GhostFileUploadSlotProps,
  GhostFileUploadValidate,
}
