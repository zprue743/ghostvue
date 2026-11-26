/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { landingProgressionStages } from '../../apps/docs/.vitepress/theme/landing-progression'
import { ghostExampleSourcePath } from '../../examples/registry'

const repositoryRoot = process.cwd()

function exampleSource(id: string): string {
  return readFileSync(join(repositoryRoot, ghostExampleSourcePath(id)), 'utf8')
}

/**
 * Badges must match real markup and script, not comments that merely mention an
 * API.
 */
function exampleSourceWithoutComments(source: string): string {
  let withoutHtmlComments = source
  // Repeat until stable so nested comment markers cannot survive one pass.
  for (let pass = 0; pass < 16; pass += 1) {
    const next = withoutHtmlComments.replace(/<!--[\s\S]*?-->/g, '')
    if (next === withoutHtmlComments) break
    withoutHtmlComments = next
  }

  let withoutBlockComments = withoutHtmlComments
  for (let pass = 0; pass < 16; pass += 1) {
    const next = withoutBlockComments.replace(/\/\*[\s\S]*?\*\//g, '')
    if (next === withoutBlockComments) break
    withoutBlockComments = next
  }

  return withoutBlockComments.replace(/(^|\s)\/\/.*$/gm, '$1')
}

describe('docs landing progression examples', () => {
  it.each(landingProgressionStages.map((stage) => [stage.sourceId, stage]))(
    '%s source exposes the API named on its tab',
    (_id, stage) => {
      const source = exampleSourceWithoutComments(exampleSource(stage.sourceId))
      for (const pattern of stage.sourceMustMatch) {
        expect(source).toMatch(pattern)
      }
    },
  )

  it('keeps four progression tabs in order', () => {
    expect(landingProgressionStages).toHaveLength(4)
    expect(landingProgressionStages.map((stage) => stage.id)).toEqual([
      'props',
      'controlled',
      'slots',
      'composable',
    ])
  })
})
