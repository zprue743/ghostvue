import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import type {
  GhostAvatarDataState,
  GhostAvatarImageStatus,
  UseGhostAvatarOptions,
} from './ghost-avatar'

export interface GhostAvatarRootProps {
  class: 'ghost-avatar'
  'data-part': 'root'
  'data-state': GhostAvatarDataState | undefined
}

export interface GhostAvatarImageProps {
  'data-part': 'image'
  src: string
  alt: string
  onError: () => void
}

/** First Unicode code point in a word (avoids splitting surrogate pairs). */
function firstGrapheme(word: string): string {
  return Array.from(word)[0] ?? ''
}

/** First two code points in a word. */
function firstTwoGraphemes(word: string): string {
  return Array.from(word).slice(0, 2).join('')
}

/** Derive up to two uppercase initials from a display name. */
export function deriveGhostAvatarInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (
      firstGrapheme(parts[0] ?? '') + firstGrapheme(parts[1] ?? '')
    ).toLocaleUpperCase()
  }

  return firstTwoGraphemes(parts[0] ?? '').toLocaleUpperCase()
}

function initialStatus(src: string | undefined): GhostAvatarImageStatus {
  return src ? 'loading' : 'idle'
}

interface ProbeImage {
  onload: (() => void) | null
  onerror: (() => void) | null
  src: string
  complete: boolean
  naturalWidth: number
}

function detachProbeHandlers(image: ProbeImage): void {
  image.onload = null
  image.onerror = null
}

/**
 * Avatar bindings, image probe, and initials. Image load is deferred until
 * after mount so SSR and hydration both render the fallback with
 * `data-state="loading"` and no `<img>`.
 */
export function useGhostAvatar(options: UseGhostAvatarOptions = {}): {
  imageStatus: Ref<GhostAvatarImageStatus>
  showImage: ComputedRef<boolean>
  showFallback: ComputedRef<boolean>
  initials: ComputedRef<string>
  rootProps: ComputedRef<GhostAvatarRootProps>
  imageProps: ComputedRef<GhostAvatarImageProps | null>
} {
  const imageStatus = ref<GhostAvatarImageStatus>(
    initialStatus(toValue(options.src)),
  )

  let activeProbeGeneration = 0
  let detachActiveProbe: (() => void) | null = null

  function cancelActiveProbe(): void {
    detachActiveProbe?.()
    detachActiveProbe = null
    activeProbeGeneration += 1
  }

  function probeImage(src: string): void {
    cancelActiveProbe()
    imageStatus.value = 'loading'
    const generation = activeProbeGeneration
    const image = new Image() as ProbeImage

    const commit = (next: GhostAvatarImageStatus): void => {
      if (generation !== activeProbeGeneration) return
      imageStatus.value = next
    }

    image.onload = () => {
      commit('loaded')
    }
    image.onerror = () => {
      commit('error')
    }
    detachActiveProbe = () => {
      detachProbeHandlers(image)
    }

    image.src = src
    if (image.complete && image.naturalWidth > 0) {
      commit('loaded')
    }
  }

  const resolvedAlt = computed(() => {
    const alt = toValue(options.alt)
    if (alt !== undefined) return alt
    const name = toValue(options.name)
    return name?.trim() ?? ''
  })

  const initials = computed(() =>
    deriveGhostAvatarInitials(toValue(options.name) ?? ''),
  )

  const showImage = computed(
    () =>
      imageStatus.value === 'loaded' && Boolean(toValue(options.src)?.trim()),
  )

  const showFallback = computed(() => !showImage.value)

  const rootProps = computed((): GhostAvatarRootProps => {
    const state = imageStatus.value === 'idle' ? undefined : imageStatus.value
    return {
      class: 'ghost-avatar',
      'data-part': 'root',
      'data-state': state,
    }
  })

  const imageProps = computed((): GhostAvatarImageProps | null => {
    const src = toValue(options.src)?.trim()
    if (!showImage.value || !src) return null
    return {
      'data-part': 'image',
      src,
      alt: resolvedAlt.value,
      onError: () => {
        if (toValue(options.src)?.trim() === src) {
          imageStatus.value = 'error'
        }
      },
    }
  })

  onMounted(() => {
    const src = toValue(options.src)?.trim()
    if (src) probeImage(src)
  })

  watch(
    () => toValue(options.src),
    (src) => {
      const trimmed = src?.trim()
      if (!trimmed) {
        cancelActiveProbe()
        imageStatus.value = 'idle'
        return
      }
      probeImage(trimmed)
    },
  )

  onUnmounted(() => {
    cancelActiveProbe()
  })

  return {
    imageStatus,
    showImage,
    showFallback,
    initials,
    rootProps,
    imageProps,
  }
}
