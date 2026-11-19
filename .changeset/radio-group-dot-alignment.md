---
'@ghostvue/themes': patch
---

Themed `GhostRadioGroupItem` now draws the checked dot centered inside its
ring. The dot claimed grid area `1 / 1` while the ring had no area, so grid
auto-placement moved the ring to a second row and the dot appeared above it.
Both now share the item's single cell.
