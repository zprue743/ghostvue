---
'@ghostvue/vue': patch
---

Leave keys that belong to an active IME composition to the input method.
`GhostComboboxInput` no longer opens the list, moves the highlight, selects, or
closes on ArrowUp/ArrowDown, `Home` / `End`, `Enter`, or `Escape` while
composing; `GhostSelect` listbox and menu (`GhostDropdownMenu`,
`GhostContextMenu`, `GhostMenubar`) typeahead and keyboard commands, and
`useDismissableLayer` Escape dismissal, ignore composing keys as well. Both
`isComposing` and the legacy `keyCode` 229 are honored, covering WebKit, which
dispatches the composition-confirming keydown after `compositionend`. Consumer
`keydown` handlers still receive these events, and normal keyboard behavior
resumes once the composition is committed.
