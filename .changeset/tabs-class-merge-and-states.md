---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

Merge consumer `class` with the part class on `GhostTabsList`,
`GhostTabsTrigger`, and `GhostTabsContent` instead of replacing it. A class on
the list previously dropped `ghost-tabs-list`, which also removed the themed
strip styles. Themed tabs now tint unselected tabs on hover, dim disabled tabs
with a `not-allowed` cursor, ring the focused panel, and paint the selected tab
with `Highlight` in forced-colors mode so its `HighlightText` label stays
legible.
