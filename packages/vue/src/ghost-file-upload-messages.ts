import type {
  GhostFileUploadMessages,
  GhostFileUploadRejectionContext,
} from './ghost-file-upload'

/**
 * Internal English defaults for {@link GhostFileUploadMessages}. Formatting
 * callbacks own pluralization so translations never concatenate fragments.
 * Private to `@ghostvue/vue`; consumers override keys through `messages`.
 */

// Decimal (SI) steps, matching how operating systems label sizes in pickers.
const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/**
 * Formats a byte count for `{limit}`, for example `5 MB` or `1.5 kB`, with
 * `Intl.NumberFormat('en', { style: 'unit', unitDisplay: 'short',
 * maximumFractionDigits: 1 })`.
 */
export function formatGhostFileUploadSize(bytes: number): string {
  let unitIndex = 0
  let value = bytes
  while (value >= 1000 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1000
    unitIndex += 1
  }
  return new Intl.NumberFormat('en', {
    style: 'unit',
    unit: SIZE_UNITS[unitIndex],
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value)
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

// Terminal punctuation that already ends a sentence in a custom code.
const TERMINAL_PUNCTUATION = /[.!?…。！？]$/u

function rejected(rejection: GhostFileUploadRejectionContext): string {
  const name = rejection.file.name
  switch (rejection.reason) {
    case 'file-type':
      return `${name} was not added: this file type is not accepted.`
    case 'file-too-large':
      return `${name} was not added: it is larger than ${formatGhostFileUploadSize(rejection.maxFileSize ?? 0)}.`
    case 'too-many-files': {
      const max = rejection.maxFiles ?? 0
      return `${name} was not added: the limit of ${plural(max, '1 file', `${String(max)} files`)} has been reached.`
    }
    case 'custom': {
      const code = (rejection.code ?? '').trim()
      if (code.length === 0) {
        return `${name} was not added.`
      }
      return `${name} was not added: ${code}${TERMINAL_PUNCTUATION.test(code) ? '' : '.'}`
    }
  }
}

/** English defaults for every {@link GhostFileUploadMessages} key. */
export const ghostFileUploadDefaultMessages: GhostFileUploadMessages =
  /* @__PURE__ */ Object.freeze({
    added: (count: number) =>
      plural(count, '1 file added.', `${String(count)} files added.`),
    removed: (file: File, remaining: number) =>
      `${file.name} removed. ${
        remaining === 0
          ? 'No files remaining.'
          : plural(
              remaining,
              '1 file remaining.',
              `${String(remaining)} files remaining.`,
            )
      }`,
    cleared: () => 'All files removed.',
    rejected,
    rejectedSummary: (count: number) =>
      `${String(count)} files were not added.`,
    removeLabel: (file: File) => `Remove ${file.name}`,
  })

/**
 * Resolves one message key against consumer overrides at call time, so a
 * reactive `messages` object updates later announcements without caching.
 */
export function resolveGhostFileUploadMessage<
  Key extends keyof GhostFileUploadMessages,
>(
  overrides: Partial<GhostFileUploadMessages> | undefined,
  key: Key,
): GhostFileUploadMessages[Key] {
  return overrides?.[key] ?? ghostFileUploadDefaultMessages[key]
}
