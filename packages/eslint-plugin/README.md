# @ghostvue/eslint-plugin

ESLint rules that check `Ghost*` component usage in Vue templates against the
GhostVue component manifests:

- `ghostvue/no-unknown-props`
- `ghostvue/no-unknown-slots`
- `ghostvue/no-undeclared-v-model`

## Install

```bash
pnpm add -D @ghostvue/eslint-plugin eslint eslint-plugin-vue
```

ESLint `^9.0.0 || ^10.0.0` and `vue-eslint-parser` `^10.0.0` are peer
dependencies; eslint-plugin-vue's flat configs set up the parser.

## Usage

```js
// eslint.config.js
import ghostvue from '@ghostvue/eslint-plugin'
import vue from 'eslint-plugin-vue'

export default [
  ...vue.configs['flat/recommended'],
  ghostvue.configs.recommended,
]
```

`configs.recommended` enables all three rules as errors for `**/*.vue`.

## Documentation

[ghostvue.dev](https://ghostvue.dev): see
[ESLint plugin](https://ghostvue.dev/tooling/eslint-plugin) for rule details.
