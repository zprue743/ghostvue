/** @vitest-environment node */

/**
 * Guards the GitHub issue forms under .github/ISSUE_TEMPLATE (#431).
 *
 * GitHub only reports a malformed form after it is merged, by silently
 * falling back to no template, so the schema subset these forms use is
 * checked here. The forms are read as text rather than parsed as YAML so the
 * guard needs no extra development dependency (the same tradeoff as
 * ci-workflow-policy.test.ts). The reader relies on the Prettier-formatted
 * layout and throws on any line it does not recognize, so a layout change
 * fails loudly instead of skipping checks. It also throws on any scalar it
 * cannot read the way a YAML parser would (for example an unquoted value
 * containing `: `, which GitHub rejects), so the text reader never accepts a
 * form that real YAML would refuse or read differently. Scalars keep their
 * YAML type: a plain `true` or `false` is read as a Boolean and a quoted one
 * stays a string, because GitHub requires real Booleans where the schema
 * says Boolean (for example `validations.required`).
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bodyBlockers } from '../../scripts/lib/release-scope.mjs'

const templatesDir = resolve(process.cwd(), '.github/ISSUE_TEMPLATE')

// Labels that schedule or hold work. Triage and the release-scope workflow
// own them; a form that applied one would let filing grant or block pickup.
const triageLabels = ['agent:triaged', 'agent:ready', 'in-progress', 'blocked']

// The element types GitHub issue forms accept.
const elementTypes = ['markdown', 'textarea', 'input', 'dropdown', 'checkboxes']

// Characters that cannot start a YAML plain scalar, or that start a
// construct (anchor, tag, alias, flow collection, block scalar) the reader
// does not interpret. `-`, `?` and `:` are only indicators before a space.
const plainScalarStart = /^(?:[[\]{}#&*!|>'"%@`,]|[-?:](?: |$))/

// Plain scalars that the YAML core schema resolves to Booleans. Anything
// quoted, including `'true'`, is a string.
const plainBooleans = {
  true: true,
  True: true,
  TRUE: true,
  false: false,
  False: false,
  FALSE: false,
}

// Plain scalars that the YAML core schema resolves to null.
const plainNulls = ['null', 'Null', 'NULL', '~']

// Plain scalars that the YAML core schema resolves to an integer or float.
// The reader has no use for numbers, so it refuses them rather than return a
// string that YAML would not produce.
const plainNumber =
  /^(?:[-+]?(?:[0-9]+|0o[0-7]+|0x[0-9a-fA-F]+|(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?)|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/

/**
 * Reads one scalar the way YAML would, or throws when the value uses syntax
 * this reader does not support. Quoted scalars must be a single well-formed
 * pair: single quotes may only contain doubled `''`, and double quotes may not
 * contain escapes or a bare `"`. A plain scalar may not contain `: ` or ` #`
 * (YAML reads those as a nested mapping or a comment) or end in `:`. A plain
 * Boolean is returned as a Boolean and a plain null as `null`, a plain number
 * throws, and every other scalar is returned as a string.
 */
function scalar(value, where) {
  const fail = (reason) => {
    throw new Error(`${where}: ${reason} in "${value}"; quote the value`)
  }
  if (value.startsWith("'")) {
    const match = /^'(.*)'$/.exec(value)
    if (!match || match[1].replaceAll("''", '').includes("'"))
      fail('malformed single-quoted scalar')
    return match[1].replaceAll("''", "'")
  }
  if (value.startsWith('"')) {
    const match = /^"([^"\\]*)"$/.exec(value)
    if (!match) fail('unsupported double-quoted scalar')
    return match[1]
  }
  if (plainScalarStart.test(value)) fail('unsupported plain scalar indicator')
  if (/: |:$/.test(value)) fail('plain scalar containing ": "')
  if (/ #/.test(value)) fail('plain scalar containing " #"')
  if (Object.hasOwn(plainBooleans, value)) return plainBooleans[value]
  if (plainNulls.includes(value)) return null
  if (plainNumber.test(value)) fail('plain scalar YAML reads as a number')
  return value
}

/**
 * Reads a nested `key: value` map at `indent`, collecting `|` block scalars
 * from the deeper-indented lines that follow.
 */
function readMap(lines, start, indent, file) {
  const map = {}
  let index = start
  const pattern = new RegExp(`^ {${indent}}([a-z_-]+): ?(.*)$`)
  while (index < lines.length) {
    const match = pattern.exec(lines[index])
    if (!match) break
    const [, key, raw] = match
    index += 1
    if (raw === '|') {
      const block = []
      const deeper = ' '.repeat(indent + 2)
      while (
        index < lines.length &&
        (lines[index].startsWith(deeper) || lines[index] === '')
      ) {
        block.push(lines[index].slice(deeper.length))
        index += 1
      }
      map[key] = block.join('\n').trimEnd()
    } else {
      map[key] = scalar(raw, `${file}: ${key}`)
    }
  }
  return { map, next: index }
}

/** Parses issue-form text into its top-level keys and body elements. */
function parseForm(text, file) {
  const lines = text.split('\n').filter((line) => !line.startsWith('#'))
  const form = { body: [] }
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line === '') {
      index += 1
      continue
    }
    if (line === 'body:') {
      index += 1
      while (index < lines.length && lines[index].startsWith('  - type: ')) {
        const element = { type: lines[index].slice('  - type: '.length) }
        index += 1
        while (index < lines.length && /^ {4}\S/.test(lines[index])) {
          const id = /^ {4}id: (\S+)$/.exec(lines[index])
          const section = /^ {4}(attributes|validations):$/.exec(lines[index])
          if (id) {
            element.id = id[1]
            index += 1
          } else if (section) {
            const { map, next } = readMap(lines, index + 1, 6, file)
            element[section[1]] = map
            index = next
          } else {
            throw new Error(`${file}: unrecognized line "${lines[index]}"`)
          }
        }
        form.body.push(element)
      }
      continue
    }
    const top = /^([a-z_]+): (.*)$/.exec(line)
    if (!top) throw new Error(`${file}: unrecognized line "${line}"`)
    const [, key, raw] = top
    const list = /^\[(.*)\]$/.exec(raw)
    form[key] = list
      ? list[1]
          .split(',')
          .map((item) => scalar(item.trim(), `${file}: ${key}`))
          .filter(Boolean)
      : scalar(raw, `${file}: ${key}`)
    index += 1
  }
  return form
}

/** Reads one issue form from .github/ISSUE_TEMPLATE. */
function readForm(file) {
  return parseForm(readFileSync(resolve(templatesDir, file), 'utf8'), file)
}

/**
 * Asserts the issue-form schema subset these forms use. GitHub drops a form
 * that breaks it only after merge, so it is checked here.
 */
function expectIssueFormSchema(form) {
  // GitHub requires both to be strings, so a plain `name: true` or
  // `description: null` is rejected after merge even though it is truthy or
  // present.
  for (const key of ['name', 'description']) {
    expect(typeof form[key], key).toBe('string')
    expect(form[key], key).not.toBe('')
  }
  expect(form.body.length).toBeGreaterThan(0)

  const fields = form.body.filter((element) => element.type !== 'markdown')
  expect(fields.length).toBeGreaterThan(0)
  for (const element of form.body) {
    expect(elementTypes).toContain(element.type)
    if (element.type === 'markdown') {
      expect(element.attributes?.value).toBeTruthy()
      expect(element.validations).toBeUndefined()
    } else {
      expect(element.id).toMatch(/^[a-z0-9_-]+$/)
      // GitHub rejects a field whose label is not a string ("label must be
      // a string"), so a plain `label: true` must fail here, not only be truthy.
      expect(typeof element.attributes?.label, element.id).toBe('string')
      expect(element.attributes.label, element.id).not.toBe('')
      // GitHub requires a Boolean here; a quoted 'true' is a string and
      // the form would be rejected after merge.
      if (element.validations)
        expect(typeof element.validations.required).toBe('boolean')
    }
  }
  // GitHub rejects a form whose ids or labels repeat.
  const ids = fields.map((element) => element.id)
  const labels = fields.map((element) => element.attributes.label)
  expect(new Set(ids).size).toBe(ids.length)
  expect(new Set(labels).size).toBe(labels.length)
}

/**
 * Renders a submission the way GitHub writes an issue-form body: each field
 * becomes `### <label>` followed by the answer, or `_No response_` when an
 * optional field is left blank.
 */
function renderIssueBody(form, answers) {
  return form.body
    .filter((element) => element.type !== 'markdown')
    .map(
      (element) =>
        `### ${element.attributes.label}\n\n${answers[element.id] ?? '_No response_'}`,
    )
    .join('\n\n')
}

/**
 * Asserts that a form applies none of the triage or readiness labels.
 * GitHub matches label names case-insensitively, so `Agent:Ready` would apply
 * the existing `agent:ready` label; both sides are compared lowercased.
 */
function expectNoTriageLabels(form) {
  const reserved = triageLabels.map((label) => label.toLowerCase())
  for (const label of form.labels ?? []) {
    expect(typeof label, String(label)).toBe('string')
    expect(reserved, label).not.toContain(label.toLowerCase())
  }
}

const formFiles = readdirSync(templatesDir)
  .filter((file) => /\.ya?ml$/.test(file) && file !== 'config.yml')
  .sort()

describe('issue forms', () => {
  it('keeps the bug and feature entry points alongside the task form', () => {
    expect(formFiles).toEqual([
      'bug.yml',
      'engineering-task.yml',
      'feature.yml',
    ])
    const config = readFileSync(resolve(templatesDir, 'config.yml'), 'utf8')
    // Blank issues stay disabled, so every issue starts from one of the forms.
    expect(config).toMatch(/^blank_issues_enabled: false$/m)
  })

  it.each(formFiles)('%s follows the issue-form schema', (file) => {
    expectIssueFormSchema(readForm(file))
  })

  it.each(formFiles)('%s applies no triage or readiness labels', (file) => {
    expectNoTriageLabels(readForm(file))
  })

  it('keeps existing bug and feature fields', () => {
    const required = (file) =>
      readForm(file)
        .body.filter((element) => element.validations?.required === true)
        .map((element) => element.id)
    expect(required('bug.yml')).toEqual([
      'description',
      'reproduction',
      'versions',
    ])
    expect(required('feature.yml')).toEqual([
      'problem',
      'simple-api',
      'accessibility',
    ])
  })
})

describe('issue-form reader', () => {
  /** Builds a minimal form whose textarea description is `description`. */
  const formWith = (description) =>
    [
      'name: Example',
      'description: Example form.',
      'body:',
      '  - type: textarea',
      '    id: example',
      '    attributes:',
      '      label: Example',
      `      description: ${description}`,
    ].join('\n')
  const describeField = (text) =>
    parseForm(text, 'example.yml').body[0].attributes.description

  it('rejects an unquoted scalar that YAML would read as a mapping', () => {
    // GitHub's YAML parser rejects this line ("mapping values are not
    // allowed here"), so the guard must refuse it rather than read the text.
    expect(() => describeField(formWith('Migration: phase two'))).toThrow(
      /example\.yml: description: plain scalar containing ": "/,
    )
    expect(() =>
      parseForm('description: Migration: phase two\n', 'top.yml'),
    ).toThrow(/top\.yml: description: plain scalar containing ": "/)
    expect(() =>
      parseForm('labels: [Migration: phase two]\n', 'list.yml'),
    ).toThrow(/plain scalar containing ": "/)
  })

  it('rejects other scalar syntax the reader cannot interpret', () => {
    for (const value of [
      'Ends with:',
      'Text # trailing comment',
      '>',
      '|-',
      '&anchor value',
      "'unterminated",
      "'stray ' quote'",
      '"escaped \\" quote"',
      '- item',
    ])
      expect(() => describeField(formWith(value)), value).toThrow(
        /quote the value/,
      )
  })

  it('keeps valid quoted and block scalars', () => {
    expect(describeField(formWith("'Migration: phase two'"))).toBe(
      'Migration: phase two',
    )
    expect(describeField(formWith("'It''s: quoted'"))).toBe("It's: quoted")
    expect(describeField(formWith('"Migration: phase two"'))).toBe(
      'Migration: phase two',
    )
    expect(describeField(formWith('Plain text, with commas.'))).toBe(
      'Plain text, with commas.',
    )
    const block = formWith(
      '|\n        Migration: phase two\n        # not a comment',
    )
    expect(describeField(block)).toBe('Migration: phase two\n# not a comment')
  })

  /** Builds a minimal form whose textarea has `required: <required>`. */
  const formRequiring = (required) =>
    [
      'name: Example',
      'description: Example form.',
      'body:',
      '  - type: textarea',
      '    id: example',
      '    attributes:',
      '      label: Example',
      '    validations:',
      `      required: ${required}`,
    ].join('\n')

  it('reads plain true and false as Booleans that pass the schema', () => {
    for (const [raw, value] of [
      ['true', true],
      ['false', false],
    ]) {
      const form = parseForm(formRequiring(raw), 'example.yml')
      expect(form.body[0].validations.required).toBe(value)
      expectIssueFormSchema(form)
    }
  })

  it('rejects quoted required values, which YAML reads as strings', () => {
    // GitHub's schema requires a Boolean for validations.required, so a
    // quoted value would be rejected after merge even though the YAML parses.
    for (const raw of ["'true'", '"true"', "'false'", '"false"']) {
      const form = parseForm(formRequiring(raw), 'example.yml')
      expect(typeof form.body[0].validations.required, raw).toBe('string')
      expect(() => expectIssueFormSchema(form), raw).toThrow()
    }
  })

  /** Builds a minimal valid form with the given top-level name/description. */
  const formTitled = ({ name = 'Example', description = 'Example form.' }) =>
    [
      `name: ${name}`,
      `description: ${description}`,
      'body:',
      '  - type: textarea',
      '    id: example',
      '    attributes:',
      '      label: Example',
    ].join('\n')

  it('rejects a name or description that YAML reads as a non-string', () => {
    for (const fields of [
      { name: 'true' },
      { name: 'False' },
      { name: 'null' },
      { name: '~' },
      { description: 'null' },
      { description: 'true' },
      { description: 'NULL' },
    ]) {
      const form = parseForm(formTitled(fields), 'example.yml')
      expect(() => expectIssueFormSchema(form), JSON.stringify(fields)).toThrow(
        /(name|description): expected '(boolean|object)' to be 'string'/,
      )
    }
  })

  it('refuses plain numbers, which YAML does not read as strings', () => {
    for (const value of ['1', '-2', '0.5', '1e3', '0x1F', '.inf', '.NaN'])
      expect(
        () => parseForm(formTitled({ name: value }), 'example.yml'),
        value,
      ).toThrow(/reads as a number.*quote the value/)
  })

  it('accepts plain and quoted string names and descriptions', () => {
    for (const [fields, expected] of [
      [{}, { name: 'Example', description: 'Example form.' }],
      [
        { name: "'true'", description: '"null"' },
        { name: 'true', description: 'null' },
      ],
      [
        { name: "'Bug: report'", description: "'Version 1.0'" },
        { name: 'Bug: report', description: 'Version 1.0' },
      ],
      [
        { name: 'Version 1.0', description: '0.2.0 release' },
        { name: 'Version 1.0', description: '0.2.0 release' },
      ],
    ]) {
      const form = parseForm(formTitled(fields), 'example.yml')
      expect(form, JSON.stringify(fields)).toMatchObject(expected)
      expectIssueFormSchema(form)
    }
  })
})

describe('issue-form labels', () => {
  /** Builds a minimal valid form; `top` lines follow name and description. */
  const formWithLines = ({ top = [], label = 'Example' } = {}) =>
    [
      'name: Example',
      'description: Example form.',
      ...top,
      'body:',
      '  - type: textarea',
      '    id: example',
      '    attributes:',
      `      label: ${label}`,
    ].join('\n')
  const parse = (options) => parseForm(formWithLines(options), 'example.yml')

  it('rejects a reserved workflow label in any letter case', () => {
    for (const label of [
      'agent:ready',
      'Agent:Ready',
      'AGENT:TRIAGED',
      'In-Progress',
      'Blocked',
    ])
      expect(
        () => expectNoTriageLabels(parse({ top: [`labels: [bug, ${label}]`] })),
        label,
      ).toThrow()
    expectNoTriageLabels(parse({ top: ['labels: [bug, Agent-Ready-ish]'] }))
  })

  it('rejects a field label that is not a nonempty string', () => {
    for (const label of ['true', 'false', "''", '""'])
      expect(() => expectIssueFormSchema(parse({ label })), label).toThrow()
  })

  it('accepts plain and quoted string field labels', () => {
    for (const [label, expected] of [
      ['Example', 'Example'],
      ["'true'", 'true'],
      ['"Migration: phase two"', 'Migration: phase two'],
    ]) {
      const form = parse({ label })
      expect(form.body[0].attributes.label).toBe(expected)
      expectIssueFormSchema(form)
    }
  })
})

describe('engineering task form', () => {
  const form = readForm('engineering-task.yml')
  const field = (id) => form.body.find((element) => element.id === id)

  it('requires only the fields needed to pick the task up independently', () => {
    const required = form.body
      .filter((element) => element.validations?.required === true)
      .map((element) => element.id)
    expect(required).toEqual([
      'outcome',
      'evidence',
      'owned-paths',
      'acceptance',
    ])
    for (const id of [
      'exclusions',
      'dependencies',
      'target-release',
      'context',
    ])
      expect(field(id)?.validations?.required).not.toBe(true)
  })

  it('applies no labels, so triage decides readiness after filing', () => {
    expect(form.labels).toBeUndefined()
    const intro = form.body.find((element) => element.type === 'markdown')
    expect(intro.attributes.value).toContain('Target release')
    expect(intro.attributes.value).toContain('#agent-readiness')
  })

  it('teaches the Blocked by line that the release-scope sweep reads', () => {
    expect(field('dependencies').attributes.description).toContain(
      '`Blocked by: #123`',
    )
    expect(field('dependencies').attributes.placeholder).toBe(
      'Blocked by: #123',
    )
    // Only the release-scope sweep decides holds; this proves a body filed
    // from the form produces the blockers that sweep would act on.
    const blocked = renderIssueBody(form, {
      outcome: 'Menubar submenus open from the keyboard.',
      evidence: 'docs/components/submenu-spec.md is approved.',
      'owned-paths': 'packages/vue/src/components/menubar/',
      acceptance: '- [ ] `pnpm verify` passes',
      dependencies: 'Blocked by: #123, #456\nNeeds the approved submenu spec.',
      'target-release': '0.2.0',
    })
    expect([...bodyBlockers(blocked)]).toEqual([123, 456])

    const docsOnly = renderIssueBody(form, {
      outcome: 'Release docs link the task form.',
      evidence: 'docs/contributing/workflow.md lists only two forms.',
      'owned-paths': 'docs/contributing/workflow.md',
      acceptance: '- [ ] `pnpm docs:links` passes',
    })
    expect(docsOnly).toContain('### Dependencies\n\n_No response_')
    expect(bodyBlockers(docsOnly).size).toBe(0)
  })
})
