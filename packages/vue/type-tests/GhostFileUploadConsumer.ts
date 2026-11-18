import {
  useGhostFileUpload,
  type GhostFileUpload,
  type GhostFileUploadDropzoneExposed,
  type GhostFileUploadDropzoneSlotProps,
  type GhostFileUploadEntry,
  type GhostFileUploadExposed,
  type GhostFileUploadItem,
  type GhostFileUploadItemRemoveExposed,
  type GhostFileUploadListExposed,
  type GhostFileUploadMessages,
  type GhostFileUploadProps,
  type GhostFileUploadRejection,
  type GhostFileUploadRejectionReason,
  type GhostFileUploadSlotProps,
  type GhostFileUploadTrigger,
  type GhostFileUploadTriggerExposed,
  type GhostFileUploadValidate,
} from '../src'

const report = new File(['x'], 'report.pdf', { type: 'application/pdf' })

const validate: GhostFileUploadValidate = (file, { files }) =>
  files.some((existing) => existing.name === file.name) ? 'duplicate' : null

const props = {
  modelValue: [report],
  defaultValue: [],
  accept: '.pdf,image/*',
  maxFiles: 3,
  maxFileSize: 5_000_000,
  validate,
  disabled: false,
  invalid: false,
  required: true,
  name: 'attachments',
  form: 'checkout',
  id: 'attachments-trigger',
  // Partial overrides are enough.
  messages: { added: (count: number) => `${String(count)} added` },
  preventDocumentDrop: false,
} satisfies GhostFileUploadProps

const componentProps: InstanceType<typeof GhostFileUpload>['$props'] = props
const triggerProps: InstanceType<typeof GhostFileUploadTrigger>['$props'] = {
  disabled: true,
}
const itemProps: InstanceType<typeof GhostFileUploadItem>['$props'] = {
  file: report,
}

const messages: Partial<GhostFileUploadMessages> = {
  rejected: ({ file, reason }) => `${file.name}: ${reason}`,
  removeLabel: (file) => `Delete ${file.name}`,
}

const reason: GhostFileUploadRejectionReason = 'too-many-files'
const rejection: GhostFileUploadRejection = {
  file: report,
  reason,
  maxFiles: 1,
  message: 'report.pdf was not added.',
}
const entry: GhostFileUploadEntry = { id: 'file-0', file: report }

function useSlot(slot: GhostFileUploadSlotProps) {
  const remaining: number | undefined = slot.remaining
  slot.remove(slot.entries[0]?.file ?? report)
  slot.openPicker()
  slot.clear()
  slot.clearRejections()
  const reasons: GhostFileUploadRejectionReason[] = slot.rejections.map(
    (item) => item.reason,
  )
  void remaining
  void reasons
}

function useDropzoneSlot(slot: GhostFileUploadDropzoneSlotProps) {
  const dragging: boolean = slot.dragging
  void dragging
}

function useExposed(
  root: GhostFileUploadExposed,
  trigger: GhostFileUploadTriggerExposed,
  remove: GhostFileUploadItemRemoveExposed,
  list: GhostFileUploadListExposed,
  dropzone: GhostFileUploadDropzoneExposed,
) {
  root.focus({ preventScroll: true })
  root.blur()
  root.openPicker()
  root.clear()
  trigger.focus()
  remove.blur()
  const elements: (HTMLElement | null)[] = [
    root.element,
    list.element,
    dropzone.element,
  ]
  void elements
}

const engine = useGhostFileUpload({
  accept: '.pdf',
  validate,
  onChange: (files) => {
    const next: File[] = files
    void next
  },
  onReject: (rejections) => {
    const first: GhostFileUploadRejection | undefined = rejections[0]
    void first
  },
})
engine.addFiles(new Set([report]))

void componentProps
void triggerProps
void itemProps
void messages
void rejection
void entry
void useSlot
void useDropzoneSlot
void useExposed

const stringModel = {
  // @ts-expect-error modelValue is File[], not string[]
  modelValue: ['report.pdf'],
} satisfies GhostFileUploadProps

// @ts-expect-error modelValue is an array of File
const singleModel = { modelValue: report } satisfies GhostFileUploadProps

// @ts-expect-error validate returns string | null | undefined, not boolean
const booleanValidate: GhostFileUploadValidate = () => true

const unknownReason: GhostFileUploadRejection = {
  file: report,
  // @ts-expect-error rejection reasons are a closed union
  reason: 'virus',
  message: '',
}

// @ts-expect-error GhostFileUploadItem requires file
const missingFile: InstanceType<typeof GhostFileUploadItem>['$props'] = {}

void stringModel
void singleModel
void booleanValidate
void unknownReason
void missingFile
