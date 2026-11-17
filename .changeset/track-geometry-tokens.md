---
'@ghostvue/themes': patch
---

Give themed `GhostProgress` and `GhostSlider` nonzero, density-independent geometry. New semantic tokens `--ghost-track-thickness-sm|md|lg` (4 / 6 / 8px), `--ghost-track-thumb-sm|md|lg` (12 / 16 / 20px), and `--ghost-track-target` (24px minimum hit size) replace the `--ghost-space-gap-*` layout gaps these recipes used, which collapsed small Progress to zero under compact density (including Calm's unset default). Slider track and range now share one centered thickness, and transparent hit areas keep track and thumb pointer targets at least 24px without changing layout or focus rings.
