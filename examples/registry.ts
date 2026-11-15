/**
 * Typed catalog of unpublished executable examples.
 *
 * Each id is the path under `examples/` without the extension
 * (`button/icon-only` → `examples/button/icon-only.vue`). Docs, the
 * playground gallery, e2e, and `pnpm manifests` all share this path
 * convention. A future MCP `get_examples` tool should consume this
 * module rather than inventing a second catalog.
 */
export type GhostExampleLayer = 'headless' | 'themed'

export interface GhostExampleDefinition {
  id: `${string}/${string}`
  title: string
  description: string
  /**
   * Headless examples import `@ghostvue/vue` and stay unstyled on
   * purpose. Themed examples import `@ghostvue/themes` so docs previews
   * dogfood the selected flagship.
   */
  layer: GhostExampleLayer
}

import { ghostExamples as generatedGhostExamples } from './.registries/examples-catalog.generated'

export const ghostExamples =
  generatedGhostExamples as readonly GhostExampleDefinition[]

export type GhostExampleId = (typeof ghostExamples)[number]['id']

export function isGhostExampleId(value: string): value is GhostExampleId {
  return ghostExamples.some((example) => example.id === value)
}

export function ghostExampleById(
  id: string,
): (typeof ghostExamples)[number] | undefined {
  return ghostExamples.find((example) => example.id === id)
}

/** Relative path from the repository root. */
export function ghostExampleSourcePath(id: string): string {
  return `examples/${id}.vue`
}
