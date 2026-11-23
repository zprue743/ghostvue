---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add `GhostCommandPalette` (GHO-104): a modal command surface that composes the
`GhostDialog` shell with `useGhostCombobox`. New headless parts
`GhostCommandPalette`, `GhostCommandPaletteTrigger`, `GhostCommandPaletteOverlay`,
`GhostCommandPaletteContent`, `GhostCommandPaletteTitle`,
`GhostCommandPaletteInput`, `GhostCommandPaletteList`, `GhostCommandPaletteItem`,
`GhostCommandPaletteGroup`, `GhostCommandPaletteLabel`,
`GhostCommandPaletteEmpty`, and `GhostCommandPaletteSeparator`, plus
`useGhostCommandPalette` and `useGhostCommandPaletteAsyncSearch`. Consumers own
filtering, async results, command execution, and shortcuts. Activating an item
emits a non-cancelable `command` event with `{ id }` and, with
`closeOnSelect`, requests close. Activation never commits a combobox
selection, and the query resets only when the palette actually closes.
`v-model:open`, `v-model:search`, `search` request ids, `loading`, and
`messages` follow the combobox contract. `@ghostvue/themes` adds themed root,
overlay, and content wrappers and the `ghost-command-palette.css` recipe. Adds
the `GHOST012` development diagnostic for duplicate item ids and names the
palette in the `GHOST002` message. Dialog and Combobox public APIs are
unchanged.
