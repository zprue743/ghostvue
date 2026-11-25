const AI_AGENTS_GUIDE = 'docs/tooling/ai-agents.md'

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/
const INLINE_CODE = /(?<!`)(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`)/g

const EXECUTABLE_PATTERNS = [
  /<script(?:\s[^>]*)?>/i,
  /<style(?:\s[^>]*)?>/i,
  /<template(?:\s[^>]*)?>/i,
  /<[A-Z][A-Za-z0-9]*(?=[\s/>])/,
  /^\s*<<<\s+/m,
  /<!--\s*@include:/,
  /\{\{[\s\S]*?\}\}/,
]

/**
 * Strip fenced code blocks and inline code spans so prose mentions of Vue tags
 * or syntax (e.g. `` `<script setup>` `` or ```vue examples) are not treated
 * as executable page code.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function stripMarkdownCode(markdown) {
  const lines = markdown.split(/\r?\n/)
  const outside = []
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0

  for (const line of lines) {
    if (!inFence) {
      const openMatch = FENCE_OPEN.exec(line)
      if (openMatch) {
        const marker = openMatch[1]
        const info = openMatch[2] ?? ''
        // CommonMark: backtick info strings cannot contain backticks.
        if (marker[0] !== '`' || !info.includes('`')) {
          inFence = true
          fenceChar = marker[0]
          fenceLength = marker.length
          continue
        }
      }
      outside.push(line.replace(INLINE_CODE, ''))
      continue
    }

    const closePattern = new RegExp(
      `^ {0,3}${fenceChar}{${String(fenceLength)},}[ \\t]*$`,
    )
    if (closePattern.test(line)) {
      inFence = false
    }
  }

  return outside.join('\n')
}

/**
 * Returns true if the Markdown source contains live Vue/VitePress blocks
 * (such as `<script setup>`, `<style>`, `<GhostExample />`, `{{ ... }}`,
 * or `<<<` snippet includes) outside of code fences and inline code spans.
 *
 * @param {string | null | undefined} markdown
 * @returns {boolean}
 */
export function isExecutableMarkdown(markdown) {
  if (!markdown) return false
  const prose = stripMarkdownCode(markdown)
  return EXECUTABLE_PATTERNS.some((pattern) => pattern.test(prose))
}

/**
 * @param {string} file
 * @param {{
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} [options]
 * @returns {boolean}
 */
export function isHeavySkipEligible(file, options = {}) {
  // The AI agents guide's snippets are executed by `pnpm agents-guide` and
  // tests/integration/ai-agents-guide*.test.ts, so prose edits there must
  // still run verification.
  if (file === AI_AGENTS_GUIDE) return false
  if (file === 'AGENTS.md') return true
  if (file.startsWith('.cursor/')) return true
  if (/^docs\/.*\.md$/u.test(file)) {
    const baseContent = options.readAtBase?.(file) ?? null
    const headContent = options.readAtHead?.(file) ?? null
    return (
      !isExecutableMarkdown(baseContent) && !isExecutableMarkdown(headContent)
    )
  }
  return false
}

const NUXT_TRIGGER_PATTERNS = [
  /^packages\/(?:nuxt|vue|themes|core|shared)\//u,
  /^apps\/nuxt-fixture\//u,
  /^scripts\//u,
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|playwright\.nuxt\.config\.ts)$/u,
  /^\.github\/workflows\/ci\.yml$/u,
]

const CROSS_BROWSER_TRIGGER_PATTERNS = [
  /^packages\/(?:vue|themes|core|shared)\//u,
  /^apps\/playground\//u,
  /^tests\/support\//u,
  /^tests\/e2e\/(?!docs-|examples)/u,
  /^(?:playwright\.config\.ts|package\.json|pnpm-lock\.yaml)$/u,
  /^\.github\/workflows\/ci\.yml$/u,
]

const NODE24_TRIGGER_PATTERNS = [
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|vitest\.config\.ts)$/u,
  /^\.github\/workflows\/ci\.yml$/u,
]

const FULL_SCAFFOLD_TRIGGER_PATTERNS = [
  /^scripts\/(?:lib\/)?(?:new-component|verify-component)/u,
  /^tests\/integration\/new-component\.test\.ts$/u,
]

const DOCS_ONLY_E2E_PATTERNS = [
  /^docs\//u,
  /^apps\/docs\//u,
  /^examples\//u,
  /^tests\/e2e\/(?:docs-|examples)/u,
  /^(?:AGENTS\.md|CLAUDE\.md)$/u,
  /^\.cursor\//u,
  /^\.changeset\//u,
]

/**
 * @param {string[]} files
 * @param {readonly RegExp[]} patterns
 * @returns {boolean}
 */
function matchesAny(files, patterns) {
  return files.some((file) => patterns.some((pattern) => pattern.test(file)))
}

/**
 * Classify a CI diff to determine whether heavy verify/browser jobs can be
 * skipped and which optional partitions or E2E subsets a pull request needs.
 *
 * @param {{
 *   eventName: string
 *   files: string[]
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} params
 * @returns {{
 *   skipHeavy: boolean
 *   runNuxt: boolean
 *   runCrossBrowser: boolean
 *   runNode24: boolean
 *   runFullScaffold: boolean
 *   e2eScope: 'docs' | 'full'
 *   files: string[]
 * }}
 */
export function classifyChangedPaths({
  eventName,
  files,
  readAtBase,
  readAtHead,
}) {
  const isPullRequest = eventName === 'pull_request'
  const isScheduled = eventName === 'schedule'
  const isFullRunEvent =
    eventName === 'push' ||
    eventName === 'merge_group' ||
    isScheduled ||
    files.length === 0

  const skipHeavy =
    isPullRequest &&
    files.length > 0 &&
    files.every((file) => isHeavySkipEligible(file, { readAtBase, readAtHead }))

  const runNuxt = isFullRunEvent || matchesAny(files, NUXT_TRIGGER_PATTERNS)
  const runCrossBrowser =
    isFullRunEvent || matchesAny(files, CROSS_BROWSER_TRIGGER_PATTERNS)
  const runNode24 = isFullRunEvent || matchesAny(files, NODE24_TRIGGER_PATTERNS)
  const runFullScaffold =
    isScheduled || matchesAny(files, FULL_SCAFFOLD_TRIGGER_PATTERNS)
  const e2eScope =
    isPullRequest &&
    files.length > 0 &&
    files.every((file) =>
      DOCS_ONLY_E2E_PATTERNS.some((pattern) => pattern.test(file)),
    )
      ? 'docs'
      : 'full'

  return {
    skipHeavy,
    runNuxt,
    runCrossBrowser,
    runNode24,
    runFullScaffold,
    e2eScope,
    files,
  }
}
