import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('ghost-avatar theme css', () => {
  it('styles avatars only under ghost theme scopes', async () => {
    const css = await readFile(
      resolve('packages/themes/src/ghost-avatar.css'),
      'utf8',
    )

    expect(css).toContain('.ghost-theme .ghost-avatar')
    expect(css).toContain('.ghost-themed-scope .ghost-avatar')
    expect(css).not.toMatch(/--ghost-avatar-[a-z]/)
  })
})
