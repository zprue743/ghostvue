import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { TextDirection } from './use-roving-focus'
import { resolveToggleGroupHtmlElement } from './ghost-toggle-group'

/** Controlled value for {@link GhostSegmentedControl}. */
export type GhostSegmentedControlValue = string | undefined

export type GhostSegmentedControlOrientation = 'horizontal' | 'vertical'

/** Valid `as` targets for {@link GhostSegmentedControl}. */
export type GhostSegmentedControlElement = string | Component

/** Valid `as` targets for {@link GhostSegmentedControlItem}. */
export type GhostSegmentedControlItemElement = string | Component

/** Props for the {@link GhostSegmentedControl} root. */
export interface GhostSegmentedControlProps {
  /**
   * Controlled selection. Omit for uncontrolled mode.
   * @default undefined
   */
  modelValue?: GhostSegmentedControlValue
  /**
   * Initial selection when `modelValue` is omitted.
   * @default undefined
   */
  defaultValue?: GhostSegmentedControlValue
  /**
   * Layout for roving arrow keys, indicator slide axis, and optional
   * `aria-orientation`.
   * @default 'horizontal'
   */
  orientation?: GhostSegmentedControlOrientation
  /** Explicit text direction for horizontal roving focus. */
  dir?: TextDirection
  /**
   * Root host element. Must not be interactive itself.
   * @default 'div'
   */
  as?: GhostSegmentedControlElement
  /**
   * Disables toggling for every item.
   * @default false
   */
  disabled?: boolean
  /**
   * When false, pressing the active segment keeps it selected.
   * @default false
   */
  deselectable?: boolean
}

/** Props for {@link GhostSegmentedControlItem}. */
export interface GhostSegmentedControlItemProps {
  /**
   * Tag name or component for the segment control.
   * @default 'button'
   */
  as?: GhostSegmentedControlItemElement
  /** Stable value identifying this item in the group model. */
  value: string
  /**
   * Disables this item and removes it from roving focus.
   * @default false
   */
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostSegmentedControl}. */
export interface GhostSegmentedControlExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostSegmentedControlItem}. */
export interface GhostSegmentedControlItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostSegmentedControl}. */
export interface UseGhostSegmentedControlOptions {
  modelValue?: MaybeRefOrGetter<GhostSegmentedControlValue>
  defaultValue?: MaybeRefOrGetter<GhostSegmentedControlValue>
  orientation?: MaybeRefOrGetter<GhostSegmentedControlOrientation>
  dir?: MaybeRefOrGetter<TextDirection | undefined>
  disabled?: MaybeRefOrGetter<boolean>
  deselectable?: MaybeRefOrGetter<boolean>
  onValueChange?: (value: GhostSegmentedControlValue) => void
}

/** Reactive state and helpers returned by {@link useGhostSegmentedControl}. */
export interface UseGhostSegmentedControlReturn {
  modelValue: Ref<GhostSegmentedControlValue>
  orientation: ComputedRef<GhostSegmentedControlOrientation>
  dir: ComputedRef<TextDirection | undefined>
  groupDisabled: ComputedRef<boolean>
  deselectable: ComputedRef<boolean>
  isPressed: (value: string) => boolean
  toggle: (value: string) => void
  registerItem: (value: string, disabled: boolean) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  tabStopValue: ComputedRef<string | undefined>
  registryVersion: Ref<number>
  /** Registration order of item values (SSR-safe indicator index). */
  itemOrder: Ref<string[]>
  /** Selected index in `itemOrder`, or `-1` when none. */
  selectedIndex: ComputedRef<number>
  itemCount: ComputedRef<number>
  /** Align `itemOrder` with DOM after mount; no-op when DOM has no items. */
  reconcileItemOrderFromDom: (root: HTMLElement) => void
}

/** Internal context shared between segmented control parts. */
export interface GhostSegmentedControlContext {
  modelValue: Ref<GhostSegmentedControlValue>
  orientation: ComputedRef<GhostSegmentedControlOrientation>
  dir: ComputedRef<TextDirection | undefined>
  groupDisabled: ComputedRef<boolean>
  isPressed: (value: string) => boolean
  toggle: (value: string) => void
  registerItem: (value: string, disabled: boolean) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  tabStopValue: ComputedRef<string | undefined>
  registryVersion: Ref<number>
  itemCount: ComputedRef<number>
  selectedIndex: ComputedRef<number>
  syncSelectionTabStops: (groupRoot: HTMLElement) => void
}

export const ghostSegmentedControlContextKey: InjectionKey<GhostSegmentedControlContext> =
  Symbol('ghost-segmented-control')

export { resolveToggleGroupHtmlElement as resolveSegmentedControlHtmlElement }
