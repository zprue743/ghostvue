---
'@ghostvue/vue': minor
---

Complete the headless DataTable phase one (GHO-247). `@ghostvue/vue` now ships
`GhostDataTable`, `GhostDataTableTable`, `GhostDataTablePreset`,
`useGhostDataTable`, `useGhostDataTableServerRequest`,
`defineDataTableColumns`, the `getDataTable*Props` interaction helpers, and the
`DataTable*` types. All of them are additive; nothing existing changes. This
entry adds no new exports (each one is described in its own entry). It points to the
new DataTable docs page, which leads with the basic and full paths and runs the
basic, preset, full, pagination, and server router examples. A themed
DataTable is not part of this release.
