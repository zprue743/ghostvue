import type { Component, InjectionKey } from 'vue'

/** Valid `as` targets for {@link GhostBreadcrumb}. */
export type GhostBreadcrumbElement = string | Component

/** Valid `as` targets for {@link GhostBreadcrumbList}. */
export type GhostBreadcrumbListElement = string | Component

/** Valid `as` targets for {@link GhostBreadcrumbItem}. */
export type GhostBreadcrumbItemElement = string | Component

/** Valid `as` targets for {@link GhostBreadcrumbLink}. */
export type GhostBreadcrumbLinkElement = string | Component

/** Valid `as` targets for {@link GhostBreadcrumbPage}. */
export type GhostBreadcrumbPageElement = string | Component

/** Valid `as` targets for {@link GhostBreadcrumbSeparator}. */
export type GhostBreadcrumbSeparatorElement = string | Component

/** Props for {@link GhostBreadcrumb}. */
export interface GhostBreadcrumbProps {
  /**
   * Tag name or component rendered for the navigation landmark.
   * @default 'nav'
   */
  as?: GhostBreadcrumbElement
  /**
   * Accessible name for the breadcrumb navigation.
   * @default 'Breadcrumb'
   */
  ariaLabel?: string
}

/** Props for {@link GhostBreadcrumbList}. */
export interface GhostBreadcrumbListProps {
  /**
   * Tag name or component rendered for the ordered list.
   * @default 'ol'
   */
  as?: GhostBreadcrumbListElement
}

/** Props for {@link GhostBreadcrumbItem}. */
export interface GhostBreadcrumbItemProps {
  /**
   * Tag name or component rendered for the list item.
   * @default 'li'
   */
  as?: GhostBreadcrumbItemElement
}

/** Props for {@link GhostBreadcrumbLink}. */
export interface GhostBreadcrumbLinkProps {
  /**
   * Tag name or component rendered for the ancestor segment.
   * @default 'a'
   */
  as?: GhostBreadcrumbLinkElement
}

/** Props for {@link GhostBreadcrumbPage}. */
export interface GhostBreadcrumbPageProps {
  /**
   * Tag name or component rendered for the current page segment.
   * @default 'span'
   */
  as?: GhostBreadcrumbPageElement
}

/** Props for {@link GhostBreadcrumbSeparator}. */
export interface GhostBreadcrumbSeparatorProps {
  /**
   * Tag name or component rendered for the decorative separator.
   * @default 'span'
   */
  as?: GhostBreadcrumbSeparatorElement
}

/** Props for {@link GhostBreadcrumbEllipsis}. */
export interface GhostBreadcrumbEllipsisProps {
  /**
   * Accessible name for the ellipsis disclosure trigger.
   * @default 'Show more breadcrumb segments'
   */
  label?: string
}

/** Methods and state exposed by breadcrumb parts with a focusable host. */
export interface GhostBreadcrumbExposed {
  readonly element: HTMLElement | null
  focus?(options?: FocusOptions): void
  blur?(): void
}

export interface GhostBreadcrumbListExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostBreadcrumbItemExposed {
  readonly element: HTMLElement | null
}

export interface GhostBreadcrumbLinkExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostBreadcrumbPageExposed {
  readonly element: HTMLElement | null
}

export interface GhostBreadcrumbSeparatorExposed {
  readonly element: HTMLElement | null
}

export interface GhostBreadcrumbEllipsisExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Internal marker that parts are composed under {@link GhostBreadcrumb}. */
export interface GhostBreadcrumbContext {
  readonly present: true
}

export const ghostBreadcrumbContextKey: InjectionKey<GhostBreadcrumbContext> =
  Symbol('ghost-breadcrumb')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveBreadcrumbHtmlElement(
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
