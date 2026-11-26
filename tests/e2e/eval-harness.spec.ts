import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { runEval } from '../../scripts/lib/eval/runner.js'

test.describe('Agent eval harness browser grading', () => {
  test('grades all 5 reference tasks in Chromium (behavior, keyboard, per-state axe, and unreviewed visual evidence)', async ({
    browser,
  }) => {
    const outDir = await mkdtemp(join(tmpdir(), 'ghostvue-eval-e2e-'))
    try {
      const { report, runDir } = await runEval({
        provider: 'mock',
        mockProfile: 'reference',
        conditions: ['docs+mcp'],
        outDir,
        runId: 'e2e-reference-check',
        skipTypecheck: true,
        ensureMcpBuilt: true,
        browser,
      })

      expect(report.trials).toHaveLength(5)

      for (const trial of report.trials) {
        expect(
          trial.grading.constraints.status,
          `${trial.taskId} constraints`,
        ).toBe('passed')
        expect(trial.grading.eslint.status, `${trial.taskId} eslint`).toBe(
          'passed',
        )
        expect(trial.grading.build.status, `${trial.taskId} build`).toBe(
          'passed',
        )

        expect(
          trial.grading.behavior.counts.failed,
          `${trial.taskId} behavior failed`,
        ).toBe(0)
        expect(
          trial.grading.behavior.counts.passed,
          `${trial.taskId} behavior passed`,
        ).toBeGreaterThan(0)

        expect(
          trial.grading.keyboard.counts.failed,
          `${trial.taskId} keyboard failed`,
        ).toBe(0)
        expect(
          trial.grading.keyboard.counts.passed,
          `${trial.taskId} keyboard passed`,
        ).toBeGreaterThan(0)

        expect(trial.grading.axe.counts.failed, `${trial.taskId} axe`).toBe(0)
        expect(
          trial.grading.axe.counts.passed,
          `${trial.taskId} axe states`,
        ).toBeGreaterThan(0)

        expect(
          trial.grading.visual.capturedCount,
          `${trial.taskId} visual screenshots`,
        ).toBeGreaterThan(0)
        for (const artifact of trial.grading.visual.artifacts) {
          expect(artifact.status).toBe('captured-pending-human-review')
          expect(artifact.reviewed).toBe(false)
          expect(artifact.humanAssessment).toBe('unreviewed')
          expect(artifact.artifactPath).toBeTruthy()
          if (artifact.artifactPath) {
            expect(existsSync(join(runDir, artifact.artifactPath))).toBe(true)
          }
        }
      }
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })
})
