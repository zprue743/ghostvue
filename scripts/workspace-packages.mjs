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
]
