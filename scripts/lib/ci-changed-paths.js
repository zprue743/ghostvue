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

/**
 * Classify a CI diff to determine whether heavy verify/browser jobs can be skipped.
 *
 * @param {{
 *   eventName: string
 *   files: string[]
 *   readAtBase?: (file: string) => string | null
 *   readAtHead?: (file: string) => string | null
 * }} params
 * @returns {{ skipHeavy: boolean, files: string[] }}
 */
export function classifyChangedPaths({
  eventName,
  files,
  readAtBase,
  readAtHead,
}) {
  const skipHeavy =
    eventName !== 'push' &&
    files.length > 0 &&
    files.every((file) => isHeavySkipEligible(file, { readAtBase, readAtHead }))

  return { skipHeavy, files }
}
