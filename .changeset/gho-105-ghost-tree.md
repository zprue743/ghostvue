---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add `GhostTree` (TreeView) following the APG Tree View pattern, with `GhostTreeItem`, `GhostTreeTrigger`, `GhostTreeGroup`, `useGhostTree`, and `resolveTreeDir`. Consumers render their own nested data as keyed items. The tree supports single or multiple selection (`v-model`) and expansion (`v-model:expanded`), controlled or uncontrolled, with `allowDeselect`, `expandOnClick`, split `toggle` / `select` triggers, and `select` / `toggle` events. It has one roving Tab stop over visible enabled items in rendered order, RTL-aware arrow keys, `Home` / `End`, `*` sibling expansion, IME-safe typeahead, and focus recovery when a branch collapses or the focused item unmounts. Server HTML includes branch ARIA and the initial tab stop. Themed wrappers add `ghost-tree.css` with level-based logical indentation, row states, a row-only focus ring, reduced-motion-aware group height transitions, and forced-colors support.
