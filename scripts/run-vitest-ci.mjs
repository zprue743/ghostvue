#!/usr/bin/env node
import { execPackageManagerSync } from './lib/package-manager.js'
import {
  ciBuildCoveredIntegrationTestFiles,
  heavyIntegrationTestFiles,
} from './ci-heavy-integration-tests.mjs'

const [mode, ...extraArgs] = process.argv.slice(2)

if (mode !== 'integration-heavy' && mode !== 'unit-exclude') {
  throw new Error(
    'Usage: node scripts/run-vitest-ci.mjs <integration-heavy|unit-exclude> [...vitestArgs]',
  )
}

const selectionArgs =
  mode === 'integration-heavy'
    ? heavyIntegrationTestFiles
    : [
        ...heavyIntegrationTestFiles,
        ...ciBuildCoveredIntegrationTestFiles,
      ].flatMap((file) => ['--exclude', file])

try {
  execPackageManagerSync(
    'pnpm',
    ['exec', 'vitest', 'run', ...extraArgs, ...selectionArgs],
    { stdio: 'inherit' },
  )
} catch (error) {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    process.exit(error.status)
  }
  throw error
}
