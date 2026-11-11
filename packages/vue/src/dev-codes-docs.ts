import {
  retiredSlopCodes,
  slopCodes,
  type SlopCode,
  type SlopCodeEntry,
} from './dev-codes'

export function renderSlopCodeDocs(): string {
  const lines = [
    '<!-- Generated from packages/vue/src/dev-codes.ts. Do not edit by hand. -->',
    '',
    '# Development diagnostic codes',
    '',
    'slop-ui reports API misuse in development with stable `SLOP0xx` codes.',
    'Each code is assigned once and is never reused, including after a warning',
    'is removed. Production builds should not contain these strings: the library',
    "ships `process.env.NODE_ENV !== 'production'` so the consumer bundler can",
    'dead-code-eliminate the diagnostic.',
    '',
    'Console format:',
    '',
    '```text',
    '[slop-ui SLOP001] <message> See <docs url>',
    '```',
    '',
    'This page is generated from `packages/vue/src/dev-codes.ts`.',
    'Update the catalog, then rewrite this file from `renderSlopCodeDocs()`.',
    '',
  ]

  for (const [code, entry] of catalogEntries()) {
    const levelLabel = entry.level === 'error' ? 'Error' : 'Warning'
    lines.push(`## ${code}`, '')
    lines.push(`**${levelLabel}:** ${entry.title}`, '')
    lines.push(entry.message, '')
    if (entry.relatedDocs) {
      lines.push(`Related: [${entry.relatedDocs}](${entry.relatedDocs})`, '')
    }
  }

  const retired = Object.entries(retiredSlopCodes)
  if (retired.length > 0) {
    lines.push('## Retired codes', '')
    lines.push('These numbers remain reserved and must not be reassigned.', '')
    for (const [code, entry] of retired) {
      lines.push(`- **${code}** — ${entry.reason}`)
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

function catalogEntries(): readonly (readonly [SlopCode, SlopCodeEntry])[] {
  return Object.entries(slopCodes) as readonly (readonly [
    SlopCode,
    SlopCodeEntry,
  ])[]
}
