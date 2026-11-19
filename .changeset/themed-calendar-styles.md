---
'@ghostvue/themes': patch
---

`default.css` now loads the themed `GhostCalendar` recipe. Before, the recipe
stylesheet was missing from the component imports, so themed calendars
rendered plain native buttons in apps.
