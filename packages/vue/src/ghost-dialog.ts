import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for {@link GhostDialogTrigger}. */
export type GhostDialogTriggerElement = string | Component

/** Valid `as` targets for {@link GhostDialogOverlay}. */
export type GhostDialogOverlayElement = string | Component

/** Valid `as` targets for {@link GhostDialogContent}. */
export type GhostDialogContentElement = string | Component

/** Valid `as` targets for {@link GhostDialogTitle}. */
export type GhostDialogTitleElement = string | Component

/** Valid `as` targets for {@link GhostDialogDescription}. */
export type GhostDialogDescriptionElement = string | Component

/** Valid `as` targets for {@link GhostDialogClose}. */
export type GhostDialogCloseElement = string | Component

/** Supported semantic roles for {@link GhostDialogContent}. */
export type GhostDialogContentRole = 'dialog' | 'alertdialog'

/** Props for the {@link GhostDialog} root provider component. */
export interface GhostDialogProps {
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
   * Enables modal behavior (trapped focus loop, scroll lock, inert background
   * siblings, `aria-modal`, and overlay rendering).
   * @default true
   */
  modal?: boolean
}

/** Props passed to the {@link GhostDialog} default slot. */
export interface GhostDialogSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostDialogTrigger}. */
export interface GhostDialogTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostDialogTriggerElement
  /**
   * Disables opening or toggling on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostDialogOverlay}. */
export interface GhostDialogOverlayProps {
  /**
   * Tag name or component rendered for the modal backdrop.
   * @default 'div'
   */
  as?: GhostDialogOverlayElement
  /**
   * Teleport overlay through {@link GhostPortal} when `true`, or render inline when `false`.
   * @default true
   */
  portal?: boolean
  /**
   * Teleport target passed to {@link GhostPortal} when `portal` is `true`.
   * @default 'body'
   */
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostDialogContent}. */
export interface GhostDialogContentProps {
  /**
   * Tag name or component rendered for the dialog surface.
   * @default 'div'
   */
  as?: GhostDialogContentElement
  /**
   * Semantic ARIA role for the dialog surface. Setting `'alertdialog'` turns off
   * outside-click dismissal by default.
   * @default 'dialog'
   */
  role?: GhostDialogContentRole
  /**
   * Dismisses the topmost open dialog when pressing `Escape`.
   * @default true
   */
  closeOnEscape?: boolean
  /**
   * Dismisses the topmost open dialog on outside pointerdown (including the
   * backdrop overlay). Defaults to `true` for `'dialog'` and `false` for `'alertdialog'`.
   * @default undefined
   */
  closeOnOutsideClick?: boolean | undefined
  /**
   * Teleport content through {@link GhostPortal} when `true`, or render inline when `false`.
   * @default true
   */
  portal?: boolean
  /**
   * Teleport target passed to {@link GhostPortal} when `portal` is `true`.
   * @default 'body'
   */
  portalTo?: GhostPortalTarget
  /**
   * Gates the first focus-scope activation (initial focus and, when modal,
   * the focus trap) of each opening. Set it to `false` while content still
   * needs positioning or rendering, then `true` once it is ready. Activation
   * also waits for portal placement. After activation the scope stays active
   * until close, even if this later becomes `false`. Scroll lock, background
   * inert, and dismissal apply from the moment the dialog opens.
   * @default true
   */
  focusReady?: boolean
  /**
   * Resolves the element that receives focus when the focus scope activates.
   * Called after mount, once per opening, after `focusReady` and portal
   * placement. Return `null`, or an element that is disconnected, unfocusable,
   * or outside the content, to keep the default: `[data-autofocus]`, then the
   * first tabbable element, then the content itself.
   * @default undefined
   */
  initialFocus?: (() => HTMLElement | null) | undefined
  /**
   * Resolves the element that receives focus when the dialog closes. Called
   * after mount on each close that restores focus. Return `null`, or an
   * element that is disconnected or unfocusable (for example disabled), to
   * keep the default: the element that was focused when the dialog opened.
   * Not called while a controlled parent keeps the dialog open.
   * @default undefined
   */
  returnFocus?: (() => HTMLElement | null) | undefined
}

/** Props for {@link GhostDialogTitle}. */
export interface GhostDialogTitleProps {
  /**
   * Tag name or component rendered for the dialog title.
   * @default 'h2'
   */
  as?: GhostDialogTitleElement
}

/** Props for {@link GhostDialogDescription}. */
export interface GhostDialogDescriptionProps {
  /**
   * Tag name or component rendered for the dialog description.
   * @default 'p'
   */
  as?: GhostDialogDescriptionElement
}

/** Props for {@link GhostDialogClose}. */
export interface GhostDialogCloseProps {
  /**
   * Tag name or component rendered for the close control.
   * @default 'button'
   */
  as?: GhostDialogCloseElement
  /**
   * Disables closing on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostDialogTrigger}. */
export interface GhostDialogTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDialogOverlay}. */
export interface GhostDialogOverlayExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDialogContent}. */
export interface GhostDialogContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDialogTitle}. */
export interface GhostDialogTitleExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDialogDescription}. */
export interface GhostDialogDescriptionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDialogClose}. */
export interface GhostDialogCloseExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostDialog}. */
export interface UseGhostDialogOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  modal?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostDialog}. */
export interface UseGhostDialogReturn {
  isOpen: Ref<boolean>
  isModal: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  titleId: ComputedRef<string>
  descriptionId: ComputedRef<string>
}

/** Internal context shared between `GhostDialog` parts. */
export interface GhostDialogContext {
  isOpen: Ref<boolean>
  isModal: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  defaultTitleId: ComputedRef<string>
  defaultDescriptionId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  titleId: ComputedRef<string>
  descriptionId: ComputedRef<string>
  triggerRegistered: Ref<boolean>
  titleRegistered: Ref<boolean>
  descriptionRegistered: Ref<boolean>
  triggerElement: Ref<HTMLElement | null>
  overlayElement: Ref<HTMLElement | null>
  contentElement: Ref<HTMLElement | null>
  setTriggerElement: (element: HTMLElement | null) => void
  setOverlayElement: (element: HTMLElement | null) => void
  setContentElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  setContentId: (id: string | null) => void
  setTitleId: (id: string | null) => void
  setTitleRegistered: (registered: boolean) => void
  setDescriptionId: (id: string | null) => void
  setDescriptionRegistered: (registered: boolean) => void
}

export interface GhostDialogInternalContext extends GhostDialogContext {
  openedAtMount: Ref<boolean>
}

export const ghostDialogContextKey: InjectionKey<GhostDialogInternalContext> =
  Symbol('ghost-dialog')
