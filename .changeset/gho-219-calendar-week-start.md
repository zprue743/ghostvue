---
'@ghostvue/vue': patch
---

Fix `GhostCalendar` week alignment: the month grid now starts on the locale's
first weekday (or `weekStartsOn`) instead of the 1st of the month, so June 1,
2024 lands under Saturday in `en-US` and leading/trailing adjacent-month days
fill the first and last weeks. Week start ids passed to
`@internationalized/date` were `'sunday'`-style names it does not recognize;
they are now `'sun'`…`'sat'`, which also fixes Home/End with an explicit
`weekStartsOn`. Calendar parts now merge a consumer `class` with their part
class instead of replacing it, and the today cell carries `aria-current="date"`.
