import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { TextDirection } from './use-roving-focus'

/** Selection mode for {@link GhostToggleGroup}. */
export type GhostToggleGroupType = 'single' | 'multiple'

export type GhostToggleGroupOrientation = 'horizontal' | 'vertical'

/** Controlled values emitted by {@link GhostToggleGroup}. */
export type GhostToggleGroupValue = string | string[] | undefined

/** Valid `as` targets for {@link GhostToggleGroup}. */
export type GhostToggleGroupElement = string | Component

/** Valid `as` targets for {@link GhostToggleGroupItem}. */
export type GhostToggleGroupItemElement = string | Component

/** Props for the {@link GhostToggleGroup} root. */
export interface GhostToggleGroupProps {
  /**
   * Single allows at most one pressed item (deselectable); multiple allows any
   * subset.
   * @default 'single'
   */
  type?: GhostToggleGroupType
  /**
   * Controlled selection. Omit for uncontrolled mode. Shape must match `type`.
   * @default undefined
   */
  modelValue?: GhostToggleGroupValue
  /**
   * Initial selection when `modelValue` is omitted. Multiple defaults to `[]`.
   * @default undefined
   */
  defaultValue?: GhostToggleGroupValue
  /**
   * Layout for roving arrow keys and optional `aria-orientation`.
   * @default 'horizontal'
   */
  orientation?: GhostToggleGroupOrientation
  /**
   * Explicit text direction for horizontal roving focus.
   */
  dir?: TextDirection
  /**
   * Root host element. Must not be interactive itself.
   * @default 'div'
   */
  as?: GhostToggleGroupElement
  /**
   * Disables toggling for every item.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostToggleGroupItem}. */
export interface GhostToggleGroupItemProps {
  /**
   * Tag name or component for the toggle control.
   * @default 'button'
   */
  as?: GhostToggleGroupItemElement
  /** Stable value identifying this item in the group model. */
  value: string
  /**
   * Disables this item and removes it from roving focus.
   * @default false
   */
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostToggleGroup}. */
export interface GhostToggleGroupExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostToggleGroupItem}. */
export interface GhostToggleGroupItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostToggleGroup}. */
export interface UseGhostToggleGroupOptions {
  type?: MaybeRefOrGetter<GhostToggleGroupType>
  modelValue?: MaybeRefOrGetter<GhostToggleGroupValue>
  defaultValue?: MaybeRefOrGetter<GhostToggleGroupValue>
  orientation?: MaybeRefOrGetter<GhostToggleGroupOrientation>
  dir?: MaybeRefOrGetter<TextDirection | undefined>
  disabled?: MaybeRefOrGetter<boolean>
  onValueChange?: (value: GhostToggleGroupValue) => void
}

/** Reactive state and helpers returned by {@link useGhostToggleGroup}. */
export interface UseGhostToggleGroupReturn {
  type: ComputedRef<GhostToggleGroupType>
  modelValue: Ref<GhostToggleGroupValue>
  orientation: ComputedRef<GhostToggleGroupOrientation>
  dir: ComputedRef<TextDirection | undefined>
  groupDisabled: ComputedRef<boolean>
  isPressed: (value: string) => boolean
  toggle: (value: string) => void
  registerItem: (value: string, disabled: boolean) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  tabStopValue: ComputedRef<string | undefined>
  registryVersion: Ref<number>
}

/** Internal context shared between `GhostToggleGroup` parts. */
export interface GhostToggleGroupContext {
  type: ComputedRef<GhostToggleGroupType>
  modelValue: Ref<GhostToggleGroupValue>
  orientation: ComputedRef<GhostToggleGroupOrientation>
  dir: ComputedRef<TextDirection | undefined>
  groupDisabled: ComputedRef<boolean>
  isPressed: (value: string) => boolean
  toggle: (value: string) => void
  registerItem: (value: string, disabled: boolean) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  tabStopValue: ComputedRef<string | undefined>
  registryVersion: Ref<number>
  syncSelectionTabStops: (groupRoot: HTMLElement) => void
}

export const ghostToggleGroupContextKey: InjectionKey<GhostToggleGroupContext> =
  Symbol('ghost-toggle-group')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveToggleGroupHtmlElement(
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
