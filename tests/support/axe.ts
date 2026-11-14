import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import type { GhostExampleId } from '../../examples/registry'

import { waitForExamplePreview } from './examples'

export type GhostColorMode = 'light' | 'dark'

export interface AxeAnalyzeOptions {
  include?: string | readonly string[]
  exclude?: string | readonly string[]
}

export interface AxeScanOptions extends AxeAnalyzeOptions {
  /** Color mode applied before scanning themed surfaces. Omit for the example default. */
  mode?: GhostColorMode
}

/**
 * Asserts axe reports no violations on the current page without navigating.
 */
export async function expectNoAxeViolations(
  page: Page,
  options: AxeAnalyzeOptions = {},
): Promise<void> {
  const results = await analyzePage(page, options)
  expect(
    results.violations,
    formatViolationSummary(results.violations),
  ).toEqual([])
}

/**
 * Loads a registered executable example and asserts axe reports no violations.
 * Navigation uses the playground examples host so CI scans match docs previews.
 */
export async function axeScan(
  page: Page,
  playgroundUrl: string,
  exampleId: GhostExampleId,
  options: AxeScanOptions = {},
): Promise<void> {
  await waitForExamplePreview(page, playgroundUrl, exampleId, options.mode)
  const results = await analyzePage(page, options)
  expect(
    results.violations,
    formatViolationSummary(results.violations, exampleId, options.mode),
  ).toEqual([])
}

async function analyzePage(page: Page, options: AxeAnalyzeOptions) {
  let builder = new AxeBuilder({ page })
  for (const selector of normalizeSelectors(options.include)) {
    builder = builder.include(selector)
  }
  for (const selector of normalizeSelectors(options.exclude)) {
    builder = builder.exclude(selector)
  }
  return builder.analyze()
}

function normalizeSelectors(
  value: string | readonly string[] | undefined,
): readonly string[] {
  if (value === undefined) return []
  return typeof value === 'string' ? [value] : value
}

function formatViolationSummary(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
  exampleId?: string,
  mode?: GhostColorMode,
): string {
  if (violations.length === 0) {
    return exampleId
      ? `No axe violations for ${exampleId}${mode ? ` (${mode} mode)` : ''}`
      : 'No axe violations'
  }
  const prefix = exampleId
    ? `Axe violations for ${exampleId}${mode ? ` (${mode} mode)` : ''}`
    : 'Axe violations'
  const summary = violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help} (${String(violation.nodes.length)} node(s))`,
    )
    .join('; ')
  return `${prefix}: ${summary}`
}
