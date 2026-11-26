/**
 * Progressive escape hatch tabs on the docs home page. Kept in one module so
 * GhostLanding and landing progression tests stay aligned on source ids and
 * badges.
 */
export const landingProgressionStages = [
  {
    id: 'props',
    title: 'Props and configuration',
    code: '<GhostButton>',
    file: 'examples/button/configured.vue',
    note: 'Typed visual props with application-owned :loading',
    sourceId: 'button/configured',
    sourceMustMatch: [/GhostButton/, /variant=/, /:loading=/],
  },
  {
    id: 'controlled',
    title: 'Controllable state and callbacks',
    code: 'v-model:open',
    file: 'examples/popover/controlled.vue',
    note: 'App-owned open state via v-model:open and @update:open on every change',
    sourceId: 'popover/controlled',
    sourceMustMatch: [/v-model:open/, /@update:open/],
  },
  {
    id: 'slots',
    title: 'Slots and marked parts',
    code: 'data-part',
    file: 'examples/button/marked-parts.vue',
    note: 'Slot content owns icons and custom loading indicators via data-part',
    sourceId: 'button/marked-parts',
    sourceMustMatch: [/data-part="icon"/, /data-part="loading-indicator"/],
  },
  {
    id: 'composable',
    title: 'Lower-level primitives',
    code: 'useGhostButton()',
    file: 'examples/button/composable.vue',
    note: 'Attach behavior directly to custom elements without wrapper SFCs',
    sourceId: 'button/composable',
    sourceMustMatch: [/useGhostButton/, /rootProps/],
  },
] as const
