import type { MaybeRefOrGetter } from 'vue'

/** Valid roots for a toolbar container in typical layouts. */
export type GhostToolbarElement = 'div' | 'section' | 'footer' | 'header'

/** Toolbar layout and roving arrow axis. */
export type GhostToolbarOrientation = 'horizontal' | 'vertical'

/** Explicit text direction for horizontal arrow reversal. */
export type GhostToolbarDirection = 'ltr' | 'rtl'

/** Options for {@link useGhostToolbar}. */
export interface UseGhostToolbarOptions {
  /** Toolbar root; roving focus attaches after mount when this element exists. */
  element: MaybeRefOrGetter<HTMLElement | null | undefined>
  orientation?: MaybeRefOrGetter<GhostToolbarOrientation | undefined>
  label?: MaybeRefOrGetter<string | undefined>
  loop?: MaybeRefOrGetter<boolean | undefined>
  dir?: MaybeRefOrGetter<GhostToolbarDirection | undefined>
}

/** Public ref contract for {@link GhostToolbar}. */
export interface GhostToolbarExposed {
  /** Root element after mount; null before mount. */
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}
