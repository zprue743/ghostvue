---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

Merge consumer `class` bindings (string, array, or object) with the library
class on `GhostDropdownMenuContent`, `GhostContextMenuContent`,
`GhostMenubarContent`, `GhostSelectContent`, and `GhostComboboxContent`
instead of dropping them. Floating position and consumer `style` merging are
unchanged. The themed `GhostComboboxContent` no longer adds a duplicate
`ghost-combobox-content` class.
