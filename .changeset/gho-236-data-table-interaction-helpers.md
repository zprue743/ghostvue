---
'@ghostvue/vue': minor
---

Add the DataTable interaction prop helpers (GHO-236):
`getDataTableHeaderCellProps`, `getDataTableSortButtonProps`,
`getDataTableRowSelectionCheckboxProps`,
`getDataTableHeaderSelectionCheckboxProps`, and
`getDataTableRowExpandButtonProps`. They take a `useGhostDataTable` return and
give attributes for the focusable control itself, so layouts without the
`GhostDataTable` root get the same labels and ARIA state as its slot getters,
which now delegate to them. `useGhostDataTable` also returns
`rowSelectionEnabled` and `rowExpansionEnabled`. `GhostDataTable` now gives each
expand button an `id` and moves focus back to it when a detail row collapses
while focus is inside that row.
