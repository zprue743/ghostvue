import type {
  ComputedRef,
  CSSProperties,
  InjectionKey,
  MaybeRef,
  MaybeRefOrGetter,
  ShallowRef,
} from 'vue'

/** Why a file was not added. The first failing validation step decides. */
export type GhostFileUploadRejectionReason =
  'file-type' | 'file-too-large' | 'too-many-files' | 'custom'

/** Second argument of {@link GhostFileUploadValidate}. */
export interface GhostFileUploadValidateContext {
  /** Accepted files so far: the current list plus earlier accepted files of this batch. */
  readonly files: readonly File[]
}

/**
 * Synchronous, pure consumer check that runs after `accept` and `maxFileSize`
 * and before capacity. Return `null` or `undefined` to accept, or a string
 * (the rejection `code`, possibly empty) to reject. A throw propagates to
 * Vue's error handler and nothing from the batch is committed.
 */
export type GhostFileUploadValidate = (
  file: File,
  context: GhostFileUploadValidateContext,
) => string | null | undefined

/** Everything `messages.rejected` needs; also the basis of the public payload. */
export interface GhostFileUploadRejectionContext {
  file: File
  reason: GhostFileUploadRejectionReason
  /** The string returned by `validate` when `reason` is `'custom'`. */
  code?: string
  /** Present when `reason` is `'too-many-files'`. */
  maxFiles?: number
  /** Present when `reason` is `'file-too-large'`, in bytes. */
  maxFileSize?: number
  /** Present when `reason` is `'file-type'`. */
  accept?: string
}

/** One rejected file from an intake batch, emitted through `reject`. */
export interface GhostFileUploadRejection extends GhostFileUploadRejectionContext {
  /** English default from `messages.rejected`; localize through `messages`. */
  message: string
}

/** A list entry with a key for `v-for`. */
export interface GhostFileUploadEntry {
  /** Opaque, unique within a root, stable for a File instance; not for persistence. */
  id: string
  file: File
}

/**
 * Announcement and label text. Callbacks own pluralization. Overrides are
 * read when a message is produced, so a reactive object updates later
 * announcements. Returning an empty string omits that part of an announcement.
 */
export interface GhostFileUploadMessages {
  /** @default `1 file added.` / `{count} files added.` */
  added(count: number): string
  /** @default `{name} removed. {n} files remaining.` (with zero and one forms) */
  removed(file: File, remaining: number): string
  /** @default `All files removed.` */
  cleared(): string
  /** Per-reason sentence, also used as `GhostFileUploadRejection.message`. */
  rejected(rejection: GhostFileUploadRejectionContext): string
  /** Used when one intake has more than three rejections. @default `{count} files were not added.` */
  rejectedSummary(count: number): string
  /** Default accessible name of `GhostFileUploadItemRemove`. @default `Remove {name}` */
  removeLabel(file: File): string
}

/**
 * Props for the {@link GhostFileUpload} root. `aria-describedby` set on the
 * root is routed to the trigger; `aria-invalid` is ignored in favor of
 * `invalid`; every other attribute, `class`, `style`, and listener falls
 * through to the root element.
 */
export interface GhostFileUploadProps {
  /** Controlled list. `undefined` is uncontrolled; `[]` is a real empty value. */
  modelValue?: File[]
  /**
   * Uncontrolled seed and form-reset baseline, captured once at setup.
   * @default []
   */
  defaultValue?: File[]
  /** Native `accept` grammar; a picker hint that is also enforced on intake. */
  accept?: string
  /** Total list capacity. Floored; not finite or below 1 is unlimited. `1` turns `multiple` off. */
  maxFiles?: number
  /** Per-file limit in bytes (equal is accepted). Not finite or negative is unset. */
  maxFileSize?: number
  /** Synchronous, pure consumer check run after `accept` and `maxFileSize`. */
  validate?: GhostFileUploadValidate
  /** @default false */
  disabled?: boolean
  /** Consumer validity, combined with native constraint failure. @default false */
  invalid?: boolean
  /** Native `required` on the form mirror; no effect without `name`. @default false */
  required?: boolean
  /** Form mirror `name`. Without it nothing is submitted. */
  name?: string
  /** `form` attribute for the mirror and picker. */
  form?: string
  /** Id of the trigger (the labelable control), not of the root. */
  id?: string
  /** Typed, reactive overrides of announcement and label text. */
  messages?: Partial<GhostFileUploadMessages>
  /**
   * Cancel file drags and drops outside every dropzone while an enabled
   * dropzone is mounted, so a missed drop does not navigate away.
   * @default true
   */
  preventDocumentDrop?: boolean
}

/** Props for {@link GhostFileUploadTrigger}. */
export interface GhostFileUploadTriggerProps {
  /** Disables this trigger; combines with the root `disabled`. @default false */
  disabled?: boolean
}

/** Props for {@link GhostFileUploadItem}. */
export interface GhostFileUploadItemProps {
  /** The entry this item represents. */
  file: File
}

/** Root default slot props. */
export interface GhostFileUploadSlotProps {
  /** Current list with stable ids for `v-for` keys. */
  entries: readonly GhostFileUploadEntry[]
  /** Rejections from the most recent intake only. */
  rejections: readonly GhostFileUploadRejection[]
  /** `maxFiles` minus list length, never below 0; `undefined` when unlimited. */
  remaining: number | undefined
  /** Effective invalid state: `invalid` prop or native constraint failure. */
  invalid: boolean
  /** Opens the native picker. No-op when disabled. */
  openPicker: () => void
  /** Removes the first identical entry and applies the focus rule. */
  remove: (file: File) => void
  /** Empties the list and `rejections`, and announces it. */
  clear: () => void
  /** Empties `rejections` without touching the list. */
  clearRejections: () => void
}

/** {@link GhostFileUploadDropzone} default slot props. */
export interface GhostFileUploadDropzoneSlotProps {
  /** A file drag is over the dropzone. */
  dragging: boolean
}

/** Template ref contract of {@link GhostFileUpload}. */
export interface GhostFileUploadExposed {
  /** The root element. */
  readonly element: HTMLElement | null
  /** Focuses the trigger. */
  focus(options?: FocusOptions): void
  /** Blurs the trigger. */
  blur(): void
  /** Opens the native picker; call inside a user gesture. */
  openPicker(): void
  /** Same as the slot `clear`. */
  clear(): void
}

/** Template ref contract of {@link GhostFileUploadDropzone}. */
export interface GhostFileUploadDropzoneExposed {
  readonly element: HTMLElement | null
}

/** Template ref contract of {@link GhostFileUploadTrigger}. */
export interface GhostFileUploadTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Template ref contract of {@link GhostFileUploadList}. */
export interface GhostFileUploadListExposed {
  /** `null` while the list is empty (the list is not rendered). */
  readonly element: HTMLElement | null
}

/** Template ref contract of {@link GhostFileUploadItem}. */
export interface GhostFileUploadItemExposed {
  readonly element: HTMLElement | null
}

/** Template ref contract of {@link GhostFileUploadItemRemove}. */
export interface GhostFileUploadItemRemoveExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostFileUpload}. Every value may be a ref or getter. */
export interface UseGhostFileUploadOptions {
  modelValue?: MaybeRefOrGetter<File[] | undefined>
  defaultValue?: MaybeRefOrGetter<File[] | undefined>
  accept?: MaybeRefOrGetter<string | undefined>
  maxFiles?: MaybeRefOrGetter<number | undefined>
  maxFileSize?: MaybeRefOrGetter<number | undefined>
  /**
   * A function or a ref holding one. Not a getter: a bare function is the
   * validator itself, so pass `toRef(props, 'validate')` for a reactive prop.
   */
  validate?: MaybeRef<GhostFileUploadValidate | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  messages?: MaybeRefOrGetter<Partial<GhostFileUploadMessages> | undefined>
  /** @default true */
  preventDocumentDrop?: MaybeRefOrGetter<boolean | undefined>
  /** Id applied to the trigger props. Generated when omitted. */
  id?: MaybeRefOrGetter<string | undefined>
  /** Transient picker input (bind `pickerProps`). */
  picker?: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  /** Form mirror input (bind `mirrorProps` when `name` is set). */
  mirror?: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  /** Trigger button, focused on native invalid and as the last removal fallback. */
  trigger?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Synchronous list write; emit `update:modelValue` here. Receives a new array. */
  onChange?: (files: File[]) => void
  /** Once per intake with at least one rejection, after `onChange`. */
  onReject?: (rejections: GhostFileUploadRejection[]) => void
}

/** Bindings for the transient picker `input[type="file"]`. */
export interface GhostFileUploadPickerProps {
  type: 'file'
  hidden: true
  accept: string | undefined
  multiple: boolean
  form: string | undefined
  disabled: boolean
  tabindex: -1
  'data-part': 'picker'
  onChange: (event: Event) => void
  onClick: (event: MouseEvent) => void
}

/** Bindings for the visually hidden form mirror `input[type="file"]`. */
export interface GhostFileUploadMirrorProps {
  type: 'file'
  name: string | undefined
  form: string | undefined
  multiple: boolean
  required: boolean
  disabled: boolean
  tabindex: -1
  'aria-hidden': 'true'
  style: CSSProperties
  'data-part': 'form-input'
  onInvalid: (event: Event) => void
}

/** Bindings for a dropzone element. */
export interface GhostFileUploadDropzoneProps {
  class: 'ghost-file-upload-dropzone'
  'data-part': 'dropzone'
  'data-state': 'dragging' | 'invalid' | 'disabled' | undefined
  onDragenter: (event: DragEvent) => void
  onDragover: (event: DragEvent) => void
  onDragleave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  onClick: (event: MouseEvent) => void
}

/** Bindings for the trigger button. */
export interface GhostFileUploadTriggerBindings {
  id: string
  type: 'button'
  class: 'ghost-file-upload-trigger'
  disabled: boolean
  'aria-invalid': 'true' | undefined
  'data-part': 'trigger'
  'data-state': 'invalid' | 'disabled' | undefined
  onClick: (event: MouseEvent) => void
}

/** Bindings for the polite live region. */
export interface GhostFileUploadLiveRegionProps {
  role: 'status'
  'aria-live': 'polite'
  'aria-atomic': 'true'
  style: CSSProperties
  'data-part': 'announcer'
}

/** Latest announcement; `key` changes on every announcement. */
export interface GhostFileUploadAnnouncement {
  key: number
  text: string
}

/** A rendered item registered for the focus-after-removal rule. */
export interface GhostFileUploadItemRegistration {
  file: () => File
  element: () => HTMLElement | null
  removeButton: () => HTMLElement | null
}

/** Return value of {@link useGhostFileUpload}. */
export interface UseGhostFileUploadReturn {
  files: ComputedRef<File[]>
  entries: ComputedRef<readonly GhostFileUploadEntry[]>
  rejections: ShallowRef<readonly GhostFileUploadRejection[]>
  remaining: ComputedRef<number | undefined>
  isDisabled: ComputedRef<boolean>
  isInvalid: ComputedRef<boolean>
  isRequired: ComputedRef<boolean>
  isDragging: ShallowRef<boolean>
  announcement: ShallowRef<GhostFileUploadAnnouncement>
  /** Single intake path for the picker, drops, and consumer paste surfaces. */
  addFiles: (files: Iterable<File>) => void
  remove: (file: File) => void
  clear: () => void
  clearRejections: () => void
  openPicker: () => void
  applyFormReset: () => void
  /**
   * Call when a dropzone mounts (client only); returns its cleanup. While at
   * least one is registered, the root is enabled, and `preventDocumentDrop`
   * is not false, the shared document drop guard is installed.
   */
  registerDropzone: () => () => void
  /** Registers a rendered item for focus after removal; returns cleanup. */
  registerItem: (item: GhostFileUploadItemRegistration) => () => void
  pickerProps: ComputedRef<GhostFileUploadPickerProps>
  mirrorProps: ComputedRef<GhostFileUploadMirrorProps>
  dropzoneProps: ComputedRef<GhostFileUploadDropzoneProps>
  triggerProps: ComputedRef<GhostFileUploadTriggerBindings>
  liveRegionProps: ComputedRef<GhostFileUploadLiveRegionProps>
}

/** Internal context shared from the root to its parts. */
export interface GhostFileUploadContext {
  upload: UseGhostFileUploadReturn
  /** Trigger id from the root `id` prop or generated. */
  triggerId: ComputedRef<string>
  /** `aria-describedby` routed from the root attributes. */
  describedBy: ComputedRef<string | undefined>
  /** Field label id when inside `GhostField`, for the composed trigger name. */
  fieldLabelId: ComputedRef<string | undefined>
  messages: ComputedRef<Partial<GhostFileUploadMessages> | undefined>
  setTriggerElement: (element: HTMLElement | null) => void
}

/** Internal context from an item to its remove button. */
export interface GhostFileUploadItemContext {
  file: ComputedRef<File>
  setRemoveButton: (element: HTMLElement | null) => void
}

export const ghostFileUploadContextKey: InjectionKey<GhostFileUploadContext> =
  Symbol('ghost-file-upload')

export const ghostFileUploadItemContextKey: InjectionKey<GhostFileUploadItemContext> =
  Symbol('ghost-file-upload-item')
