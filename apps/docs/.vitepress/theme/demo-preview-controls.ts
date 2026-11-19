/**
 * Pure helpers behind the `DemoPreview` copy and preview-width controls, kept
 * out of the SFC so the width maths and clipboard fallbacks are unit-testable
 * without a browser.
 */

/** `auto` fills the canvas; a number requests that many CSS pixels. */
export type DemoPreviewWidth = 'auto' | number

/**
 * Preset widths offered next to the range: a small phone, a large phone, and
 * a tablet. They narrow the demo canvas only; they are not device emulation.
 */
export const DEMO_PREVIEW_PRESETS: readonly DemoPreviewWidth[] = [
  'auto',
  320,
  480,
  768,
]

/** Narrowest width the range offers; below this most demos stop being useful. */
export const DEMO_PREVIEW_MIN_WIDTH = 200

/** How long the "Copied" confirmation stays before the status clears. */
export const DEMO_COPY_STATUS_MS = 2000

/**
 * Width actually applied to the canvas: the request capped at the available
 * content width. `undefined` means auto (fill the canvas). Before the client
 * has measured, the request is reported as-is and CSS `min()` does the cap.
 */
export function resolvePreviewWidth(
  requested: DemoPreviewWidth,
  available: number | undefined,
): number | undefined {
  if (requested === 'auto') return undefined
  return available === undefined ? requested : Math.min(requested, available)
}

/** Human-readable applied size, naming the cap when the request did not fit. */
export function describePreviewWidth(
  requested: DemoPreviewWidth,
  available: number | undefined,
): string {
  if (requested === 'auto') {
    return available === undefined
      ? 'Auto (fills the canvas)'
      : `Auto: ${String(available)} px`
  }
  const applied = resolvePreviewWidth(requested, available) ?? requested
  return applied < requested
    ? `${String(applied)} px (capped from ${String(requested)} px to fit)`
    : `${String(applied)} px`
}

/**
 * Write text to the system clipboard. Resolves `false` instead of throwing
 * when the Clipboard API is missing (insecure origins hide it entirely) or the
 * write is rejected (permission denied, document not focused), so callers
 * can show a failure path rather than a silent no-op.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('clipboard' in navigator)) {
    return false
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
