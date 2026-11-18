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
]
