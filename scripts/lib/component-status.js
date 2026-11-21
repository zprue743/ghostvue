/**
 * Enforces the component stability policy (GHO-58) against the evidence a
 * manifest already records. See docs/standards/component-stability.md.
 *
 * The check only ever rejects a declared `status`; it never derives one.
 * Stability is a maintainer decision backed by recorded evidence, so a green
 * CI run, a package version, or `automatedKeyboard: passed` must never read as
 * a promotion. Review evidence comes from `accessibility.verification`
 * (GHO-42), resolved through `resolveVerification` so a missing record means
 * every category is `not-reviewed`.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { resolveVerification } from './accessibility-verification.js'
import { PLACEHOLDER_DESCRIPTIONS } from './component-manifests.js'

/** Statuses in promotion order. `deprecated` is an exit state, not a level. */
export const COMPONENT_STATUSES = Object.freeze([
  'experimental',
  'beta',
  'stable',
  'deprecated',
])

const PROMOTED_STATUSES = new Set(['beta', 'stable'])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function isPlaceholder(description, placeholder) {
  return (
    typeof description !== 'string' ||
    description.trim().length === 0 ||
    description === placeholder
  )
}

/**
 * Member descriptions still equal to the generated stand-in text. Beta and
 * stable components need human-written prose for every public member, because
 * the manifest is the API documentation docs and agents read.
 */
function placeholderMembers(manifest) {
  const missing = []
  if (
    isPlaceholder(
      manifest.description,
      PLACEHOLDER_DESCRIPTIONS.component(manifest.name),
    )
  )
    missing.push('description')
  for (const prop of list(manifest.props))
    if (
      isPlaceholder(prop.description, PLACEHOLDER_DESCRIPTIONS.prop(prop.name))
    )
      missing.push(`props.${prop.name}`)
  for (const model of list(manifest.models))
    if (
      isPlaceholder(
        model.description,
        PLACEHOLDER_DESCRIPTIONS.model(model.prop),
      )
    )
      missing.push(`models.${model.prop}`)
  for (const event of list(manifest.events))
    if (
      isPlaceholder(
        event.description,
        PLACEHOLDER_DESCRIPTIONS.event(event.name),
      )
    )
      missing.push(`events.${event.name}`)
  for (const slot of list(manifest.slots)) {
    if (
      isPlaceholder(slot.description, PLACEHOLDER_DESCRIPTIONS.slot(slot.name))
    )
      missing.push(`slots.${slot.name}`)
    for (const slotProp of list(slot.props))
      if (
        isPlaceholder(
          slotProp.description,
          PLACEHOLDER_DESCRIPTIONS.slotProp(slotProp.name),
        )
      )
        missing.push(`slots.${slot.name}.props.${slotProp.name}`)
  }
  for (const member of list(manifest.exposed))
    if (
      isPlaceholder(
        member.description,
        PLACEHOLDER_DESCRIPTIONS.exposed(member.kind, member.name),
      )
    )
      missing.push(`exposed.${member.name}`)
  return missing
}

/** Usage page that pairs with an approved spec (`foo-spec.md` -> `foo.md`). */
export function usagePageForSpec(specPath) {
  return specPath.replace(/-spec\.md$/, '.md')
}

/**
 * Policy violations for one manifest's declared `status`.
 *
 * - `experimental` and `deprecated`: no evidence requirement.
 * - `beta`: approved spec, usage page, at least one example, human-written
 *   descriptions for every public member, and automated keyboard evidence
 *   that passes for every declared key.
 * - `stable`: everything beta needs, plus `passed` manual interaction and
 *   assistive-technology reviews. The schema already requires at least one
 *   dated evidence entry for `passed`.
 *
 * @param {Record<string, any>} manifest
 * @param {{ file: string, docExists: (path: string) => boolean }} options
 */
export function validateStatusContract(manifest, { file, docExists }) {
  const status = manifest.status
  if (!PROMOTED_STATUSES.has(status)) return []
  const violations = []
  const fail = (message) => violations.push(`${file}: ${status} ${message}`)

  const spec = isRecord(manifest.spec) ? manifest.spec : undefined
  if (!spec || spec.status !== 'approved') {
    fail(
      'requires an approved component specification (manifest `spec` with status "approved")',
    )
  } else if (!docExists(usagePageForSpec(spec.path))) {
    fail(`requires the usage page ${usagePageForSpec(spec.path)}`)
  }
  if (list(manifest.examples).length === 0)
    fail('requires at least one executable example in `examples`')
  const placeholders = placeholderMembers(manifest)
  if (placeholders.length > 0)
    fail(
      `requires written descriptions; generated placeholder text remains for ${placeholders.join(', ')}`,
    )

  const verification = resolveVerification(manifest)
  const declaredKeys = Object.keys(
    isRecord(manifest.accessibility) &&
      isRecord(manifest.accessibility.keyboard)
      ? manifest.accessibility.keyboard
      : {},
  )
  // `failed` records a known keyboard defect; a component with one cannot be
  // promoted even if it declares no keys.
  if (
    verification.automatedKeyboard.status === 'failed' ||
    (declaredKeys.length > 0 &&
      verification.automatedKeyboard.status !== 'passed')
  )
    fail(
      `requires accessibility.verification.automatedKeyboard "passed" (found "${verification.automatedKeyboard.status}")`,
    )

  if (status === 'stable') {
    // Manual and AT review are separate categories on purpose: neither is
    // implied by automated results or by the other review.
    for (const [category, label] of [
      ['manual', 'manual interaction'],
      ['assistiveTechnology', 'assistive-technology'],
    ]) {
      if (verification[category].status !== 'passed')
        fail(
          `requires a passed ${label} review in accessibility.verification.${category} (found "${verification[category].status}")`,
        )
    }
  }
  return violations
}

/** Status violations for every manifest entry in the repository. */
export function validateRepositoryStatus(repositoryRoot, entries) {
  const docExists = (path) => existsSync(join(repositoryRoot, path))
  return entries.flatMap(({ file, manifest }) =>
    validateStatusContract(manifest, { file, docExists }),
  )
}
