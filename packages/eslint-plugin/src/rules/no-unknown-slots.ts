import type { Rule } from 'eslint'
import type { AST } from 'vue-eslint-parser'

import { componentDocsUrl } from '../component-index.js'
import {
  createGhostTemplateVisitor,
  formatNames,
  staticArgument,
} from '../template.js'
import { ruleDocsUrl } from './docs-url.js'

function slotDirective(element: AST.VElement): AST.VDirective | undefined {
  for (const attribute of element.startTag.attributes) {
    if (attribute.directive && attribute.key.name.name === 'slot') {
      return attribute
    }
  }
  return undefined
}

/** Content that Vue passes to the implicit default slot. */
function isImplicitDefaultContent(
  child: AST.VElement | AST.VText | AST.VExpressionContainer,
): boolean {
  if (child.type === 'VText') return child.value.trim() !== ''
  if (child.type === 'VExpressionContainer') return true
  return !(child.rawName === 'template' && slotDirective(child))
}

/**
 * Reports slot content passed to a resolved GhostVue component under a name
 * its manifest does not declare: `#name` / `v-slot:name` on a child
 * `<template>` or on the component itself, and implicit default content when
 * the component has no default slot. Dynamic names (`#[name]`) are skipped,
 * and slot props are left to vue-tsc.
 */
export const noUnknownSlots: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow slot content for slots a GhostVue component does not declare',
      recommended: true,
      url: ruleDocsUrl('no-unknown-slots'),
    },
    schema: [],
    messages: {
      unknownSlot:
        "{{component}} from {{packageName}} has no '{{slot}}' slot. Declared slots: {{slots}}. See {{docs}}",
    },
  },
  create(context) {
    return createGhostTemplateVisitor(context, (element, component) => {
      const declared = component.contract.slots
      // Data-driven slot names (one per column id) are left to vue-tsc.
      if (declared === null) return
      const slots = new Set(declared)
      const report = (loc: AST.LocationRange, slot: string) => {
        context.report({
          loc,
          messageId: 'unknownSlot',
          data: {
            component: component.name,
            packageName: component.packageName,
            slot,
            slots: formatNames(declared),
            docs: componentDocsUrl(component.contract),
          },
        })
      }
      const check = (directive: AST.VDirective) => {
        const argument = staticArgument(directive)
        if (argument === undefined) return
        const slot = argument ?? 'default'
        if (!slots.has(slot)) report(directive.key.loc, slot)
      }

      const ownDirective = slotDirective(element)
      if (ownDirective) {
        // `<Comp #name>`: the children are that slot's content.
        check(ownDirective)
        return
      }

      let reportedDefault = false
      for (const child of element.children) {
        if (child.type === 'VElement' && child.rawName === 'template') {
          const directive = slotDirective(child)
          if (directive) {
            check(directive)
            continue
          }
        }
        if (
          !reportedDefault &&
          !slots.has('default') &&
          isImplicitDefaultContent(child)
        ) {
          reportedDefault = true
          report(child.loc, 'default')
        }
      }
    })
  },
}
