---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

`GhostDialogContent` (headless and themed) adds three optional focus props.
`focusReady` (default `true`) delays focus entry until content is ready, for
example after anchored positioning; once focus has entered, the trap stays on
until close. `initialFocus` and `returnFocus` are functions that return the
element to focus on entry and on close. A `null`, removed, disabled, or
otherwise invalid element keeps the existing default. Default dialog behavior
is unchanged, and `GhostDrawer` is unaffected.
