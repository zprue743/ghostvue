---
'@ghostvue/vue': patch
---

Check effective disabled state (including radio-group disabled state) before invoking consumer `onClick` handlers or mutating selection/open state across DropdownMenu, ContextMenu, and Menubar ordinary, checkbox, and radio items.
