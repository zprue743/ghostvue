---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

The themed `GhostBreadcrumbEllipsis` now opens its collapsed segments in an
opaque, layered popover panel instead of transparent text over the page. The
headless part forwards consumer attributes (`class`, `style`, `data-*`) to its
host instead of dropping them, and mirrors `data-themed` onto the trigger and
the body-portaled content so theme rules can reach them. The themed trigger is
now styled (it previously kept browser button chrome), and trail items use
`--ghost-space-gap-sm` so separators keep visible spacing in compact densities.
