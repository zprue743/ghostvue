/**
 * Progressive escape hatch tabs on the docs home page. Kept in one module so
 * GhostLanding and landing progression tests stay aligned on source ids and
 * badges.
 */
export const landingProgressionStageTitles = [
  'Props and configuration',
  'Controllable state and callbacks',
  'Slots and marked parts',
  'Lower-level primitives',
] as const

export const landingProgressionStageCodes = [
  '<GhostButton>',
  'v-model:open',
  'data-part',
  'useGhostButton()',
] as const

export const landingProgressionStages = [
  {
    id: 'props',
    file: 'examples/button/configured.vue',
    note: 'Safe default type="button"; preserves focus when loading',
    sourceId: 'button/configured',
    sourceMustMatch: [/GhostButton/, /type="button"/, /:loading=/],
  },
  {
    id: 'controlled',
    file: 'examples/popover/controlled.vue',
    note: 'Works controlled (v-model:open) or uncontrolled (defaultOpen)',
    sourceId: 'popover/controlled',
    sourceMustMatch: [/v-model:open/, /@update:open/, /defaultOpen/],
  },
  {
    id: 'slots',
    file: 'examples/button/marked-parts.vue',
    note: 'Slot content owns icons and custom loading indicators via data-part',
    sourceId: 'button/marked-parts',
    sourceMustMatch: [/data-part="icon"/, /data-part="loading-indicator"/],
  },
  {
    id: 'composable',
    file: 'examples/button/composable.vue',
    note: 'Attach behavior directly to custom elements without wrapper SFCs',
    sourceId: 'button/composable',
    sourceMustMatch: [/useGhostButton/, /rootProps/],
  },
] as const
