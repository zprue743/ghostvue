import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type FlipOptions,
  type Middleware,
  type OffsetOptions,
  type Placement,
  type ReferenceElement,
  type ShiftOptions,
  type Strategy,
} from '@floating-ui/dom'
import {
  computed,
  onMounted,
  onUnmounted,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

/** Configuration for {@link useFloating}. */
export interface UseFloatingOptions {
  /** Preferred placement relative to the anchor. Default `'bottom'`. */
  placement?: MaybeRefOrGetter<Placement | undefined>
  /** Distance or axis offsets between anchor and floating elements. */
  offset?: MaybeRefOrGetter<OffsetOptions | boolean | undefined>
  /** Flip to an opposite placement when overflowing. Default `true`. */
  flip?: MaybeRefOrGetter<boolean | FlipOptions | undefined>
  /** Shift along the cross axis to stay within view. Default `true`. */
  shift?: MaybeRefOrGetter<boolean | ShiftOptions | undefined>
  /** CSS positioning strategy. Default `'absolute'`. */
  strategy?: MaybeRefOrGetter<Strategy | undefined>
}

/** Reactive positioning state returned by {@link useFloating}. */
export interface UseFloatingReturn {
  /** Computed horizontal coordinate in pixels. */
  x: Readonly<Ref<number>>
  /** Computed vertical coordinate in pixels. */
  y: Readonly<Ref<number>>
  /** Resolved placement after collision middleware such as flip. */
  placement: Readonly<Ref<Placement>>
  /** Active CSS positioning strategy (`'absolute'` or `'fixed'`). */
  strategy: ComputedRef<Strategy>
  /** True after the first `computePosition` resolves; resets on close or target change. */
  isPositioned: Readonly<Ref<boolean>>
  /** Recompute the position on demand when mounted. */
  update: () => Promise<void>
}

function buildMiddleware(
  offsetOption: OffsetOptions | boolean | undefined,
  flipOption: boolean | FlipOptions | undefined,
  shiftOption: boolean | ShiftOptions | undefined,
): Middleware[] {
  const middleware: Middleware[] = []

  // Offset runs before flip and shift so collision checks account for the gap.
  if (offsetOption !== undefined && offsetOption !== false) {
    middleware.push(offset(offsetOption === true ? undefined : offsetOption))
  }

  if (flipOption !== false) {
    middleware.push(
      flip(
        flipOption === true || flipOption === undefined
          ? undefined
          : flipOption,
      ),
    )
  }

  if (shiftOption !== false) {
    middleware.push(
      shift(
        shiftOption === true || shiftOption === undefined
          ? undefined
          : shiftOption,
      ),
    )
  }

  return middleware
}

/**
 * Reactive floating positioning powered by `@floating-ui/dom`.
 *
 * Computes coordinates and tracks scroll/resize via `autoUpdate` only after
 * mount so SSR setup stays pure. Writes `data-placement` onto `floating` and
 * cleans up `autoUpdate` on unmount or target change.
 */
export function useFloating(
  anchor: MaybeRefOrGetter<ReferenceElement | null | undefined>,
  floating: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseFloatingOptions,
): UseFloatingReturn {
  const internalX = shallowRef(0)
  const internalY = shallowRef(0)
  const internalPlacement = shallowRef<Placement>(
    toValue(options?.placement) ?? 'bottom',
  )
  const internalPositioned = shallowRef(false)
  const strategy = computed<Strategy>(
    () => toValue(options?.strategy) ?? 'absolute',
  )

  let latestCallId = 0
  let currentUpdate: (() => Promise<void>) | undefined
  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () =>
        [
          toValue(anchor),
          toValue(floating),
          toValue(options?.placement),
          toValue(options?.strategy),
          toValue(options?.offset),
          toValue(options?.flip),
          toValue(options?.shift),
        ] as const,
      (
        [
          anchorEl,
          floatingEl,
          placementOption,
          strategyOption,
          offsetOption,
          flipOption,
          shiftOption,
        ],
        _previous,
        onCleanup,
      ) => {
        if (!anchorEl || !floatingEl) {
          internalPlacement.value = placementOption ?? 'bottom'
          internalPositioned.value = false
          return
        }

        let cancelled = false
        const runUpdate = async (): Promise<void> => {
          const callId = ++latestCallId
          const result = await computePosition(anchorEl, floatingEl, {
            placement: placementOption ?? 'bottom',
            strategy: strategyOption ?? 'absolute',
            middleware: buildMiddleware(offsetOption, flipOption, shiftOption),
          })
          // Ignore stale async resolutions after unmount or target/option changes.
          if (cancelled || callId !== latestCallId) {
            return
          }
          internalX.value = result.x
          internalY.value = result.y
          internalPlacement.value = result.placement
          floatingEl.setAttribute('data-placement', result.placement)
          internalPositioned.value = true
        }

        currentUpdate = runUpdate
        const stopAutoUpdate = autoUpdate(anchorEl, floatingEl, () => {
          void runUpdate()
        })

        onCleanup(() => {
          cancelled = true
          if (currentUpdate === runUpdate) {
            currentUpdate = undefined
          }
          stopAutoUpdate()
          floatingEl.removeAttribute('data-placement')
          // Reset readiness on close or target swap so reopened/retarged
          // layers hide until new coordinates resolve, without flickering on
          // option-only updates for the same active targets.
          if (
            toValue(anchor) !== anchorEl ||
            toValue(floating) !== floatingEl
          ) {
            internalPositioned.value = false
          }
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
    internalPositioned.value = false
  })

  return {
    x: computed(() => internalX.value),
    y: computed(() => internalY.value),
    placement: computed(() => internalPlacement.value),
    strategy,
    isPositioned: computed(() => internalPositioned.value),
    update: () => (currentUpdate ? currentUpdate() : Promise.resolve()),
  }
}
