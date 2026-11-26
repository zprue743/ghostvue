import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
} from 'vue'

import type { GhostLinkElement } from './ghost-link'

/** Valid `as` targets for {@link GhostScrollSpy}. */
export type GhostScrollSpyElement = string | Component

/** Valid `as` targets for {@link GhostScrollSpyList}. */
export type GhostScrollSpyListElement = string | Component

/** Valid `as` targets for {@link GhostScrollSpyItem}. */
export type GhostScrollSpyItemElement = string | Component

/** How URL hash is updated on plain link activation. */
export type GhostScrollSpyHistoryMode = 'replace' | 'push' | 'none'

/** Layout axis for the scroll spy navigation rail. */
export type GhostScrollSpyOrientation = 'vertical' | 'horizontal'

/** Scroll travel direction exposed on the root while the page is moving. */
export type GhostScrollSpyTravelDirection = 'down' | 'up'

/** Scroll container for measurement and programmatic scrolling. */
export type GhostScrollSpyContainer = HTMLElement | Window | null | undefined

/** Props for {@link GhostScrollSpy}. */
export interface GhostScrollSpyProps {
  /** Root landmark element. @default 'nav' */
  as?: GhostScrollSpyElement
  /**
   * Accessible name when neither `aria-label` nor `aria-labelledby` is passed
   * through attrs.
   * @default 'Page sections'
   */
  label?: string
  /** Controlled active section id (without leading `#`). */
  modelValue?: string | undefined
  /** Initial active section id in uncontrolled mode. */
  defaultValue?: string | undefined
  /** @default 'vertical' */
  orientation?: GhostScrollSpyOrientation
  /** Scroll container to observe. Defaults to the viewport (`window`). */
  container?: GhostScrollSpyContainer
  /**
   * Activation threshold as a fraction of viewport height, or pixels when
   * `> 1` or `0`.
   * @default 0.4
   */
  probeOffset?: number
  /** @default 0.995 */
  endThreshold?: number
  /** @default 'smooth' */
  scrollBehavior?: ScrollBehavior
  /** @default 'replace' */
  historyMode?: GhostScrollSpyHistoryMode
  /** @default true */
  focusTarget?: boolean
  /** @default 180 */
  travelSettleMs?: number
}

/** Scoped slot props on {@link GhostScrollSpy}. */
export interface GhostScrollSpySlotProps {
  activeId: string | undefined
  travelDirection: GhostScrollSpyTravelDirection | undefined
  itemCount: number
  scrollTo: (
    targetId: string,
    options?: { behavior?: ScrollBehavior; focus?: boolean },
  ) => void
}

/** Props for {@link GhostScrollSpyList}. */
export interface GhostScrollSpyListProps {
  /** @default 'ol' */
  as?: GhostScrollSpyListElement
}

/** Props for {@link GhostScrollSpyItem}. */
export interface GhostScrollSpyItemProps {
  /** @default 'li' */
  as?: GhostScrollSpyItemElement
}

/** Props for {@link GhostScrollSpyLink}. */
export interface GhostScrollSpyLinkProps {
  /** Target section id (a leading `#` is stripped). */
  target: string
  /** Native anchor href. @default `` `#${target}` `` */
  href?: string
  /** Passed through to {@link GhostLink}. @default 'a' */
  as?: GhostLinkElement
  /** @default false */
  disabled?: boolean
}

/** Payload for the `activate` event on {@link GhostScrollSpy}. */
export interface GhostScrollSpyActivateDetail {
  id: string
  element: HTMLElement | null
  event: MouseEvent | KeyboardEvent
}

/** Methods and state exposed by {@link GhostScrollSpy}. */
export interface GhostScrollSpyExposed {
  readonly element: HTMLElement | null
  readonly activeId: string | undefined
  scrollTo(
    targetId: string,
    options?: { behavior?: ScrollBehavior; focus?: boolean },
  ): void
  measure(): void
}

export interface GhostScrollSpyListExposed {
  readonly element: HTMLElement | null
}

export interface GhostScrollSpyItemExposed {
  readonly element: HTMLElement | null
}

export interface GhostScrollSpyLinkExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface UseGhostScrollSpyOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  onValueChange?: (id: string | undefined) => void
  orientation?: MaybeRefOrGetter<GhostScrollSpyOrientation | undefined>
  container?: MaybeRefOrGetter<GhostScrollSpyContainer>
  probeOffset?: MaybeRefOrGetter<number | undefined>
  endThreshold?: MaybeRefOrGetter<number | undefined>
  scrollBehavior?: MaybeRefOrGetter<ScrollBehavior | undefined>
  historyMode?: MaybeRefOrGetter<GhostScrollSpyHistoryMode | undefined>
  focusTarget?: MaybeRefOrGetter<boolean | undefined>
  travelSettleMs?: MaybeRefOrGetter<number | undefined>
  onActivate?: (detail: GhostScrollSpyActivateDetail) => void
}

interface ScrollSpyRegistryEntry {
  readonly id: symbol
  readonly target: string
  disabled: boolean
  getLinkElement: () => HTMLElement | null
}

/** Context shared between {@link GhostScrollSpy} compound parts. */
export interface GhostScrollSpyContext {
  readonly orientation: ComputedRef<GhostScrollSpyOrientation>
  readonly activeId: ComputedRef<string | undefined>
  isActive(target: string, registrationId?: symbol): boolean
  registerItem(
    id: symbol,
    target: string,
    disabled: boolean,
    getLinkElement: () => HTMLElement | null,
  ): void
  unregisterItem(id: symbol): void
  setItemDisabled(id: symbol, disabled: boolean): void
  handleActivate(detail: GhostScrollSpyActivateDetail): void
}

export const ghostScrollSpyContextKey: InjectionKey<GhostScrollSpyContext> =
  Symbol('ghost-scroll-spy')

export type { ScrollSpyRegistryEntry }

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveScrollSpyHtmlElement(
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

/** Strips a leading `#` from fragment targets. */
export function normalizeScrollSpyTargetId(target: string): string {
  return target.startsWith('#') ? target.slice(1) : target
}

/** Whether the activation should run scroll, hash, and focus side effects. */
export function isScrollSpyPlainActivation(
  event: MouseEvent | KeyboardEvent,
): boolean {
  if (event instanceof MouseEvent) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    )
  }
  return event.key === 'Enter'
}
