---
'@ghostvue/vue': minor
---

Add `useGhostDataTableServerRequest()`, the stale-response guard for server-mode
DataTable fetches (GHO-239). Call `begin(payload.requestId)` at the start of a
`stateChange` handler and gate every response write, including the `finally`
that clears `loading`, with `isLatest(requestId)`, so out-of-order responses and
stale `finally` blocks cannot overwrite rows, totals, errors, or the spinner of a
newer request. `retry()` re-emits the current query with a fresh `requestId` and
works with the same guard. Also exports `UseGhostDataTableServerRequestReturn`.
