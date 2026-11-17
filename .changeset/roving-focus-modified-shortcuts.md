---
'@ghostvue/vue': patch
---

`useRovingFocus` no longer handles arrow, Home, or End keys pressed with Alt, Ctrl, or Meta, or keys that belong to an IME composition. Tabs, Toolbar, ToggleGroup, SegmentedControl, Menubar, and the Select listbox now leave those shortcuts to the browser, operating system, assistive technology, or app instead of moving focus and calling `preventDefault()`. Unmodified and Shift-modified navigation is unchanged.
