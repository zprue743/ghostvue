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

export type InteractiveEffect = 'spotlight' | 'tilt' | 'magnetic'

export type InteractiveSurfaceState = 'off' | 'idle' | 'tracking'

export interface UseInteractiveSurfaceOptions {
  /** Space-separated recipes advertised on `data-interactive`. Default spotlight. */
  effects?: MaybeRefOrGetter<readonly InteractiveEffect[]>
}

export interface InteractiveSurfaceRootProps {
  'data-part': 'root'
  'data-interactive': string
  'data-state': InteractiveSurfaceState
}

/**
 * Playground spike of the SLO-62 composable. Not a published export.
 *
 * Pointer samples are rAF-batched and written as CSS variables so Vue does
 * not re-render every move. Layout is measured on a static host, not the
 * transformed face, so magnetic travel cannot feedback into the rect.
 * Reduced motion and coarse pointers leave `data-state="off"` with no
 * listeners. Offscreen and hidden-tab paths cancel the frame loop.
 */
export function useInteractiveSurface(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseInteractiveSurfaceOptions,
): {
  rootProps: ComputedRef<InteractiveSurfaceRootProps>
} {
  const state = ref<InteractiveSurfaceState>('off')
  const effects = computed(
    (): readonly InteractiveEffect[] =>
      toValue(options?.effects) ?? ['spotlight'],
  )

  const rootProps = computed((): InteractiveSurfaceRootProps => ({
    'data-part': 'root',
    'data-interactive': effects.value.join(' '),
    'data-state': state.value,
  }))

  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(target),
      (element, _previous, onCleanup) => {
        if (!element) {
          state.value = 'off'
          return
        }

        // Nested listeners do not keep the watch callback's null narrowing.
        const host = element

        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        )
        const coarsePointer = window.matchMedia('(pointer: coarse)')

        function canTrack(): boolean {
          return !reducedMotion.matches && !coarsePointer.matches
        }

        let rect: DOMRect | null = null
        let rectDirty = true
        let intersecting = true
        let pageVisible = document.visibilityState === 'visible'
        let frame = 0
        let pendingX = 0
        let pendingY = 0
        let hasSample = false
        const tiltMax = 10
        const magneticMax = 12

        function measure(): DOMRect {
          if (!rectDirty && rect) return rect
          rect = host.getBoundingClientRect()
          rectDirty = false
          return rect
        }

        function writeRest(): void {
          const box = measure()
          host.style.setProperty('--sl-pointer-x', `${String(box.width / 2)}px`)
          host.style.setProperty(
            '--sl-pointer-y',
            `${String(box.height / 2)}px`,
          )
          host.style.setProperty('--sl-pointer-nx', '0')
          host.style.setProperty('--sl-pointer-ny', '0')
          host.style.setProperty('--sl-tilt-x', '0')
          host.style.setProperty('--sl-tilt-y', '0')
          host.style.setProperty('--sl-magnetic-x', '0')
          host.style.setProperty('--sl-magnetic-y', '0')
        }

        function writeSample(clientX: number, clientY: number): void {
          const box = measure()
          const localX = clientX - box.left
          const localY = clientY - box.top
          const nx = box.width === 0 ? 0 : localX / box.width - 0.5
          const ny = box.height === 0 ? 0 : localY / box.height - 0.5
          host.style.setProperty('--sl-pointer-x', `${String(localX)}px`)
          host.style.setProperty('--sl-pointer-y', `${String(localY)}px`)
          host.style.setProperty('--sl-pointer-nx', String(nx))
          host.style.setProperty('--sl-pointer-ny', String(ny))
          host.style.setProperty('--sl-tilt-x', String(-ny * 2 * tiltMax))
          host.style.setProperty('--sl-tilt-y', String(nx * 2 * tiltMax))
          host.style.setProperty(
            '--sl-magnetic-x',
            String(nx * 2 * magneticMax),
          )
          host.style.setProperty(
            '--sl-magnetic-y',
            String(ny * 2 * magneticMax),
          )
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
          if (
            state.value !== 'tracking' ||
            !intersecting ||
            !pageVisible ||
            !canTrack()
          ) {
            return
          }
          writeSample(pendingX, pendingY)
        }

        function onPointerMove(event: PointerEvent): void {
          if (!canTrack()) return
          // A real pointer event means the host is hittable, even if IO has
          // not yet flipped after scroll-into-view (Playwright, below-the-fold).
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

        let pointerBound = false

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
