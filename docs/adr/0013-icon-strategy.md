# ADR 0013: Icon strategy

- Status: accepted
- Date: 2026-11-17
- Decision owners: Zac (repository maintainer), option A approved 2026-11-17
- Relates to: [ADR 0004](./0004-headless-styled-layering.md) (layering and
  styling hooks), [ADR 0005](./0005-design-token-taxonomy.md) (tokens),
  [dependency policy](../standards/dependencies.md),
  [GhostButton specification](/specs/button)

## Context

Several components need small graphics: loading rings, check marks, disclosure
chevrons, close glyphs, external-link arrows. Without a recorded policy each
component would pick its own source, and the cheapest-looking option, an icon
library, would add a runtime dependency to every consumer and fix the visual
language for applications that already own an icon set.

The repository already behaves mostly one way. Verified on `master` at the time
of this decision:

- **Headless components take icon content from the consumer.** `GhostButton`
  has one default slot; consumers place icons in it and opt into theme sizing
  with `data-part="icon"` or `data-part="loading-indicator"`. Select, Combobox,
  Accordion, Collapsible, Dialog close, and Popover close triggers render only
  their default slot, so no chevron or close icon ships with them.
- **Themed wrappers draw their default marks in CSS, not markup.** The
  `GhostButton` loading ring and the `GhostSpinner` ring are `::before`
  borders in `currentColor` or a tone variable. The `GhostCheckbox` check is
  the `\2713` text glyph and its indeterminate bar is a `linear-gradient` on
  `::before`. The `GhostRadioGroup` dot is an `::after` box. No themed wrapper
  renders an `<svg>`.
- **Sizing already flows from tokens.** `--ghost-action-icon-size` (`1.1em`)
  sizes `[data-part='icon']` in Button and Badge and the Link
  `[data-part='external-icon']`. `--ghost-action-spinner-size` and
  `--ghost-action-spinner-width` size loading rings. Both scale with font size
  because the token is in `em`.
- **Replacement already works through content.** A consumer
  `[data-part='loading-indicator']` inside a themed loading `GhostButton`
  suppresses the CSS default ring. `GhostBreadcrumbEllipsis` exposes an `icon`
  slot over its `…` glyph, and `GhostLink` exposes an `externalIndicator` slot.
- **One headless component ships an SVG.** `GhostLink` in `@ghostvue/vue`
  renders a 16×16 inline external-link SVG (stroke `currentColor`,
  `focusable="false"`) as the `externalIndicator` slot fallback, inside a span
  with `aria-hidden="true"`. This predates the decision.
- **Some headless components render text glyphs.** `GhostBreadcrumbSeparator`
  (`/`), `GhostBreadcrumbEllipsis` and `GhostPagination` (`…`),
  `GhostNumberInput` steppers (`−`, `+`), and the calendar navigation buttons
  (`Previous`, `Next` text) render plain text defaults. Separator, ellipsis,
  pagination, and calendar defaults can be replaced through slots; the number
  input stepper glyphs cannot.

No package depends on an icon library, and there is no shared icon registry,
adapter, or configuration API.

## Decision

1. **Headless components use consumer-supplied icon content.** `@ghostvue/vue`
   components expose icons through slots and `data-part` hooks on consumer
   markup. They do not choose icon artwork for the consumer.
2. **Themed wrappers may ship tiny, replaceable default icons.** A wrapper in
   `@ghostvue/themes` may provide a default mark only when the component would
   be unusable or visually broken without one. Prefer a CSS-painted mark
   (borders, gradients, text glyphs on a pseudo-element). When CSS cannot draw
   it, a wrapper may inline a small SVG of a few paths. Every default must be
   replaceable by consumer content through an existing slot or `data-part`
   opt-in.
3. **Theme defaults through color and size tokens.** Default and consumer
   icons paint with `currentColor` (or a private tone variable that resolves
   from semantic `--ghost-*` tokens), so tone, mode, disabled, and forced-colors
   styling apply without per-icon colors. Size comes from
   `--ghost-action-icon-size` or `--ghost-action-spinner-*`, in `em`, so icons
   track density and text size. Icons do not get their own token family until
   a component needs a value these tokens cannot express.
4. **No icon dependency or icon configuration surface.** No package adds an
   icon-library runtime dependency, and the project does not add a shared icon
   registry, provider, adapter, or icon configuration package. Applications
   pass their own icon components or SVG as slot content.
5. **Accessibility rules apply to every icon, default or consumer-supplied.**
   - Decorative icons are hidden from assistive technology with
     `aria-hidden="true"` on the icon or a wrapping element. Inline SVG should
     also carry `focusable="false"` so legacy engines do not add a tab stop.
   - An icon is never the only source of a control's accessible name.
     Icon-only controls must be named with `aria-label`, `aria-labelledby`, or
     visually hidden text such as `GhostVisuallyHidden`.
   - The `GhostButton` icon-only contract is retained unchanged: the default
     slot holds the icon, the consumer supplies the name, the themed wrapper's
     `iconOnly` prop (or `data-icon-only` on the unstyled button) only applies
     square sizing and does not name the button.
   - Icons that convey state are paired with a text or ARIA state; a glyph
     change alone is not a state announcement.
6. **New icon slots follow the component gate.** Adding a slot or default icon
   to an existing component is a public contract change. It needs a spec update
   and compatibility review under the
   [component workflow](../agents/COMPONENT_WORKFLOW.md); this ADR does not
   pre-approve any new slot.

### Existing exceptions

The headless `GhostLink` default SVG and the headless text glyphs listed under
Context predate this ADR. They stay as they are; removing them would change
rendered output for existing consumers. Text glyphs are typographic content,
not icon artwork, and are not treated as a violation. The `GhostLink` SVG does
not fit rule 1. Moving it to the themed wrapper is follow-up work that needs
its own compatibility review and Changeset. New headless components must not
add default icon artwork.

## Alternatives considered

- **Bundle an icon library (for example Lucide or Heroicons) as a runtime
  dependency.** Gives consistent artwork with little effort, but adds bundle
  size and supply-chain exposure for every consumer, couples releases to an
  upstream icon set, and conflicts with applications that already standardize
  on a different set. Rejected under the
  [dependency policy](../standards/dependencies.md).
- **Ship an icon adapter or configuration package** (a provider or
  `defineIcons()` map that components resolve icons from). Lets consumers swap
  icons globally, but creates a new package and a registry the architecture
  rules prohibit without demonstrated need, hides icon content behind string
  keys that slots already express, and complicates SSR and tree-shaking.
  Rejected; slots cover the same need per instance.
- **Icon name props** (for example `icon="close"`). Requires a lookup table,
  which is the adapter above in another form, and splits customization between
  props and slots. Rejected in favor of the slot rule in ADR 0004.
- **Slots only, with no defaults anywhere.** Simplest boundary, but themed
  components such as a loading button or checkbox would render blank until the
  consumer supplied artwork. Rejected for themed wrappers, kept for headless.

## Consequences

- Consumers keep full control of icon artwork and pay no bundle cost for icons
  they do not use.
- Headless components stay free of visual assets, consistent with ADR 0004.
- Themed wrappers stay usable without extra imports, at the cost of keeping
  their few defaults small and maintained in CSS or inline markup.
- Applications that want the same icon in many places must wrap it in their own
  component; the library does not provide global icon swapping.
- Component specs must state, for each icon position, whether a default exists,
  which layer owns it, and how to replace it.
- Follow-up candidates, each needing its own review: move the `GhostLink`
  default SVG out of the headless component, and consider a stepper content slot
  for `GhostNumberInput`.

## Compatibility implications

No public API changes. Button, Link, Breadcrumb, Pagination, NumberInput, and
themed CSS behave exactly as before. No dependency, export, token, or package is
added, so there is no release, SSR, or browser impact. Accessibility guidance is
clarified, not changed: the rules restate what the Button and Link specs and
examples already require.
