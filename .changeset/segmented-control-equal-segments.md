---
'@ghostvue/themes': patch
---

Fix themed `GhostSegmentedControl` segment sizing so the sliding indicator lines
up with the selected label. Segments now share an equal grid track sized from
the widest label, instead of splitting the sum of all labels evenly, which let
long labels overflow their segment. The keyboard focus ring is now drawn inside
the segment so it no longer stacks on the indicator border or spills past the
control's edge.
