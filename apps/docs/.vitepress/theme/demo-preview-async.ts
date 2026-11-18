import { type Component, defineAsyncComponent, h } from 'vue'

import DemoPreviewStatus from './DemoPreviewStatus.vue'

/**
 * Wait this long before showing "Loading example…". Preloaded chunks resolve
 * well inside it on client navigation, so fast loads do not flash the
 * placeholder; slow networks still get an explanation almost immediately.
 */
export const DEMO_LOADING_DELAY_MS = 120

/**
 * Give up on a stalled chunk after this long and show the failure state with
 * a reload action instead of an indefinite spinner.
 */
export const DEMO_LOAD_TIMEOUT_MS = 15_000

const LoadingState: Component = () => h(DemoPreviewStatus, { state: 'loading' })
const ErrorState: Component = () => h(DemoPreviewStatus, { state: 'error' })

/**
 * Lazy demo component for a `DemoPreview` canvas.
 *
 * SSR resolves the loader before rendering, so built pages ship the demo
 * markup and hydrate it in place; the loading state only appears for
 * client-side navigation to a chunk that has not arrived yet. A rejected or
 * timed-out chunk renders an explained failure state (SSR included) rather
 * than an empty canvas. Stale-deploy chunk 404s are still handled first by
 * `reloadOnStaleChunk`.
 */
export function defineDemoPreview(
  loader: () => Promise<{ default: Component }>,
): Component {
  return defineAsyncComponent({
    loader,
    loadingComponent: LoadingState,
    errorComponent: ErrorState,
    delay: DEMO_LOADING_DELAY_MS,
    timeout: DEMO_LOAD_TIMEOUT_MS,
  })
}
