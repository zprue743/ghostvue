import type { ComponentManifest } from './component-manifests.js'

export type ReferenceManifest = Omit<
  ComponentManifest,
  'source' | 'styling' | 'examples'
> & {
  source: 'generated' | 'handwritten'
  styling: {
    parts: { name: string; description: string }[]
    states: { name: string; description: string }[]
    cssProperties: { name: string; description: string }[]
  }
  examples: string[]
}

export function manifestToMarkdown(manifest: ReferenceManifest): string
export function writeComponentReferences(repositoryRoot: string): Promise<void>
