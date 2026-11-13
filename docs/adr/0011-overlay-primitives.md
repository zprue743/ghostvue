# ADR 0011: Overlay primitives

- Status: accepted
- Date: 2026-11-12
- Decision owners: repository maintainers
- Relates to: [ADR 0003](./0003-public-component-api-conventions.md) (naming),
  [ADR 0004](./0004-headless-styled-layering.md) (headless layering),
  [focus.md](../architecture/focus.md) (`useFocusScope`),
  [dependencies.md](../standards/dependencies.md) (runtime dependency policy)

## Context

Upcoming overlay components (`GhostPopover`, `GhostTooltip`, `GhostDropdownMenu`,
`GhostSelect`, and `GhostDialog`) share three headless requirements that do not
belong inside any single widget:

1. **Dismissable layering:** closing only the topmost open overlay on `Escape`
   or `pointerdown` outside the layer, while excluding trigger elements so
   clicking a toggle trigger does not close on `pointerdown` and immediately
   reopen on `click`.
2. **Anchor positioning:** placing a floating surface relative to an anchor
   element (or virtual element) with `offset`, `flip`, and `shift` collision
   handling, updating on scroll/resize/element-resize, and writing
   `data-placement` for directional styling hooks.
3. **Portaling:** rendering overlay content outside clipping ancestors via
   Vue `<Teleport>` without breaking SSR or hydration.

Per [ADR 0003](./0003-public-component-api-conventions.md) and
[focus.md](../architecture/focus.md), shared low-level composables omit the
`useGhost*` component prefix (`useDismissableLayer`, `useFloating`), while the
public teleport component uses the `Ghost` prefix (`GhostPortal`). All three
primitives stay headless inside `@ghostvue/vue` and never import
`@ghostvue/themes`.

## Decision

Add three headless overlay primitives to `@ghostvue/vue`:

### 1. Layering model (`useDismissableLayer` and `GhostPortal`)

- **`useDismissableLayer(el, options)`** coordinates nested overlays through a
  **module-level `layerStack`** inside `@ghostvue/vue`, matching the stacking
  model used by `useFocusScope`'s `trappedStack`.
- Capture-phase `pointerdown` and bubble-phase `keydown` listeners attach to
  `document` only after mount and only while `layerStack` is non-empty; they
  detach as soon as the last layer deactivates or unmounts. Listening in the
  bubble phase for `keydown` ensures descendants inside the layer (such as an
  `<input>`) can call `event.preventDefault()` on `Escape` before layer
  dismissal runs.
- Only the **topmost layer** on `layerStack` handles `Escape` (when not
  `defaultPrevented` or `isComposing`) and outside `pointerdown`. If the topmost
  layer sets `disableEscape` or `disableOutsidePointer`, it blocks lower layers
  from dismissing underneath it rather than letting events fall through.
- Elements in `ignore` (such as the trigger button) are checked alongside `el`
  via `composedPath()` (with `contains()` fallback) so pressing them never
  counts as an outside interaction.
- When nested DOM layers mount in the same render cycle (where Vue runs child
  `onMounted` before parent `onMounted`), descendant layers remain ordered above
  their ancestor layers on `layerStack`.
- **`GhostPortal`** wraps Vue 3.5's `<Teleport>` with `to`, `disabled`, and
  `defer`. Teleportation is disabled until `onMounted` runs (and whenever `to` is
  `null`) so SSR and initial client hydration render identical inline HTML
  without reading `document` or requiring `ssrContext.teleports`.

### 2. Positioning dependency (`@floating-ui/dom` in `useFloating`)

- **`useFloating(anchor, floating, options)`** wraps `@floating-ui/dom`'s
  `computePosition`, `autoUpdate`, `offset`, `flip`, and `shift`.
- `@floating-ui/dom` is added as an **exact-pinned runtime dependency** of
  `@ghostvue/vue` and kept **external** in `packages/vue/vite.config.ts` so
  consumer bundlers tree-shake unused middleware and deduplicate the package.
- Per [dependencies.md](../standards/dependencies.md):
  - **Capability:** viewport and overflow-ancestor collision detection (`flip`,
    `shift`, `offset`), `VirtualElement` support, `ResizeObserver` +
    scroll/layout-shift tracking (`autoUpdate`), and browser edge cases across
    CSS transforms, `offsetParent` chains, RTL, and Shadow DOM.
  - **Why local / platform APIs are insufficient:** CSS Anchor Positioning does
    not yet cover all supported browsers or expose reactive JS `data-placement`
    and coordinate state. Hand-rolling overflow-ancestor walking, `offsetParent`
    compensation, `flip`/`shift` math, and `ResizeObserver` loops would produce
    a fragile, high-maintenance clone of `@floating-ui/dom`.
  - **Tree-shaking and bundle impact:** `@floating-ui/dom` is side-effect-free
    ESM; consumers who do not import `useFloating` pay 0 bytes. Importing
    `useFloating` pulls in `computePosition`, `autoUpdate`, `offset`, `flip`,
    and `shift` (~22.1 kB minified / ~7.2 kB gzip for the `@floating-ui/dom`
    subset; ~23.5 kB minified / ~7.7 kB gzip together with the `useFloating`
    wrapper).
  - **License, maintenance, security:** MIT-licensed, zero install scripts,
    actively maintained standard across headless UI libraries, and no
    browser-global side effects at module evaluation time.
  - **SSR/browser behavior:** `computePosition` and `autoUpdate` run only inside
    `onMounted`; SSR setup returns `{ x: 0, y: 0, placement }` without touching
    `window` or `document` and writes `data-placement` only on mounted clients.

### 3. Single-copy module stack constraint

- `layerStack` in `useDismissableLayer` (like `trappedStack` in `useFocusScope`)
  is **scoped per loaded copy of `@ghostvue/vue`**.
- If an application loads two separate copies of `@ghostvue/vue` (for example,
  un-deduplicated versions or isolated micro-frontends), each copy maintains its
  own `layerStack` and Escape/outside-pointer coordination will not span across
  copies.

## Alternatives considered

**Hand-rolled positioning engine.** Rejected. Reimplementing `getBoundingClientRect`
ancestor-overflow clipping, `offsetParent` transforms, and `autoUpdate` observers
would add significant maintenance and browser-quirk risk while violating
`dependencies.md` in reverse (reinventing a well-scoped, MIT-licensed
standard).

**Global `window` / `document` registry to share `layerStack` across multiple
copies of GhostVue.** Rejected for v1. Writing undocumented properties onto
`window` or `document` introduces hidden global state and version-skew hazards
between incompatible `LayerRecord` shapes. Consumers should deduplicate
`@ghostvue/vue`; revisit only if real multi-bundle micro-frontend deployments
require a versioned DOM/event coordination protocol.

**Per-layer `document` listeners without a shared dispatcher.** Rejected.
Individual capture listeners can observe out-of-order stack mutations if a
consumer reacts synchronously, whereas a single top-only dispatcher guarantees
exactly one layer receives `onDismiss` per event and detaches cleanly at zero
layers.

## Consequences

- `@ghostvue/vue` gains `useDismissableLayer`, `useFloating`, and `GhostPortal`
  plus their TypeScript types (`DismissReason`, `UseDismissableLayerOptions`,
  `UseFloatingOptions`, `UseFloatingReturn`, `GhostPortalProps`,
  `GhostPortalTarget`).
- `@ghostvue/vue` gains an exact-pinned runtime dependency on `@floating-ui/dom`.
- `packages/vue/manifests/ghost-portal.manifest.json` is generated via
  `pnpm manifests:write`.
- Future overlay components (`GhostTooltip`, `GhostPopover`, `GhostDropdownMenu`,
  `GhostSelect`, `GhostDialog`) compose these primitives rather than introducing
  widget-specific portal, positioning, or outside-dismissal logic.

## Compatibility implications

Additive minor release on pre-release `@ghostvue/vue` (`0.0.0`). Existing public
APIs are unchanged. SSR output stays deterministic with zero `window`/`document`
access during setup. Consumers must ensure `@ghostvue/vue` is deduplicated to
one runtime copy when nesting dismissable layers across packages.
