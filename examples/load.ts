import type { Component } from 'vue'

/**
 * Vite glob of every example SFC and its raw source. Keys are
 * `./<component>/<example>.vue`. Docs and the playground both import this
 * module so the file list cannot drift between those hosts.
 */
export const exampleModules = import.meta.glob<{ default: Component }>(
  './*/*.vue',
)

export const exampleSources = import.meta.glob<string>('./*/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function exampleFileKey(id: string): `./${string}.vue` {
  return `./${id}.vue`
}

export function exampleLoader(
  id: string,
): (() => Promise<{ default: Component }>) | undefined {
  return exampleModules[exampleFileKey(id)]
}

export function exampleSource(id: string): string | undefined {
  return exampleSources[exampleFileKey(id)]
}

export function exampleIdsFromModules(): string[] {
  return Object.keys(exampleModules)
    .map((key) => key.replace(/^\.\//, '').replace(/\.vue$/, ''))
    .sort()
}
