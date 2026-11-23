---
'@ghostvue/vue': minor
---

Add `GhostDataTable`, the renderless DataTable root over `useGhostDataTable`
(GHO-235). It renders no element of its own. Its default slot provides
`tableRootProps`, `headers`, `rows`, `headerSelectionState`,
`toggleAllRowsSelected`, and the header cell, row, cell context, sort button,
selection checkbox, and expand button bindings for composing a native
`GhostTable`. All six DataTable states are v-models with `default*`
fallbacks, `stateChange` is emitted for server queries, and row, selection,
expansion, sorting, filter, pagination, and `retry()` actions are exposed on
the template ref. Also exports the slot and binding types.
