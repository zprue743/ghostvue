---
'@ghostvue/shared': minor
'@ghostvue/core': minor
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Rename the library from slop-ui to GhostVue. This is a breaking public rename of package names, component exports, CSS hooks, and diagnostic codes. Behavior and visuals are unchanged.

- npm scope `@slop-ui/*` is now `@ghostvue/*`
- Vue components and types `Sl*` are now `Ghost*` (`SlButton` → `GhostButton`)
- Composables `useSl*` are now `useGhost*`
- CSS custom properties `--sl-*` are now `--ghost-*`
- Data attributes `data-sl-*` are now `data-ghost-*`
- Classes `.slop-*` are now `.ghost-*`
- Development diagnostic codes `SLOP0xx` are now `GHOST0xx`

Button `variant="ghost"` is unchanged. The GitHub repository URL remains `github.com/zprue743/slop-ui`.
