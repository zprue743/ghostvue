/**
 * Internal compound-dialog part mechanics shared by `GhostDialog*` and
 * `GhostDrawer*`.
 *
 * Both families implement the same APG Dialog (Modal) contract: controllable
 * open state, deterministic part IDs, trigger/close activation, modal overlay,
 * and a content surface composing `useScrollLock`, `useInertOthers`,
 * `useDismissableLayer`, and `useFocusScope`. Keeping one implementation here
 * prevents the focus, dismissal, scroll-lock, and background-isolation logic
 * from drifting between the two families (GHO-91).
 *
 * This module is intentionally not exported from the public barrel. Each family
 * provides the context returned by {@link createDialogPartsContext} under its own
 * injection key (`ghostDialogContextKey` vs `ghostDrawerContextKey`) so a
 * `GhostDialog` nested inside a `GhostDrawer` (or vice versa) never resolves the
 * wrong ancestor through `provide` / `inject`.
 */
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
  toValue,
  useAttrs,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from 'vue'

import { logGhostCode } from './dev-codes'
import { isFocusable } from './get-tabbable-elements'
import type { GhostDialogContentRole, GhostDialogContext } from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'
import { useControllableState } from './use-controllable-state'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFocusScope } from './use-focus-scope'
import { useGhostId } from './use-ghost-id'
import { useGhostPresence } from './use-ghost-presence'
import { useInertOthers } from './use-inert-others'
import { useScrollLock } from './use-scroll-lock'

/**
 * Context shared by every compound dialog part. Structurally identical to the
 * public `GhostDialogContext` plus the internal `openedAtMount` flag used by
 * non-modal autofocus.
 */
export type DialogPartsContext = GhostDialogContext & {
  openedAtMount: Ref<boolean>
  /**
   * Internal: skips exit retention for the content surface. Set by
   * `GhostDatePickerContent` so an anchored picker closed before its first
   * positioning (still `visibility: hidden`) unmounts immediately.
   */
  skipExitPresence?: () => boolean
}

/** Ref contract every part exposes through `defineExpose`. */
export interface DialogPartExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options accepted by {@link useDialogState}. */
export interface UseDialogStateOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  modal?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Return value of {@link useDialogState}. */
export interface UseDialogStateReturn {
  isOpen: Ref<boolean>
  isModal: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  titleId: ComputedRef<string>
  descriptionId: ComputedRef<string>
}

/**
 * Controllable open state, modal flag, and deterministic SSR-safe IDs.
 *
 * `idPrefix` keeps generated IDs readable per family (`ghost-dialog-*` vs
 * `ghost-drawer-*`); uniqueness still comes from `useGhostId`.
 */
export function useDialogState(
  options: UseDialogStateOptions,
  idPrefix: string,
): UseDialogStateReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const isModal = computed(() => toValue(options.modal) ?? true)

  const triggerId = useGhostId(`${idPrefix}-trigger`)
  const contentId = useGhostId(`${idPrefix}-content`)
  const titleId = useGhostId(`${idPrefix}-title`)
  const descriptionId = useGhostId(`${idPrefix}-description`)

  function open(): void {
    if (!isOpen.value) {
      isOpen.value = true
    }
  }

  function close(): void {
    if (isOpen.value) {
      isOpen.value = false
    }
  }

  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    isModal,
    open,
    close,
    toggle,
    triggerId,
    contentId,
    titleId,
    descriptionId,
  }
}

/**
 * Builds the root context provided to compound parts. Must run during the
 * root component's `setup`.
 */
export function createDialogPartsContext(
  state: UseDialogStateReturn,
): DialogPartsContext {
  // Record whether a non-modal dialog started open at setup so `defaultOpen`
  // does not steal focus on page load (matching GhostPopover), while modal
  // dialogs always move focus inside on open per APG Dialog expectations.
  const openedAtMount = shallowRef(state.isOpen.value)
  watch(state.isOpen, (open) => {
    if (!open) {
      openedAtMount.value = false
    }
  })

  const customTriggerId = shallowRef<string | null>(null)
  const customContentId = shallowRef<string | null>(null)
  const customTitleId = shallowRef<string | null>(null)
  const customDescriptionId = shallowRef<string | null>(null)
  const triggerRegistered = shallowRef(false)
  const titleRegistered = shallowRef(false)
  const descriptionRegistered = shallowRef(false)
  const triggerElement = shallowRef<HTMLElement | null>(null)
  const overlayElement = shallowRef<HTMLElement | null>(null)
  const contentElement = shallowRef<HTMLElement | null>(null)

  return {
    isOpen: state.isOpen,
    isModal: state.isModal,
    open: state.open,
    close: state.close,
    toggle: state.toggle,
    defaultTriggerId: state.triggerId,
    defaultContentId: state.contentId,
    defaultTitleId: state.titleId,
    defaultDescriptionId: state.descriptionId,
    triggerId: computed(() => customTriggerId.value ?? state.triggerId.value),
    contentId: computed(() => customContentId.value ?? state.contentId.value),
    titleId: computed(() => customTitleId.value ?? state.titleId.value),
    descriptionId: computed(
      () => customDescriptionId.value ?? state.descriptionId.value,
    ),
    triggerRegistered,
    titleRegistered,
    descriptionRegistered,
    triggerElement,
    overlayElement,
    contentElement,
    openedAtMount,
    setTriggerElement(element) {
      triggerElement.value = element
    },
    setOverlayElement(element) {
      overlayElement.value = element
    },
    setContentElement(element) {
      contentElement.value = element
    },
    setTriggerId(id) {
      customTriggerId.value = id
    },
    setTriggerRegistered(registered) {
      triggerRegistered.value = registered
    },
    setContentId(id) {
      customContentId.value = id
    },
    setTitleId(id) {
      customTitleId.value = id
    },
    setTitleRegistered(registered) {
      titleRegistered.value = registered
    },
    setDescriptionId(id) {
      customDescriptionId.value = id
    },
    setDescriptionRegistered(registered) {
      descriptionRegistered.value = registered
    },
  }
}

/**
 * Injects a family context or throws a consumer-facing error naming both the
 * part and its required root.
 */
export function injectDialogPartsContext<T extends DialogPartsContext>(
  key: InjectionKey<T>,
  partName: string,
  rootName: string,
): T {
  const context = inject(key)
  if (!context) {
    throw new Error(`${partName} must be used inside ${rootName}`)
  }
  return context
}

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so wrappers like themed
 * `GhostButton` with a `display: contents` scope resolve to their inner control).
 */
export function resolveDialogHtmlElement(target: unknown): HTMLElement | null {
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

/** Builds the `{ element, focus, blur }` ref contract for one part. */
export function createDialogPartExposed(
  element: () => HTMLElement | null,
): DialogPartExposed {
  return {
    get element() {
      return element()
    },
    focus(options?: FocusOptions) {
      element()?.focus(options)
    },
    blur() {
      element()?.blur()
    },
  }
}

type ExtraAttrs = () => Record<string, unknown>

function invokeAttrHandler(handler: unknown, event: Event): void {
  if (typeof handler === 'function') {
    ;(handler as (event: Event) => void)(event)
  } else if (Array.isArray(handler)) {
    for (const fn of handler) {
      if (typeof fn === 'function') {
        ;(fn as (event: Event) => void)(event)
      }
    }
  }
}

/** Props shared by button-like parts (Trigger and Close). */
interface DialogButtonPartProps {
  as: unknown
  disabled: boolean
}

/**
 * Button semantics for Trigger and Close: native `type="button"` /
 * `disabled` on `<button>`, forwarded `disabled` on components, and
 * `role="button"` + `tabindex` + `aria-disabled` on other tags.
 */
function useButtonPart(
  props: DialogButtonPartProps,
  hostRef: Readonly<ShallowRef<unknown>>,
  activate: (event: Event) => void,
) {
  const attrs = useAttrs()
  const element = computed(() => resolveDialogHtmlElement(hostRef.value))
  const isNativeButtonTag = computed(() => props.as === 'button')
  const isComponentHost = computed(() => typeof props.as !== 'string')

  function buttonAttrs(): Record<string, unknown> {
    const customType = attrs['type']
    const customRole = attrs['role']
    const customTabindex = attrs['tabindex']
    const base: Record<string, unknown> = {}

    if (isNativeButtonTag.value) {
      base['type'] = customType ?? 'button'
      base['disabled'] = props.disabled
    } else if (isComponentHost.value) {
      base['disabled'] = props.disabled
      if (customType !== undefined) {
        base['type'] = customType
      }
    } else {
      base['role'] = customRole ?? 'button'
      base['tabindex'] = customTabindex ?? (props.disabled ? undefined : 0)
      if (props.disabled) {
        base['aria-disabled'] = 'true'
      }
    }
    return base
  }

  function restAttrs(excluded: readonly string[]): Record<string, unknown> {
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attrs)) {
      if (!excluded.includes(key)) {
        rest[key] = value
      }
    }
    return rest
  }

  // Disabled guards run before consumer handlers so a disabled control can
  // never open or close the dialog through a forwarded listener (AUDIT H2).
  function onClick(event: MouseEvent): void {
    if (props.disabled) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    invokeAttrHandler(attrs['onClick'], event)
    if (!event.defaultPrevented) {
      activate(event)
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!props.disabled) {
      invokeAttrHandler(attrs['onKeydown'], event)
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    if (props.disabled) {
      event.preventDefault()
      return
    }
    if (event.defaultPrevented) {
      return
    }
    const el = element.value
    // Native buttons and links already synthesize click from Enter/Space.
    if (el instanceof HTMLButtonElement) {
      return
    }
    if (
      event.key === 'Enter' &&
      el instanceof HTMLAnchorElement &&
      el.hasAttribute('href')
    ) {
      return
    }
    event.preventDefault()
    activate(event)
  }

  return { attrs, element, buttonAttrs, restAttrs, onClick, onKeydown }
}

/** Trigger part: opens/toggles the dialog and registers its id and element. */
export function useDialogTriggerPart(
  context: DialogPartsContext,
  props: DialogButtonPartProps,
  hostRef: Readonly<ShallowRef<unknown>>,
  options: { haspopup?: string; extraAttrs?: ExtraAttrs } = {},
) {
  const { attrs, element, buttonAttrs, restAttrs, onClick, onKeydown } =
    useButtonPart(props, hostRef, (event) => {
      // Ensure the trigger owns focus right before a pointer open so
      // useFocusScope always captures the trigger as previouslyFocused.
      if (
        event.type === 'click' &&
        !context.isOpen.value &&
        element.value &&
        document.activeElement !== element.value
      ) {
        element.value.focus({ preventScroll: true })
      }
      context.toggle()
    })

  const triggerId = computed(() => {
    const custom = attrs['id']
    return typeof custom === 'string' && custom.length > 0
      ? custom
      : context.defaultTriggerId.value
  })

  context.setTriggerRegistered(true)

  watch(
    triggerId,
    (id) => {
      context.setTriggerId(id === context.defaultTriggerId.value ? null : id)
    },
    { immediate: true },
  )

  watch(
    element,
    (el) => {
      context.setTriggerElement(el)
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(() => {
    context.setTriggerElement(null)
    context.setTriggerId(null)
    context.setTriggerRegistered(false)
  })

  const triggerAttrs = computed(() => ({
    ...restAttrs(['id', 'type', 'role', 'tabindex', 'onClick', 'onKeydown']),
    id: triggerId.value,
    'aria-haspopup': options.haspopup ?? 'dialog',
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': context.contentId.value,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    ...options.extraAttrs?.(),
    ...buttonAttrs(),
  }))

  return {
    triggerAttrs,
    onClick,
    onKeydown,
    exposed: createDialogPartExposed(() => element.value),
  }
}

/** Close part: closes the enclosing dialog on click or keyboard activation. */
export function useDialogClosePart(
  context: DialogPartsContext,
  props: DialogButtonPartProps,
  hostRef: Readonly<ShallowRef<unknown>>,
) {
  const { element, buttonAttrs, restAttrs, onClick, onKeydown } = useButtonPart(
    props,
    hostRef,
    () => {
      context.close()
    },
  )

  const closeAttrs = computed(() => ({
    ...restAttrs(['type', 'role', 'tabindex', 'onClick', 'onKeydown']),
    'data-part': 'close',
    ...buttonAttrs(),
  }))

  return {
    closeAttrs,
    onClick,
    onKeydown,
    exposed: createDialogPartExposed(() => element.value),
  }
}

/** Overlay part: modal-only backdrop that stays non-inert while open. */
export function useDialogOverlayPart(
  context: DialogPartsContext,
  hostRef: Readonly<ShallowRef<unknown>>,
  options: { extraAttrs?: ExtraAttrs } = {},
) {
  const attrs = useAttrs()
  const visible = computed(() => context.isOpen.value && context.isModal.value)
  // The backdrop stays mounted while its own exit fade runs; `visible` (logical
  // state) still drives background inert registration so isolation releases
  // immediately on close.
  const presence = useGhostPresence({
    present: visible,
    element: () => resolveDialogHtmlElement(hostRef.value),
  })
  const overlayElement = computed(() =>
    visible.value ? resolveDialogHtmlElement(hostRef.value) : null,
  )
  const presentElement = computed(() =>
    presence.isPresent.value ? resolveDialogHtmlElement(hostRef.value) : null,
  )

  watch(
    overlayElement,
    (el) => {
      context.setOverlayElement(el)
    },
    { immediate: true, flush: 'post' },
  )

  onUnmounted(() => {
    context.setOverlayElement(null)
  })

  const overlayAttrs = computed(() => {
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attrs)) {
      if (key !== 'aria-hidden' && key !== 'class') {
        rest[key] = value
      }
    }
    // Declared `style` key: written below while exiting.
    const result: Record<string, unknown> & { style?: unknown } = {
      ...rest,
      'aria-hidden': 'true',
      'data-part': 'overlay',
      'data-state': presence.dataState.value,
      ...options.extraAttrs?.(),
    }
    if (presence.isExiting.value) {
      // A fading scrim must let clicks and touch scrolling reach the page the
      // moment the dialog logically closes. Applied after consumer `style` so
      // a consumer `pointer-events` cannot keep a departing scrim clickable.
      const { style: consumerStyle } = attrs
      result.style = [consumerStyle, { pointerEvents: 'none' }]
    }
    return result
  })

  return {
    attrs,
    isPresent: presence.isPresent,
    overlayAttrs,
    exposed: createDialogPartExposed(() => presentElement.value),
  }
}

/** Title or Description part: registers its id for automatic ARIA linking. */
export function useDialogLabelPart(
  context: DialogPartsContext,
  kind: 'title' | 'description',
  hostRef: Readonly<ShallowRef<unknown>>,
) {
  const attrs = useAttrs()
  const element = computed(() => resolveDialogHtmlElement(hostRef.value))
  const defaultId =
    kind === 'title' ? context.defaultTitleId : context.defaultDescriptionId
  const setId = kind === 'title' ? context.setTitleId : context.setDescriptionId
  const setRegistered =
    kind === 'title'
      ? context.setTitleRegistered
      : context.setDescriptionRegistered

  const id = computed(() => {
    const custom = attrs['id']
    return typeof custom === 'string' && custom.length > 0
      ? custom
      : defaultId.value
  })

  setRegistered(true)

  watch(
    id,
    (next) => {
      setId(next === defaultId.value ? null : next)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    setId(null)
    setRegistered(false)
  })

  const labelAttrs = computed(() => {
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attrs)) {
      if (key !== 'id') {
        rest[key] = value
      }
    }
    return {
      ...rest,
      id: id.value,
      'data-part': kind,
    }
  })

  return {
    labelAttrs,
    exposed: createDialogPartExposed(() => element.value),
  }
}

/** Props consumed by {@link useDialogContentPart}. */
export interface DialogContentPartProps {
  role: GhostDialogContentRole
  closeOnEscape: boolean
  closeOnOutsideClick: boolean | undefined
  portal: boolean
  portalTo: GhostPortalTarget
  /**
   * Focus-entry hooks exposed by `GhostDialogContent` (GHO-209). Optional so
   * `GhostDrawerContent`, which does not expose them, keeps the defaults.
   */
  focusReady?: boolean
  initialFocus?: (() => HTMLElement | null) | undefined
  returnFocus?: (() => HTMLElement | null) | undefined
}

/** True when `element` can receive restored focus right now. */
function isRestorableTarget(element: unknown): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.isConnected &&
    isFocusable(element)
  )
}

function hasFocusableAncestor(target: EventTarget | null): boolean {
  let current: Element | null =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    if (current instanceof HTMLElement && isFocusable(current)) {
      return true
    }
    current = current.parentElement
  }
  return false
}

/**
 * Content part: the dialog surface. Composes scroll lock, background inert,
 * dismissable layer, and focus scope, links Title/Description, and emits
 * `GHOST002` / `GHOST003` development diagnostics.
 *
 * `extraAttrs` lets a family add its own hooks (for example the drawer's
 * `data-side` / `data-dir`). They are applied after consumer attrs and before
 * the ARIA relationships, so they cannot override role or labelling.
 *
 * `suppressRestoreFocus` lets a family close without restoring focus when the
 * user already moved focus elsewhere (the non-modal command palette's focus
 * departure, GHO-166). Dialog and Drawer do not pass it.
 */
export function useDialogContentPart(
  context: DialogPartsContext,
  props: DialogContentPartProps,
  hostRef: Readonly<ShallowRef<unknown>>,
  options: {
    extraAttrs?: ExtraAttrs
    suppressRestoreFocus?: () => boolean
  } = {},
) {
  const attrs = useAttrs()

  // Logical `isOpen` drives focus, dismissal, scroll lock and background inert
  // (all released immediately on close); presence only retains the DOM node
  // while the surface's own exit motion runs (presence spec, Composition).
  const presence = useGhostPresence({
    present: () => context.isOpen.value,
    element: () => resolveDialogHtmlElement(hostRef.value),
    disabled: () => context.skipExitPresence?.() ?? false,
  })

  /** Mounted surface, live while `'open'` or `'exiting'`. */
  const presentElement = computed(() =>
    presence.isPresent.value ? resolveDialogHtmlElement(hostRef.value) : null,
  )
  /** Open-gated surface used by every interactive subsystem. */
  const contentElement = computed(() =>
    context.isOpen.value ? presentElement.value : null,
  )

  const contentId = computed(() => {
    const custom = attrs['id']
    return typeof custom === 'string' && custom.length > 0
      ? custom
      : context.defaultContentId.value
  })

  watch(
    [() => context.isOpen.value, contentId],
    ([open, id]) => {
      if (open && id !== context.defaultContentId.value) {
        context.setContentId(id)
      } else {
        context.setContentId(null)
      }
    },
    { immediate: true },
  )

  watch(
    contentElement,
    (el) => {
      context.setContentElement(el)
    },
    { immediate: true, flush: 'post' },
  )

  // When a portaled dialog starts open at mount, GhostPortal teleports the DOM
  // node from inline into `portalTo` on the post-mount tick. Moving a focused
  // node during Teleport drops focus back to `document.body`, so defer focus
  // scope activation by one tick only for that initial-mount portal move.
  const focusPortalReady = shallowRef(!props.portal || !context.isOpen.value)
  let componentActive = true

  onMounted(() => {
    if (!focusPortalReady.value) {
      void nextTick(() => {
        if (componentActive) {
          focusPortalReady.value = true
        }
      })
    }
  })

  onUnmounted(() => {
    componentActive = false
    context.setContentElement(null)
    context.setContentId(null)
  })

  const modalActive = computed(
    () => context.isOpen.value && context.isModal.value,
  )
  const effectiveCloseOnOutsideClick = computed(
    () => props.closeOnOutsideClick ?? props.role !== 'alertdialog',
  )

  const shouldRestoreFocus = shallowRef(true)
  const allowRestoreFocus = (): boolean =>
    shouldRestoreFocus.value && !(options.suppressRestoreFocus?.() ?? false)

  // Per-opening focus bookkeeping for `focusReady`. `openerAtOpen` is captured
  // synchronously when an opening starts (or at mount for an initially open
  // dialog), before useInertOthers below inerts the background: browsers blur
  // a focused element once it becomes inert, so a scope that activates later
  // would otherwise save <body> as its restoration target. The saved opener is
  // only used when activation was actually deferred, so the default path keeps
  // useFocusScope's own saved node. Flags reset when the next opening starts,
  // not on close, because the scope's restore runs after the close watcher.
  let openerAtOpen: HTMLElement | null = null
  let activatedThisOpening = false
  let activationDeferred = false

  function beginOpening(): void {
    const active = document.activeElement
    openerAtOpen =
      active instanceof HTMLElement && active !== document.body ? active : null
    activatedThisOpening = false
    activationDeferred = false
  }

  // Non-immediate `sync` watcher: never runs during SSR, and runs before the
  // pre-flush inert watcher when `isOpen` flips to true on the client.
  watch(
    () => context.isOpen.value,
    (open) => {
      if (open) {
        beginOpening()
      }
    },
    { flush: 'sync' },
  )

  // Registered before useInertOthers so its onMounted inerting runs after.
  onMounted(() => {
    if (context.isOpen.value) {
      beginOpening()
    }
  })

  function resolveReturnTarget(): HTMLElement | null {
    const preferred = props.returnFocus?.()
    if (isRestorableTarget(preferred)) {
      return preferred
    }
    if (activationDeferred && isRestorableTarget(openerAtOpen)) {
      return openerAtOpen
    }
    return null
  }

  watch(
    () => context.isOpen.value,
    (open) => {
      if (open) {
        shouldRestoreFocus.value = true
      }
    },
    { immediate: true },
  )

  // Register scroll lock and inert isolation before useFocusScope so background
  // inert is removed from the trigger before focus restores on close.
  useScrollLock(modalActive)
  useInertOthers(
    [() => context.contentElement.value, () => context.overlayElement.value],
    modalActive,
    { watch: [() => props.portal, () => props.portalTo] },
  )

  useDismissableLayer(contentElement, {
    disableEscape: () => !props.closeOnEscape,
    disableOutsidePointer: () => !effectiveCloseOnOutsideClick.value,
    ignore: () => context.triggerElement.value,
    onDismiss: (reason, event) => {
      // Modal dialogs always restore focus on close; non-modal dialogs allow
      // clicking an outside focusable control to keep focus there cleanly.
      const skipRestore =
        !context.isModal.value &&
        reason === 'outside-pointer' &&
        hasFocusableAncestor(event.target)
      shouldRestoreFocus.value = !skipRestore
      if (context.isModal.value && reason === 'outside-pointer') {
        // Closing on pointerdown removes the overlay before the browser's
        // follow-up mousedown event fires at those coordinates; without this,
        // mousedown hits document.body and blurs the restored trigger focus.
        const preventBlur = (mouseEvent: MouseEvent): void => {
          mouseEvent.preventDefault()
        }
        // WebKit dispatches no compatibility mousedown once pointerdown has
        // removed its target, but its press default action still moves focus
        // to <body> after the restore. Remember where focus was restored and
        // reapply it in the next task, once that synchronous press handling is
        // over, but only if focus was dropped to <body> rather than moved on.
        let restored: HTMLElement | null = null
        const rememberRestored = (focusEvent: FocusEvent): void => {
          if (focusEvent.target instanceof HTMLElement) {
            restored = focusEvent.target
          }
        }
        document.addEventListener('mousedown', preventBlur, {
          capture: true,
          once: true,
        })
        document.addEventListener('focusin', rememberRestored, {
          capture: true,
          once: true,
        })
        window.setTimeout(() => {
          document.removeEventListener('mousedown', preventBlur, {
            capture: true,
          })
          document.removeEventListener('focusin', rememberRestored, {
            capture: true,
          })
          const active = document.activeElement
          if (
            restored?.isConnected &&
            (active === null || active === document.body)
          ) {
            restored.focus({ preventScroll: true })
          }
        }, 0)
      }
      context.close()
      if (skipRestore) {
        void nextTick(() => {
          if (context.isOpen.value) {
            shouldRestoreFocus.value = true
          }
        })
      }
    },
  })

  // Activation waits for portal placement and `focusReady`. Only the first
  // activation of an opening is gated: once active, the scope (and its trap)
  // stays on until close even if `focusReady` turns false again, so a
  // re-measure during positioning never releases a modal trap mid-interaction.
  const focusTarget = shallowRef<HTMLElement | null>(null)
  let lastSeenOpen = false
  watch(
    [
      () => context.isOpen.value,
      contentElement,
      focusPortalReady,
      () => props.focusReady ?? true,
    ],
    ([open, el, portalReady, ready]) => {
      const wasOpen = lastSeenOpen
      lastSeenOpen = open
      if (!open || !el) {
        if (
          !open &&
          wasOpen &&
          !activatedThisOpening &&
          activationDeferred &&
          allowRestoreFocus()
        ) {
          // Closed before the scope ever activated, so useFocusScope has
          // nothing to restore. Inert release is a pre-flush watcher, so the
          // opener is interactive again by this post-flush callback. Leave
          // focus alone if it already moved somewhere other than <body>.
          const active = document.activeElement
          const target = resolveReturnTarget()
          if (target && (active === null || active === document.body)) {
            target.focus({ preventScroll: true })
          }
        }
        focusTarget.value = null
        return
      }
      if (!portalReady || focusTarget.value === el) {
        return
      }
      if (ready || activatedThisOpening) {
        activatedThisOpening = true
        focusTarget.value = el
      } else {
        activationDeferred = true
      }
    },
    { immediate: true, flush: 'post' },
  )

  useFocusScope(focusTarget, {
    trapped: () => context.isModal.value,
    loop: () => context.isModal.value,
    autoFocus: () => context.isModal.value || !context.openedAtMount.value,
    restoreFocus: allowRestoreFocus,
    // Getters, so useFocusScope invokes the consumer resolvers lazily at
    // activation and restoration only (mounted lifecycle, never SSR setup).
    initialFocus: () => props.initialFocus?.() ?? null,
    returnFocus: resolveReturnTarget,
  })

  function hasNonEmptyStringAttr(name: string): boolean {
    const value = attrs[name]
    return typeof value === 'string' && value.trim().length > 0
  }

  if (process.env.NODE_ENV !== 'production') {
    watch(
      [() => context.isOpen.value, contentElement],
      ([open, el]) => {
        if (!open || !el) {
          return
        }
        if (
          !context.titleRegistered.value &&
          !hasNonEmptyStringAttr('aria-label') &&
          !hasNonEmptyStringAttr('aria-labelledby')
        ) {
          logGhostCode('GHOST002')
        }
        if (
          props.role === 'alertdialog' &&
          !context.descriptionRegistered.value &&
          !hasNonEmptyStringAttr('aria-describedby')
        ) {
          logGhostCode('GHOST003')
        }
      },
      { immediate: true, flush: 'post' },
    )
  }

  const hasExplicitLabel = computed(
    () =>
      attrs['aria-label'] !== undefined ||
      attrs['aria-labelledby'] !== undefined,
  )

  const contentAttrs = computed(() => {
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(attrs)) {
      if (
        key !== 'id' &&
        key !== 'class' &&
        key !== 'role' &&
        key !== 'aria-modal' &&
        key !== 'aria-describedby' &&
        key !== 'tabindex'
      ) {
        rest[key] = value
      }
    }

    // Declared `inert` / `style` keys: written below while exiting.
    const result: Record<string, unknown> & {
      inert?: boolean
      style?: unknown
    } = {
      ...rest,
      id: contentId.value,
      role: props.role,
      tabindex: attrs['tabindex'] ?? -1,
      'data-part': 'content',
      'data-state': presence.dataState.value,
      ...options.extraAttrs?.(),
    }

    if (presence.isExiting.value) {
      // Focus has already been restored by the time this render commits; the
      // departing surface leaves the accessibility tree and hit-testing. A
      // consumer `inert` is passed through above and returns on reopen.
      result.inert = true
      const { style: consumerStyle } = attrs
      result.style = [consumerStyle, { pointerEvents: 'none' }]
    }

    if (context.isModal.value) {
      result['aria-modal'] = 'true'
    }

    if (!hasExplicitLabel.value && context.titleRegistered.value) {
      result['aria-labelledby'] = context.titleId.value
    }

    if ('aria-describedby' in attrs) {
      result['aria-describedby'] = attrs['aria-describedby']
    } else if (context.descriptionRegistered.value) {
      result['aria-describedby'] = context.descriptionId.value
    }

    return result
  })

  return {
    attrs,
    contentElement,
    presentElement,
    isPresent: presence.isPresent,
    contentAttrs,
    exposed: createDialogPartExposed(() => presentElement.value),
  }
}
