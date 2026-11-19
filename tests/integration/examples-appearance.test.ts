/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ghostExamples, ghostExampleSourcePath } from '../../examples/registry'

const repositoryRoot = process.cwd()

function exampleSource(id: string): string {
  return readFileSync(join(repositoryRoot, ghostExampleSourcePath(id)), 'utf8')
}

function exampleTemplate(id: string): string {
  return /<template>([\s\S]*)<\/template>/.exec(exampleSource(id))?.[1] ?? ''
}

const themesImport = /from\s+'@ghostvue\/themes'/

describe('executable example appearance', () => {
  it.each(ghostExamples.map((example) => [example.id, example.layer]))(
    '%s registry layer (%s) matches its package import',
    (id, layer) => {
      // The docs badge, playground, and manifests trust `layer`; a themed
      // label on a headless import shows an unstyled demo as "Themed".
      expect(themesImport.test(exampleSource(id))).toBe(layer === 'themed')
    },
  )

  it.each(ghostExamples.map((example) => [example.id]))(
    '%s does not pin a color mode or theme',
    (id) => {
      // Inline demos must follow the docs/site appearance, and portaled
      // content (tooltips, hover cards) inherits from <html>, not the demo.
      // A local data-ghost-mode / data-ghost-theme splits the two and paints
      // a light island in dark mode.
      const template = exampleTemplate(id)
      expect(template).not.toMatch(/\bdata-ghost-mode\b/)
      expect(template).not.toMatch(/\bdata-ghost-theme\b/)
    },
  )

  it.each([
    'accordion/themed',
    'collapsible/themed',
    'empty-state/themed',
    'hover-card/themed',
    'tooltip/themed',
    'scroll-area/themed',
  ])('%s inherits the site token host instead of painting its own', (id) => {
    // `.ghost-theme` re-hosts default-theme tokens and paints a surface, which
    // ignores the selected flagship and diverges from portaled content.
    expect(exampleTemplate(id)).not.toMatch(/\bghost-theme\b/)
  })
})
