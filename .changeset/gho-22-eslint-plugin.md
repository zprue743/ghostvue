---
'@ghostvue/eslint-plugin': minor
---

Add `@ghostvue/eslint-plugin` with three manifest-based template rules for `.vue` files: `ghostvue/no-unknown-props`, `ghostvue/no-unknown-slots`, and `ghostvue/no-undeclared-v-model`. They check only components imported from `@ghostvue/vue` or `@ghostvue/themes` in `<script setup>`, honor aliases and the headless/themed contract of the import, allow native, ARIA, and data attributes, and skip dynamic bindings. Enable them with `ghostvue.configs.recommended` next to eslint-plugin-vue.
