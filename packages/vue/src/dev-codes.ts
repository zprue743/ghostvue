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
  'https://github.com/zprue743/ghostvue/blob/master/docs/warnings.md'

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
  GHOST002: {
    level: 'warn',
    title: 'Dialog content missing accessible name',
    message:
      'GhostDialogContent and GhostDrawerContent require an accessible name. Render GhostDialogTitle or GhostDrawerTitle inside the content, or pass aria-label or aria-labelledby.',
    relatedDocs: './components/dialog.md',
  },
  GHOST003: {
    level: 'warn',
    title: 'Alert dialog missing description',
    message:
      'GhostDialogContent or GhostDrawerContent with role="alertdialog" should provide a description. Render GhostDialogDescription or GhostDrawerDescription inside the content, or pass aria-describedby.',
    relatedDocs: './components/dialog.md',
  },
  GHOST004: {
    level: 'warn',
    title: 'DatePicker format callback threw',
    message:
      'The GhostDatePicker format callback threw for {date}. The input shows the ISO YYYY-MM-DD text instead. Make format synchronous, pure, and total for valid CalendarDate values.',
    relatedDocs: './components/date-picker.md',
  },
  GHOST005: {
    level: 'warn',
    title: 'Deprecated API used',
    message:
      '{api} is deprecated since {since} and will be removed in {removal}. {migration}',
    relatedDocs: './standards/component-stability.md',
  },
  GHOST006: {
    level: 'warn',
    title: 'Toast created during server rendering',
    message:
      'toast() ran during server-side rendering and was ignored. The server never queues toasts; call toast() from client code such as onMounted or an event handler.',
    relatedDocs: './components/toast.md',
  },
  GHOST007: {
    level: 'warn',
    title: 'Toast duration ignored',
    message:
      'duration is ignored on toast "{id}" because {reason} toasts persist until dismissed. Remove duration, or make the toast informational.',
    relatedDocs: './components/toast.md',
  },
  GHOST008: {
    level: 'warn',
    title: 'Invalid toast option',
    message:
      '{option} {value} is invalid; expected {expected}. Using {fallback} instead.',
    relatedDocs: './components/toast.md',
  },
  GHOST009: {
    level: 'warn',
    title: 'Toast id uses the reserved prefix',
    message:
      'Toast id "{id}" starts with the generated-id prefix "{prefix}". It is treated as an update of an existing toast only; omit id for a generated one or choose another explicit id.',
    relatedDocs: './components/toast.md',
  },
  GHOST010: {
    level: 'warn',
    title: 'Many toasts waiting',
    message:
      '{count} toasts are waiting behind the visible stack. Check for runaway toast() calls, and reuse an id to update a toast in place.',
    relatedDocs: './components/toast.md',
  },
  GHOST011: {
    level: 'warn',
    title: 'Toast without a title',
    message:
      'toast() and update() need a non-empty title. The {call} call was ignored.',
    relatedDocs: './components/toast.md',
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

/**
 * One deprecation notice. Every field is consumer-facing text in the GHOST005
 * message, so `migration` names the replacement and how to move to it.
 */
export interface GhostDeprecation {
  /** The deprecated API, e.g. `GhostFoo prop "size"` or `GhostFoo`. */
  readonly api: string
  /** Package version that first deprecated it, e.g. `0.4.0`. */
  readonly since: string
  /**
   * Earliest release that may remove it: a minor before 1.0 and a major from
   * 1.0 onward, at least one minor release and 30 days after `since`.
   */
  readonly removal: string
  /** Replacement and migration steps. */
  readonly migration: string
}

// Module-level on purpose: a deprecated prop used in a list would otherwise
// warn once per instance and bury other diagnostics. On the server this means
// once per process, which is still enough to surface the notice in logs.
const reportedDeprecations = new Set<string>()

/**
 * Reports deprecated API use with GHOST005, once per `api` per JavaScript
 * realm. This is the only sanctioned deprecation warning; see
 * docs/standards/component-stability.md. Callers must wrap it in
 * `process.env.NODE_ENV !== 'production'` like `logGhostCode`.
 */
export function warnGhostDeprecation(deprecation: GhostDeprecation): void {
  if (reportedDeprecations.has(deprecation.api)) return
  reportedDeprecations.add(deprecation.api)
  logGhostCode('GHOST005', {
    api: deprecation.api,
    since: deprecation.since,
    removal: deprecation.removal,
    migration: deprecation.migration,
  })
}
