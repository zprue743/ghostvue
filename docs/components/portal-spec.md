---
schemaVersion: 1.0.0
component: GhostPortal
components:
  - GhostPortal
packages:
  - '@ghostvue/vue'
specStatus: proposed
manifests:
  - packages/vue/manifests/ghost-portal.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: false
    reason: 'GhostPortal only teleports slot children and does not accept consumer data collections.'
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# GhostPortal specification

**Status:** Proposed. The `GhostPortal` public contract was accepted in
[ADR 0011](../adr/0011-overlay-primitives.md), but this specification document
was written retroactively for GHO-19 and has not been approved by a maintainer.
Set `specStatus: approved` with `approval.evidence` only after that review.

## Purpose and user problems

`GhostPortal` is a thin, SSR-safe wrapper around Vue `<Teleport>` for rendering overlay content outside the parent DOM hierarchy so floating panels, dialogs, and tooltips escape ancestor `overflow`, `transform`, and stacking-context clipping.

## Non-goals

- Does not manage focus trapping, dismiss layers, or positioning; those belong to `useFocusScope`, `useDismissableLayer`, and `useFloating`.
- Does not ship themed styling or wrapper DOM elements around the default slot.

## Public API

See [ghost-portal.manifest.json](../../packages/vue/manifests/ghost-portal.manifest.json) for the generated prop and slot contracts (`to`, `disabled`, `defer`, and the `default` slot).

## State model

`GhostPortal` tracks a single client-only `mounted` boolean initialized to `false` and set to `true` in `onMounted`. Teleportation is disabled whenever `disabled` is `true`, `!mounted`, or `to == null` (falling back to `'body'` as the internal `<Teleport>` target when `to` is nullish so `<Teleport>` receives a valid target prop while remaining disabled).

## Accessibility contract

`GhostPortal` renders no wrapper element and adds no ARIA roles or attributes of its own. Overlay components using `GhostPortal` preserve Vue-tree `provide`/`inject` context for focus-scope ancestry (`useFocusScope`) and layer ordering (`useDismissableLayer`), while owning their own dialog/popover/tooltip roles and labels.

## Rendering and customization

Renders only `<Teleport :to="teleportTarget" :disabled="teleportDisabled" :defer="defer"><slot /></Teleport>` with no extra wrapper DOM nodes. Consumers customize destination and inline fallback via `to`, `disabled`, and `defer`.

## Environment behavior

During SSR and initial client hydration (`mounted === false`), teleportation is disabled so content renders inline without touching `document` or requiring `ssrContext.teleports`. After client mount, `<Teleport>` moves the slot content to `to` unless `disabled` is `true` or `to == null`.

## Performance

Constant-time wrapper around Vue `<Teleport>` with a single `shallowRef(false)` and two computed booleans.

## Composition

Shared overlay primitive in `@ghostvue/vue` composed by `GhostDialog`, `GhostPopover`, `GhostTooltip`, `GhostHoverCard`, and related overlay components.

## Test plan

Covered by `packages/vue/src/GhostPortal.test.ts` and `packages/vue/src/overlay-ssr.test.ts` for SSR inline rendering without `document` queries, default `body` teleportation after mount, `disabled` / `to={null}` inline rendering, `defer`, and unmount cleanup.

## Documentation plan

Documented in [ADR 0011](../adr/0011-overlay-primitives.md), [the roadmap](../roadmap.md), and the generated manifest `packages/vue/manifests/ghost-portal.manifest.json`.

## Compatibility and release impact

Shipped in `@ghostvue/vue` under PR #59; no breaking changes.
