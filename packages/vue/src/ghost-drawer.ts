import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { DialogPartsContext } from './dialog-shared'
import type { GhostDialogContext } from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'

/**
 * Viewport edge a drawer is anchored to. `start` / `end` are logical and map
 * to physical left/right edges from the resolved writing direction.
 */
export type GhostDrawerSide = 'start' | 'end' | 'top' | 'bottom'

/** Writing direction used to map logical `start` / `end` sides. */
export type GhostDrawerDirection = 'ltr' | 'rtl'

/** Valid `as` targets for {@link GhostDrawerTrigger}. */
export type GhostDrawerTriggerElement = string | Component

/** Valid `as` targets for {@link GhostDrawerOverlay}. */
export type GhostDrawerOverlayElement = string | Component

/** Valid `as` targets for {@link GhostDrawerContent}. */
export type GhostDrawerContentElement = string | Component

/** Valid `as` targets for {@link GhostDrawerTitle}. */
export type GhostDrawerTitleElement = string | Component

/** Valid `as` targets for {@link GhostDrawerDescription}. */
export type GhostDrawerDescriptionElement = string | Component

/** Valid `as` targets for {@link GhostDrawerClose}. */
export type GhostDrawerCloseElement = string | Component

/** Supported semantic roles for {@link GhostDrawerContent}. */
export type GhostDrawerContentRole = 'dialog' | 'alertdialog'

/** Props for the {@link GhostDrawer} root provider component. */
export interface GhostDrawerProps {
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
  /**
   * Viewport edge the drawer is anchored to. `GhostDrawerContent` may override it.
   * @default 'end'
   */
  side?: GhostDrawerSide
  /**
   * Explicit writing direction for mapping `start` / `end`. When omitted the
   * direction resolves from the nearest `[dir]` ancestor of the content, then
   * of the trigger, then `<html dir>`, falling back to `'ltr'`.
   * @default undefined
   */
  dir?: GhostDrawerDirection | undefined
}

/** Props passed to the {@link GhostDrawer} default slot. */
export interface GhostDrawerSlotProps {
  open: boolean
  close: () => void
  /** Effective side (the content override when set, otherwise the root `side`). */
  side: GhostDrawerSide
}

/** Props for {@link GhostDrawerTrigger}. */
export interface GhostDrawerTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostDrawerTriggerElement
  /**
   * Disables opening or toggling on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostDrawerOverlay}. */
export interface GhostDrawerOverlayProps {
  /**
   * Tag name or component rendered for the modal backdrop.
   * @default 'div'
   */
  as?: GhostDrawerOverlayElement
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

/** Props for {@link GhostDrawerContent}. */
export interface GhostDrawerContentProps {
  /**
   * Tag name or component rendered for the drawer surface.
   * @default 'div'
   */
  as?: GhostDrawerContentElement
  /**
   * Overrides the root `side` when provided.
   * @default undefined
   */
  side?: GhostDrawerSide | undefined
  /**
   * Overrides the root `dir` when provided.
   * @default undefined
   */
  dir?: GhostDrawerDirection | undefined
  /**
   * Semantic ARIA role for the drawer surface. Setting `'alertdialog'` turns off
   * outside-click dismissal by default.
   * @default 'dialog'
   */
  role?: GhostDrawerContentRole
  /**
   * Dismisses the topmost open layer when pressing `Escape`.
   * @default true
   */
  closeOnEscape?: boolean
  /**
   * Dismisses the drawer on outside pointerdown (including the backdrop
   * overlay). Defaults to `true` for `'dialog'` and `false` for `'alertdialog'`.
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
}

/** Props for {@link GhostDrawerTitle}. */
export interface GhostDrawerTitleProps {
  /**
   * Tag name or component rendered for the drawer title.
   * @default 'h2'
   */
  as?: GhostDrawerTitleElement
}

/** Props for {@link GhostDrawerDescription}. */
export interface GhostDrawerDescriptionProps {
  /**
   * Tag name or component rendered for the drawer description.
   * @default 'p'
   */
  as?: GhostDrawerDescriptionElement
}

/** Props for {@link GhostDrawerClose}. */
export interface GhostDrawerCloseProps {
  /**
   * Tag name or component rendered for the close control.
   * @default 'button'
   */
  as?: GhostDrawerCloseElement
  /**
   * Disables closing on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostDrawerTrigger}. */
export interface GhostDrawerTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDrawerOverlay}. */
export interface GhostDrawerOverlayExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDrawerContent}. */
export interface GhostDrawerContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDrawerTitle}. */
export interface GhostDrawerTitleExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDrawerDescription}. */
export interface GhostDrawerDescriptionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDrawerClose}. */
export interface GhostDrawerCloseExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostDrawer}. */
export interface UseGhostDrawerOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  modal?: MaybeRefOrGetter<boolean | undefined>
  /** Viewport edge; defaults to `'end'`. */
  side?: MaybeRefOrGetter<GhostDrawerSide | undefined>
  /** Explicit writing direction; `undefined` defers to DOM resolution. */
  dir?: MaybeRefOrGetter<GhostDrawerDirection | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostDrawer}. */
export interface UseGhostDrawerReturn {
  isOpen: Ref<boolean>
  isModal: ComputedRef<boolean>
  side: ComputedRef<GhostDrawerSide>
  dir: ComputedRef<GhostDrawerDirection | undefined>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  titleId: ComputedRef<string>
  descriptionId: ComputedRef<string>
}

/**
 * Internal context shared between `GhostDrawer` parts. Extends the dialog part
 * context with placement state.
 */
export interface GhostDrawerContext extends GhostDialogContext {
  /** Effective side: the content override when set, otherwise the root `side`. */
  side: ComputedRef<GhostDrawerSide>
  /** Root explicit direction, if any. */
  dir: ComputedRef<GhostDrawerDirection | undefined>
  setContentSide: (side: GhostDrawerSide | null) => void
}

export type GhostDrawerInternalContext = GhostDrawerContext & DialogPartsContext

// Distinct from `ghostDialogContextKey` so a GhostDialog nested inside a
// GhostDrawer (or vice versa) always injects its own root.
export const ghostDrawerContextKey: InjectionKey<GhostDrawerInternalContext> =
  Symbol('ghost-drawer')

/** Inputs for {@link resolveDrawerDir}. */
export interface ResolveDrawerDirOptions {
  /** Explicit direction from `GhostDrawerContent` or `GhostDrawer`. */
  dir?: GhostDrawerDirection | undefined
  /** Mounted drawer surface (its own `dir` attribute is ignored). */
  contentElement?: Element | null
  /** Trigger element, used when the content has no `[dir]` ancestor (portaled). */
  triggerElement?: Element | null
  /**
   * Document root. Defaults to `document.documentElement` in the browser and
   * `null` during SSR.
   */
  documentElement?: Element | null
}

function readDir(
  element: Element | null | undefined,
): GhostDrawerDirection | null {
  const value = element?.getAttribute('dir')?.trim().toLowerCase()
  return value === 'rtl' || value === 'ltr' ? value : null
}

function closestDirAncestor(
  start: Element | null | undefined,
  root: Element | null,
): GhostDrawerDirection | null {
  let current: Element | null = start ?? null
  while (current && current !== root) {
    const value = readDir(current)
    if (value) {
      return value
    }
    current = current.parentElement
  }
  return null
}

/**
 * Resolves the effective writing direction for a drawer, SSR-safe.
 *
 * Priority: explicit `dir` → nearest `[dir]` ancestor of the content → nearest
 * `[dir]` ancestor (or self) of the trigger → `<html dir>` → `'ltr'`.
 *
 * The document root is deliberately skipped in the ancestor walks: a drawer
 * portaled to `<body>` would otherwise always resolve to `<html dir>` and never
 * see a localized `<div dir="rtl">` wrapping its trigger. `dir="auto"` and
 * other values are ignored so resolution falls through to the next source.
 */
export function resolveDrawerDir(
  options: ResolveDrawerDirOptions = {},
): GhostDrawerDirection {
  if (options.dir === 'ltr' || options.dir === 'rtl') {
    return options.dir
  }
  const root =
    options.documentElement !== undefined
      ? options.documentElement
      : typeof document === 'undefined'
        ? null
        : document.documentElement
  return (
    closestDirAncestor(options.contentElement?.parentElement, root) ??
    closestDirAncestor(options.triggerElement, root) ??
    readDir(root) ??
    'ltr'
  )
}
