/**
 * Public entry point for `@ghostvue/eslint-plugin`: manifest-based usage rules
 * for GhostVue components in Vue templates.
 */
import type { ESLint, Linter, Rule } from 'eslint'

import { noUndeclaredVModel } from './rules/no-undeclared-v-model.js'
import { noUnknownProps } from './rules/no-unknown-props.js'
import { noUnknownSlots } from './rules/no-unknown-slots.js'

/** Rules keyed by name, without the plugin namespace. */
export const rules = {
  'no-unknown-props': noUnknownProps,
  'no-unknown-slots': noUnknownSlots,
  'no-undeclared-v-model': noUndeclaredVModel,
} satisfies Record<string, Rule.RuleModule>

/**
 * The plugin object for flat config. Register it under the `ghostvue`
 * namespace (`plugins: { ghostvue }`) so rule ids match the docs and the
 * recommended config.
 */
export interface GhostVueEslintPlugin extends ESLint.Plugin {
  meta: { name: string }
  rules: typeof rules
  configs: {
    /**
     * Enables every rule as an error for `**\/*.vue`. Does not set a parser:
     * combine it with eslint-plugin-vue's flat configs, which install
     * vue-eslint-parser for `.vue` files.
     */
    recommended: Linter.Config
  }
}

const recommended: Linter.Config = {
  name: 'ghostvue/recommended',
  files: ['**/*.vue'],
  rules: {
    'ghostvue/no-unknown-props': 'error',
    'ghostvue/no-unknown-slots': 'error',
    'ghostvue/no-undeclared-v-model': 'error',
  },
}

const plugin: GhostVueEslintPlugin = {
  meta: { name: '@ghostvue/eslint-plugin' },
  rules,
  configs: { recommended },
}

// The recommended config references the plugin object itself, so it is
// attached after construction instead of in the literal above.
recommended.plugins = { ghostvue: plugin }

export default plugin
