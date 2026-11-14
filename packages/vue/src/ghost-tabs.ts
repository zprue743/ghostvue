import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { TextDirection } from './use-roving-focus'

/** Valid `as` targets for {@link GhostTabsList}. */
export type GhostTabsListElement = string | Component

/** Valid `as` targets for {@link GhostTabsTrigger}. */
export type GhostTabsTriggerElement = string | Component

/** Valid `as` targets for {@link GhostTabsContent}. */
export type GhostTabsContentElement = string | Component

export type GhostTabsActivationMode = 'automatic' | 'manual'
export type GhostTabsOrientation = 'horizontal' | 'vertical'

/** Props for the {@link GhostTabs} root provider component. */
export interface GhostTabsProps {
  /**
   * Controlled selected tab value. Omit to run uncontrolled from `defaultValue`.
   * @default undefined
   */
  modelValue?: string | undefined
  /**
   * Initial selected value when `modelValue` is omitted. When omitted, the first
   * mounted trigger value is selected.
   * @default undefined
   */
  defaultValue?: string | undefined
  /**
   * Whether focus alone activates a tab (`automatic`) or activation requires
   * click/Enter/Space (`manual`).
   * @default 'automatic'
   */
  activationMode?: GhostTabsActivationMode
  /**
   * Tab strip layout; drives roving arrow keys and `aria-orientation` on the list.
   * @default 'horizontal'
   */
  orientation?: GhostTabsOrientation
  /**
   * Explicit text direction for roving focus. When omitted, inferred from the list.
   */
  dir?: TextDirection
}

/** Props passed to the {@link GhostTabs} default slot. */
export interface GhostTabsSlotProps {
  modelValue: string | undefined
}

/** Props for {@link GhostTabsList}. */
export interface GhostTabsListProps {
  /**
   * Tag name or component rendered for the tab list.
   * @default 'div'
   */
  as?: GhostTabsListElement
}

/** Props for {@link GhostTabsTrigger}. */
export interface GhostTabsTriggerProps {
  /**
   * Tag name or component rendered for the tab control.
   * @default 'button'
   */
  as?: GhostTabsTriggerElement
  /** Stable value identifying this tab and its panel. */
  value: string
  /**
   * Disables selection and removes the tab from roving focus.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostTabsContent}. */
export interface GhostTabsContentProps {
  /**
   * Tag name or component rendered for the tab panel.
   * @default 'div'
   */
  as?: GhostTabsContentElement
  /** Panel value; must match a {@link GhostTabsTrigger} `value`. */
  value: string
}

/** Methods and state exposed by a template ref to {@link GhostTabsList}. */
export interface GhostTabsListExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostTabsTrigger}. */
export interface GhostTabsTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostTabsContent}. */
export interface GhostTabsContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/**
 * Renderless {@link GhostTabs} exposes no root element; `element` is always `null`.
 */
export interface GhostTabsExposed {
  readonly element: HTMLElement | null
}

/** Options for {@link useGhostTabs}. */
export interface UseGhostTabsOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  activationMode?: MaybeRefOrGetter<GhostTabsActivationMode>
  orientation?: MaybeRefOrGetter<GhostTabsOrientation>
  dir?: MaybeRefOrGetter<TextDirection | undefined>
  onValueChange?: (value: string) => void
}

/** Reactive state and helpers returned by {@link useGhostTabs}. */
export interface UseGhostTabsReturn {
  modelValue: Ref<string | undefined>
  activationMode: ComputedRef<GhostTabsActivationMode>
  orientation: ComputedRef<GhostTabsOrientation>
  dir: ComputedRef<TextDirection | undefined>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  registerTrigger: (value: string, triggerId: string) => void
  unregisterTrigger: (value: string) => void
  registerPanel: (value: string, panelId: string) => void
  unregisterPanel: (value: string) => void
  getTriggerId: (value: string) => string | undefined
  getPanelId: (value: string) => string | undefined
  defaultUncontrolled: ComputedRef<boolean>
  registryVersion: Ref<number>
}

/** Internal context shared between `GhostTabs` parts. */
export interface GhostTabsContext {
  modelValue: Ref<string | undefined>
  activationMode: ComputedRef<GhostTabsActivationMode>
  orientation: ComputedRef<GhostTabsOrientation>
  dir: ComputedRef<TextDirection | undefined>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  registerTrigger: (value: string, triggerId: string) => void
  unregisterTrigger: (value: string) => void
  registerPanel: (value: string, panelId: string) => void
  unregisterPanel: (value: string) => void
  getTriggerId: (value: string) => string | undefined
  getPanelId: (value: string) => string | undefined
  registryVersion: Ref<number>
}

export const ghostTabsContextKey: InjectionKey<GhostTabsContext> =
  Symbol('ghost-tabs')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so wrappers like themed
 * `GhostButton` with a `display: contents` scope resolve to their inner control).
 */
export function resolveTabsHtmlElement(target: unknown): HTMLElement | null {
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
