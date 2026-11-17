---
'@ghostvue/vue': patch
---

Fix `GhostNumberInput` and `useGhostNumberInput` draft parsing to use `Intl.NumberFormat.formatToParts` across `decimal`, `currency`, `percent`, and `unit` styles (`notation: 'standard'`), scaling percent drafts, normalizing localized digits and bidi/sign/affix literals, and rejecting malformed locale grouping.
