#!/usr/bin/env node
/**
 * `ghostvue-mcp` executable. Delegates to the stub until the stdio server
 * lands; setting `exitCode` (not calling `process.exit`) lets stderr flush.
 */
import { runStub } from './index.js'

process.exitCode = runStub(process.stderr)
