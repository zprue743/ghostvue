---
'@ghostvue/vue': patch
'@ghostvue/mcp': patch
---

Declare third-party runtime dependencies with caret ranges instead of exact versions, so apps can dedupe them and take patch releases: `@floating-ui/dom` `^1.8.0` and `@internationalized/date` `^3.12.4` in `@ghostvue/vue`; `@modelcontextprotocol/sdk` `^1.32.2`, `ajv` `^8.20.0` and `zod` `^4.6.7` in `@ghostvue/mcp`. `@ghostvue/vue` also declares `unplugin-vue-components` `^32.0.0` as an optional peer for `@ghostvue/vue/resolver`; it is not installed unless you add it.
