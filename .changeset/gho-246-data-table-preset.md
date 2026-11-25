---
'@ghostvue/vue': minor
---

Add `GhostDataTablePreset` (GHO-246), the batteries-included default child of
`GhostDataTable`. Place it inside the root instead of a manual `#default`
composition to get a labelled global search field, a selection column with a
select-all checkbox, an expansion column with labelled expand buttons and
detail rows, sort buttons with `aria-sort` on the `<th>`, and a
`GhostEmptyState` row when nothing renders.

- Props: `emptyTitle`, `emptyHeadingLevel`, `searchLabel`,
  `selectionHeaderLabel`, `expansionHeaderLabel`, `showGlobalFilter` (defaults
  to `true` when any column takes part in the global filter), and localized
  control names `selectAllLabel`, `rowSelectionLabel`, `rowExpansionLabel`.
  `disabled` and `loading` come from the parent `GhostDataTable`.
- Slots: typed `#<columnId>` cell slots (pass the same `columns` array, as with
  `GhostDataTableTable`), `#detail="{ row, rowId, rowIndex }"`, `#toolbar`, and
  `#search` to replace the default search field.
