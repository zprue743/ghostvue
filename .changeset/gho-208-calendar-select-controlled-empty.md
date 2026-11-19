---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
---

Add a `select(date: CalendarDate)` event to `GhostCalendar` and an `onSelect` option to `useGhostCalendar`. It fires once per accepted date activation, after `update:modelValue`, including repeated activation of the same date; disabled, unavailable, and outside-month activations emit nothing. `modelValue` (prop and composable option) now also accepts `null` as a controlled empty selection: `undefined` stays uncontrolled, `defaultValue` is ignored while `null`, and slots, the returned `modelValue`, and emitted payloads still report empty as `undefined`. The themed `GhostCalendar` forwards both. Existing output types, default-value behavior, and `update:modelValue` proposals are unchanged.
