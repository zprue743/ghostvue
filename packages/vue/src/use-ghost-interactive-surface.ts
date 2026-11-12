import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'

import type {
  InteractiveEffect,
  InteractiveStateAttribute,
  InteractiveSurfaceState,
  UseGhostInteractiveSurfaceOptions,
} from './ghost-interactive-surface'

export interface GhostInteractiveSurfaceRootProps {
  'data-part': 'root'
  'data-interactive': string
  'data-state'?: InteractiveSurfaceState
  'data-interactive-state'?: InteractiveSurfaceState
}

/**
 * Pointer tracking for ambient surfaces (ADR 0009).
 *
 * Samples are rAF-batched and written as CSS variables so Vue does not
 * re-render every move. Layout is cached on enter / resize / scroll-dirty,
 * never per `pointermove`. Reduced motion and coarse pointers leave the
 * host `off` with no pointer listeners. Offscreen and hidden-tab paths
 * cancel the frame loop. One tracking surface is a documented budget, not
 * a singleton.
 */
export function useGhostInteractiveSurface(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseGhostInteractiveSurfaceOptions,
): {
  rootProps: ComputedRef<GhostInteractiveSurfaceRootProps>
} {
  const state = ref<InteractiveSurfaceState>('off')
  const effects = computed((): readonly InteractiveEffect[] => {
    const value = toValue(options?.effects)
    // `undefined` means the dedicated surface default. An empty list is an
    // explicit off (themed GhostButton with no interactive prop).
    return value ?? ['spotlight']
  })
  const stateAttribute = computed(
    (): InteractiveStateAttribute =>
      toValue(options?.stateAttribute) ?? 'data-state',
  )

  const rootProps = computed((): GhostInteractiveSurfaceRootProps => {
    const status = state.value
    const interactive = effects.value.join(' ')
    if (stateAttribute.value === 'data-interactive-state') {
      return {
        'data-part': 'root',
        'data-interactive': interactive,
        ...(interactive ? { 'data-interactive-state': status } : {}),
      }
    }
    return {
      'data-part': 'root',
      'data-interactive': interactive,
      'data-state': status,
    }
  })

  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => [toValue(target), effects.value.join(' ')] as const,
      ([element], _previous, onCleanup) => {
        if (!element || !effects.value.includes('spotlight')) {
          state.value = 'off'
          return
        }

        const host = element
        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        )
        const coarsePointer = window.matchMedia('(pointer: coarse)')

        function canTrack(): boolean {
          return (
            effects.value.includes('spotlight') &&
            !reducedMotion.matches &&
            !coarsePointer.matches
          )
        }

        let rect: DOMRect | null = null
        let rectDirty = true
        let intersecting = true
        let pageVisible = document.visibilityState === 'visible'
        let frame = 0
        let pendingX = 0
        let pendingY = 0
        let hasSample = false
        let pointerBound = false

        function measure(): DOMRect {
          if (!rectDirty && rect) return rect
          rect = host.getBoundingClientRect()
          rectDirty = false
          return rect
        }

        function writeRest(): void {
          const box = measure()
          host.style.setProperty(
            '--ghost-pointer-x',
            `${String(box.width / 2)}px`,
          )
          host.style.setProperty(
            '--ghost-pointer-y',
            `${String(box.height / 2)}px`,
          )
          host.style.setProperty('--ghost-pointer-nx', '0')
          host.style.setProperty('--ghost-pointer-ny', '0')
        }

        function writeSample(clientX: number, clientY: number): void {
          const box = measure()
          const localX = clientX - box.left
          const localY = clientY - box.top
          const nx = box.width === 0 ? 0 : localX / box.width - 0.5
          const ny = box.height === 0 ? 0 : localY / box.height - 0.5
          host.style.setProperty('--ghost-pointer-x', `${String(localX)}px`)
          host.style.setProperty('--ghost-pointer-y', `${String(localY)}px`)
          host.style.setProperty('--ghost-pointer-nx', String(nx))
          host.style.setProperty('--ghost-pointer-ny', String(ny))
        }

        function cancelFrame(): void {
          if (frame !== 0) {
            cancelAnimationFrame(frame)
            frame = 0
          }
        }

        function flush(): void {
          frame = 0
          if (!hasSample) return
          hasSample = false
          if (state.value !== 'tracking' || !pageVisible) return
          writeSample(pendingX, pendingY)
        }

        function onPointerMove(event: PointerEvent): void {
          if (!canTrack()) return
          intersecting = true
          if (state.value !== 'tracking') {
            rectDirty = true
            writeSample(event.clientX, event.clientY)
            state.value = 'tracking'
          }
          pendingX = event.clientX
          pendingY = event.clientY
          hasSample = true
          if (frame === 0 && pageVisible) {
            frame = requestAnimationFrame(flush)
          }
        }

        function onPointerEnter(event: PointerEvent): void {
          if (!canTrack()) return
          intersecting = true
          rectDirty = true
          writeSample(event.clientX, event.clientY)
          state.value = 'tracking'
        }

        function onPointerLeave(): void {
          cancelFrame()
          hasSample = false
          rectDirty = true
          writeRest()
          if (canTrack()) state.value = 'idle'
        }

        function bindPointer(): void {
          if (pointerBound) return
          host.addEventListener('pointerenter', onPointerEnter)
          host.addEventListener('pointermove', onPointerMove, {
            passive: true,
          })
          host.addEventListener('pointerleave', onPointerLeave)
          pointerBound = true
        }

        function unbindPointer(): void {
          if (!pointerBound) return
          host.removeEventListener('pointerenter', onPointerEnter)
          host.removeEventListener('pointermove', onPointerMove)
          host.removeEventListener('pointerleave', onPointerLeave)
          pointerBound = false
        }

        function syncCapability(): void {
          cancelFrame()
          hasSample = false
          rectDirty = true
          if (!canTrack()) {
            unbindPointer()
            writeRest()
            state.value = 'off'
            return
          }
          bindPointer()
          writeRest()
          if (state.value === 'off') state.value = 'idle'
        }

        function onVisibility(): void {
          pageVisible = document.visibilityState === 'visible'
          if (!pageVisible) {
            cancelFrame()
            hasSample = false
            if (state.value === 'tracking') {
              writeRest()
              state.value = 'idle'
            }
          }
        }

        function markRectDirty(): void {
          rectDirty = true
        }

        syncCapability()

        reducedMotion.addEventListener('change', syncCapability)
        coarsePointer.addEventListener('change', syncCapability)
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('resize', markRectDirty)
        window.addEventListener('scroll', markRectDirty, true)

        const intersection =
          typeof IntersectionObserver === 'function'
            ? new IntersectionObserver((entries) => {
                intersecting = entries.some((entry) => entry.isIntersecting)
                if (!intersecting) {
                  cancelFrame()
                  hasSample = false
                  if (state.value === 'tracking') {
                    writeRest()
                    state.value = 'idle'
                  }
                }
              })
            : null
        intersection?.observe(host)

        const resize =
          typeof ResizeObserver === 'function'
            ? new ResizeObserver(() => {
                rectDirty = true
              })
            : null
        resize?.observe(host)

        onCleanup(() => {
          cancelFrame()
          unbindPointer()
          reducedMotion.removeEventListener('change', syncCapability)
          coarsePointer.removeEventListener('change', syncCapability)
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('resize', markRectDirty)
          window.removeEventListener('scroll', markRectDirty, true)
          intersection?.disconnect()
          resize?.disconnect()
          state.value = 'off'
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })

  return { rootProps }
}
