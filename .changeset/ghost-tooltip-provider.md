---
'@ghostvue/vue': minor
---

Add `GhostTooltipProvider` so adjacent tooltips can skip the open delay when moving between triggers within `skipDelayDuration`, following Radix/APG timing guidance. Per-root `delayDuration` still overrides the provider default; keyboard focus timing is unchanged.
