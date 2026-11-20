---
'@ghostvue/themes': patch
---

Draw the focus-ring token inset on the highlighted `GhostCombobox` option.
DOM focus stays in the input, and the muted highlight fill alone was under
3:1 against the panel and identical to the checked fill, so keyboard users
could not reliably see which option Enter would pick. The ring matches
focused `GhostSelect` options and menu items and stays inside the scrolling
panel.
