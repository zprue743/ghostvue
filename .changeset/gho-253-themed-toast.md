---
'@ghostvue/themes': minor
---

Add the themed Toast stack (GHO-253). `@ghostvue/themes` exports a themed
`GhostToastViewport`, which fixes the portaled region to the bottom-end corner
above modal layers (or keeps it in flow with `portal: false`) and renders each
record as a themed toast with an icon close, and a themed `GhostToast` with
`variant` (`surface`, `solid`) and `tone` (`neutral`, `accent`, `danger`;
`type: 'error'` defaults to `danger`) hooks. `GhostToastProvider`,
`GhostToastTitle`, `GhostToastDescription`, `GhostToastAction`,
`GhostToastClose`, and `useGhostToast` are re-exported from `@ghostvue/vue`.
The new `ghost-toast.css` recipe adds an enter-only animation from the motion
tokens, off under `prefers-reduced-motion`; in-place `update()` keeps the
toast element, so the animation does not replay. Behavior is the headless
Toast's, unchanged. Ships in the same release as the headless Toast.
