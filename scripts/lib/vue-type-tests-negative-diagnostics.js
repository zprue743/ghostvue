const diagnosticLine = /^(.+)\((\d+),\d+\): error (TS\d+): (.+)$/u

/**
 * @param {string} output
 * @returns {{ file: string, line: string, code: string, message: string }[]}
 */
export function parseVueTscErrorLines(output) {
  const diagnostics = []
  for (const line of output.split(/\r?\n/u)) {
    const match = diagnosticLine.exec(line.trimEnd())
    if (match) {
      const [, file, lineNumber, code, message] = match
      diagnostics.push({ file, line: lineNumber, code, message })
    }
  }
  return diagnostics
}
