/**
 * Internal `accept` matcher for {@link GhostFileUpload}. Private to
 * `@ghostvue/vue` until a second consumer proves a need (see the spec's
 * Composition section).
 *
 * The matcher is client-side UX only: `file.type` and `file.name` come from
 * the operating system and the user, so a match is not a guarantee about the
 * file's real content.
 */

/** One parsed, valid `accept` token. Values are lowercased. */
export type GhostFileUploadAcceptToken =
  | { kind: 'extension'; value: string }
  | { kind: 'wildcard'; value: string }
  | { kind: 'mime'; value: string }

// `type/subtype` with no whitespace or extra slashes. Parameters are not valid
// in `accept`, matching the browser, so `text/plain;charset=utf-8` is ignored.
const MIME_TOKEN = /^[^\s/;,]+\/[^\s/;,]+$/

/**
 * Parses native `accept` grammar into valid tokens. Tokens are comma-separated,
 * trimmed, and lowercased; empty and invalid tokens are dropped, matching how
 * browsers ignore them in the picker. An empty result means "accept everything".
 */
export function parseGhostFileUploadAccept(
  accept: string | undefined,
): GhostFileUploadAcceptToken[] {
  if (!accept) {
    return []
  }
  const tokens: GhostFileUploadAcceptToken[] = []
  for (const raw of accept.split(',')) {
    const token = raw.trim().toLowerCase()
    if (token.length === 0) {
      continue
    }
    if (token.startsWith('.')) {
      // A bare "." names no extension; native pickers ignore it too.
      if (token.length > 1) {
        tokens.push({ kind: 'extension', value: token })
      }
      continue
    }
    if (!MIME_TOKEN.test(token)) {
      continue
    }
    if (token.endsWith('/*')) {
      // `*/*` is not part of the native grammar for `accept`; treat the
      // wildcard only for a concrete top-level type.
      const top = token.slice(0, -1)
      if (top !== '*/') {
        tokens.push({ kind: 'wildcard', value: top })
      }
      continue
    }
    if (token.includes('*')) {
      continue
    }
    tokens.push({ kind: 'mime', value: token })
  }
  return tokens
}

/**
 * Whether `file` satisfies at least one token. An empty token list accepts
 * every file. An empty `file.type` (unknown to the operating system) matches
 * extension tokens only: the matcher never guesses a MIME type.
 */
export function matchesGhostFileUploadAccept(
  file: Pick<File, 'name' | 'type'>,
  tokens: readonly GhostFileUploadAcceptToken[],
): boolean {
  if (tokens.length === 0) {
    return true
  }
  const name = file.name.toLowerCase()
  // MIME parameters (`;charset=…`) never take part in the comparison.
  const type = (file.type.split(';')[0] ?? '').trim().toLowerCase()
  return tokens.some((token) => {
    switch (token.kind) {
      case 'extension':
        return name.endsWith(token.value)
      case 'wildcard':
        return type.length > 0 && type.startsWith(token.value)
      case 'mime':
        return type.length > 0 && type === token.value
    }
  })
}
