#!/usr/bin/env node
import { heavyIntegrationTestFiles } from './ci-heavy-integration-tests.mjs'

const mode = process.argv[2]
if (mode === 'integration-heavy') {
  process.stdout.write(heavyIntegrationTestFiles.join(' '))
  process.exit(0)
}
if (mode === 'unit-exclude') {
  for (const file of heavyIntegrationTestFiles) {
    process.stdout.write(` --exclude ${JSON.stringify(file)}`)
  }
  process.exit(0)
}

throw new Error(
  `Usage: node scripts/vitest-ci-args.mjs <integration-heavy|unit-exclude>`,
)
