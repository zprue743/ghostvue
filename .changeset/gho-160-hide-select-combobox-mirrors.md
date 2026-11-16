---
'@ghostvue/vue': patch
---

Apply inline visually-hidden styles to `GhostSelect` and `GhostCombobox` form
mirror inputs and the `GhostCombobox` live-region announcer so they remain
visually hidden without consumer CSS while preserving native constraint
validation, `FormData`, `reset`, external `form` association, and live-region
announcements.
