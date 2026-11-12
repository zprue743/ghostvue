/** @vitest-environment node */

import { glob } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ghostExamples } from '../../examples/registry'
import {
  componentExamplePrefix,
  validateExampleManifests,
} from '../../scripts/lib/component-manifests.js'

const repositoryRoot = process.cwd()

async function exampleFileIds(): Promise<string[]> {
  const ids: string[] = []
  for await (const file of glob('*/*.vue', {
    cwd: join(repositoryRoot, 'examples'),
  })) {
    ids.push(file.replaceAll('\\', '/').replace(/\.vue$/, ''))
  }
  return ids.sort()
}

describe('executable examples', () => {
  it('keeps the registry, files, and manifests in lockstep', async () => {
    const fileIds = await exampleFileIds()
    const registryIds = ghostExamples.map((example) => example.id).sort()

    expect(fileIds.length).toBeGreaterThan(0)
    expect(registryIds).toEqual(fileIds)
    expect(new Set(registryIds).size).toBe(registryIds.length)

    const violations = await validateExampleManifests(repositoryRoot)
    expect(violations).toEqual([])
  })

  it('derives GhostButton example prefixes from the public name', () => {
    expect(componentExamplePrefix('GhostButton')).toBe('button')
    expect(componentExamplePrefix('GhostInteractiveSurface')).toBe(
      'interactive-surface',
    )
    expect(componentExamplePrefix('GhostVisuallyHidden')).toBe(
      'visually-hidden',
    )
  })
})
