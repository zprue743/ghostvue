---
'@ghostvue/themes': patch
---

Scope GhostAccordion theme styles to themed instances. The themed root and item wrappers now add `data-themed`, and `ghost-accordion.css` no longer matches the headless `data-ghost-accordion` / `data-ghost-accordion-value` behavior hooks, so loading `default.css` leaves unstyled `@ghostvue/vue` accordions unstyled. Accordions inside `.ghost-theme` or `.ghost-themed-scope` are styled as before.
