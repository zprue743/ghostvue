---
'@ghostvue/themes': patch
---

Keep themed component states visible in forced colors (Windows High Contrast). The radio dot, checked Select and Combobox options, selected calendar days, and the current pagination page now paint `Highlight` / `HighlightText`; disabled Select, Combobox, NumberInput, Pagination, Collapsible / Accordion, and DatePicker parts use `GrayText` instead of opacity; and NumberInput keyboard focus falls back to a `Highlight` outline because forced colors remove its box-shadow ring.
