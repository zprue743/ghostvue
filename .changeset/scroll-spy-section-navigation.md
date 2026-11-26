---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add `GhostScrollSpy` section-navigation compound parts, `useGhostScrollSpy`, and scroll measurement helpers. The docs landing rail migrates onto the new primitive without visual changes.

ScrollSpy preserves consumer classes and link metadata, tracks each enabled section once, and updates after viewport or content resizes. Nested navigation respects scroll padding and target scroll margins.

Tracking follows changes to the scroll container, including template refs that resolve after mount. Progress stays at zero when no targets can be measured.

Enabled custom link components receive the resolved `href`.

Link activation and `scrollTo()` jump immediately when reduced motion is requested, even with CSS smooth scrolling.

Changes to `probeOffset` or `endThreshold` refresh the active section and its progress at the current scroll position.
