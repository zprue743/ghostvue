import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type {
  GhostComboboxLiveRegionProps,
  GhostComboboxMessages,
  GhostComboboxSearchPayload,
} from './ghost-combobox'
import type { GhostDialogContext } from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for {@link GhostCommandPaletteTrigger}. */
export type GhostCommandPaletteTriggerElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteOverlay}. */
export type GhostCommandPaletteOverlayElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteContent}. */
export type GhostCommandPaletteContentElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteTitle}. */
export type GhostCommandPaletteTitleElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteInput}. */
export type GhostCommandPaletteInputElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteList}. */
export type GhostCommandPaletteListElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteItem}. */
export type GhostCommandPaletteItemElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteGroup}. */
export type GhostCommandPaletteGroupElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteLabel}. */
export type GhostCommandPaletteLabelElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteEmpty}. */
export type GhostCommandPaletteEmptyElement = string | Component
/** Valid `as` targets for {@link GhostCommandPaletteSeparator}. */
export type GhostCommandPaletteSeparatorElement = string | Component

/**
 * Payload of the palette `command` event. Only the activated item's stable
 * `id` is emitted (C10): `textValue` is presentation for assistive technology,
 * and handlers should key off ids that survive copy and locale changes.
 */
export interface GhostCommandPaletteCommandPayload {
  /** Stable command identity from the activated item's `id` prop. */
  id: string
}

/** Payload of the palette `search` event (same contract as `GhostCombobox`). */
export type GhostCommandPaletteSearchPayload = GhostComboboxSearchPayload

/** Props for the {@link GhostCommandPalette} root. */
export interface GhostCommandPaletteProps {
  /**
   * Controlled open state. Omit to run uncontrolled from `defaultOpen`.
   * @default undefined
   */
  open?: boolean | undefined
  /**
   * Initial open state when `open` is omitted.
   * @default false
   */
  defaultOpen?: boolean
  /**
   * Controlled query text. Omit to run uncontrolled from `defaultSearch`.
   * @default undefined
   */
  search?: string | undefined
  /**
   * Initial query, and the value the query resets to when the palette closes.
   * @default ''
   */
  defaultSearch?: string
  /**
   * Shows loading presentation: hides the empty part, sets `aria-busy` on the
   * listbox, and announces `messages.loading` politely.
   * @default false
   */
  loading?: boolean
  /**
   * Modal dialog shell: focus trap, scroll lock, inert background, and overlay.
   * A non-modal palette closes when focus leaves it.
   * @default true
   */
  modal?: boolean
  /**
   * Blocks opening, search, and command activation.
   * @default false
   */
  disabled?: boolean
  /**
   * Requests close after a command is activated. When `false`, or when a
   * controlled parent keeps `open`, the query stays as typed.
   * @default true
   */
  closeOnSelect?: boolean
  /**
   * Whether `Escape` closes the palette. `GhostCommandPaletteContent` may
   * override it.
   * @default true
   */
  closeOnEscape?: boolean
  /**
   * Overrides the loading, empty, and results-count announcements. Unset
   * fields keep the English defaults.
   * @default undefined
   */
  messages?: GhostComboboxMessages | undefined
}

/** Props passed to the {@link GhostCommandPalette} default slot. */
export interface GhostCommandPaletteSlotProps {
  open: boolean
  search: string
  loading: boolean
  close: () => void
  focusInput: () => void
}

/** Props for {@link GhostCommandPaletteTrigger}. */
export interface GhostCommandPaletteTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostCommandPaletteTriggerElement
  /**
   * Disables opening from this trigger. The root `disabled` prop also applies.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostCommandPaletteOverlay}. */
export interface GhostCommandPaletteOverlayProps {
  /**
   * Tag name or component rendered for the modal backdrop.
   * @default 'div'
   */
  as?: GhostCommandPaletteOverlayElement
  /**
   * Teleport the overlay through `GhostPortal` when `true`.
   * @default true
   */
  portal?: boolean
  /**
   * Teleport target when `portal` is `true`.
   * @default 'body'
   */
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostCommandPaletteContent}. */
export interface GhostCommandPaletteContentProps {
  /**
   * Tag name or component rendered for the dialog surface.
   * @default 'div'
   */
  as?: GhostCommandPaletteContentElement
  /**
   * Overrides the root `closeOnEscape` when set.
   * @default undefined
   */
  closeOnEscape?: boolean | undefined
  /**
   * Dismisses the palette on outside pointerdown, including the overlay.
   * @default true
   */
  closeOnOutsideClick?: boolean
  /**
   * Teleport the surface through `GhostPortal` when `true`.
   * @default true
   */
  portal?: boolean
  /**
   * Teleport target when `portal` is `true`.
   * @default 'body'
   */
  portalTo?: GhostPortalTarget
  /**
   * Gates the first focus-scope activation of each opening (see
   * `GhostDialogContent`).
   * @default true
   */
  focusReady?: boolean
  /**
   * Resolves the element focused on open. Defaults to the command input.
   * @default undefined
   */
  initialFocus?: (() => HTMLElement | null) | undefined
  /**
   * Resolves the element focused on close, for openers that are not the
   * visible trigger. Defaults to the element focused before opening.
   * @default undefined
   */
  returnFocus?: (() => HTMLElement | null) | undefined
}

/** Props for {@link GhostCommandPaletteTitle}. */
export interface GhostCommandPaletteTitleProps {
  /**
   * Tag name or component rendered for the dialog title.
   * @default 'h2'
   */
  as?: GhostCommandPaletteTitleElement
}

/** Props for {@link GhostCommandPaletteInput}. */
export interface GhostCommandPaletteInputProps {
  /**
   * Tag name or component rendered for the query field.
   * @default 'input'
   */
  as?: GhostCommandPaletteInputElement
  /**
   * Disables typing and activation from this input.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostCommandPaletteList}. */
export interface GhostCommandPaletteListProps {
  /**
   * Tag name or component rendered for the listbox.
   * @default 'div'
   */
  as?: GhostCommandPaletteListElement
}

/** Props for {@link GhostCommandPaletteItem}. */
export interface GhostCommandPaletteItemProps {
  /** Stable command identity, unique within the palette; emitted on `command`. */
  id: string
  /**
   * Excluded from highlight and activation.
   * @default false
   */
  disabled?: boolean
  /**
   * Plain-text label for assistive technology. Falls back to the item's text.
   * @default undefined
   */
  textValue?: string | undefined
  /**
   * Tag name or component rendered for the option.
   * @default 'div'
   */
  as?: GhostCommandPaletteItemElement | undefined
}

/** Props for {@link GhostCommandPaletteGroup}. */
export interface GhostCommandPaletteGroupProps {
  /**
   * Tag name or component rendered for the group.
   * @default 'div'
   */
  as?: GhostCommandPaletteGroupElement
}

/** Props for {@link GhostCommandPaletteLabel}. */
export interface GhostCommandPaletteLabelProps {
  /**
   * Tag name or component rendered for the group label.
   * @default 'div'
   */
  as?: GhostCommandPaletteLabelElement
}

/** Props for {@link GhostCommandPaletteEmpty}. */
export interface GhostCommandPaletteEmptyProps {
  /**
   * Tag name or component rendered for the empty message.
   * @default 'div'
   */
  as?: GhostCommandPaletteEmptyElement
}

/** Props for {@link GhostCommandPaletteSeparator}. */
export interface GhostCommandPaletteSeparatorProps {
  /**
   * Tag name or component rendered for the divider.
   * @default 'div'
   */
  as?: GhostCommandPaletteSeparatorElement
}

/** Ref contract shared by every palette part. */
export interface GhostCommandPalettePartExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods exposed by a template ref to {@link GhostCommandPalette}. */
export interface GhostCommandPaletteExposed extends GhostCommandPalettePartExposed {
  /** Opens the palette (no-op while `disabled`). */
  open(): void
  /** Requests close; a controlled parent may keep it open. */
  close(): void
  /** Moves focus to the command input when it is mounted. */
  focusInput(): void
}

export type GhostCommandPaletteTriggerExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteOverlayExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteContentExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteTitleExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteInputExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteListExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteItemExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteGroupExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteLabelExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteEmptyExposed = GhostCommandPalettePartExposed
export type GhostCommandPaletteSeparatorExposed = GhostCommandPalettePartExposed

/** Options for {@link useGhostCommandPalette}. */
export interface UseGhostCommandPaletteOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  search?: MaybeRefOrGetter<string | undefined>
  defaultSearch?: MaybeRefOrGetter<string | undefined>
  loading?: MaybeRefOrGetter<boolean | undefined>
  modal?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  closeOnSelect?: MaybeRefOrGetter<boolean | undefined>
  closeOnEscape?: MaybeRefOrGetter<boolean | undefined>
  messages?: MaybeRefOrGetter<GhostComboboxMessages | undefined>
  onOpenChange?: (open: boolean) => void
  onSearchChange?: (query: string) => void
  onSearch?: (payload: GhostCommandPaletteSearchPayload) => void
  onCommand?: (payload: GhostCommandPaletteCommandPayload) => void
}

/**
 * Dialog part state used by the palette shell parts. Structurally the public
 * `GhostDialogContext` plus the non-modal autofocus flag.
 */
export type GhostCommandPaletteDialogContext = GhostDialogContext & {
  openedAtMount: Ref<boolean>
}

/** Reactive state and helpers returned by {@link useGhostCommandPalette}. */
export interface UseGhostCommandPaletteReturn {
  /** Dialog open state. */
  isOpen: Ref<boolean>
  /** Current query text. */
  searchValue: Ref<string>
  loading: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  isModal: ComputedRef<boolean>
  closeOnEscape: ComputedRef<boolean>
  /** Opens the palette unless `disabled`. */
  open: () => void
  /** Requests close. */
  close: () => void
  /** Focuses the mounted command input. */
  focusInput: () => void
  /**
   * Emits `command` for an enabled, registered item and, with
   * `closeOnSelect`, requests close. Never commits combobox selection or
   * rewrites the query.
   */
  activateCommand: (id: string) => void
  /** Writes the query from user input and emits `search`. */
  setSearchFromInput: (query: string) => void
  /** Dialog shell state consumed by trigger, overlay, content, and title. */
  dialog: GhostCommandPaletteDialogContext
  inputId: ComputedRef<string>
  listId: ComputedRef<string>
  inputElement: Ref<HTMLElement | null>
  setInputElement: (element: HTMLElement | null) => void
  setInputId: (id: string | null) => void
  /** Called from `focusout` on the content; closes a non-modal palette (C4). */
  notifyFocusOut: (event: FocusEvent) => void
  /** True while a focus-departure close must not restore focus. */
  focusRestoreSuppressed: Ref<boolean>
  registerItem: (
    id: string,
    textValue: string,
    disabled: boolean,
    optionId: string,
    getElement: () => HTMLElement | null,
  ) => void
  unregisterItem: (id: string) => void
  setItemDisabled: (id: string, disabled: boolean) => void
  setItemTextValue: (id: string, textValue: string) => void
  isItemRegistered: (id: string) => boolean
  isItemDisabled: (id: string) => boolean
  itemCount: ComputedRef<number>
  activeItemId: Ref<string | undefined>
  activeDescendantId: ComputedRef<string | undefined>
  moveActive: (direction: 1 | -1) => void
  moveActiveFirst: () => void
  moveActiveLast: () => void
  setActiveItem: (id: string | undefined) => void
  announceMessage: Ref<string>
  liveRegionProps: ComputedRef<GhostComboboxLiveRegionProps>
}

/**
 * Context provided by {@link GhostCommandPalette} to its parts: the full
 * {@link useGhostCommandPalette} return value.
 */
export type GhostCommandPaletteContext = UseGhostCommandPaletteReturn

/** Return type of {@link useGhostCommandPaletteAsyncSearch}. */
export interface UseGhostCommandPaletteAsyncSearchReturn {
  /** Records `requestId` from a `search` event as the newest request. */
  begin: (requestId: number) => void
  /** True when `requestId` is still the newest request passed to `begin`. */
  isLatest: (requestId: number) => boolean
}

export const ghostCommandPaletteContextKey: InjectionKey<GhostCommandPaletteContext> =
  Symbol('ghost-command-palette')

export const ghostCommandPaletteGroupLabelKey: InjectionKey<{
  setLabelId: (id: string | null) => void
}> = Symbol('ghost-command-palette-group-label')
