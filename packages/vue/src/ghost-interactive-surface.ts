import type { MaybeRefOrGetter } from 'vue'

/**
 * v1 ships spotlight only. Tilt and magnetic are ADR 0009 follow-ups.
 */
export type InteractiveEffect = 'spotlight'

export type InteractiveSurfaceState = 'off' | 'idle' | 'tracking'

export type InteractiveSurfaceElement = 'div' | 'article' | 'section' | 'aside'

/**
 * Attribute that carries off/idle/tracking. Dedicated surfaces use
 * `data-state`. Hosts that already own `data-state` (themed GhostButton) use
 * `data-interactive-state` so loading/disabled are not overwritten.
 */
export type InteractiveStateAttribute = 'data-state' | 'data-interactive-state'

/** Props for the unstyled {@link GhostInteractiveSurface} component. */
export interface GhostInteractiveSurfaceProps {
  /**
   * Root tag. Default `div`.
   * @default 'div'
   */
  as?: InteractiveSurfaceElement
  /**
   * Recipes advertised on `data-interactive`. v1 supports `spotlight` only.
   * @default ['spotlight']
   */
  effects?: InteractiveEffect[]
}

/** Options for {@link useGhostInteractiveSurface}. `as` is a render concern. */
export interface UseGhostInteractiveSurfaceOptions {
  /** Recipes advertised on `data-interactive`. Default `['spotlight']`. */
  effects?: MaybeRefOrGetter<readonly InteractiveEffect[] | undefined>
  /**
   * Where to write off/idle/tracking. Default `data-state`.
   * @default 'data-state'
   */
  stateAttribute?: MaybeRefOrGetter<InteractiveStateAttribute | undefined>
}

/** Methods available from a template ref to {@link GhostInteractiveSurface}. */
export interface GhostInteractiveSurfaceExposed {
  /** The root element after mount, or `null` before mount. */
  readonly element: HTMLElement | null
}
