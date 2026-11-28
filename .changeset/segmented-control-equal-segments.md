---
'@ghostvue/themes': patch
---

Fix themed `GhostSegmentedControl` segment sizing so the sliding indicator lines
up with the selected label. Segments now share an equal grid track sized from
the widest label, instead of splitting the sum of all labels evenly, which let
long labels overflow their segment. Labels wrap within their segments when the
control is constrained. Set `display: grid` on the root to span a container.
Roots already overridden to a full-width `display: flex` keep equal segments
through a `flex: 1 1 0` fallback. Vertical controls keep equal rows on the
default grid. A vertical flex override keeps them only for single-line labels.
The keyboard focus ring is now drawn inside
the segment so it no longer stacks on the indicator border or spills past the
control's edge.
