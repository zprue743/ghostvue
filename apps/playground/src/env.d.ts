/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent
  export default component
}

/**
 * Playground typecheck runs before `@slop-ui/vue` emits `dist` types. Vite
 * aliases the import to source; this module is only the typecheck stand-in.
 */
declare module '@slop-ui/vue' {
  import type { MaybeRefOrGetter } from 'vue'

  export interface UseFocusScopeOptions {
    trapped?: MaybeRefOrGetter<boolean>
    loop?: MaybeRefOrGetter<boolean>
    autoFocus?: MaybeRefOrGetter<boolean>
    restoreFocus?: MaybeRefOrGetter<boolean>
  }

  export function useFocusScope(
    container: MaybeRefOrGetter<HTMLElement | null | undefined>,
    options?: UseFocusScopeOptions,
  ): void

  export type RovingOrientation = 'horizontal' | 'vertical' | 'both'
  export type TextDirection = 'ltr' | 'rtl'

  export interface UseRovingFocusOptions {
    orientation?: MaybeRefOrGetter<RovingOrientation>
    loop?: MaybeRefOrGetter<boolean>
    dir?: MaybeRefOrGetter<TextDirection>
  }

  export function useRovingFocus(
    container: MaybeRefOrGetter<HTMLElement | null | undefined>,
    options?: UseRovingFocusOptions,
  ): void
}
