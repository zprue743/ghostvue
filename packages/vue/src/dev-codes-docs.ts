import {
  retiredGhostCodes,
  ghostCodes,
  type GhostCode,
  type GhostCodeEntry,
} from './dev-codes'

export function renderGhostCodeDocs(): string {
  const lines = [
    '<!-- Generated from packages/vue/src/dev-codes.ts. Do not edit by hand. -->',
    '',
    '# Development diagnostic codes',
    '',
    'GhostVue reports API misuse in development with stable `GHOST0xx` codes.',
    'Each code is assigned once and is never reused, including after a warning',
    'is removed. Production builds should not contain these strings: the library',
    "ships `process.env.NODE_ENV !== 'production'` so the consumer bundler can",
    'dead-code-eliminate the diagnostic.',
    '',
    'Console format:',
    '',
    '```text',
    '[ghostvue GHOST001] <message> See <docs url>',
    '```',
    '',
    'This page is generated from `packages/vue/src/dev-codes.ts`.',
    'Update the catalog, then rewrite this file from `renderGhostCodeDocs()`.',
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

  const retired = Object.entries(retiredGhostCodes)
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

function catalogEntries(): readonly (readonly [GhostCode, GhostCodeEntry])[] {
  return Object.entries(ghostCodes) as readonly (readonly [
    GhostCode,
    GhostCodeEntry,
  ])[]
}
