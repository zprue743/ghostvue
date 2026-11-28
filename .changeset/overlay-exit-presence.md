---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
'@ghostvue/nuxt': patch
'@ghostvue/mcp': patch
---

Overlays can now animate out. New `GhostPresence` and `useGhostPresence` keep a closing surface mounted with `data-state="closed"` only while its own CSS transition or animation runs, then unmount it. `GhostDialog`, `GhostDrawer`, `GhostCommandPalette`, `GhostPopover`, `GhostHoverCard`, and `GhostDatePicker` use it with no new props: `update:open`, trigger `aria-expanded`, focus return, `Escape` layering, scroll lock, and background `inert` still change the moment an overlay closes, and the departing surface is `inert` with `pointer-events: none`. Reopening mid-exit reuses the same element. Without exit CSS, overlays unmount in the same frame as before.

Content and overlay parts of these hosts now report `data-state="closed"` while exiting (previously they only ever rendered `data-state="open"`), and their exposed `element` stays set until the node unmounts.

`@ghostvue/themes` adds exit recipes for those surfaces and the Dialog, Drawer, and CommandPalette backdrops: a fade with the entry's travel reversed over `--ghost-motion-exit-duration`, or a fade only under reduced motion. Dialog and CommandPalette backdrops also fade in. Dialog and Drawer geometry and forced-colors rules no longer require `[data-state='open']`. Themed overlays now stay in the DOM for about 120ms after closing, so tests that expect them gone immediately should wait for removal.

New development warning `GHOST014` reports a multi-root `GhostPresence` slot that never bound `setElement`.
