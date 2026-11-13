---
'@ghostvue/vue': patch
---

Fix three `GhostPopover` focus behaviors: walk up to the nearest focusable ancestor on outside pointer dismissal so clicks on child elements inside focusable controls do not pull focus back to the trigger, reset `shouldRestoreFocus` when a controlled parent keeps `open` true after an outside pointer dismissal, and suppress initial `useFocusScope` autofocus only when the `GhostPopover` root started open at setup (`defaultOpen` or `open: true` at mount) until it first closes.
