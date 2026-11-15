import type { AnchorHTMLAttributes, Component, MaybeRefOrGetter } from 'vue'

import { resolvePopoverHtmlElement } from './ghost-popover'

/** Valid `as` targets for {@link GhostLink}. */
export type GhostLinkElement = 'a' | Component

/**
 * Unstyled {@link GhostLink} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the anchor contract for consumers.
 */
export interface GhostLinkProps extends /* @vue-ignore */ AnchorHTMLAttributes {
  /**
   * Root tag or component (for example `RouterLink` / `NuxtLink`).
   * @default 'a'
   */
  as?: GhostLinkElement
  /**
   * Prevents navigation and removes the link from sequential focus order.
   * @default false
   */
  disabled?: boolean
  /**
   * Shows the external indicator for same-tab outbound navigation.
   * `target="_blank"` implies the indicator even when this is false.
   * @default false
   */
  external?: boolean
  /**
   * Visually hidden text when `target` is `_blank`.
   * @default 'Opens in new tab'
   */
  newTabLabel?: string
}

/** Options for {@link useGhostLink}. `as` and `newTabLabel` are render concerns of the SFC. */
export interface UseGhostLinkOptions {
  disabled?: MaybeRefOrGetter<boolean | undefined>
  external?: MaybeRefOrGetter<boolean | undefined>
  href?: MaybeRefOrGetter<string | undefined>
  target?: MaybeRefOrGetter<string | undefined>
  rel?: MaybeRefOrGetter<string | undefined>
  as?: MaybeRefOrGetter<GhostLinkElement | undefined>
}

/** Methods and state available from a template ref to {@link GhostLink}. */
export interface GhostLinkExposed {
  /** The navigable host element after mount, or `null` before mount. */
  readonly element: HTMLElement | null

  /** Moves focus to the host when mounted and not disabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the host when mounted. */
  blur(): void
}

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveGhostLinkHtmlElement(
  target: unknown,
): HTMLElement | null {
  return resolvePopoverHtmlElement(target)
}

/**
 * Adds `noopener` and `noreferrer` when opening a new browsing context.
 * Preserves any other rel tokens the consumer already set.
 */
export function mergeLinkRel(
  target: string | undefined,
  rel: string | undefined,
): string | undefined {
  if (target !== '_blank') {
    return rel
  }

  const tokens = new Set((rel ?? '').split(/\s+/).filter(Boolean))
  tokens.add('noopener')
  tokens.add('noreferrer')
  const merged = [...tokens].join(' ')
  return merged.length > 0 ? merged : undefined
}
