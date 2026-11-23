#!/usr/bin/env node
/**
 * `ghostvue-mcp` executable. Setting `exitCode` (rather than calling
 * `process.exit`) lets pending stdout frames and stderr diagnostics flush.
 */
import { runCli } from './cli.js'

process.exitCode = await runCli({
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
})
