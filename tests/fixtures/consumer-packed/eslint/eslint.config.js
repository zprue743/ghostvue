import ghostvue from '@ghostvue/eslint-plugin'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  ghostvue.configs.recommended,
]
