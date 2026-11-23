import { inject } from 'vue'

import {
  ghostCommandPaletteContextKey,
  type GhostCommandPaletteContext,
} from './ghost-command-palette'

/**
 * Injects the palette context or throws a consumer-facing error naming the
 * part. Every `GhostCommandPalette*` part requires the root.
 */
export function injectCommandPaletteContext(
  partName: string,
): GhostCommandPaletteContext {
  const context = inject(ghostCommandPaletteContextKey, null)
  if (!context) {
    throw new Error(`${partName} must be used inside GhostCommandPalette`)
  }
  return context
}
