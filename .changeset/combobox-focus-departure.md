---
'@ghostvue/vue': patch
---

`GhostCombobox` now closes when keyboard or programmatic focus leaves the whole
widget (input, trigger, and inline or portaled content). It emits
`update:open` with `false` without restoring focus and clears the transient
search: single selection shows the committed label, multiple selection returns
to an empty query (`update:search` and `search` are emitted when the query
changes). The selection is unchanged. Moving between the input, trigger, and
content, pointer selection, and pressing non-focusable content (which now keeps
focus on the input) do not dismiss. Controlled `open` and `search` stay
parent-owned.
