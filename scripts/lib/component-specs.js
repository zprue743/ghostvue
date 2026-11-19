/**
 * Parses and validates YAML frontmatter in `docs/components/*-spec.md`.
 *
 * Keeps frontmatter focused on component identity, spec approval status,
 * required-section applicability, manifest references, and unresolved
 * questions. Detailed behavior stays in markdown prose; APG/keyboard/state
 * contracts and source-derived API types stay in component manifests.
 */
import { access, glob, readFile } from 'node:fs/promises'
import { basename, join, posix } from 'node:path'

export const CURRENT_SPEC_SCHEMA_VERSION = '1.0.0'

export const SPEC_STATUSES = [
  'draft',
  'proposed',
  'submitted',
  'pending-review',
  'approved',
]

export const REQUIRED_SECTION_KEYS = [
  'purpose',
  'nonGoals',
  'publicApi',
  'stateModel',
  'consumerData',
  'accessibility',
  'rendering',
  'environment',
  'performance',
  'composition',
  'testPlan',
  'documentationPlan',
  'compatibility',
]

export const SECTION_HEADING_ALIASES = {
  purpose: ['purpose and user problems', 'purpose'],
  nonGoals: ['non-goals'],
  publicApi: ['public api'],
  stateModel: ['state model', 'behavior'],
  consumerData: ['consumer data'],
  accessibility: ['accessibility contract'],
  rendering: ['rendering and customization'],
  environment: ['environment behavior'],
  performance: ['performance'],
  composition: ['composition'],
  testPlan: ['test plan'],
  documentationPlan: ['documentation plan'],
  compatibility: ['compatibility and release impact', 'compatibility'],
}

const FORBIDDEN_DUPLICATE_KEYS = [
  'apgPattern',
  'keyboard',
  'requiredAriaAttributes',
  'role',
  'states',
  'parts',
  'cssProperties',
  'props',
  'models',
  'events',
  'slots',
  'exposed',
]

const PLACEHOLDER_PATTERNS = [
  /\b(?:TODO|TBD|FIXME)\b/,
  /What does this component enable, and for whom\?/i,
  /What related behavior is deliberately outside this component\?/i,
  /List names, types, defaults, invariants, and interaction between options\./i,
  /Define values, update timing, controlled\/uncontrolled behavior, and reset rules\./i,
  /Describe states and valid transitions, including controlled versus uncontrolled/i,
  /Document assumed shapes, property\/nested-path access, typed accessors/i,
  /Define native elements, roles, names, descriptions, states, and relationships\./i,
  /Define simple configuration, callbacks, slots\/rendering, lower-level primitives/i,
  /Define deterministic markup, browser-only behavior, and hydration concerns\./i,
  /Define expected data scale, complexity constraints, measurement approach/i,
  /List existing primitives\/capabilities reused and explain any intentional/i,
  /List API reference, ordinary examples, advanced examples, accessibility guidance/i,
  /Identify public contracts, potential breaking changes, deprecation\/migration/i,
]

const COMPONENT_NAME_PATTERN = /^Ghost[A-Z][A-Za-z0-9]*$/
const MANIFEST_PATH_PATTERN =
  /^packages\/(?:vue|themes)\/manifests\/[a-z0-9-]+\.manifest\.json$/

function stripYamlComment(line) {
  let quote = null
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote) {
      if (char === quote && line[index - 1] !== '\\') quote = null
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index)
    }
  }
  return line
}

function parseYamlScalar(raw) {
  const trimmed = raw.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null' || trimmed === '~') return null
  if (trimmed === '[]') return []
  if (trimmed === '{}') return {}
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1)
    return trimmed.startsWith('"')
      ? inner
          .replaceAll('\\"', '"')
          .replaceAll('\\\\', '\\')
          .replaceAll('\\n', '\n')
      : inner.replaceAll("''", "'")
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

function splitKeyValue(trimmedLine) {
  const colonIndex = trimmedLine.indexOf(':')
  if (colonIndex <= 0) return null
  const key = trimmedLine.slice(0, colonIndex).trim()
  const rest = trimmedLine.slice(colonIndex + 1).trim()
  if (!key) return null
  return { key, rest }
}

/**
 * Minimal deterministic YAML parser for component spec frontmatter.
 * Supports nested maps, block sequences, inline `[]`/`{}`, and quoted strings.
 */
export function parseSimpleYaml(source) {
  const lines = source.split(/\r?\n/)
  const tokens = []
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const cleaned = stripYamlComment(lines[lineNumber])
    if (!cleaned.trim()) continue
    const indentMatch = cleaned.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0
    tokens.push({
      indent,
      text: cleaned.trim(),
      lineNumber: lineNumber + 1,
    })
  }

  let cursor = 0

  function parseNode(expectedIndent) {
    if (cursor >= tokens.length) return {}
    const current = tokens[cursor]
    if (current.text.startsWith('- ') || current.text === '-') {
      return parseSequence(current.indent)
    }
    return parseMapping(expectedIndent)
  }

  function parseSequence(baseIndent) {
    const items = []
    while (cursor < tokens.length) {
      const token = tokens[cursor]
      if (token.indent < baseIndent) break
      if (token.indent > baseIndent) {
        throw new Error(
          `Unexpected indentation in YAML list at line ${String(token.lineNumber)}`,
        )
      }
      if (!(token.text.startsWith('- ') || token.text === '-')) break

      const afterDash = token.text.slice(1).trim()
      cursor += 1

      if (!afterDash) {
        if (cursor < tokens.length && tokens[cursor].indent > baseIndent) {
          items.push(parseNode(tokens[cursor].indent))
        } else {
          items.push(null)
        }
        continue
      }

      const kv = splitKeyValue(afterDash)
      if (kv && !afterDash.startsWith("'") && !afterDash.startsWith('"')) {
        const entry = {}
        if (kv.rest === '') {
          if (
            cursor < tokens.length &&
            tokens[cursor].indent > baseIndent + 1
          ) {
            entry[kv.key] = parseNode(tokens[cursor].indent)
          } else {
            entry[kv.key] = null
          }
        } else {
          entry[kv.key] = parseYamlScalar(kv.rest)
        }
        if (cursor < tokens.length && tokens[cursor].indent > baseIndent) {
          const childIndent = tokens[cursor].indent
          const restMap = parseMapping(childIndent)
          Object.assign(entry, restMap)
        }
        items.push(entry)
        continue
      }

      items.push(parseYamlScalar(afterDash))
    }
    return items
  }

  function parseMapping(baseIndent) {
    const map = {}
    while (cursor < tokens.length) {
      const token = tokens[cursor]
      if (token.indent < baseIndent) break
      if (token.indent > baseIndent) {
        throw new Error(
          `Unexpected indentation in YAML mapping at line ${String(token.lineNumber)}`,
        )
      }
      if (token.text.startsWith('- ') || token.text === '-') break

      const kv = splitKeyValue(token.text)
      if (!kv) {
        throw new Error(
          `Expected key: value at YAML line ${String(token.lineNumber)}: ${token.text}`,
        )
      }
      cursor += 1

      if (kv.rest === '') {
        if (cursor < tokens.length && tokens[cursor].indent > baseIndent) {
          map[kv.key] = parseNode(tokens[cursor].indent)
        } else {
          map[kv.key] = null
        }
      } else {
        map[kv.key] = parseYamlScalar(kv.rest)
      }
    }
    return map
  }

  if (tokens.length === 0) return {}
  const root = parseNode(tokens[0].indent)
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    throw new Error('YAML frontmatter root must be a mapping')
  }
  return root
}

export function extractFrontmatter(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return null
  const frontmatter = parseSimpleYaml(match[1])
  const body = normalized.slice(match[0].length)
  return { frontmatter, body }
}

/**
 * Splits markdown body by H2 (`## Heading`) sections, ignoring headings inside
 * fenced code blocks.
 */
export function extractH2Sections(body) {
  const sections = new Map()
  const lines = body.split(/\r?\n/)
  let inFence = false
  let currentKey = null
  let buffer = []

  function flush() {
    if (currentKey !== null) {
      sections.set(currentKey, buffer.join('\n').trim())
    }
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
    }
    if (!inFence) {
      const headingMatch = line.match(/^##\s+(.+?)\s*$/)
      if (headingMatch) {
        flush()
        currentKey = headingMatch[1].trim().toLowerCase()
        buffer = []
        continue
      }
    }
    if (currentKey !== null) {
      buffer.push(line)
    }
  }
  flush()
  return sections
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateSectionBody(sectionKey, h2Map, filePath, violations) {
  const aliases = SECTION_HEADING_ALIASES[sectionKey] ?? [sectionKey]
  let content = null
  for (const alias of aliases) {
    if (h2Map.has(alias)) {
      content = h2Map.get(alias)
      break
    }
  }
  if (content === null) {
    violations.push(
      `${filePath}: applicable section "${sectionKey}" is missing its "## ..." heading`,
    )
    return
  }
  if (!content) {
    violations.push(
      `${filePath}: applicable section "${sectionKey}" has empty content`,
    )
    return
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(
        `${filePath}: applicable section "${sectionKey}" still contains unresolved template or placeholder text (${pattern.source})`,
      )
      return
    }
  }
}

export async function validateSpecDocument({
  repositoryRoot,
  relativePath,
  content,
}) {
  const violations = []
  const warnings = []
  let parsed
  try {
    parsed = extractFrontmatter(content)
  } catch (error) {
    violations.push(
      `${relativePath}: invalid YAML frontmatter (${error instanceof Error ? error.message : String(error)})`,
    )
    return { violations, warnings, frontmatter: null }
  }

  if (!parsed) {
    violations.push(
      `${relativePath}: missing YAML frontmatter block (expected leading --- ... ---)`,
    )
    return { violations, warnings, frontmatter: null }
  }

  const { frontmatter, body } = parsed

  for (const forbidden of FORBIDDEN_DUPLICATE_KEYS) {
    if (forbidden in frontmatter) {
      violations.push(
        `${relativePath}: frontmatter must not duplicate manifest field "${forbidden}"; reference the manifest instead`,
      )
    }
  }

  if (frontmatter.schemaVersion !== CURRENT_SPEC_SCHEMA_VERSION) {
    violations.push(
      `${relativePath}: schemaVersion must be "${CURRENT_SPEC_SCHEMA_VERSION}"`,
    )
  }

  if (
    typeof frontmatter.component !== 'string' ||
    !COMPONENT_NAME_PATTERN.test(frontmatter.component)
  ) {
    violations.push(
      `${relativePath}: component must be a Ghost* PascalCase name`,
    )
  }

  if (
    !Array.isArray(frontmatter.components) ||
    frontmatter.components.length === 0
  ) {
    violations.push(
      `${relativePath}: components must be a non-empty array of Ghost* names`,
    )
  } else {
    for (const name of frontmatter.components) {
      if (typeof name !== 'string' || !COMPONENT_NAME_PATTERN.test(name)) {
        violations.push(
          `${relativePath}: invalid component entry "${String(name)}" in components`,
        )
      }
    }
    if (
      typeof frontmatter.component === 'string' &&
      !frontmatter.components.includes(frontmatter.component)
    ) {
      violations.push(
        `${relativePath}: components must include primary component "${frontmatter.component}"`,
      )
    }
  }

  if (
    !Array.isArray(frontmatter.packages) ||
    frontmatter.packages.length === 0
  ) {
    violations.push(
      `${relativePath}: packages must be a non-empty array (@ghostvue/vue, @ghostvue/themes)`,
    )
  } else {
    for (const pkg of frontmatter.packages) {
      if (pkg !== '@ghostvue/vue' && pkg !== '@ghostvue/themes') {
        violations.push(
          `${relativePath}: invalid package "${String(pkg)}" in packages`,
        )
      }
    }
  }

  if (
    typeof frontmatter.specStatus !== 'string' ||
    !SPEC_STATUSES.includes(frontmatter.specStatus)
  ) {
    violations.push(
      `${relativePath}: specStatus must be one of ${SPEC_STATUSES.join(', ')}`,
    )
  } else if (frontmatter.specStatus !== 'approved') {
    warnings.push(
      `${relativePath}: specStatus is "${frontmatter.specStatus}" (not yet "approved"; must be "approved" with human approval evidence before implementation)`,
    )
  }

  if (frontmatter.specStatus === 'approved') {
    const approval = frontmatter.approval
    if (
      !approval ||
      typeof approval !== 'object' ||
      Array.isArray(approval) ||
      !isNonEmptyString(approval.evidence)
    ) {
      violations.push(
        `${relativePath}: approved spec must include approval.evidence`,
      )
    }
  }

  if (!Array.isArray(frontmatter.manifests)) {
    violations.push(
      `${relativePath}: manifests must be an array of manifest paths`,
    )
  } else {
    for (const manifestPath of frontmatter.manifests) {
      if (
        typeof manifestPath !== 'string' ||
        !MANIFEST_PATH_PATTERN.test(manifestPath)
      ) {
        violations.push(
          `${relativePath}: invalid manifest reference "${String(manifestPath)}"`,
        )
        continue
      }
      if (!(await fileExists(join(repositoryRoot, manifestPath)))) {
        violations.push(
          `${relativePath}: referenced manifest does not exist: ${manifestPath}`,
        )
      }
    }
  }

  if (
    !frontmatter.sections ||
    typeof frontmatter.sections !== 'object' ||
    Array.isArray(frontmatter.sections)
  ) {
    violations.push(`${relativePath}: sections must be a mapping`)
  } else {
    const h2Map = extractH2Sections(body)
    for (const key of REQUIRED_SECTION_KEYS) {
      const entry = frontmatter.sections[key]
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        violations.push(
          `${relativePath}: sections.${key} must be an object with applicable: boolean`,
        )
        continue
      }
      if (typeof entry.applicable !== 'boolean') {
        violations.push(
          `${relativePath}: sections.${key}.applicable must be a boolean`,
        )
        continue
      }
      if (entry.applicable === false) {
        if (!isNonEmptyString(entry.reason)) {
          violations.push(
            `${relativePath}: sections.${key} is marked not-applicable without a non-empty reason`,
          )
        }
      } else {
        validateSectionBody(key, h2Map, relativePath, violations)
      }
    }
  }

  if (!Array.isArray(frontmatter.unresolvedQuestions)) {
    violations.push(`${relativePath}: unresolvedQuestions must be an array`)
  } else {
    for (const item of frontmatter.unresolvedQuestions) {
      if (typeof item === 'string') {
        if (item.trim().length > 0) {
          violations.push(
            `${relativePath}: unresolved required question: ${item.trim()}`,
          )
        }
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        if (item.blocking !== false) {
          const text = isNonEmptyString(item.question)
            ? item.question.trim()
            : JSON.stringify(item)
          violations.push(
            `${relativePath}: unresolved required question: ${text}`,
          )
        }
      } else {
        violations.push(`${relativePath}: invalid entry in unresolvedQuestions`)
      }
    }
  }

  return { violations, warnings, frontmatter }
}

async function discoverExportedComponents(repositoryRoot) {
  const exported = new Map()
  const vueBarrel = join(
    repositoryRoot,
    'packages/vue/src/.registries/public-api.generated.ts',
  )
  if (await fileExists(vueBarrel)) {
    const text = await readFile(vueBarrel, 'utf8')
    for (const match of text.matchAll(
      /export\s*\{\s*default\s+as\s+(Ghost[A-Z][A-Za-z0-9]*)\s*\}/g,
    )) {
      const pkgs = exported.get(match[1]) ?? new Set()
      pkgs.add('@ghostvue/vue')
      exported.set(match[1], pkgs)
    }
  }

  const themesBarrel = join(
    repositoryRoot,
    'packages/themes/src/.registries/public-api.generated.ts',
  )
  if (await fileExists(themesBarrel)) {
    const text = await readFile(themesBarrel, 'utf8')
    for (const block of text.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const rawItem of block[1].split(',')) {
        const item = rawItem.trim()
        if (!item || item.startsWith('type ')) continue
        const match = item.match(/^(Ghost[A-Z][A-Za-z0-9]*)$/)
        if (match) {
          const pkgs = exported.get(match[1]) ?? new Set()
          pkgs.add('@ghostvue/themes')
          exported.set(match[1], pkgs)
        }
      }
    }
  }

  if (exported.size === 0) {
    for (const pkg of [
      { dir: 'vue', name: '@ghostvue/vue' },
      { dir: 'themes', name: '@ghostvue/themes' },
    ]) {
      const manifestsDir = join(
        repositoryRoot,
        'packages',
        pkg.dir,
        'manifests',
      )
      if (!(await fileExists(manifestsDir))) continue
      for await (const file of glob('*.manifest.json', { cwd: manifestsDir })) {
        const manifest = JSON.parse(
          await readFile(join(manifestsDir, file), 'utf8'),
        )
        if (typeof manifest.name === 'string') {
          const pkgs = exported.get(manifest.name) ?? new Set()
          pkgs.add(pkg.name)
          exported.set(manifest.name, pkgs)
        }
      }
    }
  }

  return exported
}

export async function checkComponentSpecs(repositoryRoot) {
  const specsDir = join(repositoryRoot, 'docs/components')
  const specFiles = []
  if (await fileExists(specsDir)) {
    for await (const file of glob('*-spec.md', { cwd: specsDir })) {
      if (basename(file) === 'spec-template.md') continue
      specFiles.push(file.replaceAll('\\', '/'))
    }
  }
  specFiles.sort()

  const violations = []
  const warnings = []
  const componentOwners = new Map()
  const specPackages = new Map()
  const specManifestCounts = new Map()
  let approvedCount = 0

  for (const file of specFiles) {
    const relativePath = posix.join('docs/components', file)
    const content = await readFile(join(specsDir, file), 'utf8')
    const {
      violations: docViolations,
      warnings: docWarnings,
      frontmatter,
    } = await validateSpecDocument({
      repositoryRoot,
      relativePath,
      content,
    })
    violations.push(...docViolations)
    warnings.push(...docWarnings)

    if (
      frontmatter &&
      frontmatter.specStatus === 'approved' &&
      docViolations.length === 0
    ) {
      approvedCount += 1
    }

    if (frontmatter && Array.isArray(frontmatter.manifests)) {
      specManifestCounts.set(relativePath, frontmatter.manifests.length)
    }

    if (frontmatter && Array.isArray(frontmatter.components)) {
      const pkgs = new Set(
        Array.isArray(frontmatter.packages) ? frontmatter.packages : [],
      )
      for (const name of frontmatter.components) {
        if (typeof name !== 'string') continue
        const existing = componentOwners.get(name)
        if (existing) {
          violations.push(
            `${relativePath}: component "${name}" is already claimed by ${existing}`,
          )
        } else {
          componentOwners.set(name, relativePath)
          specPackages.set(name, pkgs)
        }
      }
    }
  }

  const exported = await discoverExportedComponents(repositoryRoot)
  const specsWithExportedComponents = new Set()
  for (const [name, pkgs] of [...exported.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const owner = componentOwners.get(name)
    if (!owner) {
      violations.push(
        `Exported component "${name}" (${[...pkgs].join(', ')}) has no component specification in docs/components/*-spec.md`,
      )
      continue
    }
    specsWithExportedComponents.add(owner)
    const declaredPkgs = specPackages.get(name) ?? new Set()
    for (const pkg of pkgs) {
      if (!declaredPkgs.has(pkg)) {
        violations.push(
          `${owner}: exported component "${name}" is exported from ${pkg} but frontmatter packages omits "${pkg}"`,
        )
      }
    }
  }

  for (const owner of [...specsWithExportedComponents].sort()) {
    if (specManifestCounts.get(owner) === 0) {
      violations.push(
        `${owner}: manifests must be a non-empty array of manifest paths for exported components`,
      )
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    warnings,
    specCount: specFiles.length,
    approvedCount,
    exportedCount: exported.size,
  }
}

/**
 * Loads approved spec references for manifest generation.
 * Consumes ONLY specs with valid frontmatter and `specStatus: "approved"`.
 */
export async function loadApprovedSpecMetadata(repositoryRoot) {
  const result = new Map()
  const specsDir = join(repositoryRoot, 'docs/components')
  if (!(await fileExists(specsDir))) return result

  const files = []
  for await (const file of glob('*-spec.md', { cwd: specsDir })) {
    if (basename(file) === 'spec-template.md') continue
    files.push(file.replaceAll('\\', '/'))
  }
  files.sort()

  for (const file of files) {
    const relativePath = posix.join('docs/components', file)
    const content = await readFile(join(specsDir, file), 'utf8')
    let parsed
    try {
      parsed = extractFrontmatter(content)
    } catch {
      continue
    }
    if (!parsed) continue
    const { frontmatter } = parsed
    if (
      frontmatter.specStatus !== 'approved' ||
      !Array.isArray(frontmatter.components) ||
      !frontmatter.approval ||
      typeof frontmatter.approval !== 'object' ||
      Array.isArray(frontmatter.approval) ||
      !isNonEmptyString(frontmatter.approval.evidence)
    ) {
      continue
    }

    const entry = {
      path: relativePath,
      status: 'approved',
      evidence: frontmatter.approval.evidence.trim(),
    }
    for (const name of frontmatter.components) {
      if (typeof name === 'string' && COMPONENT_NAME_PATTERN.test(name)) {
        result.set(name, entry)
      }
    }
  }

  return result
}
