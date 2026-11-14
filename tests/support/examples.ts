import { expect, type Page } from '@playwright/test'

import { ghostExampleById, type GhostExampleId } from '../../examples/registry'

import type { GhostColorMode } from './axe'

/** Applies the default theme tokens used by visual example baselines. */
export async function setGhostExampleTheme(
  page: Page,
  mode: GhostColorMode,
): Promise<void> {
  await page.evaluate((targetMode) => {
    const root = document.documentElement
    root.classList.add('ghost-theme')
    root.setAttribute('data-ghost-theme', 'default')
    root.setAttribute('data-ghost-density', 'comfortable')
    root.setAttribute('data-ghost-mode', targetMode)
  }, mode)
}

/**
 * Opens an example preview and waits until its async chunk mounted, matching
 * the readiness checks used by visual baselines.
 */
export async function waitForExamplePreview(
  page: Page,
  playgroundUrl: string,
  exampleId: GhostExampleId,
  mode?: GhostColorMode,
): Promise<void> {
  await page.goto(
    `${playgroundUrl}/examples.html?id=${encodeURIComponent(exampleId)}`,
  )

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
  await expect(preview.locator(':scope > *').first()).toBeAttached()

  if (mode) {
    await setGhostExampleTheme(page, mode)
  }
}
