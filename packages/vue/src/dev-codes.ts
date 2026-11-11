export type SlopCodeLevel = 'warn' | 'error'

export interface SlopCodeEntry {
  readonly level: SlopCodeLevel
  readonly title: string
  /**
   * Runtime message. `{name}` placeholders are replaced by `logSlopCode`
   * replacements; unknown placeholders are left unchanged.
   */
  readonly message: string
  /** Markdown path relative to `docs/warnings.md`. */
  readonly relatedDocs?: string
}

export interface RetiredSlopCodeEntry {
  readonly reason: string
}

/**
 * Canonical public URL for the diagnostic catalog. Console messages link here
 * until a hosted docs origin exists.
 */
export const SLOP_CODE_DOCS_URL =
  'https://github.com/zprue743/slop-ui/blob/master/docs/warnings.md'

/**
 * Assigned development diagnostic codes. Keys are stable public identifiers and
 * must never be reused. Retire a code in `retiredSlopCodes` instead of deleting
 * it.
 */
export const slopCodes = {
  SLOP001: {
    level: 'warn',
    title: 'Controlled and uncontrolled state mixed',
    message:
      'A component switched from {from} to {to}. Pass the value prop for the lifetime of the instance, or omit it and use default*.',
    relatedDocs: './architecture/component-state.md',
  },
} as const satisfies Record<string, SlopCodeEntry>

/**
 * Formerly assigned codes. Kept so the number cannot be given to a new meaning.
 */
export const retiredSlopCodes: Readonly<Record<string, RetiredSlopCodeEntry>> =
  {}

export type SlopCode = keyof typeof slopCodes

export function slopCodeDocsUrl(code: SlopCode): string {
  return `${SLOP_CODE_DOCS_URL}#${code.toLowerCase()}`
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g

export function formatSlopCodeMessage(
  code: SlopCode,
  replacements: Readonly<Record<string, string>> = {},
): string {
  const message = slopCodes[code].message.replace(
    PLACEHOLDER,
    (placeholder, name: string) => replacements[name] ?? placeholder,
  )
  return `[slop-ui ${code}] ${message} See ${slopCodeDocsUrl(code)}`
}

function emitSlopDiagnostic(level: SlopCodeLevel, formatted: string): void {
  if (level === 'error') {
    console.error(formatted)
    return
  }
  console.warn(formatted)
}

/**
 * Emits a coded diagnostic. Callers must wrap this in
 * `process.env.NODE_ENV !== 'production'` so consumer bundlers can strip both
 * the call and these strings. `import.meta.env.DEV` would be baked by the
 * library build.
 */
export function logSlopCode(
  code: SlopCode,
  replacements: Readonly<Record<string, string>> = {},
): void {
  emitSlopDiagnostic(
    slopCodes[code].level,
    formatSlopCodeMessage(code, replacements),
  )
}
