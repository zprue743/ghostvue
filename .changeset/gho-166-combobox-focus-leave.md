---
'@ghostvue/vue': patch
---

Dismiss `GhostCombobox` when keyboard or programmatic focus leaves the complete
widget (`GhostComboboxInput`, `GhostComboboxTrigger`, and inline or portaled
`GhostComboboxContent`) without restoring focus or changing selection, while
clearing transient search text and keeping controlled props parent-owned.
