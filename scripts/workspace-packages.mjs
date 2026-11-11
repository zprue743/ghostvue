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
    name: '@slop-ui/shared',
    responsibility: 'Proven framework-neutral low-level utilities.',
    allowedDependencies: [],
  },
  {
    directory: 'core',
    name: '@slop-ui/core',
    responsibility: 'Framework-independent behavior and contracts.',
    allowedDependencies: ['@slop-ui/shared'],
  },
  {
    directory: 'vue',
    name: '@slop-ui/vue',
    responsibility: 'Vue lifecycle, reactivity, composables, and components.',
    allowedDependencies: ['@slop-ui/core', '@slop-ui/shared'],
  },
  {
    directory: 'themes',
    name: '@slop-ui/themes',
    responsibility: 'Optional theme and design-token infrastructure.',
    allowedDependencies: [],
  },
]
