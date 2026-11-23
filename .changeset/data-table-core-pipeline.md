---
'@ghostvue/vue': minor
---

Add `useGhostDataTable`, the headless DataTable state and local processing
pipeline (GHO-233): sorting, default filtering, pagination with clamping,
selection, and expansion state; core, sorted, filtered, pre-pagination, and
paginated row models; the `manualSorting` / `manualFiltering` /
`manualPagination` matrix with page-local processing; and one coalesced
`stateChange` per server-query change. Also exports the phase-one `DataTable*`
types. Markup components and column helpers follow in later releases.
