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
 * fails loudly instead of skipping checks.
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

/** Removes one pair of matching YAML quotes from a plain scalar. */
function unquote(value) {
  const match = /^(['"])(.*)\1$/.exec(value)
  return match ? match[2].replaceAll("''", "'") : value
}

/**
 * Reads a nested `key: value` map at `indent`, collecting `|` block scalars
 * from the deeper-indented lines that follow.
 */
function readMap(lines, start, indent) {
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
      map[key] = unquote(raw)
    }
  }
  return { map, next: index }
}

/** Reads one issue form into its top-level keys and body elements. */
function readForm(file) {
  const lines = readFileSync(resolve(templatesDir, file), 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('#'))
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
            const { map, next } = readMap(lines, index + 1, 6)
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
          .map((item) => unquote(item.trim()))
          .filter(Boolean)
      : unquote(raw)
    index += 1
  }
  return form
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
    const form = readForm(file)
    expect(form.name).toBeTruthy()
    expect(form.description).toBeTruthy()
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
        expect(element.attributes?.label).toBeTruthy()
        if (element.validations)
          expect(element.validations.required).toMatch(/^(true|false)$/)
      }
    }
    // GitHub rejects a form whose ids or labels repeat.
    const ids = fields.map((element) => element.id)
    const labels = fields.map((element) => element.attributes.label)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it.each(formFiles)('%s applies no triage or readiness labels', (file) => {
    const labels = readForm(file).labels ?? []
    for (const label of triageLabels) expect(labels).not.toContain(label)
  })

  it('keeps existing bug and feature fields', () => {
    const required = (file) =>
      readForm(file)
        .body.filter((element) => element.validations?.required === 'true')
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

describe('engineering task form', () => {
  const form = readForm('engineering-task.yml')
  const field = (id) => form.body.find((element) => element.id === id)

  it('requires only the fields needed to pick the task up independently', () => {
    const required = form.body
      .filter((element) => element.validations?.required === 'true')
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
      expect(field(id)?.validations?.required).not.toBe('true')
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
