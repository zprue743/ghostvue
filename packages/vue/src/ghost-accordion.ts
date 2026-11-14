import type {
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
  WritableComputedRef,
} from 'vue'

import type {
  GhostCollapsibleContentElement,
  GhostCollapsibleContentExposed,
  GhostCollapsibleTriggerElement,
  GhostCollapsibleTriggerExposed,
} from './ghost-collapsible'

export type GhostAccordionType = 'single' | 'multiple'
export type GhostAccordionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type GhostAccordionValue = string | string[] | undefined

/** Valid `as` targets for {@link GhostAccordionTrigger}. */
export type GhostAccordionTriggerElement = GhostCollapsibleTriggerElement

/** Valid `as` targets for {@link GhostAccordionContent}. */
export type GhostAccordionContentElement = GhostCollapsibleContentElement

/** Props for the {@link GhostAccordion} root provider component. */
export interface GhostAccordionProps {
  /**
   * Single expansion (one open item) or multiple open items.
   * @default 'single'
   */
  type?: GhostAccordionType
  /**
   * When `type` is `single`, allow closing the open item so none are expanded.
   * @default false
   */
  collapsible?: boolean
  /**
   * Controlled expansion. Omit for uncontrolled. `string` or `undefined` when
   * `type` is `single`; `string[]` when `type` is `multiple`.
   * @default undefined
   */
  modelValue?: GhostAccordionValue
  /**
   * Initial expansion when `modelValue` is omitted.
   * @default undefined
   */
  defaultValue?: GhostAccordionValue
  /**
   * Heading level wrapping each accordion trigger.
   * @default 3
   */
  headingLevel?: GhostAccordionHeadingLevel
  /**
   * Disables toggling on every item when `true`.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostAccordionItem}. */
export interface GhostAccordionItemProps {
  /** Stable value identifying this panel in the root `modelValue`. */
  value: string
  /**
   * Disables toggling on this item.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostAccordionTrigger}. */
export interface GhostAccordionTriggerProps {
  /**
   * Tag name or component forwarded to the inner disclosure trigger.
   * @default 'button'
   */
  as?: GhostAccordionTriggerElement
}

/** Props for {@link GhostAccordionContent}. */
export interface GhostAccordionContentProps {
  /**
   * Tag name or component forwarded to the inner disclosure panel.
   * @default 'div'
   */
  as?: GhostAccordionContentElement
  /**
   * Skips theme height animations even when motion is allowed.
   * @default false
   */
  disableAnimation?: boolean
}

export type GhostAccordionTriggerExposed = GhostCollapsibleTriggerExposed
export type GhostAccordionContentExposed = GhostCollapsibleContentExposed

/** Methods and state exposed by a template ref to {@link GhostAccordion}. */
export interface GhostAccordionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostAccordion}. */
export interface UseGhostAccordionOptions {
  type?: MaybeRefOrGetter<GhostAccordionType>
  collapsible?: MaybeRefOrGetter<boolean>
  modelValue?: MaybeRefOrGetter<GhostAccordionValue>
  defaultValue?: MaybeRefOrGetter<GhostAccordionValue>
  onValueChange?: (value: GhostAccordionValue) => void
}

/** Reactive state and helpers returned by {@link useGhostAccordion}. */
export interface UseGhostAccordionReturn {
  modelValue: WritableComputedRef<GhostAccordionValue>
  type: ComputedRef<GhostAccordionType>
  collapsible: ComputedRef<boolean>
  isItemOpen: (value: string) => boolean
  setItemOpen: (value: string, open: boolean) => void
}

/** Internal context shared between `GhostAccordion` parts. */
export interface GhostAccordionContext {
  type: ComputedRef<GhostAccordionType>
  collapsible: ComputedRef<boolean>
  headingLevel: ComputedRef<GhostAccordionHeadingLevel>
  disabled: Ref<boolean>
  isItemOpen: (value: string) => boolean
  setItemOpen: (value: string, open: boolean) => void
  isItemDisabled: (value: string) => boolean
}

/** Per-item context from {@link GhostAccordionItem}. */
export interface GhostAccordionItemContext {
  value: string
  disabled: ComputedRef<boolean>
}

export const ghostAccordionContextKey: InjectionKey<GhostAccordionContext> =
  Symbol('ghost-accordion')

export const ghostAccordionItemContextKey: InjectionKey<GhostAccordionItemContext> =
  Symbol('ghost-accordion-item')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveAccordionHtmlElement(
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
