import { computed, onMounted, ref, toValue, type ComputedRef } from 'vue'

import type {
  GhostKbdKeyItem,
  GhostKbdPlatform,
  GhostKbdResolvedPlatform,
  UseGhostKbdOptions,
} from './ghost-kbd'

export interface GhostKbdRootProps {
  class: 'ghost-kbd'
  'data-part': 'root'
  'data-platform': GhostKbdResolvedPlatform
}

/**
 * `'auto'` must paint PC labels until after mount. Reading `navigator` in
 * `setup` would disagree with SSR HTML and break hydration.
 */
export const GHOST_KBD_SSR_PLATFORM: GhostKbdResolvedPlatform = 'pc'

const TOKEN_ALIASES: Record<string, string> = {
  cmd: 'meta',
  command: 'meta',
  control: 'ctrl',
  option: 'alt',
  return: 'enter',
  escape: 'esc',
  super: 'win',
}

interface KeyLabel {
  label: string
  abbrTitle?: string
}

const APPLE_LABELS: Record<string, KeyLabel> = {
  mod: { label: '⌘', abbrTitle: 'Command' },
  meta: { label: '⌘', abbrTitle: 'Command' },
  ctrl: { label: '⌃', abbrTitle: 'Control' },
  alt: { label: '⌥', abbrTitle: 'Option' },
  shift: { label: '⇧', abbrTitle: 'Shift' },
  win: { label: 'Super' },
  enter: { label: '⏎', abbrTitle: 'Return' },
  esc: { label: 'Esc' },
  tab: { label: 'Tab' },
  space: { label: 'Space' },
  backspace: { label: '⌫', abbrTitle: 'Backspace' },
  delete: { label: '⌦', abbrTitle: 'Delete' },
  up: { label: '↑' },
  down: { label: '↓' },
  left: { label: '←' },
  right: { label: '→' },
}

const PC_LABELS: Record<string, KeyLabel> = {
  mod: { label: 'Ctrl' },
  meta: { label: 'Win' },
  ctrl: { label: 'Ctrl' },
  alt: { label: 'Alt' },
  shift: { label: 'Shift' },
  win: { label: 'Win' },
  enter: { label: 'Enter' },
  esc: { label: 'Esc' },
  tab: { label: 'Tab' },
  space: { label: 'Space' },
  backspace: { label: 'Backspace' },
  delete: { label: 'Delete' },
  up: { label: '↑' },
  down: { label: '↓' },
  left: { label: '←' },
  right: { label: '→' },
}

function canonicalToken(token: string): string {
  const lower = token.toLowerCase()
  return TOKEN_ALIASES[lower] ?? lower
}

function toKeyList(value: string | readonly string[] | undefined): string[] {
  if (value == null) return []
  const list = typeof value === 'string' ? [value] : value
  return list.map((token) => token.trim()).filter((token) => token.length > 0)
}

/**
 * `mod` is the platform primary modifier (Command / Control). `meta` is
 * specifically Meta / Command / Windows and stays Win on PC.
 */
export function resolveGhostKbdKey(
  token: string,
  platform: GhostKbdResolvedPlatform,
): GhostKbdKeyItem {
  const trimmed = token.trim()
  const canonical = canonicalToken(trimmed)
  const table = platform === 'apple' ? APPLE_LABELS : PC_LABELS
  const mapped = table[canonical]
  if (mapped) {
    return mapped.abbrTitle
      ? {
          token: canonical,
          label: mapped.label,
          abbrTitle: mapped.abbrTitle,
        }
      : { token: canonical, label: mapped.label }
  }
  return {
    token: canonical,
    label: trimmed.length === 1 ? trimmed.toUpperCase() : trimmed,
  }
}

/**
 * Apple desktop and iOS report as Mac / iPhone / iPad / iPod. Call only after
 * mount; this is the only `navigator` read in the kbd path.
 */
export function isAppleNavigator(
  navigatorLike: Pick<Navigator, 'platform' | 'userAgent'> | undefined,
): boolean {
  if (!navigatorLike) return false
  const platform = navigatorLike.platform
  const userAgent = navigatorLike.userAgent
  return (
    /Mac|iPhone|iPod|iPad/i.test(platform) ||
    /Mac OS X|iPhone|iPad|iPod/.test(userAgent)
  )
}

/**
 * jsdom's `navigator` is unforgeable, so tests spy this reader instead of
 * replacing the browser global. Production always reads `globalThis.navigator`.
 */
export const ghostKbdNavigator = {
  read(): Pick<Navigator, 'platform' | 'userAgent'> | undefined {
    if (!('navigator' in globalThis)) return undefined
    return globalThis.navigator
  },
}

/** Key-token labels, SSR-safe platform, `data-part` / `data-platform`. */
export function useGhostKbd(options: UseGhostKbdOptions = {}): {
  resolvedPlatform: ComputedRef<GhostKbdResolvedPlatform>
  keyItems: ComputedRef<GhostKbdKeyItem[]>
  rootProps: ComputedRef<GhostKbdRootProps>
} {
  const detectedPlatform = ref<GhostKbdResolvedPlatform | null>(null)

  onMounted(() => {
    detectedPlatform.value = isAppleNavigator(ghostKbdNavigator.read())
      ? 'apple'
      : 'pc'
  })

  const resolvedPlatform = computed((): GhostKbdResolvedPlatform => {
    const requested: GhostKbdPlatform = toValue(options.platform) ?? 'auto'
    if (requested === 'apple' || requested === 'pc') return requested
    return detectedPlatform.value ?? GHOST_KBD_SSR_PLATFORM
  })

  const keyItems = computed((): GhostKbdKeyItem[] =>
    toKeyList(toValue(options.keys)).map((token) =>
      resolveGhostKbdKey(token, resolvedPlatform.value),
    ),
  )

  const rootProps = computed((): GhostKbdRootProps => ({
    class: 'ghost-kbd',
    'data-part': 'root',
    'data-platform': resolvedPlatform.value,
  }))

  return { resolvedPlatform, keyItems, rootProps }
}
