---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add `GhostDrawer` (Sheet), an edge-anchored Dialog variant with `GhostDrawerTrigger`, `GhostDrawerOverlay`, `GhostDrawerContent`, `GhostDrawerTitle`, `GhostDrawerDescription`, `GhostDrawerClose`, `useGhostDrawer`, and `resolveDrawerDir`. Drawers anchor to the logical `start` / `end` or `top` / `bottom` edge (default `end`), are modal by default, and resolve writing direction safely when portaled. Themed wrappers add `ghost-drawer.css` with a `@starting-style` slide-in that becomes an opacity-only fade under `prefers-reduced-motion: reduce`, plus forced-colors support. `GhostDialog` now shares its part mechanics with `GhostDrawer` internally; its public API is unchanged. The `GHOST002` / `GHOST003` development messages now name both families.
