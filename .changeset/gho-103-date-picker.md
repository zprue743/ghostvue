---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add `GhostDatePicker` (GHO-103): a headless date-entry and selection family
(`GhostDatePicker`, `GhostDatePickerInput`, `GhostDatePickerTrigger`,
`GhostDatePickerContent`, `GhostDatePickerCalendar`, and `useGhostDatePicker`)
following the APG Date Picker Dialog pattern. Single dates and inclusive
ranges use `CalendarDate` values with strict ISO `YYYY-MM-DD` typed entry by
default, consumer `parse` / `format` callbacks, drafts that never replace the
committed value, atomic two-activation calendar ranges, an anchored modal
calendar built on `GhostDialogContent` and `useFloating`, native form
serialization (`name`, `name[start]` / `name[end]`), constraint validation,
and reset. `@ghostvue/themes` adds matching themed wrappers and CSS. Adds the
`GHOST004` development diagnostic for a throwing `format` callback. No new
runtime dependency.
