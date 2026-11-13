import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/**
 * Module-level scroll-lock reference count and saved `document.body` inline
 * style state (per copy of `@ghostvue/vue`), matching `layerStack` and
 * `trappedStack`.
 */
let lockCount = 0
let savedHadStyleAttribute = false
let savedOverflow = ''
let savedOverflowPriority = ''
let savedPaddingRight = ''
let savedPaddingRightPriority = ''

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
  const body = document.body as HTMLBodyElement | null
  if (!body) {
    return
  }

  if (lockCount === 0) {
    savedHadStyleAttribute = body.hasAttribute('style')
    savedOverflow = body.style.getPropertyValue('overflow')
    savedOverflowPriority = body.style.getPropertyPriority('overflow')
    savedPaddingRight = body.style.getPropertyValue('padding-right')
    savedPaddingRightPriority = body.style.getPropertyPriority('padding-right')

    const root = document.documentElement
    const scrollbarWidth = window.innerWidth - root.clientWidth
    if (scrollbarWidth > 0 && !hasStableScrollbarGutter(root)) {
      const computedPaddingRight = Number.parseFloat(
        window.getComputedStyle(body).paddingRight,
      )
      const basePadding = Number.isFinite(computedPaddingRight)
        ? computedPaddingRight
        : 0
      body.style.paddingRight = `${String(basePadding + scrollbarWidth)}px`
    }

    body.style.overflow = 'hidden'
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

  const body = document.body as HTMLBodyElement | null
  if (body) {
    if (savedOverflow) {
      body.style.setProperty('overflow', savedOverflow, savedOverflowPriority)
    } else {
      body.style.removeProperty('overflow')
    }

    if (savedPaddingRight) {
      body.style.setProperty(
        'padding-right',
        savedPaddingRight,
        savedPaddingRightPriority,
      )
    } else {
      body.style.removeProperty('padding-right')
    }

    // Avoid leaving an empty `style=""` attribute behind when the element had
    // none originally and no unrelated inline styles were added while locked.
    if (!savedHadStyleAttribute && body.getAttribute('style') === '') {
      body.removeAttribute('style')
    }
  }

  savedHadStyleAttribute = false
  savedOverflow = ''
  savedOverflowPriority = ''
  savedPaddingRight = ''
  savedPaddingRightPriority = ''
}

/**
 * Locks document scrolling (`overflow: hidden` on `document.body`) while
 * `enabled` resolves to `true`.
 *
 * Ref-counted across nested callers so only the final unlock restores the
 * original inline styles. Compensates for classic scrollbar removal via
 * `padding-right` unless `document.documentElement` uses
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
