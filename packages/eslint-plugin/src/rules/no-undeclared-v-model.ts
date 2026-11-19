import type { Rule } from 'eslint'

import { componentDocsUrl } from '../component-index.js'
import { camelize } from '../native-attributes.js'
import {
  createGhostTemplateVisitor,
  formatNames,
  staticArgument,
} from '../template.js'
import { ruleDocsUrl } from './docs-url.js'

/**
 * Reports `v-model` / `v-model:name` on a resolved GhostVue component when the
 * manifest declares no model for that prop. Dynamic arguments
 * (`v-model:[name]`) are skipped; modifiers and value types are not checked.
 */
export const noUndeclaredVModel: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow v-model bindings that a GhostVue component does not declare',
      recommended: true,
      url: ruleDocsUrl('no-undeclared-v-model'),
    },
    schema: [],
    messages: {
      undeclaredModel:
        "{{component}} from {{packageName}} does not declare {{directive}} (model prop '{{prop}}'). Declared models: {{models}}. See {{docs}}",
    },
  },
  create(context) {
    return createGhostTemplateVisitor(context, (element, component) => {
      const models = new Set(component.contract.models)
      for (const attribute of element.startTag.attributes) {
        if (!attribute.directive || attribute.key.name.name !== 'model') {
          continue
        }
        const argument = staticArgument(attribute)
        if (argument === undefined) continue
        // Vue camelizes the v-model argument when matching it to a prop.
        const prop = argument === null ? 'modelValue' : camelize(argument)
        if (models.has(prop)) continue

        context.report({
          loc: attribute.key.loc,
          messageId: 'undeclaredModel',
          data: {
            component: component.name,
            packageName: component.packageName,
            directive: argument === null ? 'v-model' : `v-model:${argument}`,
            prop,
            models: formatNames(component.contract.models),
            docs: componentDocsUrl(component.contract),
          },
        })
      }
    })
  },
}
