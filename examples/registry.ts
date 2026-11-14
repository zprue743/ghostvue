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
    id: 'badge/basic',
    title: 'Basic',
    description: 'Unstyled compact status text.',
    layer: 'headless',
  },
  {
    id: 'badge/composable',
    title: 'Composable',
    description: 'Same contract as GhostBadge, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'badge/themed',
    title: 'Themed',
    description: 'Visual props on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'badge/icon',
    title: 'Icon',
    description: 'Optional decorative icon marked data-part=icon.',
    layer: 'themed',
  },
  {
    id: 'badge/table',
    title: 'Table and filters',
    description: 'Cell statuses, counts, and active-filter summaries.',
    layer: 'themed',
  },
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
    id: 'checkbox/basic',
    title: 'Basic',
    description: 'Labeled native checkbox with a boolean v-model.',
    layer: 'headless',
  },
  {
    id: 'checkbox/composable',
    title: 'Composable',
    description: 'Same contract as GhostCheckbox, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'checkbox/themed',
    title: 'Themed',
    description: 'Visual size and tone on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'checkbox/indeterminate',
    title: 'Indeterminate',
    description: 'Select-all mixed state computed from child checkboxes.',
    layer: 'headless',
  },
  {
    id: 'checkbox/ref',
    title: 'Component ref',
    description: 'Template refs expose element, focus, and blur.',
    layer: 'headless',
  },
  {
    id: 'spinner/basic',
    title: 'Basic',
    description: 'Named status. The default label is Loading.',
    layer: 'headless',
  },
  {
    id: 'spinner/composable',
    title: 'Composable',
    description: 'Same contract as GhostSpinner, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'spinner/themed',
    title: 'Themed',
    description: 'Visual size and tone on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'spinner/table-refresh',
    title: 'Table refresh',
    description: 'Localized pending status; the table owns aria-busy.',
    layer: 'themed',
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
    id: 'skeleton/basic',
    title: 'Basic',
    description:
      'Unstyled decorative loading placeholder. Hidden from assistive technology.',
    layer: 'headless',
  },
  {
    id: 'skeleton/composable',
    title: 'Composable',
    description: 'Same contract as GhostSkeleton, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'skeleton/themed',
    title: 'Themed',
    description:
      'Text, rect, and circle shapes on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'skeleton/table',
    title: 'Table loading',
    description:
      'Loading rows with aria-busy and a caption as the status text.',
    layer: 'themed',
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
    id: 'progress/basic',
    title: 'Basic',
    description: 'Named determinate progressbar with value and max.',
    layer: 'headless',
  },
  {
    id: 'progress/composable',
    title: 'Composable',
    description: 'Same contract as GhostProgress, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'progress/indeterminate',
    title: 'Indeterminate',
    description: 'Fallback when the current value is unknown.',
    layer: 'headless',
  },
  {
    id: 'progress/value-text',
    title: 'Value text',
    description: 'Custom accessible value text instead of a percent.',
    layer: 'headless',
  },
  {
    id: 'progress/themed',
    title: 'Themed',
    description: 'Track thickness and tone on the @ghostvue/themes wrapper.',
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
    description: 'li separator inside a list-shaped menu.',
    layer: 'headless',
  },
  {
    id: 'separator/themed',
    title: 'Themed',
    description: 'Hairline rules on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'kbd/basic',
    title: 'Basic',
    description: 'Native kbd chrome for a single key.',
    layer: 'headless',
  },
  {
    id: 'kbd/composable',
    title: 'Composable',
    description: 'Same contract as GhostKbd, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'kbd/combination',
    title: 'Combination',
    description: 'Key tokens plus a trailing slot key.',
    layer: 'headless',
  },
  {
    id: 'kbd/platform',
    title: 'Platform labels',
    description: 'Explicit Apple and PC modifier labels.',
    layer: 'headless',
  },
  {
    id: 'kbd/themed',
    title: 'Themed',
    description: 'Keycap chrome and size on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'input/basic',
    title: 'Basic',
    description: 'Native labeled text field. The default type is text.',
    layer: 'headless',
  },
  {
    id: 'input/composable',
    title: 'Composable',
    description: 'Same contract as GhostInput, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'input/ref',
    title: 'Component ref',
    description: 'Template refs expose element, focus, and blur.',
    layer: 'headless',
  },
  {
    id: 'input/themed',
    title: 'Themed',
    description: 'Size props on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'input/states',
    title: 'States',
    description: 'Disabled, readonly, invalid, and required.',
    layer: 'themed',
  },
  {
    id: 'input/search',
    title: 'Search',
    description: 'Controlled type=search for DataTable-style filters.',
    layer: 'themed',
  },
  {
    id: 'textarea/basic',
    title: 'Basic',
    description: 'Labeled native textarea with v-model.',
    layer: 'headless',
  },
  {
    id: 'textarea/composable',
    title: 'Composable',
    description: 'Same contract as GhostTextarea, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'textarea/themed',
    title: 'Themed',
    description: 'Visual size on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'textarea/states',
    title: 'States',
    description: 'Disabled, readonly, invalid, and required fields.',
    layer: 'themed',
  },
  {
    id: 'textarea/auto-resize',
    title: 'Auto-resize',
    description: 'Grows with content until maxRows.',
    layer: 'themed',
  },
  {
    id: 'textarea/form',
    title: 'Form',
    description: 'Native form submission of the textarea value.',
    layer: 'themed',
  },
  {
    id: 'textarea/ref',
    title: 'Component ref',
    description: 'Template refs expose element, focus, and blur.',
    layer: 'headless',
  },
  {
    id: 'switch/basic',
    title: 'Basic',
    description: 'Labeled native switch. The default state is off.',
    layer: 'headless',
  },
  {
    id: 'switch/composable',
    title: 'Composable',
    description: 'Same contract as GhostSwitch, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'switch/themed',
    title: 'Themed',
    description: 'Visual size and tone on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
  {
    id: 'switch/states',
    title: 'Disabled and read-only',
    description: 'Disabled switches leave the tab order; read-only ones stay.',
    layer: 'themed',
  },
  {
    id: 'switch/form',
    title: 'Form value',
    description: 'Named switches submit while on and restore on reset.',
    layer: 'themed',
  },
  {
    id: 'switch/ref',
    title: 'Component ref',
    description:
      'Template refs expose element, checked, toggle, focus, and blur.',
    layer: 'headless',
  },
  {
    id: 'collapsible/basic',
    title: 'Collapsible disclosure',
    description: 'Headless trigger and content linked with aria-controls.',
    layer: 'headless',
  },
  {
    id: 'collapsible/themed',
    title: 'Themed collapsible',
    description: 'Default surface styles with optional motion on expand.',
    layer: 'themed',
  },
  {
    id: 'field/basic',
    title: 'Labeled input',
    description: 'Label, hint, and control id wiring for GhostInput.',
    layer: 'headless',
  },
  {
    id: 'field/invalid',
    title: 'Invalid field',
    description: 'Required filter with error copy and aria-invalid.',
    layer: 'headless',
  },
  {
    id: 'field/textarea',
    title: 'Textarea field',
    description: 'GhostTextarea composed with description.',
    layer: 'headless',
  },
  {
    id: 'field/checkbox',
    title: 'Wrapping checkbox',
    description: 'associate=wrap label pattern for GhostCheckbox.',
    layer: 'headless',
  },
  {
    id: 'field/themed',
    title: 'Themed stack',
    description: 'Default vertical spacing from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'tabs/basic',
    title: 'Basic',
    description: 'Controlled compound tabs with automatic activation.',
    layer: 'headless',
  },
  {
    id: 'tabs/manual',
    title: 'Manual activation',
    description: 'Tabs activate on click or Enter/Space instead of focus.',
    layer: 'headless',
  },
  {
    id: 'tabs/vertical',
    title: 'Vertical',
    description: 'Vertical tab list with arrow-key roving focus.',
    layer: 'headless',
  },
  {
    id: 'tabs/themed',
    title: 'Themed',
    description: 'Styled tab list and panels from @ghostvue/themes.',
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
