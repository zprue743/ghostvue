/**
 * Executable catalog of publishable workspace packages.
 *
 * Package-boundary checks, package `AGENTS.md` adapters, and the human
 * architecture docs stay aligned by reading this list instead of restating the
 * graph. Allowed edges match `docs/architecture/package-boundaries.md`.
 */
export const workspacePackages = [
  {
    directory: 'shared',
    name: '@ghostvue/shared',
    responsibility: 'Proven framework-neutral low-level utilities.',
    allowedDependencies: [],
  },
  {
    directory: 'core',
    name: '@ghostvue/core',
    responsibility: 'Framework-independent behavior and contracts.',
    allowedDependencies: ['@ghostvue/shared'],
  },
  {
    directory: 'vue',
    name: '@ghostvue/vue',
    responsibility: 'Vue lifecycle, reactivity, composables, and components.',
    allowedDependencies: ['@ghostvue/core', '@ghostvue/shared'],
  },
  {
    directory: 'themes',
    name: '@ghostvue/themes',
    responsibility: 'Optional theme and design-token infrastructure.',
    allowedDependencies: ['@ghostvue/vue'],
  },
  {
    directory: 'nuxt',
    name: '@ghostvue/nuxt',
    responsibility:
      'Optional Nuxt module: auto-imports headless components by default; themed wrappers and theme CSS on explicit opt-in.',
    allowedDependencies: ['@ghostvue/vue', '@ghostvue/themes'],
  },
  {
    directory: 'eslint-plugin',
    name: '@ghostvue/eslint-plugin',
    responsibility:
      'Node-only ESLint rules that check GhostVue component usage against manifests.',
    // Component contracts are compiled from packages/{vue,themes}/manifests at
    // registries:write time, so there is no runtime or source import edge.
    allowedDependencies: [],
  },
  {
    directory: 'mcp',
    name: '@ghostvue/mcp',
    responsibility:
      'Node-only MCP stdio server: read-only discovery over bundled manifests, examples, docs, and tokens.',
    allowedDependencies: ['@ghostvue/core'], // @ghostvue/* only; npm: sdk, zod, ajv per GHO-17 plan §7
    // Component, example, docs, and token data are copied into the package at
    // build time (GHO-17 plan §4), so the server must never load a Vue
    // runtime. These names are rejected in every dependency group, including
    // the external `vue` package that `allowedDependencies` cannot express.
    forbiddenDependencies: ['vue', '@ghostvue/vue', '@ghostvue/themes'],
  },
]
