import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('workspace metadata', () => {
  it('keeps the Vue runtime external to the published Vue package', async () => {
    const packageJson = JSON.parse(
      await readFile(
        resolve(process.cwd(), 'packages/vue/package.json'),
        'utf8',
      ),
    ) as { peerDependencies?: Record<string, string> }

    // This protects consumers from accidentally receiving a duplicate Vue
    // runtime, which would break identity-sensitive reactivity behavior.
    expect(packageJson.peerDependencies?.['vue']).toBeDefined()
  })

  it('keeps Cursor from reading node_modules and env files', async () => {
    const cursorignore = await readFile(
      resolve(process.cwd(), '.cursorignore'),
      'utf8',
    )

    // .cursorignore is the hard block. Lockfiles and generated outputs stay
    // readable via .cursorindexingignore because tests and reviews open them.
    expect(cursorignore).toMatch(/node_modules/)
    expect(cursorignore).toMatch(/\.env/)
  })
})
