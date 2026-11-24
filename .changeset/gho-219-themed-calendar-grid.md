---
'@ghostvue/themes': patch
---

Themed `GhostCalendar` now reads like a standard month calendar. The root
renders a `.ghost-themed-scope` container (consumer `class`/`style` land on it)
so the recipe reaches the weekday header, week rows, and cells without a
page-level `.ghost-theme`. Rows use seven equal CSS grid columns shared with the
muted weekday header; today, selected, range, hover, focus-visible,
unavailable, and outside-month days have distinct styles, including forced
colors; cells and navigation reach 44px touch targets where space allows.
Themed previous/next buttons default to decorative CSS chevrons (accessible
names unchanged), and the themed date picker calendar uses the same themed
header parts.
