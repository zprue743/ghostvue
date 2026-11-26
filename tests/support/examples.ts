import { expect, type Locator, type Page } from '@playwright/test'

import type {
  ExamplesHostDensity,
  ExamplesHostTheme,
} from '../../apps/playground/src/examples-host'
import { ghostExampleById, type GhostExampleId } from '../../examples/registry'

import type { GhostColorMode } from './axe'

/**
 * Token host for `/examples.html`. Omitted fields keep the docs first paint
 * (`default`, unset density, light). The host never adds `.ghost-theme`, so
 * headless examples stay unthemed exactly as in the docs.
 */
export interface GhostExampleHost {
  theme?: ExamplesHostTheme
  density?: ExamplesHostDensity
  mode?: GhostColorMode
}

/** URL of one example on the playground examples route. */
export function exampleUrl(
  playgroundUrl: string,
  exampleId: GhostExampleId,
  host: GhostExampleHost = {},
): string {
  const params = new URLSearchParams({ id: exampleId })
  if (host.theme) params.set('theme', host.theme)
  if (host.density) params.set('density', host.density)
  if (host.mode) params.set('mode', host.mode)
  return `${playgroundUrl}/examples.html?${params.toString()}`
}

/**
 * Opens an example preview and waits until its async chunk mounted, matching
 * the readiness checks used by visual baselines. Returns the preview canvas.
 */
export async function waitForExamplePreview(
  page: Page,
  playgroundUrl: string,
  exampleId: GhostExampleId,
  hostOrMode?: GhostExampleHost | GhostColorMode,
): Promise<Locator> {
  const host =
    typeof hostOrMode === 'string' ? { mode: hostOrMode } : (hostOrMode ?? {})
  await page.goto(exampleUrl(playgroundUrl, exampleId, host))

  const definition = ghostExampleById(exampleId)
  const preview = page.getByTestId('ghost-example-preview')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute('data-example-id', exampleId)

  if (definition) {
    await expect(
      page.getByRole('heading', { name: definition.title, level: 1 }),
    ).toBeVisible()
  }

  // Examples load asynchronously via defineAsyncComponent.
  await expect(
    preview.getByTestId('ghost-example-stage').locator(':scope > *').first(),
  ).toBeAttached()

  return preview
}
