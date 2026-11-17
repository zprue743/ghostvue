---
'@ghostvue/vue': patch
---

`GhostTooltip` now coordinates `Escape` with the shared overlay layer stack instead of a separate document listener. A tooltip open inside a `GhostDialog`, `GhostPopover`, or menu closes on the first `Escape` without also closing that overlay; the next `Escape` reaches the layer beneath. Tooltips stay out of outside-pointer dismissal, so pressing outside still dismisses the dialog or popover under an open tooltip.
