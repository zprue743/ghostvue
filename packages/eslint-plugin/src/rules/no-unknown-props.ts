import type { Rule } from 'eslint'
import type { AST } from 'vue-eslint-parser'

import { componentDocsUrl } from '../component-index.js'
import { camelize, isAllowedNonPropAttribute } from '../native-attributes.js'
import { createGhostTemplateVisitor, formatNames } from '../template.js'
import { ruleDocsUrl } from './docs-url.js'

function hasBoundArgument(element: AST.VElement, name: string): boolean {
  return element.startTag.attributes.some(
    (attribute) =>
      attribute.directive &&
      attribute.key.name.name === 'bind' &&
      attribute.key.argument?.type === 'VIdentifier' &&
      attribute.key.argument.rawName === name,
  )
}

/**
 * Reports a static attribute or `v-bind:name` on a resolved GhostVue component
 * when the name is neither a manifest prop nor an attribute that falls through
 * natively. Object spreads (`v-bind="attrs"`), dynamic arguments
 * (`:[name]`), and `.prop`/`.attr` bindings are skipped because they carry no
 * static prop name, and so is an element with a bound polymorphic `:as`.
 * Value types are left to vue-tsc.
 */
export const noUnknownProps: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow attributes on GhostVue components that are neither declared props nor native, ARIA, or data attributes',
      recommended: true,
      url: ruleDocsUrl('no-unknown-props'),
    },
    schema: [],
    messages: {
      unknownProp:
        "'{{name}}' is not a prop of {{component}} from {{packageName}} and is not a native, ARIA, or data attribute. Declared props: {{props}}. See {{docs}}",
    },
  },
  create(context) {
    return createGhostTemplateVisitor(context, (element, component) => {
      const props = new Set(component.contract.props)
      // A bound polymorphic `:as` may render another component (for example
      // RouterLink) that receives the fallthrough attributes as its own props,
      // so no attribute on this element is evidence of a mistake.
      if (props.has('as') && hasBoundArgument(element, 'as')) return
      for (const attribute of element.startTag.attributes) {
        let name: string
        if (attribute.directive) {
          const key = attribute.key
          if (key.name.name !== 'bind') continue
          if (key.argument?.type !== 'VIdentifier') continue
          if (
            key.modifiers.some(
              (modifier) =>
                modifier.name === 'prop' || modifier.name === 'attr',
            )
          ) {
            continue
          }
          name = key.argument.rawName
        } else {
          name = attribute.key.rawName
        }

        // Vue normalizes `max-value` and `maxValue` to the same prop key.
        if (props.has(name) || props.has(camelize(name))) continue
        if (isAllowedNonPropAttribute(name)) continue

        context.report({
          loc: attribute.key.loc,
          messageId: 'unknownProp',
          data: {
            name,
            component: component.name,
            packageName: component.packageName,
            props: formatNames(component.contract.props),
            docs: componentDocsUrl(component.contract),
          },
        })
      }
    })
  },
}
