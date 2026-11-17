---
'@ghostvue/vue': patch
---

Keep `GhostSelect` and `GhostCombobox` keyboard navigation in rendered order
after option lists change. Combobox Arrow / `Home` / `End` highlight
(`aria-activedescendant`) and Select first/last open focus and typeahead now
follow the DOM order of mounted options instead of the order they registered
in, so keyed reordering, inserting options before existing ones, filtering then
restoring results, and a virtualized window scrolling back no longer leave
keyboard traversal out of step with what is displayed.
