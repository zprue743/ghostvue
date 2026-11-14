import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

/** Valid `as` targets for {@link GhostCollapsibleTrigger}. */
export type GhostCollapsibleTriggerElement = string | Component

/** Valid `as` targets for {@link GhostCollapsibleContent}. */
export type GhostCollapsibleContentElement = string | Component

/** Props for the {@link GhostCollapsible} root provider component. */
export interface GhostCollapsibleProps {
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
   * Disables toggling on the trigger when `true`.
   * @default false
   */
  disabled?: boolean
}

/** Props passed to the {@link GhostCollapsible} default slot. */
export interface GhostCollapsibleSlotProps {
  open: boolean
  toggle: () => void
}

/** Props for {@link GhostCollapsibleTrigger}. */
export interface GhostCollapsibleTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostCollapsibleTriggerElement
  /**
   * Disables toggling on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostCollapsibleContent}. */
export interface GhostCollapsibleContentProps {
  /**
   * Tag name or component rendered for the disclosure panel.
   * @default 'div'
   */
  as?: GhostCollapsibleContentElement
  /**
   * Skips theme height animations even when motion is allowed.
   * @default false
   */
  disableAnimation?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostCollapsibleTrigger}. */
export interface GhostCollapsibleTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostCollapsibleContent}. */
export interface GhostCollapsibleContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostCollapsible}. */
export interface UseGhostCollapsibleOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostCollapsible}. */
export interface UseGhostCollapsibleReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between `GhostCollapsible` parts. */
export interface GhostCollapsibleContext {
  isOpen: Ref<boolean>
  disabled: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  triggerRegistered: Ref<boolean>
  setTriggerId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  setContentId: (id: string | null) => void
}

export const ghostCollapsibleContextKey: InjectionKey<GhostCollapsibleContext> =
  Symbol('ghost-collapsible')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so themed wrappers resolve to
 * their inner control).
 */
export function resolveCollapsibleHtmlElement(
  target: unknown,
): HTMLElement | null {
  if (typeof HTMLElement === 'undefined') {
    return null
  }
  if (target instanceof HTMLElement) {
    return target
  }
  if (typeof target === 'object' && target !== null) {
    if ('element' in target && target.element instanceof HTMLElement) {
      return target.element
    }
    if ('$el' in target && target.$el instanceof HTMLElement) {
      return target.$el
    }
  }
  return null
}
