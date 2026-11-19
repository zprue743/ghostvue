---
'@ghostvue/core': minor
'@ghostvue/vue': patch
---

Add optional `accessibility.verification` to the component manifest schema
(`schemaVersion` 1.1.0, additive). It records APG conformance evidence in three
separate categories, automated keyboard tests, manual review, and
assistive-technology review, each `passed`, `failed`, or `not-reviewed`.
`GhostAccordion`, `GhostCheckbox`, `GhostCombobox`, `GhostSlider`,
`GhostSwitch`, `GhostTree`, `GhostTreeGroup`, and `GhostTreeItem` manifests now
map every declared key to a browser test; manual and assistive-technology
review remain `not-reviewed`.
