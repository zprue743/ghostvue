import { computed, nextTick, shallowRef, toValue, watch } from 'vue'

import { createDialogPartsContext, useDialogState } from './dialog-shared'
import type {
  GhostCommandPaletteDialogContext,
  UseGhostCommandPaletteAsyncSearchReturn,
  UseGhostCommandPaletteOptions,
  UseGhostCommandPaletteReturn,
} from './ghost-command-palette'
import { useControllableState } from './use-controllable-state'
import {
  useGhostCombobox,
  useGhostComboboxAsyncSearch,
} from './use-ghost-combobox'
import { useGhostId } from './use-ghost-id'

/**
 * Command palette state: a dialog shell (open, modal, part ids) composed with
 * `useGhostCombobox` for the item registry, highlight, loading, and polite
 * announcements. Must run during a component `setup`.
 *
 * The palette deliberately never calls the combobox `select()`: that commits
 * `modelValue`, copies the option label into the query, and closes the list,
 * which is right for a form field but would emit spurious `search` events and
 * leave a stale selection on the next open. Activation goes through
 * {@link UseGhostCommandPaletteReturn.activateCommand} instead.
 *
 * The query is owned here rather than by the combobox so that typing and the
 * reset on close share one monotonic `requestId` sequence; the combobox only
 * sees `open`, `loading`, `disabled`, and `messages`.
 */
export function useGhostCommandPalette(
  options: UseGhostCommandPaletteOptions = {},
): UseGhostCommandPaletteReturn {
  const disabled = computed(() => Boolean(toValue(options.disabled)))
  const closeOnSelect = computed(() => toValue(options.closeOnSelect) ?? true)
  const closeOnEscape = computed(() => toValue(options.closeOnEscape) ?? true)

  const dialogState = useDialogState(
    {
      open: options.open,
      defaultOpen: options.defaultOpen,
      modal: options.modal,
      onOpenChange: (next) => {
        options.onOpenChange?.(next)
      },
    },
    'ghost-command-palette',
  )

  function open(): void {
    if (disabled.value) {
      return
    }
    dialogState.open()
  }

  function toggle(): void {
    if (dialogState.isOpen.value) {
      dialogState.close()
      return
    }
    open()
  }

  // Trigger and content parts call `open` / `toggle` on this context, so the
  // `disabled` guard covers every opening path, not just the exposed method.
  const dialog: GhostCommandPaletteDialogContext = {
    ...createDialogPartsContext(dialogState),
    open,
    toggle,
  }

  const searchValue = useControllableState<string>({
    prop: () => toValue(options.search),
    defaultValue: () => toValue(options.defaultSearch) ?? '',
    onChange: (next) => {
      options.onSearchChange?.(next)
    },
  })

  let searchRequestId = 0
  function emitSearch(query: string): void {
    searchRequestId += 1
    options.onSearch?.({ query, requestId: searchRequestId })
  }

  // The combobox list is held open exactly while the dialog is open; it never
  // writes `open` itself because the palette mounts no combobox chrome.
  const combobox = useGhostCombobox({
    open: () => dialogState.isOpen.value,
    disabled,
    loading: options.loading,
    messages: options.messages,
  })

  const inputElement = shallowRef<HTMLElement | null>(null)
  const customInputId = shallowRef<string | null>(null)
  const defaultInputId = useGhostId('ghost-command-palette-input')
  const listId = useGhostId('ghost-command-palette-list')
  const focusRestoreSuppressed = shallowRef(false)

  function setSearchFromInput(query: string): void {
    if (disabled.value) {
      return
    }
    searchValue.value = query
    emitSearch(query)
  }

  /*
   * Search resets only when the palette actually closes (C3). A controlled
   * parent that rejects `update:open` keeps the dialog open, so this watcher
   * never fires and the query stays as typed. The reset goes through
   * controllable state, so a parent that owns `search` can reject it too.
   */
  watch(dialogState.isOpen, (isOpen) => {
    if (isOpen) {
      focusRestoreSuppressed.value = false
      return
    }
    const reset = toValue(options.defaultSearch) ?? ''
    if (searchValue.value === reset) {
      return
    }
    searchValue.value = reset
    emitSearch(reset)
  })

  function isItemRegistered(id: string): boolean {
    return combobox.getOptionId(id) !== undefined
  }

  function activateCommand(id: string): void {
    if (
      disabled.value ||
      !id ||
      !isItemRegistered(id) ||
      combobox.isOptionDisabled(id)
    ) {
      return
    }
    // Fire-and-forget (C7): the event is not cancelable and runs before the
    // close request, so a parent that rejects close has already received it.
    options.onCommand?.({ id })
    if (closeOnSelect.value) {
      dialogState.close()
    }
  }

  function focusInput(): void {
    inputElement.value?.focus({ preventScroll: true })
  }

  function isInsidePalette(node: unknown): boolean {
    if (!(node instanceof Node)) {
      return false
    }
    return [dialog.contentElement.value, dialog.triggerElement.value].some(
      (element) => element?.contains(node) ?? false,
    )
  }

  function departFocus(): void {
    // The user chose where focus went; closing must not pull it back to the
    // opener (GHO-166). A controlled parent that keeps the palette open
    // re-enables restoration for later closes.
    focusRestoreSuppressed.value = true
    dialogState.close()
    void nextTick(() => {
      if (dialogState.isOpen.value) {
        focusRestoreSuppressed.value = false
      }
    })
  }

  /**
   * C4: a modal palette ignores focus departure (its trap only lets nested
   * portaled overlays take focus, and those keep the shell open). A non-modal
   * palette closes once focus leaves the content and the trigger, following
   * the combobox focus-departure contract.
   */
  function notifyFocusOut(event: FocusEvent): void {
    if (dialogState.isModal.value || !dialogState.isOpen.value) {
      return
    }
    const next = event.relatedTarget
    if (next !== null) {
      if (!isInsidePalette(next)) {
        departFocus()
      }
      return
    }
    // A null `relatedTarget` is either focus moving to `body` or the window
    // losing focus; when the window blurs, `activeElement` stays inside.
    queueMicrotask(() => {
      if (
        !dialogState.isOpen.value ||
        isInsidePalette(document.activeElement)
      ) {
        return
      }
      departFocus()
    })
  }

  return {
    isOpen: dialogState.isOpen,
    searchValue,
    loading: combobox.loading,
    disabled,
    isModal: dialogState.isModal,
    closeOnEscape,
    open,
    close: dialogState.close,
    focusInput,
    activateCommand,
    setSearchFromInput,
    dialog,
    inputId: computed(() => customInputId.value ?? defaultInputId.value),
    listId,
    inputElement,
    setInputElement(element) {
      inputElement.value = element
    },
    setInputId(id) {
      customInputId.value = id
    },
    notifyFocusOut,
    focusRestoreSuppressed,
    registerItem: combobox.registerOption,
    unregisterItem: combobox.unregisterOption,
    setItemDisabled: combobox.setOptionDisabled,
    setItemTextValue: combobox.setOptionTextValue,
    isItemRegistered,
    isItemDisabled: combobox.isOptionDisabled,
    itemCount: combobox.optionCount,
    activeItemId: combobox.activeOptionValue,
    activeDescendantId: combobox.activeDescendantId,
    moveActive: combobox.moveActive,
    moveActiveFirst: combobox.moveActiveFirst,
    moveActiveLast: combobox.moveActiveLast,
    setActiveItem: combobox.setActiveOptionByValue,
    announceMessage: combobox.announceMessage,
    liveRegionProps: combobox.liveRegionProps,
  }
}

/**
 * Stale-response guard for async command lists. Call `begin(requestId)` from
 * the palette `search` handler, then apply results only while
 * `isLatest(requestId)` is true. Same contract as
 * `useGhostComboboxAsyncSearch`, tied to the palette's own `requestId`.
 */
export function useGhostCommandPaletteAsyncSearch(): UseGhostCommandPaletteAsyncSearchReturn {
  return useGhostComboboxAsyncSearch()
}
