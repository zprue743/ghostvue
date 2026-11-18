import {
  computed,
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  unref,
  watch,
} from 'vue'

import type {
  GhostFileUploadAnnouncement,
  GhostFileUploadDropzoneProps,
  GhostFileUploadEntry,
  GhostFileUploadItemRegistration,
  GhostFileUploadLiveRegionProps,
  GhostFileUploadMessages,
  GhostFileUploadMirrorProps,
  GhostFileUploadPickerProps,
  GhostFileUploadRejection,
  GhostFileUploadRejectionContext,
  GhostFileUploadTriggerBindings,
  UseGhostFileUploadOptions,
  UseGhostFileUploadReturn,
} from './ghost-file-upload'
import {
  matchesGhostFileUploadAccept,
  parseGhostFileUploadAccept,
} from './ghost-file-upload-accept'
import { resolveGhostFileUploadMessage } from './ghost-file-upload-messages'
import { sortByDocumentOrder } from './sort-by-document-order'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

/**
 * Batches with more rejections than this announce one summary instead of one
 * sentence per file, so a large drop does not flood the live region.
 */
const REJECTION_ANNOUNCEMENT_LIMIT = 3

/**
 * Descendants of a dropzone whose clicks must not also open the picker (spec:
 * Dropzone behavior, click rule). A trigger inside the dropzone therefore opens
 * the picker once.
 */
const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, summary, [role="button"], [tabindex]'

/** Drag events are handled only for file drags; text and link drags pass through. */
export function isGhostFileUploadFileDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) {
    return false
  }
  // `types` is a frozen array in current engines and a DOMStringList in old ones.
  return Array.from(types).includes('Files')
}

// Document drop guard, shared by every root: one reference-counted pair of
// document listeners, installed with the first active dropzone and removed with
// the last. Module state is fine for SSR because it is only touched from
// client-only lifecycle paths (`registerDropzone` runs after mount).
let documentDropGuardCount = 0

function onDocumentFileDrag(event: DragEvent): void {
  // Never override a handler that already decided (including every dropzone,
  // which cancels its own drags), and never touch non-file drags.
  if (event.defaultPrevented || !isGhostFileUploadFileDrag(event)) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'none'
  }
}

function acquireDocumentDropGuard(): () => void {
  if (documentDropGuardCount === 0) {
    document.addEventListener('dragover', onDocumentFileDrag)
    document.addEventListener('drop', onDocumentFileDrag)
  }
  documentDropGuardCount += 1
  let released = false
  return () => {
    if (released) {
      return
    }
    released = true
    documentDropGuardCount -= 1
    if (documentDropGuardCount === 0) {
      document.removeEventListener('dragover', onDocumentFileDrag)
      document.removeEventListener('drop', onDocumentFileDrag)
    }
  }
}

/** Active guard holders across all roots (internal; for tests). */
export function ghostFileUploadDocumentDropGuardCount(): number {
  return documentDropGuardCount
}

/** Empty strings render no attribute, like an omitted prop. */
function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value
}

function normalizeMaxFiles(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return undefined
  }
  return Math.floor(value)
}

function normalizeMaxFileSize(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined
  }
  return value
}

function countFiles(files: readonly File[]): Map<File, number> {
  const counts = new Map<File, number>()
  for (const file of files) {
    counts.set(file, (counts.get(file) ?? 0) + 1)
  }
  return counts
}

function sameFiles(a: readonly File[], b: readonly File[]): boolean {
  return a.length === b.length && a.every((file, index) => file === b[index])
}

function isFocusable(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected) {
    return false
  }
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement
  ) {
    return !element.disabled
  }
  return true
}

/**
 * Headless state and behavior for {@link GhostFileUpload}: one intake path for
 * the picker, drops, and consumer surfaces; `accept` / size / `validate` /
 * capacity validation computed purely and committed once; controlled or
 * uncontrolled `File[]`; the `DataTransfer` form mirror; the polite live region;
 * focus after removal; and the shared document drop guard.
 *
 * Files are never cloned, wrapped, made reactive, or mutated, and the
 * consumer's array is never mutated: every change writes a new array.
 */
export function useGhostFileUpload(
  options: UseGhostFileUploadOptions = {},
): UseGhostFileUploadReturn {
  // Captured once: the uncontrolled seed and the form-reset baseline for the
  // instance lifetime. Copied so later consumer mutation cannot retarget reset.
  const seed: readonly File[] = [...(toValue(options.defaultValue) ?? [])]

  const model = useControllableState<File[]>({
    prop: () => toValue(options.modelValue),
    defaultValue: [...seed],
    onChange: (next) => {
      options.onChange?.(next)
    },
  })

  const files = computed(() => model.value)
  const rejections = shallowRef<readonly GhostFileUploadRejection[]>([])
  const isDragging = shallowRef(false)
  const announcement = shallowRef<GhostFileUploadAnnouncement>({
    key: 0,
    text: '',
  })
  // Native `valueMissing` reported by the mirror's `invalid` event.
  const constraintInvalid = shallowRef(false)

  const triggerId = useGhostId('ghost-file-upload-trigger', options.id)
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isInvalid = computed(
    () => Boolean(toValue(options.invalid)) || constraintInvalid.value,
  )
  const isRequired = computed(() => Boolean(toValue(options.required)))
  const maxFiles = computed(() => normalizeMaxFiles(toValue(options.maxFiles)))
  const maxFileSize = computed(() =>
    normalizeMaxFileSize(toValue(options.maxFileSize)),
  )
  // Parsed once per `accept` change rather than per file.
  const acceptTokens = computed(() =>
    parseGhostFileUploadAccept(toValue(options.accept)),
  )
  const multiple = computed(() => maxFiles.value !== 1)

  const remaining = computed(() =>
    maxFiles.value === undefined
      ? undefined
      : Math.max(0, maxFiles.value - files.value.length),
  )

  // Entry ids: per-root WeakMap so a File keeps its id while it stays in the
  // list, plus an occurrence suffix so a repeated identical instance still has
  // a unique `v-for` key. Not for persistence.
  const entryIds = new WeakMap<File, number>()
  let nextEntryId = 0
  const entries = computed((): readonly GhostFileUploadEntry[] => {
    const seen = new Map<File, number>()
    return files.value.map((file) => {
      let base = entryIds.get(file)
      if (base === undefined) {
        base = nextEntryId
        nextEntryId += 1
        entryIds.set(file, base)
      }
      const occurrence = seen.get(file) ?? 0
      seen.set(file, occurrence + 1)
      return {
        id:
          occurrence === 0
            ? `file-${String(base)}`
            : `file-${String(base)}-${String(occurrence)}`,
        file,
      }
    })
  })

  let disposed = false

  // Read at call time so a reactive `messages` object updates later output.
  function message<Key extends keyof GhostFileUploadMessages>(
    key: Key,
  ): GhostFileUploadMessages[Key] {
    return resolveGhostFileUploadMessage(toValue(options.messages), key)
  }

  /**
   * Replaces the live region text. The key changes every time so the region
   * renders a new keyed child and identical consecutive messages are still
   * announced, without timers.
   */
  function announce(parts: readonly string[]): void {
    const text = parts.filter((part) => part.length > 0).join(' ')
    if (text.length === 0) {
      return
    }
    announcement.value = { key: announcement.value.key + 1, text }
  }

  function afterTick(callback: () => void): void {
    void nextTick(() => {
      if (!disposed) {
        callback()
      }
    })
  }

  // ---------------------------------------------------------------- intake

  function addFiles(input: Iterable<File>): void {
    // Scripted calls cannot bypass `disabled`, matching GhostInput.
    if (isDisabled.value) {
      return
    }
    const incoming = Array.from(input)
    if (incoming.length === 0) {
      return
    }

    // Pure phase: nothing below commits until every file is classified, so a
    // throwing `validate` or `messages.rejected` leaves state untouched.
    const current = files.value
    const tokens = acceptTokens.value
    const accept = toValue(options.accept)
    const sizeLimit = maxFileSize.value
    const capacityLimit = maxFiles.value
    // Computed once at the start of the batch; only otherwise-valid files
    // consume it, in input order. Never negative even if a trusted controlled
    // list already exceeds the limit.
    const capacity =
      capacityLimit === undefined
        ? Number.POSITIVE_INFINITY
        : Math.max(0, capacityLimit - current.length)
    const validate = unref(options.validate)
    const formatRejection = message('rejected')

    const accepted: File[] = []
    const rejected: GhostFileUploadRejection[] = []
    for (const file of incoming) {
      let context: GhostFileUploadRejectionContext | undefined
      if (!matchesGhostFileUploadAccept(file, tokens)) {
        // Reached only with at least one valid token, so `accept` is set.
        context = { file, reason: 'file-type', accept: accept ?? '' }
      } else if (sizeLimit !== undefined && file.size > sizeLimit) {
        context = { file, reason: 'file-too-large', maxFileSize: sizeLimit }
      } else {
        const code = validate?.(file, { files: [...current, ...accepted] })
        if (code !== null && code !== undefined) {
          context = { file, reason: 'custom', code }
        } else if (accepted.length >= capacity) {
          // Capacity is finite only when `maxFiles` is set.
          context = {
            file,
            reason: 'too-many-files',
            maxFiles: capacityLimit ?? 0,
          }
        }
      }
      if (context) {
        rejected.push({ ...context, message: formatRejection(context) })
      } else {
        accepted.push(file)
      }
    }

    // Commit once: list, then rejections, then `reject` (after
    // `update:modelValue`, even when a controlled parent ignores the update,
    // because it describes intake validation).
    if (accepted.length > 0) {
      model.value = [...current, ...accepted]
    }
    rejections.value = rejected
    if (rejected.length > 0) {
      options.onReject?.([...rejected])
    }

    // "Added" is composed from the files actually present after the parent
    // had a chance to apply or veto the update, so a vetoed addition is never
    // announced. Rejections are announced regardless.
    afterTick(() => {
      const added = countAdded(current, files.value, accepted)
      const parts: string[] = []
      if (added > 0) {
        parts.push(message('added')(added))
      }
      if (rejected.length > REJECTION_ANNOUNCEMENT_LIMIT) {
        parts.push(message('rejectedSummary')(rejected.length))
      } else {
        parts.push(...rejected.map((rejection) => rejection.message))
      }
      announce(parts)
    })
  }

  /** How many of `accepted` are present in `after` beyond what `before` held. */
  function countAdded(
    before: readonly File[],
    after: readonly File[],
    accepted: readonly File[],
  ): number {
    const delta = countFiles(after)
    for (const [file, count] of countFiles(before)) {
      delta.set(file, (delta.get(file) ?? 0) - count)
    }
    let added = 0
    for (const [file, count] of countFiles(accepted)) {
      added += Math.min(count, Math.max(0, delta.get(file) ?? 0))
    }
    return added
  }

  // ---------------------------------------------------------- remove / clear

  const items = new Set<GhostFileUploadItemRegistration>()

  function registerItem(item: GhostFileUploadItemRegistration): () => void {
    items.add(item)
    return () => {
      items.delete(item)
    }
  }

  function orderedItems(): GhostFileUploadItemRegistration[] {
    return sortByDocumentOrder([...items], (item) => item.element()).filter(
      (item) => item.element()?.isConnected,
    )
  }

  function remove(file: File): void {
    if (isDisabled.value) {
      return
    }
    const current = files.value
    const index = current.indexOf(file)
    if (index < 0) {
      return
    }
    const before = countFiles(current).get(file) ?? 0

    // Focus is captured when the removal is applied: was it inside an item
    // for this file? Any identical item counts, because re-keying after a
    // duplicate removal can unmount the item the user activated.
    let focusPosition = -1
    if (typeof document !== 'undefined') {
      const active = document.activeElement
      const ordered = orderedItems()
      focusPosition = ordered.findIndex(
        (item) =>
          item.file() === file &&
          active !== null &&
          (item.element()?.contains(active) ?? false),
      )
    }

    model.value = current.filter((_, position) => position !== index)

    // Decided on nextTick so a controlled parent that vetoed the removal
    // leaves focus (and the announcement) untouched.
    afterTick(() => {
      const after = files.value
      const applied = (countFiles(after).get(file) ?? 0) < before
      if (!applied) {
        return
      }
      announce([message('removed')(file, after.length)])
      if (focusPosition >= 0) {
        moveFocusAfterRemoval(focusPosition)
      }
    })
  }

  /**
   * Next item's remove button (the item that moved into the removed slot),
   * otherwise the previous item's, otherwise the trigger. If none can take
   * focus, focus is not forced.
   */
  function moveFocusAfterRemoval(position: number): void {
    const ordered = orderedItems()
    const candidates = [
      ordered[position]?.removeButton(),
      ordered[position - 1]?.removeButton(),
      toValue(options.trigger),
    ]
    for (const candidate of candidates) {
      if (candidate && isFocusable(candidate)) {
        candidate.focus()
        if (document.activeElement === candidate) {
          return
        }
      }
    }
  }

  function clear(): void {
    if (isDisabled.value) {
      return
    }
    const hadFiles = files.value.length > 0
    model.value = []
    rejections.value = []
    afterTick(() => {
      // Announced only when the clear was applied (not vetoed).
      if (hadFiles && files.value.length === 0) {
        announce([message('cleared')()])
      }
    })
  }

  function clearRejections(): void {
    rejections.value = []
  }

  // ----------------------------------------------------- picker and mirror

  function openPicker(): void {
    if (isDisabled.value) {
      return
    }
    // Must run inside the activating user gesture; browsers may block a
    // picker opened outside one.
    toValue(options.picker)?.click()
  }

  function onPickerChange(event: Event): void {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) {
      return
    }
    const picked = input.files ? Array.from(input.files) : []
    // Always empty between uses: `change` fires on every choice, including
    // choosing a file again after removing it.
    input.value = ''
    addFiles(picked)
  }

  function syncMirror(): void {
    const mirror = toValue(options.mirror)
    // `DataTransfer` is the only way to assign `input.files`. Guarded for
    // environments without it (SSR, jsdom).
    if (!mirror || typeof DataTransfer !== 'function') {
      return
    }
    const transfer = new DataTransfer()
    for (const file of files.value) {
      transfer.items.add(file)
    }
    mirror.files = transfer.files
  }

  // Post-flush: runs after the DOM reflects the committed list (or the
  // reconciled prop after a parent veto), so the mirror always holds exactly
  // the committed list.
  watch([files, () => toValue(options.mirror)], syncMirror, { flush: 'post' })

  watch(
    () => files.value.length,
    (length) => {
      if (length > 0) {
        constraintInvalid.value = false
      }
    },
  )

  function onMirrorInvalid(event: Event): void {
    // Same as GhostSelect: surface the failure on the visible control and keep
    // the form invalid. The browser's own localized message stays available
    // through `validationMessage`.
    constraintInvalid.value = true
    toValue(options.trigger)?.focus()
    if (event.cancelable) {
      event.preventDefault()
    }
  }

  /**
   * Native form reset: restore the captured `defaultValue` through the write
   * path (a controlled parent may ignore it), clear rejections and native
   * invalid state, then resync the mirror because the browser's reset emptied
   * it. Silent. Callers schedule this after the reset macrotask
   * (`useNativeFormReset`), so canceled resets never reach it.
   */
  function applyFormReset(): void {
    if (!sameFiles(files.value, seed)) {
      model.value = [...seed]
    }
    rejections.value = []
    constraintInvalid.value = false
    afterTick(syncMirror)
  }

  // ------------------------------------------------------------------ drag

  function setDragging(next: boolean): void {
    if (isDragging.value === next) {
      return
    }
    isDragging.value = next
    if (next) {
      document.addEventListener('dragend', onDocumentDragEnd)
      document.addEventListener('drop', onDocumentDragEnd)
      document.addEventListener('dragleave', onDocumentDragLeave)
    } else {
      removeDragEndListeners()
    }
  }

  // Transient listeners, attached only while `dragging` is set, so a drag
  // that ends elsewhere (or leaves the window) still clears the state.
  function onDocumentDragEnd(): void {
    setDragging(false)
  }
  function onDocumentDragLeave(event: DragEvent): void {
    // A `null` related target means the pointer left the window.
    if (event.relatedTarget === null) {
      setDragging(false)
    }
  }
  function removeDragEndListeners(): void {
    if (typeof document === 'undefined') {
      return
    }
    document.removeEventListener('dragend', onDocumentDragEnd)
    document.removeEventListener('drop', onDocumentDragEnd)
    document.removeEventListener('dragleave', onDocumentDragLeave)
  }

  watch(isDisabled, (disabled) => {
    if (disabled) {
      setDragging(false)
    }
  })

  function onDropzoneDragEnter(event: DragEvent): void {
    if (!isGhostFileUploadFileDrag(event)) {
      return
    }
    event.preventDefault()
    if (!isDisabled.value) {
      setDragging(true)
    }
  }

  function onDropzoneDragOver(event: DragEvent): void {
    if (!isGhostFileUploadFileDrag(event)) {
      return
    }
    // Cancel even when disabled so a release here never navigates the page.
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isDisabled.value ? 'none' : 'copy'
    }
    if (!isDisabled.value) {
      setDragging(true)
    }
  }

  function onDropzoneDragLeave(event: DragEvent): void {
    if (!isGhostFileUploadFileDrag(event)) {
      return
    }
    // Moving between descendants is not leaving: no flicker. A spurious leave
    // (an engine without `relatedTarget`) is corrected by the next `dragover`.
    const zone = event.currentTarget
    const related = event.relatedTarget
    if (
      zone instanceof Node &&
      related instanceof Node &&
      zone.contains(related)
    ) {
      return
    }
    setDragging(false)
  }

  function onDropzoneDrop(event: DragEvent): void {
    if (!isGhostFileUploadFileDrag(event)) {
      return
    }
    event.preventDefault()
    setDragging(false)
    if (isDisabled.value) {
      return
    }
    // Read synchronously: the DataTransfer is protected after the event.
    addFiles(Array.from(event.dataTransfer?.files ?? []))
  }

  function onDropzoneClick(event: MouseEvent): void {
    if (isDisabled.value || event.defaultPrevented) {
      return
    }
    const zone = event.currentTarget
    const target = event.target
    if (zone instanceof Element && target instanceof Element) {
      const interactive = target.closest(INTERACTIVE_SELECTOR)
      if (interactive && interactive !== zone && zone.contains(interactive)) {
        return
      }
    }
    // Pointer convenience; every action stays reachable from the trigger.
    openPicker()
  }

  // ------------------------------------------------- document drop guard

  const dropzoneCount = shallowRef(0)

  function registerDropzone(): () => void {
    dropzoneCount.value += 1
    let registered = true
    return () => {
      if (!registered) {
        return
      }
      registered = false
      dropzoneCount.value -= 1
    }
  }

  let releaseGuard: (() => void) | undefined
  watch(
    () =>
      dropzoneCount.value > 0 &&
      !isDisabled.value &&
      toValue(options.preventDocumentDrop) !== false,
    (active) => {
      if (active && !releaseGuard) {
        releaseGuard = acquireDocumentDropGuard()
      } else if (!active && releaseGuard) {
        releaseGuard()
        releaseGuard = undefined
      }
    },
  )

  onScopeDispose(() => {
    disposed = true
    releaseGuard?.()
    releaseGuard = undefined
    if (isDragging.value) {
      isDragging.value = false
      removeDragEndListeners()
    }
  })

  // ------------------------------------------------------------ prop bags

  const pickerProps = computed((): GhostFileUploadPickerProps => ({
    type: 'file',
    hidden: true,
    accept: nonEmpty(toValue(options.accept)),
    multiple: multiple.value,
    form: nonEmpty(toValue(options.form)),
    disabled: isDisabled.value,
    tabindex: -1,
    'data-part': 'picker',
    onChange: onPickerChange,
    // `openPicker()` dispatches a synthetic click; keep it from reaching
    // consumer listeners on the root or a surrounding dropzone.
    onClick: (event: MouseEvent) => {
      event.stopPropagation()
    },
  }))

  const mirrorProps = computed((): GhostFileUploadMirrorProps => {
    const name = nonEmpty(toValue(options.name))
    return {
      type: 'file',
      name,
      form: nonEmpty(toValue(options.form)),
      multiple: multiple.value,
      required: Boolean(name) && isRequired.value,
      disabled: isDisabled.value,
      tabindex: -1,
      'aria-hidden': 'true',
      // Not `type="hidden"`: hidden inputs skip constraint validation.
      style: visuallyHiddenStyle,
      'data-part': 'form-input',
      onInvalid: onMirrorInvalid,
    }
  })

  const dropzoneProps = computed((): GhostFileUploadDropzoneProps => ({
    class: 'ghost-file-upload-dropzone',
    'data-part': 'dropzone',
    // Drag feedback is transient and stays visible on an invalid zone; a
    // disabled zone never reports dragging because it ignores drags.
    'data-state':
      isDragging.value && !isDisabled.value
        ? 'dragging'
        : isInvalid.value
          ? 'invalid'
          : isDisabled.value
            ? 'disabled'
            : undefined,
    onDragenter: onDropzoneDragEnter,
    onDragover: onDropzoneDragOver,
    onDragleave: onDropzoneDragLeave,
    onDrop: onDropzoneDrop,
    onClick: onDropzoneClick,
  }))

  const triggerProps = computed((): GhostFileUploadTriggerBindings => ({
    id: triggerId.value,
    type: 'button',
    class: 'ghost-file-upload-trigger',
    disabled: isDisabled.value,
    'aria-invalid': isInvalid.value ? 'true' : undefined,
    'data-part': 'trigger',
    'data-state': isInvalid.value
      ? 'invalid'
      : isDisabled.value
        ? 'disabled'
        : undefined,
    onClick: (event: MouseEvent) => {
      if (!event.defaultPrevented) {
        openPicker()
      }
    },
  }))

  const liveRegionProps = computed((): GhostFileUploadLiveRegionProps => ({
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    style: visuallyHiddenStyle,
    'data-part': 'announcer',
  }))

  return {
    files,
    entries,
    rejections,
    remaining,
    isDisabled,
    isInvalid,
    isRequired,
    isDragging,
    announcement,
    addFiles,
    remove,
    clear,
    clearRejections,
    openPicker,
    applyFormReset,
    registerDropzone,
    registerItem,
    pickerProps,
    mirrorProps,
    dropzoneProps,
    triggerProps,
    liveRegionProps,
  }
}
