import {
  Comment,
  Text,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type Ref,
  type VNode,
} from 'vue'

/** Valid `as` targets for {@link GhostFieldLabel}. */
export type GhostFieldLabelElement = string | Component

/** Valid `as` targets for {@link GhostFieldDescription}. */
export type GhostFieldDescriptionElement = string | Component

/** Valid `as` targets for {@link GhostFieldError}. */
export type GhostFieldErrorElement = string | Component

/** How {@link GhostFieldLabel} associates with the control. */
export type GhostFieldLabelAssociate = 'reference' | 'wrap'

/** Props for the {@link GhostField} root provider. */
export interface GhostFieldProps {
  /**
   * Optional control id override. When omitted, {@link useGhostId} generates one.
   */
  id?: string
  /**
   * Propagates disabled semantics to the control through {@link GhostFieldControl}.
   * @default false
   */
  disabled?: boolean
  /**
   * Propagates invalid semantics to the control and sets root `data-state`.
   * @default false
   */
  invalid?: boolean
  /**
   * Propagates required semantics to the control.
   * @default false
   */
  required?: boolean
}

/** Props for {@link GhostFieldLabel}. */
export interface GhostFieldLabelProps {
  /**
   * Tag name or component rendered for the label.
   * @default 'label'
   */
  as?: GhostFieldLabelElement
  /**
   * `reference` uses `for` with the control id. `wrap` omits `for` for nested controls.
   * @default 'reference'
   */
  associate?: GhostFieldLabelAssociate
  /**
   * Shows the required marker when the root or this prop marks the field required.
   * @default false
   */
  required?: boolean
  /**
   * Renders the visual required marker when required.
   * @default true
   */
  showRequired?: boolean
}

/** Props for {@link GhostFieldDescription}. */
export interface GhostFieldDescriptionProps {
  /**
   * Tag name or component rendered for the hint.
   * @default 'p'
   */
  as?: GhostFieldDescriptionElement
}

/** Props for {@link GhostFieldError}. */
export interface GhostFieldErrorProps {
  /**
   * Tag name or component rendered for the error.
   * @default 'span'
   */
  as?: GhostFieldErrorElement
}

/** Scoped slot props from {@link GhostFieldControl}. */
export interface GhostFieldControlSlotProps {
  id: string
  disabled: boolean
  invalid: boolean
  required: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/** Props for {@link GhostFieldControl} (no declared props; slot props carry the contract). */
export type GhostFieldControlProps = Record<string, never>

/** Methods and state exposed by {@link GhostField}. */
export interface GhostFieldExposed {
  readonly element: HTMLElement | null
}

/** Methods and state exposed by {@link GhostFieldLabel}. */
export interface GhostFieldLabelExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by {@link GhostFieldDescription}. */
export interface GhostFieldDescriptionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by {@link GhostFieldError}. */
export interface GhostFieldErrorExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by {@link GhostFieldControl}. */
export interface GhostFieldControlExposed {
  readonly element: HTMLElement | null
}

/** Options for {@link useGhostField}. */
export interface UseGhostFieldOptions {
  id?: () => string | undefined
  disabled?: () => boolean | undefined
  invalid?: () => boolean | undefined
  required?: () => boolean | undefined
}

/** Reactive ids and state returned by {@link useGhostField}. */
export interface UseGhostFieldReturn {
  controlId: ComputedRef<string>
  labelId: ComputedRef<string>
  descriptionId: ComputedRef<string>
  errorId: ComputedRef<string>
  disabled: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  required: ComputedRef<boolean>
}

/** Shared context between `GhostField` parts. */
export interface GhostFieldContext {
  controlId: ComputedRef<string>
  labelId: ComputedRef<string>
  descriptionId: ComputedRef<string>
  errorId: ComputedRef<string>
  disabled: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  required: ComputedRef<boolean>
  descriptionRegistered: Ref<boolean>
  errorRegistered: Ref<boolean>
  errorVisible: Ref<boolean>
  ariaDescribedBy: ComputedRef<string | undefined>
  setDescriptionRegistered(registered: boolean): void
  setErrorRegistered(registered: boolean): void
  setErrorVisible(visible: boolean): void
}

export type GhostFieldInternalContext = GhostFieldContext

export const ghostFieldContextKey: InjectionKey<GhostFieldInternalContext> =
  Symbol('ghost-field')

/** Resolve the mounted HTMLElement for template refs on field parts. */
export function resolveFieldHtmlElement(target: unknown): HTMLElement | null {
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

/** Whether a default slot renders visible text or element content. */
export function vnodeListHasContent(nodes: VNode[]): boolean {
  return nodes.some((node) => {
    if (node.type === Comment) {
      return false
    }
    if (node.type === Text) {
      return (
        typeof node.children === 'string' && node.children.trim().length > 0
      )
    }
    if (Array.isArray(node.children)) {
      return vnodeListHasContent(node.children as VNode[])
    }
    return Boolean(node.type)
  })
}
