import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { resolveVerification } from './accessibility-verification.js'
import { MANIFEST_PACKAGES, pascalToKebab } from './component-manifests.js'

// Escape prose as text: manifest descriptions can contain HTML, pipes and
// Vue interpolation, none of which should become executable docs markup.
function text(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;')
    .replaceAll('*', '&#42;')
    .replaceAll('_', '&#95;')
    .replaceAll('[', '&#91;')
    .replaceAll(']', '&#93;')
    .replaceAll(/\r?\n/g, ' ')
}

function code(value) {
  return `<code>${text(value)}</code>`
}

// Shared with the docs API tables (scripts/lib/docs-api.js) so hand-maintained
// pages and the generated reference escape manifest text the same way.
export { code as referenceCode, text as referenceText }

function table(title, columns, rows, heading = '##') {
  return [
    `${heading} ${title}`,
    '',
    ...(rows.length
      ? [
          `| ${columns.join(' | ')} |`,
          `| ${columns.map(() => '---').join(' | ')} |`,
          ...rows.map((row) => `| ${row.join(' | ')} |`),
        ]
      : ['None declared.']),
    '',
  ].join('\n')
}

const STATUS_LABELS = {
  passed: 'Passed',
  failed: 'Failed',
  'not-reviewed': 'Not reviewed',
}

const REPOSITORY_BLOB = 'https://github.com/zprue743/ghostvue/blob/master/'

// VitePress default-theme badge types. The badge text stays the raw manifest
// value so readers, search, and llms.txt see the same token tools read.
const STABILITY_BADGE_TYPES = {
  experimental: 'warning',
  beta: 'info',
  stable: 'tip',
  deprecated: 'danger',
}

/** Status badge for the manifest `status` field (GHO-58). */
export function stabilityBadge(status) {
  const type = STABILITY_BADGE_TYPES[status] ?? 'info'
  return `<Badge type="${type}" text="${text(status)}" />`
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? text(status)
}

function testLink(reference) {
  return `<a href="${REPOSITORY_BLOB}${encodeURI(reference.spec)}">${text(reference.title)}</a> (${code(reference.package)})`
}

function reviewEvidence(entry) {
  const environment = [
    entry.environment.assistiveTechnology,
    entry.environment.browser,
    entry.environment.platform,
  ]
    .filter(Boolean)
    .map(text)
    .join(', ')
  const reference = entry.reference.startsWith('https://')
    ? entry.reference
    : `${REPOSITORY_BLOB}${entry.reference}`
  return `${text(entry.date)}, ${text(entry.reviewer)}, ${code(entry.package)} at ${code(entry.revision)} (${environment}): ${text(entry.summary)} <a href="${encodeURI(reference)}">Record</a>`
}

/**
 * Accessibility contract plus the three verification categories, each shown
 * on its own row. A passed automated row never implies the review rows.
 */
function accessibilitySection(manifest) {
  const accessibility = manifest.accessibility
  const verification = resolveVerification(manifest)
  const { automatedKeyboard, manual, assistiveTechnology } = verification
  const keyboardRows = Object.entries(accessibility.keyboard).map(
    ([key, action]) => [
      code(key),
      text(action),
      automatedKeyboard.status === 'not-reviewed'
        ? 'Not reviewed'
        : (automatedKeyboard.keys[key] ?? []).map(testLink).join('<br>'),
    ],
  )
  const reviewCell = (category) =>
    category.evidence.length
      ? category.evidence.map(reviewEvidence).join('<br>')
      : 'No review recorded.'
  return [
    '## Accessibility',
    '',
    `Role: ${code(accessibility.role)}. APG pattern: <a href="${encodeURI(accessibility.apgPattern)}">${text(accessibility.apgPattern)}</a>.`,
    '',
    `Required ARIA attributes: ${
      accessibility.requiredAriaAttributes.length
        ? accessibility.requiredAriaAttributes.map(code).join(', ')
        : 'none'
    }.`,
    '',
    table(
      'Keyboard',
      ['Key', 'Action', 'Automated browser test'],
      keyboardRows,
      '###',
    ),
    '### Verification',
    '',
    'Each category is reviewed separately. Automated keyboard and axe results do not attest manual or assistive-technology review.',
    '',
    '| Category | Status | Evidence |',
    '| --- | --- | --- |',
    `| Automated keyboard | ${statusLabel(automatedKeyboard.status)} | ${
      automatedKeyboard.status === 'not-reviewed'
        ? 'No declared key is mapped to a browser test yet.'
        : 'Every declared key maps to a Chromium browser test that CI runs and requires to pass on every commit.'
    } |`,
    `| Manual interaction | ${statusLabel(manual.status)} | ${reviewCell(manual)} |`,
    `| Assistive technology | ${statusLabel(assistiveTechnology.status)} | ${reviewCell(assistiveTechnology)} |`,
    '',
  ].join('\n')
}

/** Render the existing manifest contract without inferring undocumented APIs. */
export function manifestToMarkdown(manifest) {
  return [
    `# ${manifest.name} reference`,
    '',
    `Package: ${code(manifest.package)}. Status: ${stabilityBadge(manifest.status)} ([stability policy](/standards/component-stability)).`,
    '',
    text(manifest.description),
    '',
    'Generated from the component manifest. Edit the manifest or Vue source, then rebuild the docs.',
    '',
    '[All component references](/reference/)',
    '',
    table(
      'Props',
      ['Name', 'Type', 'Default', 'Required', 'Description'],
      manifest.props.map((prop) => [
        code(prop.name),
        code(prop.type),
        Object.hasOwn(prop, 'default')
          ? code(JSON.stringify(prop.default))
          : '—',
        prop.required ? 'Yes' : 'No',
        text(prop.description),
      ]),
    ),
    table(
      'Emits',
      ['Name', 'Payload', 'Description'],
      manifest.events.map((event) => [
        code(event.name),
        code(event.payloadType),
        text(event.description),
      ]),
    ),
    table(
      'Models',
      ['Prop', 'Event', 'Type', 'Description'],
      manifest.models.map((model) => [
        code(model.prop),
        code(model.event),
        code(model.type),
        text(model.description),
      ]),
    ),
    table(
      'Slots',
      ['Name', 'Description'],
      manifest.slots.map((slot) => [code(slot.name), text(slot.description)]),
    ),
    ...manifest.slots.map((slot) =>
      table(
        `Slot props: ${slot.name}`,
        ['Name', 'Type', 'Description'],
        slot.props.map((prop) => [
          code(prop.name),
          code(prop.type),
          text(prop.description),
        ]),
      ),
    ),
    table(
      'Exposed members',
      ['Name', 'Type', 'Description'],
      manifest.exposed.map((member) => [
        code(member.name),
        code(member.type),
        text(member.description),
      ]),
    ),
    table(
      'Parts and data attributes',
      ['Attribute', 'Value', 'Description'],
      [
        ...manifest.styling.parts.map((part) => [
          code('data-part'),
          code(part.name),
          text(part.description),
        ]),
        ...manifest.styling.states.map((state) => [
          code('data-state'),
          code(state.name),
          text(state.description),
        ]),
        // Presence attributes have no value list: they render as an empty
        // string when true and are absent otherwise.
        ...(manifest.styling.attributes ?? []).map((attribute) => [
          code(attribute.name),
          attribute.values.length
            ? attribute.values.map(code).join(', ')
            : 'present',
          text(attribute.description),
        ]),
      ],
    ),
    table(
      'CSS variables',
      ['Name', 'Description'],
      manifest.styling.cssProperties.map((property) => [
        code(property.name),
        text(property.description),
      ]),
    ),
    accessibilitySection(manifest),
    '## Examples',
    '',
    ...(manifest.examples.length
      ? manifest.examples.flatMap((id) => [
          `### ${id}`,
          '',
          `[Example source](https://github.com/zprue743/ghostvue/blob/master/examples/${id}.vue)`,
          '',
          `<GhostExample id="${id}" />`,
          '',
        ])
      : ['None declared.', '']),
  ].join('\n')
}

/** Rebuild the exclusively generated directory, removing obsolete pages too. */
export async function writeComponentReferences(repositoryRoot) {
  const output = join(repositoryRoot, 'docs/reference')
  await rm(output, { recursive: true, force: true })
  const links = []
  for (const spec of MANIFEST_PACKAGES) {
    const directory = join(
      repositoryRoot,
      'packages',
      spec.directory,
      'manifests',
    )
    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.manifest.json'))
      .sort()
    await mkdir(join(output, spec.directory), { recursive: true })
    for (const file of files) {
      const manifest = JSON.parse(await readFile(join(directory, file), 'utf8'))
      const slug = pascalToKebab(manifest.name)
      await writeFile(
        join(output, spec.directory, `${slug}.md`),
        manifestToMarkdown(manifest),
      )
      links.push(
        `- [${manifest.name} (${manifest.package})](./${spec.directory}/${slug}.md) ${stabilityBadge(manifest.status)}`,
      )
    }
  }
  await writeFile(
    join(output, 'index.md'),
    `# Component references\n\nGenerated from the same manifests checked by \`pnpm manifests\`. Native fallthrough attributes and undocumented hooks are not inferred. Badges show each manifest \`status\`; see the [component stability policy](/standards/component-stability).\n\n${links.join('\n')}\n`,
  )
}
