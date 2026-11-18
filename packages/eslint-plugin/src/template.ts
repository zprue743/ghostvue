import type { Rule } from 'eslint'
import type { AST } from 'vue-eslint-parser'

import {
  type GhostComponentContract,
  type GhostComponentPackage,
  isGhostComponentPackage,
  lookupComponentContract,
} from './component-index.js'
import { camelize } from './native-attributes.js'

/** A template element whose tag statically resolves to a GhostVue export. */
export interface ResolvedGhostComponent {
  /** Exported component name, independent of the local alias. */
  readonly name: string
  readonly packageName: GhostComponentPackage
  readonly contract: GhostComponentContract
}

type ElementHandler = (
  element: AST.VElement,
  component: ResolvedGhostComponent,
) => void

/**
 * The subset of vue-eslint-parser's parser services the rules use. Declared
 * locally so the plugin has no runtime import of the parser; the consumer's
 * config supplies it (eslint-plugin-vue's flat configs already do).
 */
interface VueParserServices {
  defineTemplateBodyVisitor(templateVisitor: {
    VElement: (element: AST.VElement) => void
  }): Rule.RuleListener
  getDocumentFragment(): AST.VDocumentFragment | null
}

function isVueParserServices(services: unknown): services is VueParserServices {
  if (typeof services !== 'object' || services === null) return false
  return (
    'defineTemplateBodyVisitor' in services &&
    typeof services.defineTemplateBodyVisitor === 'function' &&
    'getDocumentFragment' in services &&
    typeof services.getDocumentFragment === 'function'
  )
}

interface ImportedBinding {
  readonly packageName: GhostComponentPackage
  readonly exportName: string
}

interface TemplateBindings {
  readonly named: ReadonlyMap<string, ImportedBinding>
  readonly namespaces: ReadonlyMap<string, GhostComponentPackage>
}

const NO_BINDINGS: TemplateBindings = {
  named: new Map(),
  namespaces: new Map(),
}

function hasScriptSetup(fragment: AST.VDocumentFragment | null): boolean {
  return (fragment?.children ?? []).some(
    (child) =>
      child.type === 'VElement' &&
      child.name === 'script' &&
      child.startTag.attributes.some(
        (attribute) => !attribute.directive && attribute.key.name === 'setup',
      ),
  )
}

/**
 * Template-visible imports from GhostVue packages. Only `<script setup>`
 * exposes imports to the template; Options API `components` registration and
 * global `app.component` registration are not resolved, so those tags stay
 * unchecked rather than guessed.
 */
function collectBindings(
  program: Rule.RuleContext['sourceCode']['ast'],
  fragment: AST.VDocumentFragment | null,
): TemplateBindings {
  if (!hasScriptSetup(fragment)) return NO_BINDINGS

  const named = new Map<string, ImportedBinding>()
  const namespaces = new Map<string, GhostComponentPackage>()
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue
    const source = statement.source.value
    if (typeof source !== 'string' || !isGhostComponentPackage(source)) continue
    // `import type` (a typescript-eslint extension of ESTree) cannot bind a
    // runtime component.
    if (isTypeOnly(statement)) continue

    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        namespaces.set(specifier.local.name, source)
      } else if (
        specifier.type === 'ImportSpecifier' &&
        !isTypeOnly(specifier)
      ) {
        const exportName =
          specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : String(specifier.imported.value)
        named.set(specifier.local.name, { packageName: source, exportName })
      }
    }
  }
  return { named, namespaces }
}

function isTypeOnly(node: object): boolean {
  return 'importKind' in node && node.importKind === 'type'
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Resolve a tag the way Vue's `<script setup>` compiler does: the raw tag,
 * then camelCase, then PascalCase (`ghost-button` -> `GhostButton`), or a
 * namespace member (`<G.GhostButton>`). Lowercase tags without a hyphen are
 * native elements to Vue's compiler before any binding lookup, so they are
 * never treated as components.
 */
function resolveTag(
  rawName: string,
  bindings: TemplateBindings,
): ImportedBinding | undefined {
  const dot = rawName.indexOf('.')
  if (dot > 0) {
    const packageName = bindings.namespaces.get(rawName.slice(0, dot))
    return packageName
      ? { packageName, exportName: rawName.slice(dot + 1) }
      : undefined
  }
  if (/^[a-z][a-z0-9]*$/.test(rawName)) return undefined

  const camel = camelize(rawName)
  return (
    bindings.named.get(rawName) ??
    bindings.named.get(camel) ??
    bindings.named.get(capitalize(camel))
  )
}

/**
 * Shared rule scaffold: visits every template element that resolves to a
 * GhostVue component with a manifest and hands it to `handler`. Everything
 * else (native elements, unresolved tags, exports without a manifest,
 * `<component :is>`) is skipped, because a diagnostic requires positive
 * evidence.
 */
export function createGhostTemplateVisitor(
  context: Rule.RuleContext,
  handler: ElementHandler,
): Rule.RuleListener {
  const services: unknown = context.sourceCode.parserServices
  if (!isVueParserServices(services)) {
    // Mirrors eslint-plugin-vue: a `.vue` file without vue-eslint-parser would
    // otherwise pass silently with every rule disabled in effect.
    if (context.filename.endsWith('.vue')) {
      return {
        Program() {
          context.report({
            loc: { line: 1, column: 0 },
            message:
              'GhostVue rules need vue-eslint-parser for .vue files. Use eslint-plugin-vue flat configs or set languageOptions.parser to vue-eslint-parser.',
          })
        },
      }
    }
    return {}
  }

  let bindings: TemplateBindings | undefined
  return services.defineTemplateBodyVisitor({
    VElement(element) {
      // Template traversal runs after the script body is parsed, so the
      // import list is complete the first time an element is visited.
      bindings ??= collectBindings(
        context.sourceCode.ast,
        services.getDocumentFragment(),
      )
      const binding = resolveTag(element.rawName, bindings)
      if (!binding) return
      const contract = lookupComponentContract(
        binding.packageName,
        binding.exportName,
      )
      if (!contract) return
      handler(element, {
        name: binding.exportName,
        packageName: binding.packageName,
        contract,
      })
    },
  })
}

/**
 * Directive argument: `null` when absent (`v-model`, `v-slot`), the raw name
 * when static (`v-model:open`), and `undefined` when dynamic (`#[name]`), which
 * callers must skip.
 */
export function staticArgument(
  directive: AST.VDirective,
): string | null | undefined {
  const argument = directive.key.argument
  if (argument === null) return null
  return argument.type === 'VIdentifier' ? argument.rawName : undefined
}

/** Comma-separated list for messages, or a stand-in when empty. */
export function formatNames(names: readonly string[]): string {
  return names.length > 0 ? names.join(', ') : '(none)'
}
