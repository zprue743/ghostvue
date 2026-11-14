import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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

function table(title, columns, rows) {
  return [
    `## ${title}`,
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

/** Render the existing manifest contract without inferring undocumented APIs. */
export function manifestToMarkdown(manifest) {
  return [
    `# ${manifest.name} reference`,
    '',
    `Package: ${code(manifest.package)}. Status: ${text(manifest.status)}.`,
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
        `- [${manifest.name} (${manifest.package})](./${spec.directory}/${slug}.md)`,
      )
    }
  }
  await writeFile(
    join(output, 'index.md'),
    `# Component references\n\nGenerated from the same manifests checked by \`pnpm manifests\`. Native fallthrough attributes and undocumented hooks are not inferred.\n\n${links.join('\n')}\n`,
  )
}
