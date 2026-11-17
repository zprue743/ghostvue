import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/**
 * Module-level scroll-lock reference count and saved inline style state for
 * the locked viewport scroller (per copy of `@ghostvue/vue`), matching
 * `layerStack` and `trappedStack`.
 */
let lockCount = 0
let lockedTarget: HTMLElement | null = null
let savedHadStyleAttribute = false
let savedOverflow = ''
let savedOverflowPriority = ''
let savedOverflowX = ''
let savedOverflowXPriority = ''
let savedOverflowY = ''
let savedOverflowYPriority = ''
let savedPaddingRight = ''
let savedPaddingRightPriority = ''

function isVisibleOverflow(value: string | undefined): boolean {
  return !value || value === 'visible'
}

/**
 * Resolves the element whose `overflow` controls viewport scrolling per
 * CSS Overflow 3 (§ 3.2 overflow propagation): `document.body` only
 * propagates to the viewport when `document.documentElement` has
 * `overflow-x: visible` and `overflow-y: visible`; otherwise the root element
 * owns viewport scrolling.
 */
function resolveScrollLockTarget(): HTMLElement | null {
  const root = document.documentElement
  const body = document.body as HTMLBodyElement | null

  const rootComputed = window.getComputedStyle(root)
  const rootOverflowX =
    (typeof rootComputed.getPropertyValue === 'function'
      ? rootComputed.getPropertyValue('overflow-x')
      : '') ||
    rootComputed.overflowX ||
    root.style.getPropertyValue('overflow-x')
  const rootOverflowY =
    (typeof rootComputed.getPropertyValue === 'function'
      ? rootComputed.getPropertyValue('overflow-y')
      : '') ||
    rootComputed.overflowY ||
    root.style.getPropertyValue('overflow-y')

  if (isVisibleOverflow(rootOverflowX) && isVisibleOverflow(rootOverflowY)) {
    return body ?? root
  }

  return root
}

function restoreStyleProperty(
  target: HTMLElement,
  property: string,
  value: string,
  priority: string,
): void {
  if (value) {
    target.style.setProperty(property, value, priority)
  } else {
    target.style.removeProperty(property)
  }
}

function hasStableScrollbarGutter(root: HTMLElement): boolean {
  const computed = window.getComputedStyle(root)
  const computedGutter =
    typeof computed.getPropertyValue === 'function'
      ? computed.getPropertyValue('scrollbar-gutter') ||
        computed.scrollbarGutter
      : computed.scrollbarGutter
  // Fall back to inline style because jsdom's cssstyle omits `scrollbar-gutter`
  // from computed style declarations.
  const value =
    computedGutter ||
    root.style.getPropertyValue('scrollbar-gutter') ||
    root.style.scrollbarGutter
  return typeof value === 'string' && value.includes('stable')
}

function acquireScrollLock(): void {
  const target = lockCount === 0 ? resolveScrollLockTarget() : lockedTarget
  if (!target) {
    return
  }

  if (lockCount === 0) {
    lockedTarget = target
    savedHadStyleAttribute = target.hasAttribute('style')
    savedOverflow = target.style.getPropertyValue('overflow')
    savedOverflowPriority = target.style.getPropertyPriority('overflow')
    savedOverflowX = target.style.getPropertyValue('overflow-x')
    savedOverflowXPriority = target.style.getPropertyPriority('overflow-x')
    savedOverflowY = target.style.getPropertyValue('overflow-y')
    savedOverflowYPriority = target.style.getPropertyPriority('overflow-y')
    savedPaddingRight = target.style.getPropertyValue('padding-right')
    savedPaddingRightPriority =
      target.style.getPropertyPriority('padding-right')

    const root = document.documentElement
    const scrollbarWidth = window.innerWidth - root.clientWidth
    if (scrollbarWidth > 0 && !hasStableScrollbarGutter(root)) {
      const computedPaddingRight = Number.parseFloat(
        window.getComputedStyle(target).paddingRight,
      )
      const basePadding = Number.isFinite(computedPaddingRight)
        ? computedPaddingRight
        : 0
      target.style.setProperty(
        'padding-right',
        `${String(basePadding + scrollbarWidth)}px`,
        savedPaddingRightPriority,
      )
    }

    target.style.overflow = 'hidden'
  }

  lockCount += 1
}

function releaseScrollLock(): void {
  if (lockCount === 0) {
    return
  }

  lockCount -= 1
  if (lockCount > 0) {
    return
  }

  const target = lockedTarget
  if (target) {
    if (savedOverflow) {
      target.style.setProperty('overflow', savedOverflow, savedOverflowPriority)
    } else {
      target.style.removeProperty('overflow')
      restoreStyleProperty(
        target,
        'overflow-x',
        savedOverflowX,
        savedOverflowXPriority,
      )
      restoreStyleProperty(
        target,
        'overflow-y',
        savedOverflowY,
        savedOverflowYPriority,
      )
    }
    restoreStyleProperty(
      target,
      'padding-right',
      savedPaddingRight,
      savedPaddingRightPriority,
    )

    // Avoid leaving an empty `style=""` attribute behind when the element had
    // none originally and no unrelated inline styles were added while locked.
    if (!savedHadStyleAttribute && target.getAttribute('style') === '') {
      target.removeAttribute('style')
    }
  }

  lockedTarget = null
  savedHadStyleAttribute = false
  savedOverflow = ''
  savedOverflowPriority = ''
  savedOverflowX = ''
  savedOverflowXPriority = ''
  savedOverflowY = ''
  savedOverflowYPriority = ''
  savedPaddingRight = ''
  savedPaddingRightPriority = ''
}

/**
 * Locks viewport scrolling (`overflow: hidden` on `document.documentElement`
 * when the root element owns scrolling, or `document.body` when `body`
 * propagates overflow to the viewport) while `enabled` resolves to `true`.
 *
 * Ref-counted across nested callers so only the final unlock restores the
 * original inline styles and priorities. Compensates for classic scrollbar
 * removal via `padding-right` unless `document.documentElement` uses
 * `scrollbar-gutter: stable`. Defers all `window`/`document` access until
 * `onMounted` so SSR setup stays pure.
 */
export function useScrollLock(enabled: MaybeRefOrGetter<boolean>): void {
  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(enabled),
      (isLocked, _wasLocked, onCleanup) => {
        if (!isLocked) {
          return
        }
        acquireScrollLock()
        onCleanup(() => {
          releaseScrollLock()
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })
}
