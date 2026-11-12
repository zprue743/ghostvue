export type GhostCodeLevel = 'warn' | 'error'

export interface GhostCodeEntry {
  readonly level: GhostCodeLevel
  readonly title: string
  /**
   * Runtime message. `{name}` placeholders are replaced by `logGhostCode`
   * replacements; unknown placeholders are left unchanged.
   */
  readonly message: string
  /** Markdown path relative to `docs/warnings.md`. */
  readonly relatedDocs?: string
}

export interface RetiredGhostCodeEntry {
  readonly reason: string
}

/**
 * Canonical public URL for the diagnostic catalog. Console messages link here
 * until a hosted docs origin exists.
 */
export const GHOST_CODE_DOCS_URL =
  'https://github.com/zprue743/slop-ui/blob/master/docs/warnings.md'

/**
 * Assigned development diagnostic codes. Keys are stable public identifiers and
 * must never be reused. Retire a code in `retiredGhostCodes` instead of deleting
 * it.
 */
export const ghostCodes = {
  GHOST001: {
    level: 'warn',
    title: 'Controlled and uncontrolled state mixed',
    message:
      'A component switched from {from} to {to}. Pass the value prop for the lifetime of the instance, or omit it and use default*.',
    relatedDocs: './architecture/component-state.md',
  },
} as const satisfies Record<string, GhostCodeEntry>

/**
 * Formerly assigned codes. Kept so the number cannot be given to a new meaning.
 */
export const retiredGhostCodes: Readonly<
  Record<string, RetiredGhostCodeEntry>
> = {}

export type GhostCode = keyof typeof ghostCodes

export function ghostCodeDocsUrl(code: GhostCode): string {
  return `${GHOST_CODE_DOCS_URL}#${code.toLowerCase()}`
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g

export function formatGhostCodeMessage(
  code: GhostCode,
  replacements: Readonly<Record<string, string>> = {},
): string {
  const message = ghostCodes[code].message.replace(
    PLACEHOLDER,
    (placeholder, name: string) => replacements[name] ?? placeholder,
  )
  return `[ghostvue ${code}] ${message} See ${ghostCodeDocsUrl(code)}`
}

function emitGhostDiagnostic(level: GhostCodeLevel, formatted: string): void {
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
export function logGhostCode(
  code: GhostCode,
  replacements: Readonly<Record<string, string>> = {},
): void {
  emitGhostDiagnostic(
    ghostCodes[code].level,
    formatGhostCodeMessage(code, replacements),
  )
}
