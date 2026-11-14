import {
  computed,
  onMounted,
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

/** Derive up to two uppercase initials from a display name. */
export function deriveGhostAvatarInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? ''
    const second = parts[1]?.[0] ?? ''
    return (first + second).toLocaleUpperCase()
  }

  return (parts[0] ?? '').slice(0, 2).toLocaleUpperCase()
}

function initialStatus(src: string | undefined): GhostAvatarImageStatus {
  return src ? 'loading' : 'idle'
}

function probeImage(src: string, status: Ref<GhostAvatarImageStatus>): void {
  status.value = 'loading'
  const image = new Image()
  image.onload = () => {
    status.value = 'loaded'
  }
  image.onerror = () => {
    status.value = 'error'
  }
  image.src = src
  if (image.complete && image.naturalWidth > 0) {
    status.value = 'loaded'
  }
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
        imageStatus.value = 'error'
      },
    }
  })

  onMounted(() => {
    const src = toValue(options.src)?.trim()
    if (src) probeImage(src, imageStatus)
  })

  watch(
    () => toValue(options.src),
    (src) => {
      const trimmed = src?.trim()
      if (!trimmed) {
        imageStatus.value = 'idle'
        return
      }
      probeImage(trimmed, imageStatus)
    },
  )

  return {
    imageStatus,
    showImage,
    showFallback,
    initials,
    rootProps,
    imageProps,
  }
}
