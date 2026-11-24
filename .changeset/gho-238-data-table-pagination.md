---
'@ghostvue/vue': minor
---

Add pager bindings to the `GhostDataTable` default slot: `pagination` (clamped), `pageCount`, `rowCount`, and `setPageIndex`. Bind a co-located `GhostPagination` to them so the pager follows the filtered count or the server `rowCount`, shows page 1 of 1 when nothing matches, and emits one `stateChange` per page change in server mode.
