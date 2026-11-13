const RELOAD_AT_KEY = 'ghost-docs-stale-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 10_000

/**
 * Every Vercel deploy replaces the hashed chunks, so a tab still running an
 * older deploy 404s on lazily loaded example chunks after client-side
 * navigation and the previews silently render nothing. Reload once so the tab
 * picks up the current deploy's HTML and chunk graph. The cooldown stops a
 * genuinely missing chunk from looping reloads.
 */
export function reloadOnStaleChunk(): void {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      const lastReloadAt = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? 0)
      if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return
      sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
    } catch {
      // Without storage there is no loop guard, so leave the page as is.
      return
    }
    event.preventDefault()
    window.location.reload()
  })
}
