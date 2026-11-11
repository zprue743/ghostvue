/**
 * Crossfade `data-sl-mode` with the View Transitions API when the browser
 * supports it and the user has not requested reduced motion. Falls back to
 * an immediate attribute write so theming never depends on the API.
 *
 * New public export; keep this helper one function. Callers that need to
 * change `data-sl-theme` can wrap the same pattern themselves.
 */
export async function startThemeTransition(
  element: Element,
  mode: 'light' | 'dark',
): Promise<void> {
  const apply = (): void => {
    element.setAttribute('data-sl-mode', mode)
  }

  if (typeof document === 'undefined' || typeof matchMedia !== 'function') {
    apply()
    return
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply()
    return
  }

  const viewDocument = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> }
  }
  if (typeof viewDocument.startViewTransition !== 'function') {
    apply()
    return
  }

  await viewDocument.startViewTransition.bind(document)(apply).finished
}
