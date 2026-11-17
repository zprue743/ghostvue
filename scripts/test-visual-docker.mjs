#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

import { buildVisualDockerArgs } from './lib/test-visual-docker.js'

try {
  execFileSync('docker', buildVisualDockerArgs(), { stdio: 'inherit' })
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
