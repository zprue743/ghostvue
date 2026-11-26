/**
 * `unplugin-vue-components` resolver for headless GhostVue components, published
 * as `@ghostvue/vue/resolver`.
 *
 * This entry runs in build tooling (Vite, webpack, Rollup config), not in the
 * browser bundle. It deliberately imports nothing from Vue or the component
 * graph, and never imports `unplugin-vue-components` (only an optional peer of
 * `@ghostvue/vue`, declared for its supported range): the returned object
 * matches the plugin's resolver contract structurally, so consumers who never
 * auto-import pay nothing for it.
 *
 * Only headless components resolve here, always to `@ghostvue/vue`. Themed
 * wrappers live in the optional `@ghostvue/themes` package, which this package
 * must never depend on or name (docs/architecture/package-boundaries.md), so a
 * themed opt-in belongs in an integration that may depend on themes, such as
 * `@ghostvue/nuxt`.
 */
import { ghostVueComponentNames } from './.registries/component-names.generated'

/** Package that every name resolved by {@link GhostVueResolver} imports from. */
export type GhostVueResolverSource = '@ghostvue/vue'

/**
 * Import instruction for one auto-imported component. Structurally compatible
 * with `ComponentInfo` from `unplugin-vue-components`: the plugin emits
 * `import { <name> } from '<from>'`.
 */
export interface GhostVueResolvedComponent {
  /** Named export to import, identical to the requested component name. */
  readonly name: string
  /** Package the named export comes from. */
  readonly from: GhostVueResolverSource
}

/**
 * Component resolver object accepted by `Components({ resolvers: [...] })`.
 * Structurally compatible with `ComponentResolverObject` from
 * `unplugin-vue-components`.
 */
export interface GhostVueComponentResolver {
  /** Resolves template component names, never directives. */
  readonly type: 'component'
  /**
   * Returns the import for a PascalCase `Ghost*` component exported by
   * `@ghostvue/vue`, or `undefined` so other resolvers and the template
   * compiler's unknown-component warning handle every other name.
   */
  readonly resolve: (name: string) => GhostVueResolvedComponent | undefined
}

/**
 * Creates an `unplugin-vue-components` resolver for headless `Ghost*` components.
 *
 * Names resolve only when `@ghostvue/vue` exports a component with that exact
 * PascalCase name (the plugin normalizes kebab-case template tags first), so an
 * application component that merely shares the `Ghost` prefix is never
 * rewritten into a broken import. The list is generated from the same registry
 * metadata as the package entry, not maintained by hand.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import Components from 'unplugin-vue-components/vite'
 * import { GhostVueResolver } from '@ghostvue/vue/resolver'
 *
 * export default defineConfig({
 *   plugins: [vue(), Components({ resolvers: [GhostVueResolver()] })],
 * })
 * ```
 */
export function GhostVueResolver(): GhostVueComponentResolver {
  // One Set per resolver keeps lookups O(1) for every template tag the plugin
  // visits without sharing mutable state between plugin instances.
  const components = new Set(ghostVueComponentNames)
  return {
    type: 'component',
    resolve: (name) =>
      components.has(name) ? { name, from: '@ghostvue/vue' } : undefined,
  }
}
