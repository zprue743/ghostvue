---
'@ghostvue/themes': patch
---

Themed `GhostTable` row headers (`scope="row"`) in the body and foot now keep
the row surface and top alignment instead of the column header band, and the
`containHorizontal` scroll region shows the token focus ring, inset so a
clipping ancestor cannot cut it off. The `GhostTable` manifest documents
`scrollLabel` and lists the new `table/team-directory` example: a searchable
team directory with status badges, row actions, loading and empty states, and
a named horizontal-scroll region.
