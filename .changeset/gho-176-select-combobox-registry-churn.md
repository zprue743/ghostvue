---
'@ghostvue/vue': patch
---

Make `GhostSelect` and `GhostCombobox` option registration constant-time.
Registering, unregistering, or updating an option no longer copies the option
order and label/record maps, and an open Combobox no longer rescans every
option to announce the result count, so mounting, filtering, restoring, or
keyed reordering large option lists scales linearly instead of quadratically
(3000 options: about 2.2 s to 6 ms of Combobox registry work in jsdom). An
option's own disabled / label state now re-evaluates only when that option
changes. Public registry state (`optionOrder`, `optionCount`, labels, the
live-region announcement) is still updated synchronously.
