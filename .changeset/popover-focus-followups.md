---
'@ghostvue/vue': patch
---

Fix three `GhostPopoverContent` focus behaviors: walk up to the nearest focusable ancestor on outside pointer dismissal so clicks on child elements inside focusable controls do not pull focus back to the trigger, reset `shouldRestoreFocus` when a controlled parent keeps `open` true after an outside pointer dismissal, and only autofocus popover content on closed-to-open transitions after mount rather than when rendered initially open (`defaultOpen` or `open: true` at mount).
