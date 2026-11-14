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

export const ghostExamples = [
  {
    id: 'button/basic',
    title: 'Basic',
    description: 'Native action control. The default type is button.',
    layer: 'headless',
  },
  {
    id: 'button/composable',
    title: 'Composable',
    description: 'Same contract as GhostButton, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'button/themed',
    title: 'Themed',
    description: 'Visual props on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'button/loading',
    title: 'Loading and disabled',
    description: 'Pending actions stay focusable; disabled ones do not.',
    layer: 'themed',
  },
  {
    id: 'button/icon-only',
    title: 'Icon only',
    description: 'Square treatment with an accessible name from aria-label.',
    layer: 'themed',
  },
  {
    id: 'button/ref',
    title: 'Component ref',
    description: 'Template refs expose element, focus, and blur.',
    layer: 'headless',
  },
  {
    id: 'interactive-surface/basic',
    title: 'Basic',
    description: 'Pointer spotlight on a content surface.',
    layer: 'themed',
  },
  {
    id: 'interactive-surface/composable',
    title: 'Composable',
    description: 'Spotlight tracking on a native host with a glow layer.',
    layer: 'headless',
  },
  {
    id: 'interactive-surface/button',
    title: 'Button opt-in',
    description: 'Themed GhostButton stays inert until interactive is set.',
    layer: 'themed',
  },
  {
    id: 'visually-hidden/basic',
    title: 'Basic',
    description: 'Hidden text names an icon-only control.',
    layer: 'headless',
  },
  {
    id: 'visually-hidden/composable',
    title: 'Composable',
    description: 'Clip-technique hiding on a native element.',
    layer: 'headless',
  },
  {
    id: 'visually-hidden/icon-name',
    title: 'Interpolated name',
    description: 'Hidden text interpolates so translation tools can see it.',
    layer: 'headless',
  },
  {
    id: 'visually-hidden/table-header',
    title: 'Table header',
    description: 'A real th that only assistive technology encounters.',
    layer: 'headless',
  },
  {
    id: 'visually-hidden/skip-link',
    title: 'Skip link',
    description: 'Focusable hidden content reveals while it has focus.',
    layer: 'headless',
  },
  {
    id: 'visually-hidden/live-region',
    title: 'Live region',
    description:
      'A visually hidden status that assistive technology announces.',
    layer: 'headless',
  },
  {
    id: 'popover/basic',
    title: 'Basic',
    description:
      'Unstyled non-modal disclosure anchored to its trigger with Escape and outside-click dismissal.',
    layer: 'headless',
  },
  {
    id: 'popover/themed',
    title: 'Themed',
    description:
      'Elevated surface tokens and themed button controls composed via the as prop.',
    layer: 'themed',
  },
  {
    id: 'dialog/basic',
    title: 'Basic',
    description:
      'Unstyled modal dialog with overlay, trapped Tab focus, scroll lock, and inert background.',
    layer: 'headless',
  },
  {
    id: 'dialog/themed',
    title: 'Themed',
    description:
      'Elevation-4 modal surface, scrim overlay, and themed button actions.',
    layer: 'themed',
  },
  {
    id: 'dialog/nested',
    title: 'Nested',
    description:
      'Stacked modal dialogs where Escape dismisses only the innermost open dialog.',
    layer: 'themed',
  },
  {
    id: 'dialog/alert',
    title: 'Alert dialog',
    description:
      'Confirmation dialog with role="alertdialog" and outside-click dismissal disabled by default.',
    layer: 'themed',
  },
  {
    id: 'separator/basic',
    title: 'Basic',
    description: 'Native horizontal thematic break with separator semantics.',
    layer: 'headless',
  },
  {
    id: 'separator/composable',
    title: 'Composable',
    description: 'Same contract as GhostSeparator, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'separator/vertical',
    title: 'Vertical',
    description: 'Inline-axis rule between neighboring items.',
    layer: 'headless',
  },
  {
    id: 'separator/decorative',
    title: 'Decorative',
    description: 'Visual line omitted from the accessibility tree.',
    layer: 'headless',
  },
  {
    id: 'separator/list',
    title: 'List',
    description: 'Valid li separator between grouped list items.',
    layer: 'headless',
  },
  {
    id: 'separator/themed',
    title: 'Themed',
    description: 'Hairline rules on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
] as const satisfies readonly GhostExampleDefinition[]

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
