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
    id: 'avatar/basic',
    title: 'Initials',
    description: 'Fallback initials from name without an image URL.',
    layer: 'headless',
  },
  {
    id: 'avatar/composable',
    title: 'Composable',
    description: 'Same contract as GhostAvatar, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'avatar/fallback',
    title: 'Fallback slot',
    description: 'Custom fallback when src is missing or fails to load.',
    layer: 'headless',
  },
  {
    id: 'avatar/image',
    title: 'Loaded image',
    description: 'Client image probe after SSR-safe loading fallback.',
    layer: 'headless',
  },
  {
    id: 'avatar/themed',
    title: 'Themed',
    description: 'Size hooks on the @ghostvue/themes wrapper.',
    layer: 'themed',
  },
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
    id: 'breadcrumb/basic',
    title: 'Basic',
    description: 'Ordered navigation trail with current page semantics.',
    layer: 'headless',
  },
  {
    id: 'breadcrumb/collapsed',
    title: 'Collapsed segments',
    description: 'Ellipsis popover exposes middle ancestors.',
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
    id: 'hover-card/basic',
    title: 'Basic',
    description:
      'Unstyled hover/focus preview card with delays, interactive content, and Escape dismissal.',
    layer: 'headless',
  },
  {
    id: 'hover-card/themed',
    title: 'Themed',
    description: 'Elevation-3 surface tokens for rich preview cards.',
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
    id: 'dropdown-menu/basic',
    title: 'Basic',
    description:
      'Headless menu button with items, checkbox, radio group, label, separator, and disabled item.',
    layer: 'headless',
  },
  {
    id: 'dropdown-menu/themed',
    title: 'Themed',
    description:
      'Elevation-3 menu surface and interactive item tokens with a themed trigger button.',
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
    id: 'link/basic',
    title: 'Basic',
    description: 'Native anchor with headless styling hooks.',
    layer: 'headless',
  },
  {
    id: 'link/composable',
    title: 'Composable',
    description: 'Same contract as GhostLink, applied to a native host.',
    layer: 'headless',
  },
  {
    id: 'link/themed',
    title: 'Themed',
    description: 'Default inline link visuals from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'link/external',
    title: 'External',
    description: 'New-tab safety, indicator, and accessible hint.',
    layer: 'themed',
  },
  {
    id: 'link/disabled',
    title: 'Disabled',
    description: 'No href, not focusable, and activation cancelled.',
    layer: 'themed',
  },
  {
    id: 'link/router',
    title: 'Router composition',
    description: 'Render through as without importing vue-router.',
    layer: 'headless',
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
  {
    id: 'table/basic',
    title: 'Basic table',
    description: 'Caption, header row, and explicit tbody semantics.',
    layer: 'headless',
  },
  {
    id: 'table/composable',
    title: 'Composable',
    description: 'Native table hosts with useGhostTable hooks.',
    layer: 'headless',
  },
  {
    id: 'table/contain-horizontal',
    title: 'Horizontal containment',
    description: 'Optional scroll container for wide static tables.',
    layer: 'headless',
  },
  {
    id: 'table/row-headers',
    title: 'Row headers',
    description: 'th scope=row inside the table body.',
    layer: 'headless',
  },
  {
    id: 'table/themed',
    title: 'Themed',
    description: 'Default table chrome from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'empty-state/basic',
    title: 'Empty state basics',
    description: 'Title and description for an unused panel.',
    layer: 'headless',
  },
  {
    id: 'empty-state/filtered',
    title: 'Filtered empty results',
    description: 'Copy and an action when filters hide every row.',
    layer: 'headless',
  },
  {
    id: 'empty-state/table-cell',
    title: 'Empty table body',
    description: 'EmptyState inside a colspan cell.',
    layer: 'headless',
  },
  {
    id: 'empty-state/themed',
    title: 'Themed empty state',
    description: 'Visual, title, description, and actions with default CSS.',
    layer: 'themed',
  },
  {
    id: 'empty-state/composable',
    title: 'Composable empty state',
    description: 'useGhostEmptyState bindings on a custom host.',
    layer: 'headless',
  },
  {
    id: 'inline-alert/basic',
    title: 'Static inline alert',
    description: 'Title and message without live-region semantics.',
    layer: 'headless',
  },
  {
    id: 'inline-alert/composable',
    title: 'Composable inline alert',
    description: 'useGhostInlineAlert bindings on a section root.',
    layer: 'headless',
  },
  {
    id: 'inline-alert/themed',
    title: 'Themed inline alert',
    description: 'Soft danger styling from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'inline-alert/live',
    title: 'Post-mount alert',
    description: 'announce=alert after a simulated failure.',
    layer: 'headless',
  },
  {
    id: 'inline-alert/table-error',
    title: 'Table load failure',
    description: 'Recoverable table error with a retry action.',
    layer: 'themed',
  },
  {
    id: 'card/basic',
    title: 'Card basics',
    description: 'Header, content, and footer parts on a surface.',
    layer: 'headless',
  },
  {
    id: 'card/actions',
    title: 'Card with actions',
    description: 'Static root and footer buttons.',
    layer: 'headless',
  },
  {
    id: 'card/link',
    title: 'Navigational card',
    description: 'Whole-card link without nested interactives.',
    layer: 'headless',
  },
  {
    id: 'card/interactive',
    title: 'Spotlight card',
    description: 'Ambient pointer tracking on the card root.',
    layer: 'headless',
  },
  {
    id: 'card/themed',
    title: 'Themed card',
    description: 'Elevation chrome and optional spotlight from themes.',
    layer: 'themed',
  },
  {
    id: 'card/composable',
    title: 'Composable card',
    description: 'useGhostCard bindings on a custom host.',
    layer: 'headless',
  },
  {
    id: 'radio-group/basic',
    title: 'Basic',
    description: 'Headless radio group with labeled items.',
    layer: 'headless',
  },
  {
    id: 'radio-group/field',
    title: 'Field wiring',
    description: 'Group label, description, and error through GhostField.',
    layer: 'headless',
  },
  {
    id: 'radio-group/form',
    title: 'Form reset',
    description: 'Native submit and reset with a shared name.',
    layer: 'headless',
  },
  {
    id: 'radio-group/themed',
    title: 'Themed',
    description: 'Styled radio dots from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'accordion/basic',
    title: 'Accordion sections',
    description: 'Single expansion with collapsible coordination over panels.',
    layer: 'headless',
  },
  {
    id: 'accordion/themed',
    title: 'Themed accordion',
    description: 'Multiple expansion with default surface styles.',
    layer: 'themed',
  },
  {
    id: 'accordion/navigation',
    title: 'Accordion navigation',
    description:
      'Tab order across headers and panel links; nested accordion isolation.',
    layer: 'headless',
  },
  {
    id: 'slider/basic',
    title: 'Single value',
    description: 'Headless numeric slider with stepped values.',
    layer: 'headless',
  },
  {
    id: 'slider/range',
    title: 'Range filter',
    description: 'Two-thumb interval selection for tables.',
    layer: 'headless',
  },
  {
    id: 'slider/vertical',
    title: 'Vertical themed',
    description: 'Themed vertical orientation and tokens.',
    layer: 'themed',
  },
  {
    id: 'slider/value-text',
    title: 'Value text',
    description:
      'Named slider with aria-valuetext alongside the numeric value.',
    layer: 'headless',
  },
  {
    id: 'tooltip-provider/skip-delay',
    title: 'Provider skip delay',
    description:
      'Adjacent tooltips share skipDelayDuration under GhostTooltipProvider.',
    layer: 'headless',
  },
  {
    id: 'tooltip/basic',
    title: 'Supplemental label',
    description:
      'Icon-only trigger with delay timing, floating placement, and aria-describedby.',
    layer: 'headless',
  },
  {
    id: 'tooltip/themed',
    title: 'Themed',
    description: 'Elevation-2 tooltip surface inside a ghost-theme fieldset.',
    layer: 'themed',
  },
  {
    id: 'pagination/basic',
    title: 'Basic',
    description: 'Numbered page navigation with previous and next.',
    layer: 'headless',
  },
  {
    id: 'pagination/controlled',
    title: 'Controlled',
    description: 'Parent-owned page index and page count.',
    layer: 'headless',
  },
  {
    id: 'pagination/ellipsis',
    title: 'Ellipsis',
    description: 'Large page counts collapse into start and end ellipsis.',
    layer: 'headless',
  },
  {
    id: 'pagination/themed',
    title: 'Themed',
    description: 'Default pagination styling from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'number-input/basic',
    title: 'Basic',
    description: 'Labeled spinbutton with min, max, and step.',
    layer: 'headless',
  },
  {
    id: 'number-input/bounds',
    title: 'Bounds',
    description: 'Increment buttons disable at min and max.',
    layer: 'headless',
  },
  {
    id: 'number-input/field',
    title: 'Field',
    description: 'Currency formatting inside GhostField.',
    layer: 'headless',
  },
  {
    id: 'number-input/form-locale',
    title: 'Form locale',
    description: 'Hidden submit value stays machine-readable in de-DE.',
    layer: 'headless',
  },
  {
    id: 'number-input/ref',
    title: 'Component ref',
    description: 'Programmatic increment through the exposed API.',
    layer: 'headless',
  },
  {
    id: 'number-input/themed',
    title: 'Themed',
    description: 'Large block layout from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'toolbar/basic',
    title: 'Basic',
    description: 'Horizontal action bar with roving focus among buttons.',
    layer: 'headless',
  },
  {
    id: 'toolbar/composable',
    title: 'Composable',
    description: 'Same contract as GhostToolbar on a native host.',
    layer: 'headless',
  },
  {
    id: 'toolbar/vertical',
    title: 'Vertical',
    description: 'Vertical toolbar with up and down arrow movement.',
    layer: 'headless',
  },
  {
    id: 'toolbar/separators',
    title: 'Separators',
    description: 'Group controls with semantic vertical separators.',
    layer: 'headless',
  },
  {
    id: 'toolbar/themed',
    title: 'Themed',
    description: 'Flex layout from @ghostvue/themes.',
    layer: 'themed',
  },
  {
    id: 'segmented-control/basic',
    title: 'Segmented control',
    description: 'Single-select view switcher with sliding indicator vars.',
    layer: 'headless',
  },
  {
    id: 'segmented-control/themed',
    title: 'Segmented control themed',
    description: 'Token-driven thumb with reduced-motion support.',
    layer: 'themed',
  },
  {
    id: 'toggle-group/basic',
    title: 'Toggle group single',
    description: 'Exclusive aria-pressed density controls.',
    layer: 'headless',
  },
  {
    id: 'toggle-group/multiple',
    title: 'Toggle group multiple',
    description: 'Independent formatting toggles in one group.',
    layer: 'headless',
  },
  {
    id: 'toggle-group/themed',
    title: 'Toggle group themed',
    description: 'Segmented layout switcher with default styles.',
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
