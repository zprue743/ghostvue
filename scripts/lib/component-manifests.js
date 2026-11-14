/**
 * Generates component manifests from Vue SFCs via vue-component-meta.
 *
 * Machine-derived fields (props/events/slots/exposed names and types, models)
 * come from the SFC. Prose (descriptions, status, styling, accessibility,
 * examples) is preserved from the existing file so humans do not maintain
 * types in two places. `source` is always `generated` for SFC-backed files.
 *
 * Handwritten manifests without a matching `Ghost*.vue` stay as they are until
 * the component source exists — required while Button/VisuallyHidden land in
 * parallel PRs.
 *
 * `.js` rather than `.mjs` so TypeScript can attach the sibling `.d.ts` when
 * tests import this module.
 */
import { access, glob, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import Ajv2020 from 'ajv/dist/2020.js'
import { createChecker } from 'vue-component-meta'

export const CURRENT_SCHEMA_VERSION = '1.0.0'

export const MANIFEST_PACKAGES = [
  { directory: 'vue', name: '@ghostvue/vue' },
  { directory: 'themes', name: '@ghostvue/themes' },
]

const COMPONENT_FILE = /^Ghost[A-Z][A-Za-z0-9]*\.vue$/
const PROP_NAME = /^[a-z][A-Za-z0-9]*$/
const EVENT_NAME = /^[a-z][A-Za-z0-9:]*$/
const SLOT_NAME = /^(default|[a-z][A-Za-z0-9]*)$/
const EXPOSED_NAME = /^[a-z][A-Za-z0-9]*$/
const UPDATE_EVENT = /^update:([a-z][A-Za-z0-9]*)$/

const STUB_ACCESSIBILITY = {
  role: 'generic',
  apgPattern: 'https://www.w3.org/WAI/ARIA/apg/',
  keyboard: {},
  requiredAriaAttributes: [],
}

const STUB_STYLING = {
  parts: [],
  states: [],
  cssProperties: [],
}

export function pascalToKebab(name) {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** `GhostButton` → `button`, matching `examples/<prefix>/<id>.vue`. */
export function componentExamplePrefix(name) {
  const remainder = name.startsWith('Ghost') ? name.slice('Ghost'.length) : name
  return pascalToKebab(remainder)
}

/**
 * Every examples/<component>/<id>.vue file must be listed on a Ghost*
 * manifest, and every manifest example id must exist as that file.
 * Skips when the repository has no examples directory so fixture syncs
 * used by unit tests stay isolated.
 */
export async function validateExampleManifests(repositoryRoot, componentNames) {
  const prefixes = componentNames?.map(componentExamplePrefix)
  const violations = []
  const examplesRoot = join(repositoryRoot, 'examples')
  if (!(await fileExists(examplesRoot))) {
    return violations
  }

  const fileIds = new Set()
  for await (const file of glob('*/*.vue', { cwd: examplesRoot })) {
    const id = file.replaceAll('\\', '/').replace(/\.vue$/, '')
    if (!prefixes || prefixes.some((prefix) => id.startsWith(`${prefix}/`)))
      fileIds.add(id)
  }

  const referenced = new Map()
  for await (const file of glob('packages/*/manifests/*.manifest.json', {
    cwd: repositoryRoot,
  })) {
    const relativePath = file.replaceAll('\\', '/')
    if (
      componentNames &&
      !componentNames.some(
        (name) =>
          basename(relativePath) === `${pascalToKebab(name)}.manifest.json`,
      )
    )
      continue
    const manifest = await readJsonObject(join(repositoryRoot, relativePath))
    if (componentNames && !componentNames.includes(manifest.name)) continue
    const prefix =
      typeof manifest.name === 'string'
        ? componentExamplePrefix(manifest.name)
        : ''
    const examples = Array.isArray(manifest.examples) ? manifest.examples : []

    for (const id of examples) {
      if (typeof id !== 'string') continue
      const owners = referenced.get(id) ?? []
      owners.push(relativePath)
      referenced.set(id, owners)

      if (!fileIds.has(id)) {
        violations.push(
          `${relativePath} examples lists "${id}" but examples/${id}.vue does not exist`,
        )
      }
      if (prefix && !id.startsWith(`${prefix}/`)) {
        violations.push(
          `${relativePath} example "${id}" does not belong to ${String(manifest.name)} (expected ${prefix}/*)`,
        )
      }
    }
  }

  for (const id of [...fileIds].sort()) {
    if (!referenced.has(id)) {
      violations.push(
        `examples/${id}.vue is not listed in any component manifest`,
      )
    }
  }

  return violations
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

const MANIFEST_NAME_COLLATOR = new Intl.Collator('en', { sensitivity: 'base' })

export function compareManifestMemberNames(left, right) {
  return MANIFEST_NAME_COLLATOR.compare(left, right)
}

function mapTypeDelimitedSegments(type, open, close, mapInner) {
  let result = ''
  let index = 0
  while (index < type.length) {
    const char = type[index]
    if (char === open) {
      let depth = 1
      let end = index + 1
      while (end < type.length && depth > 0) {
        const next = type[end]
        if (next === open) depth += 1
        else if (next === close) depth -= 1
        end += 1
      }
      const inner = type.slice(index + 1, end - 1)
      result += open + mapInner(inner) + close
      index = end
      continue
    }
    result += char
    index += 1
  }
  return result
}

function mapNestedTypeSegments(type, mapInner) {
  let result = mapTypeDelimitedSegments(type, '(', ')', mapInner)
  result = mapTypeDelimitedSegments(result, '<', '>', mapInner)
  return mapTypeDelimitedSegments(result, '[', ']', mapInner)
}

/** Lexicographic order for every `|` union at each nesting depth in a type string. */
export function sortUnionsInType(type) {
  const trimmed = type.trim()
  const parts = splitTopLevel(trimmed, '|')
  if (parts.length > 1) {
    return parts
      .map((part) => sortUnionsInType(part.trim()))
      .sort(compareManifestMemberNames)
      .join(' | ')
  }
  return mapNestedTypeSegments(trimmed, sortUnionsInType)
}

export function normalizeType(type, { optional = false } = {}) {
  let result = type.trim()
  if (optional) {
    result = result.replace(/ \| undefined$/, '')
    result = result.replace(/^undefined \| /, '')
  }
  result = result.replaceAll(/\?: ([^)|]+?) \| undefined/g, '?: $1')
  result = result.replaceAll(/"([^"]*)"/g, "'$1'")
  return sortUnionsInType(result)
}

// vue-component-meta prop/slot/emit order is not stable across TS builds; names are.
function sortMembersByName(members) {
  return [...members].sort((left, right) =>
    compareManifestMemberNames(left.name, right.name),
  )
}

function sortModelsByProp(models) {
  return [...models].sort((left, right) =>
    compareManifestMemberNames(left.prop, right.prop),
  )
}

export function parseDefaultValue(raw) {
  if (raw == null) return { present: false }
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === 'undefined') return { present: false }
  if (trimmed === 'null') return { present: true, value: null }
  if (trimmed === 'true') return { present: true, value: true }
  if (trimmed === 'false') return { present: true, value: false }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return { present: true, value: Number(trimmed) }
  }
  const quoted = trimmed.match(/^(['"])(.*)\1$/s)
  if (quoted) return { present: true, value: quoted[2] }
  return { present: true, value: trimmed }
}

function splitTopLevel(value, separator) {
  const parts = []
  let current = ''
  let depth = 0
  let quote = null
  for (const char of value) {
    if (quote) {
      current += char
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      current += char
      continue
    }
    if (char === '(' || char === '[' || char === '{' || char === '<') depth += 1
    if (char === ')' || char === ']' || char === '}' || char === '>') depth -= 1
    if (char === separator && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) parts.push(current)
  return parts
}

export function eventPayloadType(type) {
  const normalized = normalizeType(type)
  if (normalized === '' || normalized === '[]') return 'void'
  if (!(normalized.startsWith('[') && normalized.endsWith(']'))) {
    return normalized
  }
  const inner = normalized.slice(1, -1).trim()
  if (!inner) return 'void'
  const types = splitTopLevel(inner, ',').map((part) => {
    const trimmed = part.trim()
    const named = trimmed.match(/^[A-Za-z_$][\w$]*:\s*(.*)$/s)
    return (named ? named[1] : trimmed).trim()
  })
  return types.length === 1 ? types[0] : `[${types.join(', ')}]`
}

function isDeprecated(tags) {
  return tags.some((tag) => tag.name === 'deprecated')
}

function exposedKind(type) {
  const trimmed = type.trim()
  if (trimmed.includes('=>') || trimmed.startsWith('(')) return 'method'
  return 'property'
}

function proseOrFallback(prose, fallback) {
  if (typeof prose === 'string' && prose.trim().length > 0) return prose
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback
  }
  return null
}

function memberDescription(existing, jsdoc, fallback) {
  return proseOrFallback(existing, jsdoc) ?? fallback
}

function extractSlotProps(slot) {
  const schema = slot.schema
  if (
    typeof schema !== 'object' ||
    schema === null ||
    schema.kind !== 'object' ||
    schema.schema == null ||
    Array.isArray(schema.schema)
  ) {
    return []
  }
  const props = Object.values(schema.schema)
    .filter((entry) => PROP_NAME.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      type: normalizeType(entry.type, { optional: !entry.required }),
      description: entry.description,
    }))
  return sortMembersByName(props)
}

export function buildDerivedContract(meta, { name, packageName }) {
  const violations = []
  const props = []
  const events = []
  const models = []
  const slots = []
  const exposed = []

  for (const prop of meta.props) {
    if (prop.global) continue
    if (!PROP_NAME.test(prop.name)) {
      violations.push(
        `${name}: prop "${prop.name}" is not a camelCase public prop`,
      )
      continue
    }
    const optional = !prop.required
    const parsedDefault = optional
      ? parseDefaultValue(prop.default)
      : { present: false }
    const entry = {
      name: prop.name,
      type: normalizeType(prop.type, { optional }),
      required: prop.required,
      description: prop.description,
      deprecated: isDeprecated(prop.tags),
    }
    if (parsedDefault.present) entry.default = parsedDefault.value
    props.push(entry)
  }

  const propByName = new Map(props.map((prop) => [prop.name, prop]))

  for (const event of meta.events) {
    if (!EVENT_NAME.test(event.name)) {
      violations.push(
        `${name}: event "${event.name}" is not a public emit name`,
      )
      continue
    }
    const payloadType = eventPayloadType(event.type)
    const update = event.name.match(UPDATE_EVENT)
    if (update) {
      const modelProp = propByName.get(update[1])
      if (modelProp) {
        models.push({
          prop: modelProp.name,
          event: event.name,
          type: modelProp.type,
          description: event.description,
        })
        continue
      }
    }
    events.push({
      name: event.name,
      payloadType,
      description: event.description,
    })
  }

  for (const slot of meta.slots) {
    if (!SLOT_NAME.test(slot.name)) {
      violations.push(`${name}: slot "${slot.name}" is not a public slot name`)
      continue
    }
    slots.push({
      name: slot.name,
      props: extractSlotProps(slot),
      description: slot.description,
    })
  }

  for (const member of meta.exposed) {
    if (member.name.startsWith('$')) continue
    if (!EXPOSED_NAME.test(member.name)) {
      violations.push(
        `${name}: exposed "${member.name}" is not a public template-ref name`,
      )
      continue
    }
    const optional = member.type.includes('| undefined')
    exposed.push({
      name: member.name,
      kind: exposedKind(member.type),
      type: normalizeType(member.type, { optional }),
      description: member.description,
    })
  }

  return {
    violations,
    derived: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      source: 'generated',
      name,
      package: packageName,
      description: meta.description ?? '',
      props: sortMembersByName(props),
      models: sortModelsByProp(models),
      events: sortMembersByName(events),
      slots: sortMembersByName(slots),
      exposed: sortMembersByName(exposed),
    },
  }
}

function existingByName(list) {
  const map = new Map()
  if (!Array.isArray(list)) return map
  for (const item of list) {
    if (item && typeof item === 'object' && typeof item.name === 'string') {
      map.set(item.name, item)
    }
  }
  return map
}

function existingByProp(list) {
  const map = new Map()
  if (!Array.isArray(list)) return map
  for (const item of list) {
    if (item && typeof item === 'object' && typeof item.prop === 'string') {
      map.set(item.prop, item)
    }
  }
  return map
}

export function mergeManifest(derived, existing) {
  const previous =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing
      : {}
  const previousProps = existingByName(previous.props)
  const previousEvents = existingByName(previous.events)
  const previousSlots = existingByName(previous.slots)
  const previousExposed = existingByName(previous.exposed)
  const previousModels = existingByProp(previous.models)

  const props = derived.props.map((prop) => {
    const prior = previousProps.get(prop.name)
    return {
      name: prop.name,
      type: prop.type,
      ...(Object.hasOwn(prop, 'default') ? { default: prop.default } : {}),
      required: prop.required,
      description: memberDescription(
        prior?.description,
        prop.description,
        `Declared prop \`${prop.name}\`.`,
      ),
      deprecated: prop.deprecated,
    }
  })

  const models = derived.models.map((model) => {
    const prior = previousModels.get(model.prop)
    return {
      prop: model.prop,
      event: model.event,
      type: model.type,
      description: memberDescription(
        prior?.description,
        model.description,
        `v-model binding for \`${model.prop}\`.`,
      ),
    }
  })

  const events = derived.events.map((event) => {
    const prior = previousEvents.get(event.name)
    return {
      name: event.name,
      payloadType: event.payloadType,
      description: memberDescription(
        prior?.description,
        event.description,
        `Emitted as \`${event.name}\`.`,
      ),
    }
  })

  const slots = derived.slots.map((slot) => {
    const prior = previousSlots.get(slot.name)
    const priorProps = existingByName(prior?.props)
    return {
      name: slot.name,
      props: slot.props.map((slotProp) => ({
        name: slotProp.name,
        type: slotProp.type,
        description: memberDescription(
          priorProps.get(slotProp.name)?.description,
          slotProp.description,
          `Slot prop \`${slotProp.name}\`.`,
        ),
      })),
      description: memberDescription(
        prior?.description,
        slot.description,
        slot.name === 'default'
          ? 'Primary content.'
          : `Named slot \`${slot.name}\`.`,
      ),
    }
  })

  const exposed = derived.exposed.map((member) => {
    const prior = previousExposed.get(member.name)
    return {
      name: member.name,
      kind: member.kind,
      type: member.type,
      description: memberDescription(
        prior?.description,
        member.description,
        `Exposed ${member.kind} \`${member.name}\`.`,
      ),
    }
  })

  const status =
    previous.status === 'experimental' ||
    previous.status === 'beta' ||
    previous.status === 'stable' ||
    previous.status === 'deprecated'
      ? previous.status
      : 'experimental'

  const accessibility =
    previous.accessibility &&
    typeof previous.accessibility === 'object' &&
    !Array.isArray(previous.accessibility)
      ? previous.accessibility
      : STUB_ACCESSIBILITY

  const styling =
    previous.styling &&
    typeof previous.styling === 'object' &&
    !Array.isArray(previous.styling)
      ? previous.styling
      : STUB_STYLING

  const examples = Array.isArray(previous.examples) ? previous.examples : []

  return {
    schemaVersion:
      typeof previous.schemaVersion === 'string' && previous.schemaVersion
        ? previous.schemaVersion
        : derived.schemaVersion,
    source: 'generated',
    name: derived.name,
    package: derived.package,
    status,
    description: memberDescription(
      previous.description,
      derived.description,
      `Public ${derived.name} component.`,
    ),
    props,
    models,
    events,
    slots,
    exposed,
    styling,
    accessibility,
    examples,
  }
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readJsonObject(path) {
  const value = JSON.parse(await readFile(path, 'utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object`)
  }
  return value
}

async function listVueComponents(srcDir) {
  const files = []
  for await (const file of glob('**/*.vue', { cwd: srcDir })) {
    if (!COMPONENT_FILE.test(basename(file))) continue
    files.push(file)
  }
  return files.sort()
}

async function listManifestFiles(manifestsDir) {
  if (!(await fileExists(manifestsDir))) return []
  const files = []
  for await (const file of glob('*.manifest.json', { cwd: manifestsDir })) {
    files.push(file)
  }
  return files.sort()
}

export function resolveManifestPackage(repositoryRoot, spec) {
  return {
    directory: spec.directory,
    name: spec.name,
    srcDir:
      spec.srcDir ?? join(repositoryRoot, 'packages', spec.directory, 'src'),
    manifestsDir:
      spec.manifestsDir ??
      join(repositoryRoot, 'packages', spec.directory, 'manifests'),
    tsconfig:
      spec.tsconfig ??
      join(repositoryRoot, 'packages', spec.directory, 'tsconfig.json'),
  }
}

const checkers = new Map()

export function createMetaChecker(tsconfigPath) {
  const cached = checkers.get(tsconfigPath)
  if (cached) return cached
  const checker = createChecker(tsconfigPath, { schema: true })
  checkers.set(tsconfigPath, checker)
  return checker
}

export function resetMetaCheckers() {
  checkers.clear()
}

const TypeMetaUnknown = 0

export function extractComponentMeta(checker, filePath) {
  const meta = checker.getComponentMeta(filePath)
  if (meta.type === TypeMetaUnknown) {
    throw new Error(
      `vue-component-meta could not load ${filePath} as a Vue component. Include the file from the package tsconfig.`,
    )
  }
  return meta
}

export async function syncRepositoryManifests({
  repositoryRoot,
  write = false,
  packages = MANIFEST_PACKAGES,
  componentNames,
} = {}) {
  const selectedManifestFiles =
    componentNames &&
    new Set(
      componentNames.map((name) => `${pascalToKebab(name)}.manifest.json`),
    )
  const violations = []
  const written = []
  const checked = []
  const generatedFiles = new Set()

  for (const spec of packages) {
    const pkg = resolveManifestPackage(repositoryRoot, spec)
    const components = (await listVueComponents(pkg.srcDir)).filter(
      (file) =>
        !componentNames || componentNames.includes(basename(file, '.vue')),
    )
    if (components.length === 0) {
      for (const fileName of await listManifestFiles(pkg.manifestsDir)) {
        if (selectedManifestFiles && !selectedManifestFiles.has(fileName))
          continue
        const relativePath = join(
          'packages',
          pkg.directory,
          'manifests',
          fileName,
        )
        const manifest = await readJsonObject(join(pkg.manifestsDir, fileName))
        if (manifest.source === 'generated') {
          violations.push(
            `${relativePath} has source "generated" but no matching Ghost*.vue under ${pkg.srcDir}`,
          )
        }
      }
      continue
    }

    if (!(await fileExists(pkg.tsconfig))) {
      violations.push(
        `Missing tsconfig for ${pkg.name} components: ${pkg.tsconfig}`,
      )
      continue
    }

    const checker = createMetaChecker(pkg.tsconfig)

    for (const relative of components) {
      const name = basename(relative, '.vue')
      const kebab = pascalToKebab(name)
      const fileName = `${kebab}.manifest.json`
      const absoluteSfc = join(pkg.srcDir, relative)
      const absoluteManifest = join(pkg.manifestsDir, fileName)
      const relativeManifest = join(
        'packages',
        pkg.directory,
        'manifests',
        fileName,
      )
      generatedFiles.add(join(pkg.manifestsDir, fileName))

      let meta
      try {
        meta = extractComponentMeta(checker, absoluteSfc)
      } catch (error) {
        violations.push(error instanceof Error ? error.message : String(error))
        continue
      }

      const { derived, violations: derivedViolations } = buildDerivedContract(
        meta,
        { name, packageName: pkg.name },
      )
      violations.push(...derivedViolations)
      if (derivedViolations.length > 0) continue

      const existing = (await fileExists(absoluteManifest))
        ? await readJsonObject(absoluteManifest)
        : null
      const next = mergeManifest(derived, existing)
      const serialized = serializeManifest(next)
      checked.push(relativeManifest)

      if (write) {
        await mkdir(pkg.manifestsDir, { recursive: true })
        await writeFile(absoluteManifest, serialized)
        written.push(relativeManifest)
        continue
      }

      if (!existing) {
        violations.push(
          `Missing manifest for ${name} (${absoluteSfc}). Run pnpm manifests:write`,
        )
        continue
      }

      const current = await readFile(absoluteManifest, 'utf8')
      if (current !== serialized) {
        violations.push(
          `${relativeManifest} is stale versus ${relative}. Run pnpm manifests:write`,
        )
      }
    }

    for (const fileName of await listManifestFiles(pkg.manifestsDir)) {
      if (selectedManifestFiles && !selectedManifestFiles.has(fileName))
        continue
      const absoluteManifest = join(pkg.manifestsDir, fileName)
      if (generatedFiles.has(absoluteManifest)) continue
      const relativePath = join(
        'packages',
        pkg.directory,
        'manifests',
        fileName,
      )
      const manifest = await readJsonObject(absoluteManifest)
      if (manifest.source === 'generated') {
        violations.push(
          `${relativePath} has source "generated" but no matching Ghost*.vue`,
        )
      }
    }
  }

  return { ok: violations.length === 0, violations, written, checked }
}

/** Shared schema validation for the repository gate and scoped verification. */
export async function validateManifestSchemas(repositoryRoot, files) {
  const schema = await readJsonObject(
    join(repositoryRoot, 'schemas/component-manifest.schema.json'),
  )
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validate = ajv.compile(schema)
  const violations = []
  for (const file of files) {
    const manifest = await readJsonObject(join(repositoryRoot, file))
    if (!validate(manifest))
      violations.push(`${file}: ${ajv.errorsText(validate.errors)}`)
  }
  return violations
}
