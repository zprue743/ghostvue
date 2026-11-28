---
'@ghostvue/mcp': patch
---

The `field/themed` example no longer wraps its field in `.ghost-theme`. That class hosts the default palette, so the copied SFC showed default colors and density inside an app themed with `data-ghost-theme="calm"` on `<html>`. The example now follows the app's flagship, as Getting started documents.
