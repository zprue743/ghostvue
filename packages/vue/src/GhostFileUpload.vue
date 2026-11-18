<script setup lang="ts">
import {
  computed,
  inject,
  mergeProps,
  provide,
  shallowRef,
  toRef,
  useAttrs,
  useTemplateRef,
} from 'vue'

import { useNativeFormReset } from './form-reset'
import { ghostFieldContextKey } from './ghost-field'
import {
  ghostFileUploadContextKey,
  type GhostFileUploadExposed,
  type GhostFileUploadMessages,
  type GhostFileUploadRejection,
  type GhostFileUploadSlotProps,
  type GhostFileUploadValidate,
} from './ghost-file-upload'
import { useGhostFileUpload } from './use-ghost-file-upload'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Controlled list. `undefined` is uncontrolled; `[]` is a real empty value. */
    modelValue?: File[] | undefined
    /** Uncontrolled seed and form-reset baseline, captured once at setup. */
    defaultValue?: File[]
    /** Native `accept` grammar: a picker hint that is also enforced on intake. */
    accept?: string | undefined
    /** Total list capacity. Floored; not finite or below 1 is unlimited. `1` turns `multiple` off. */
    maxFiles?: number | undefined
    /** Per-file limit in bytes; equal is accepted. Not finite or negative is unset. */
    maxFileSize?: number | undefined
    /** Synchronous, pure check after `accept` and `maxFileSize`; return a string to reject. */
    validate?: GhostFileUploadValidate | undefined
    /** Disables the trigger, drops, and remove buttons, and omits the mirror from submit. */
    disabled?: boolean
    /** Consumer validity, combined with native constraint failure. */
    invalid?: boolean
    /** Native `required` on the form mirror when `name` is set. */
    required?: boolean
    /** Form mirror `name`. Without it no mirror renders and nothing is submitted. */
    name?: string | undefined
    /** `form` attribute for the mirror and the picker. */
    form?: string | undefined
    /** Id of the trigger (the labelable control), not of the root element. */
    id?: string | undefined
    /** Typed, reactive overrides of announcement and label text. */
    messages?: Partial<GhostFileUploadMessages> | undefined
    /** Cancel file drags and drops outside every dropzone while an enabled dropzone is mounted. */
    preventDocumentDrop?: boolean
  }>(),
  {
    modelValue: undefined,
    defaultValue: () => [],
    accept: undefined,
    maxFiles: undefined,
    maxFileSize: undefined,
    validate: undefined,
    disabled: false,
    invalid: false,
    required: false,
    name: undefined,
    form: undefined,
    id: undefined,
    messages: undefined,
    preventDocumentDrop: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: File[]]
  reject: [rejections: GhostFileUploadRejection[]]
}>()

defineSlots<{
  default(props: GhostFileUploadSlotProps): unknown
}>()

const attrs = useAttrs()
const rootRef = useTemplateRef<HTMLElement>('root')
const pickerRef = useTemplateRef<HTMLInputElement>('picker')
const mirrorRef = useTemplateRef<HTMLInputElement>('mirror')
const triggerElement = shallowRef<HTMLElement | null>(null)

const upload = useGhostFileUpload({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  accept: () => props.accept,
  maxFiles: () => props.maxFiles,
  maxFileSize: () => props.maxFileSize,
  validate: toRef(props, 'validate'),
  disabled: () => props.disabled,
  invalid: () => props.invalid,
  required: () => props.required,
  name: () => props.name,
  form: () => props.form,
  messages: () => props.messages,
  preventDocumentDrop: () => props.preventDocumentDrop,
  id: () => props.id,
  picker: pickerRef,
  mirror: mirrorRef,
  trigger: triggerElement,
  onChange: (files) => {
    emit('update:modelValue', files)
  },
  onReject: (rejections) => {
    emit('reject', rejections)
  },
})

// The mirror owns reset when it exists; otherwise the picker (both are
// form-associated), so reset and external `form` work with or without `name`.
useNativeFormReset(
  () => mirrorRef.value ?? pickerRef.value,
  upload.applyFormReset,
)

// Read-only and optional: only the Field label id, for the trigger's composed
// accessible name. The component works without a Field.
const field = inject(ghostFieldContextKey, null)

provide(ghostFileUploadContextKey, {
  upload,
  triggerId: computed(() => upload.triggerProps.value.id),
  describedBy: computed(() => {
    const value = attrs['aria-describedby']
    return typeof value === 'string' && value.length > 0 ? value : undefined
  }),
  fieldLabelId: computed(() => field?.labelId.value),
  messages: computed(() => props.messages),
  setTriggerElement(element) {
    triggerElement.value = element
  },
})

const rootBindings = computed(() => {
  // `aria-describedby` belongs to the trigger (it is routed through context);
  // `aria-invalid` from GhostFieldControl is ignored in favor of `invalid`.
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'aria-describedby' && key !== 'aria-invalid') {
      rest[key] = value
    }
  }
  return mergeProps(rest, {
    class: 'ghost-file-upload',
    'data-part': 'root',
    'data-state': upload.isInvalid.value
      ? 'invalid'
      : upload.isDisabled.value
        ? 'disabled'
        : undefined,
  })
})

const slotProps = computed((): GhostFileUploadSlotProps => ({
  entries: upload.entries.value,
  rejections: upload.rejections.value,
  remaining: upload.remaining.value,
  invalid: upload.isInvalid.value,
  openPicker: upload.openPicker,
  remove: upload.remove,
  clear: upload.clear,
  clearRejections: upload.clearRejections,
}))

const { pickerProps, mirrorProps, liveRegionProps, announcement } = upload

defineExpose<GhostFileUploadExposed>({
  get element() {
    return rootRef.value
  },
  focus(options?: FocusOptions) {
    triggerElement.value?.focus(options)
  },
  blur() {
    triggerElement.value?.blur()
  },
  openPicker: upload.openPicker,
  clear: upload.clear,
})
</script>

<template>
  <div ref="root" v-bind="rootBindings">
    <slot v-bind="slotProps" />
    <input ref="picker" v-bind="pickerProps" />
    <input v-if="name" ref="mirror" v-bind="mirrorProps" />
    <!-- Always mounted so the first announcement is not lost; empty on the server. -->
    <div v-bind="liveRegionProps">
      <span v-if="announcement.text" :key="announcement.key">{{
        announcement.text
      }}</span>
    </div>
  </div>
</template>
