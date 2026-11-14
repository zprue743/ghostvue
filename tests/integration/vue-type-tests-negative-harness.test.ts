/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseVueTscErrorLines } from '../../scripts/lib/vue-type-tests-negative-diagnostics.js'

const repositoryRoot = process.cwd()
const harnessScript = join(
  repositoryRoot,
  'scripts/vue-type-tests-negative.mjs',
)

describe('vue-type-tests-negative harness', () => {
  it('parses vue-tsc diagnostic lines', () => {
    const output = [
      "type-tests-negative/invalid-model-value.ts(9,3): error TS2322: Type 'number' is not assignable to type 'string'.",
      '  The file is in the program because:',
    ].join('\n')

    expect(parseVueTscErrorLines(output)).toEqual([
      {
        file: 'type-tests-negative/invalid-model-value.ts',
        line: '9',
        code: 'TS2322',
        message: "Type 'number' is not assignable to type 'string'.",
      },
    ])
  })

  it('fails when vue-tsc succeeds on a clean temp fixture', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'ghostvue-negative-harness-'))
    const tsconfigPath = join(tempDir, 'tsconfig.harness-smoke.json')

    try {
      await writeFile(
        join(tempDir, 'valid.ts'),
        "const value: string = 'ok'\nvoid value\n",
        'utf8',
      )
      await writeFile(
        tsconfigPath,
        JSON.stringify(
          {
            extends: join(repositoryRoot, 'tsconfig.base.json'),
            compilerOptions: {
              noEmit: true,
              rootDir: '.',
            },
            include: ['valid.ts'],
          },
          null,
          2,
        ),
        'utf8',
      )

      let exitedNonZero = false
      try {
        execFileSync('node', [harnessScript, tsconfigPath], {
          stdio: 'pipe',
          encoding: 'utf8',
        })
      } catch (error) {
        const execError =
          /** @type {Error & { status?: number, stderr?: string, stdout?: string }} */ error
        exitedNonZero = execError.status !== 0
        const combinedOutput = [
          typeof execError.stdout === 'string' ? execError.stdout : '',
          typeof execError.stderr === 'string' ? execError.stderr : '',
        ].join('')
        expect(combinedOutput).toContain('expected to fail vue-tsc but passed')
      }

      expect(exitedNonZero).toBe(true)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
