---
schemaVersion: 1.0.0
component: GhostColorSwatch
components:
  - GhostColorSwatch
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests: []
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions:
  - question: 'Colour input validation: SSR-safe character guard (proposed) vs pass-through vs client-only CSS.supports check before a consumer string reaches the inline style.'
    blocking: false
    reviewer: Zac
  - question: 'Naming default: decorative unless label is set (proposed) vs an explicit decorative prop with a development warning when neither a name nor decorative is given.'
    blocking: false
    reviewer: Zac
  - question: 'Package split: headless @ghostvue/vue plus themed wrapper (proposed) vs themed-only, given the headless part paints nothing without CSS.'
    blocking: false
    reviewer: Zac
  - question: 'Label or value slot: consumer composition only (proposed) vs a built-in label/value part next to the chip.'
    blocking: false
    reviewer: Zac
  - question: 'Transparent colours: always-on checkerboard backdrop in the themed recipe (proposed) vs opt-in prop vs none.'
    blocking: false
    reviewer: Zac
  - question: 'Size and shape scale: component-local size custom properties and --ghost-radius-sm (proposed) vs new DTCG swatch tokens, and whether a circle shape prop is needed.'
    blocking: false
    reviewer: Zac
---

# GhostColorSwatch specification

**Status:** Proposed for
[Issue #341](https://github.com/zprue743/ghostvue/issues/341). No production
markup, package exports, manifests, or Changeset land before Zac resolves the
open questions below and promotes `specStatus` to `approved`.

**Related:** [GhostAvatar specification](/specs/avatar),
[GhostKbd specification](/specs/kbd),
[accessibility standard](../standards/accessibility.md),
[styling architecture](../architecture/styling.md), and the
[design token catalog](../themes/tokens.md).

## Purpose and user problems

`GhostColorSwatch` is a small, non-interactive chip that shows one colour. The
colour is a CSS colour value (`#1d4ed8`, `oklch(…)`) or a reference to a custom
property (`var(--ghost-action-primary-bg)`), so a swatch can follow the active
theme and light or dark mode without JavaScript.

Consumers need:

- one consistent chip for token tables, theme previews, and legends, instead of
  a hand-styled `<span>` per page;
- a clear accessible-naming rule: hidden when a visible label sits beside it,
  named when it stands alone;
- a chip that still shows its authored colour in forced colors mode, since the
  colour is the content, with a boundary that stays visible; and
- size and corner shape that follow the theme's size and roundness scale.

The first in-repo consumer is the landing page theming section.
`apps/docs/.vitepress/theme/GhostLanding.vue` renders a bespoke
`<span class="ghost-landing__swatch-chip" aria-hidden="true">` next to a visible
label, styled in `landing-page.css` with a 1px `--ghost-border-default` border,
`calc(0.4rem * var(--ghost-roundness, 1))` corners, and
`forced-color-adjust: none`. That chip moves to `GhostColorSwatch` after this
spec is approved and implemented. The token pages under `docs/themes/` are a
candidate second consumer.

## Non-goals

- **Colour picking or editing.** No picker, input, eyedropper, palette
  selection, or `v-model`. A selectable swatch grid is a separate component
  (for example a radio group whose items contain swatches).
- **Any interaction.** No click, hover, copy-to-clipboard, tooltip, or focus.
  Consumers wrap the swatch in `GhostButton`, `GhostTooltip`, or a link when
  they need behaviour, and that wrapper owns the accessible name.
- **Colour maths.** No conversion between formats, contrast calculation,
  automatic readable-text colour, or colour-name generation.
- **Contrast guarantees.** The component makes no claim about the contrast of
  the fill against its surroundings or against any text. The boundary exists
  so the chip's edge stays visible, not to certify a contrast ratio.
- **Ramps and palettes.** A row of swatches is consumer layout (a list or
  grid). There is no `GhostColorSwatchGroup` in this scope.
- **Status meaning.** A swatch is not a status indicator. Use `GhostBadge` or
  `GhostInlineAlert` when colour stands for a state, because those carry text.
- **GHO-38 styling hooks.** This component uses the existing `data-part` and
  configuration `data-*` attributes from ADR 0004. It does not add `pt` or CSS
  shadow parts.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostColorSwatch` / `useGhostColorSwatch`:

| Prop    | Type     | Default  | Contract                                                                                                                                                                                                                                        |
| ------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color` | `string` | required | The colour to show. Any CSS `<color>` value or `var(--name)` reference. A bare custom property name (`--name`) is normalised to `var(--name)`. Values that fail the input guard are not applied; see [Consumer data](#consumer-data).           |
| `label` | `string` | omitted  | Text alternative for a standalone swatch. When set (non-empty after trimming), the root gets `role="img"` and `aria-label`. When omitted or empty, the swatch is decorative and gets `aria-hidden="true"`. See open question 2 for the default. |

The root is a native `<span>` (phrasing content, so a swatch can sit inline in
a sentence, a table cell, or a list item). There is no `as` prop: the swatch
has no children, so a `div` host adds nothing.

Native attributes fall through to the root, including `id`, `class`, `style`,
`title`, `data-*`, `aria-label`, and `aria-labelledby`. Consumer `class` and
`style` merge with the component's own and never replace the colour custom
property. A consumer `aria-label` or `aria-labelledby` counts as a name in the
same way as `label` (the root becomes `role="img"` and is not hidden).

Named ESM exports: `GhostColorSwatch`, `useGhostColorSwatch`,
`GhostColorSwatchProps`, `UseGhostColorSwatchOptions`, and
`UseGhostColorSwatchReturn`. Whether to also export the pure guard as
`normalizeGhostSwatchColor` is decided with open question 1.

Themed `@ghostvue/themes` `GhostColorSwatch` wraps the headless component and
adds one visual prop:

| Prop   | Type                   | Default | Contract                                                                 |
| ------ | ---------------------- | ------- | ------------------------------------------------------------------------ |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Chip dimensions. The default omits `data-size` so CSS treats it as `md`. |

As in `GhostKbd` and `GhostAvatar`, the themed wrapper renders the headless
root inside `.ghost-themed-scope` (`display: contents`) so recipe CSS styles
that instance without styling every `.ghost-color-swatch` on the page.

### v-model contracts

There is no model. The swatch displays a prop and owns no state.

### Events, callbacks, slots, and exposed methods

- **Events:** none declared. Native listeners attach to the root `<span>` and
  receive native events. A swatch is not a control, so documentation steers
  click handling to a wrapping button.
- **Slots:** none. The chip has no content. Visible labels and colour values
  sit beside it in consumer markup; open question 4 asks whether a built-in
  label or value part belongs here instead.
- **Exposed:** none. The root has no focus contract. Consumers who need the
  element use the component instance `$el` (single native root).

## State model

The component is display-only. Its rendered output is a pure function of
`color`, `label`, and fallthrough attributes. There is no open, pressed,
selected, loading, or disabled state.

### Loading, empty, disabled, read-only, and error states

- **Loading, disabled, read-only:** not applicable. Hiding a swatch is the
  consumer's `v-if`.
- **Unresolved custom property:** `var(--missing)` with no fallback makes
  `background-color` invalid at computed-value time, so the chip paints
  `transparent`. The boundary and (in the themed recipe) the checkerboard stay
  visible, so an empty chip is still recognisable as a chip. Consumers who want
  a fallback write `var(--name, #ccc)`.
- **Rejected value:** a `color` string that fails the input guard is not
  applied. The chip paints the same way as an unresolved custom property and a
  development warning (a new `GHOST*` code in `packages/vue/src/dev-codes.ts`)
  names the rejected value. Production builds stay silent.
- **Empty string:** treated as a rejected value.

There is no `data-state` for these cases. A swatch that silently shows nothing
is a consumer bug, and the development warning is the signal.

### Async behavior

None. The component does not fetch, wait, or announce.

## Consumer data

`color` and `label` are strings owned by the consumer. The component does not
mutate them.

The colour reaches the DOM only through one inline custom property,
`--ghost-color-swatch-color`, which recipe CSS reads as
`background-color: var(--ghost-color-swatch-color)`. Keeping the value inside
a custom property means a value that is not a colour (for example
`url(…)`) is invalid at computed-value time for `background-color` and paints
nothing, rather than becoming an image.

That alone does not protect the server-rendered `style` attribute, where Vue
serialises the value as text. A value containing `;` could end the declaration
and add others (for example a `background-image` that requests a remote URL).
The proposed guard, run identically on server and client:

1. Trim the string. Reject it when empty.
2. Normalise a bare `--name` to `var(--name)`.
3. Reject it when it contains `;`, `{`, `}`, `<`, `>`, `\`, a newline, or the
   case-insensitive substrings `url(`, `image(`, or `expression(`.
4. Otherwise apply it unchanged. The browser decides whether it is a valid
   colour; the component does not parse CSS colour syntax.

This is a narrow injection guard, not a colour validator. Documentation says
that `color` should not take untrusted input directly, and that apps showing
user-supplied colours should validate them first. Open question 1 asks whether
this guard is the right line, or whether the component should pass values
through, or add a client-only `CSS.supports('color', value)` check (which
cannot run during SSR and would change markup after hydration).

## Accessibility contract

### Semantics and relationships

There is no APG pattern for a colour chip. The component follows the
[Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
practice and the [accessibility standard](../standards/accessibility.md)
rule that meaning is never carried by colour alone.

The swatch has exactly two modes, decided by whether a name is present:

| Mode       | When                                                                             | Root markup                                      |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Decorative | No `label`, no `aria-label`, no `aria-labelledby`                                | `<span aria-hidden="true">`, no `role`           |
| Standalone | `label` set, or consumer passes `aria-label` / `aria-labelledby` as an attribute | `<span role="img" aria-label="…">`, never hidden |

- **Decorative** is for a swatch with a visible label beside it, such as the
  landing page list, where the text already names the colour. Hiding the chip
  stops screen readers from reading an empty image next to the label.
- **Standalone** is for a swatch with no visible text, such as a colour column
  in a table without a value column. `role="img"` makes the span an image in
  the accessibility tree, and it then requires an accessible name.
- The component never renders `role="img"` without a name, and never renders
  `aria-hidden="true"` together with a name. When `label` and a consumer
  `aria-label` are both set, the consumer attribute wins (attribute
  fallthrough) and documentation recommends using one.
- The name should say what the colour means or which token it is
  ("Primary action", "Primary action, #1d4ed8"), not only a colour word.
  Colour names are subjective and do not help users who cannot see the fill.
  This is guidance; the component does not inspect the label.

Consumer `title` attributes fall through but are not a substitute for a name:
`title` is not reliably exposed to touch or keyboard users.

### Keyboard interaction

None. The swatch is not a control and handles no keys.

### Focus behavior

The root is never focusable and receives no `tabindex`. The component does not
move, trap, or restore focus. A consumer wrapper that is interactive (button,
link) owns focus and its visible focus indicator.

### Assistive technology expectations

- Decorative swatches are skipped. The adjacent visible label is read as
  ordinary text.
- Standalone swatches are announced as an image (or graphic) with their name,
  for example "Primary action, image".
- Changing `color` is not announced. A swatch is not a live region.
- Automated checks can confirm the role/name pairing but cannot judge whether
  a name describes the colour's meaning. That stays with the consumer.

### Forced colors

The colour is the content, so the root sets `forced-color-adjust: none` and
keeps its authored fill when `forced-colors: active`. This matches the bespoke
landing chip and the selected-indicator pattern already used in
`ghost-checkbox.css` and `ghost-radio-group.css`.

Because `forced-color-adjust: none` also stops the browser from replacing the
border colour, the recipe sets the boundary explicitly inside
`@media (forced-colors: active)` to `CanvasText`, so the chip edge stays
visible on any user-chosen background. The boundary uses `border` (not
`box-shadow` or `outline`) because forced colors mode removes box shadows.

### Contrast

The component does not compute or guarantee contrast and documentation must
not claim that it does. The themed 1px boundary keeps a light chip on a light
surface (or a dark chip on a dark surface) from disappearing into the page, but
it is a fixed theme border colour, not an adaptive one.

## Rendering and customization

Stable styling hooks (ADR 0004):

- class `ghost-color-swatch` on the root
- `data-part="root"`
- inline custom property `--ghost-color-swatch-color` holding the normalised
  colour (omitted when the value is rejected)
- themed `data-size`: `sm`, `lg` (default `md` omitted)

The headless component ships no visual CSS. On its own it is an empty inline
`<span>` with a custom property, so consumers who use it unstyled must give it
dimensions and read the custom property themselves. Open question 3 asks
whether that headless layer is worth publishing.

The themed recipe (`packages/themes/src/ghost-color-swatch.css`, in
`@layer ghostvue-theme`, scoped by `.ghost-theme` / `.ghost-themed-scope`):

- `display: inline-block`, `flex: none`, `vertical-align: middle`, equal
  `inline-size` and `block-size` from a component-local
  `--ghost-color-swatch-size` (proposed `sm` 1rem, `md` 1.25rem, `lg` 1.5rem;
  see open question 6);
- `border: 1px solid var(--ghost-border-default)`;
- `border-radius: var(--ghost-radius-sm)`, which already scales with
  `--ghost-roundness`, so a sharp theme gets square chips and a rounded theme
  gets rounded ones;
- `background-color: var(--ghost-color-swatch-color)` layered over a
  checkerboard `background-image` drawn with two neutral tokens, so
  translucent colours show their alpha (open question 5);
- `forced-color-adjust: none` and a `CanvasText` border under
  `@media (forced-colors: active)`.

Consumers override size with `--ghost-color-swatch-size` and corners with
`border-radius` on the class, without depending on internal wrappers.

## Environment behavior

### SSR and hydration

Setup reads no browser globals. The input guard is a pure string function, so
server and client produce the same `style`, `role`, and `aria-*` output and
hydration has nothing to correct. A `var(--token)` colour resolves in CSS on
both sides, so theme and dark-mode changes repaint the chip without a
re-render.

### Mobile and touch

Not a control and not a touch target, so minimum target sizes do not apply.
Sizes are in `rem`, so the chip scales with the user's text size and with page
zoom.

## Performance

Each swatch is one element with one inline custom property. There are no
listeners, observers, timers, or watchers beyond Vue's prop reactivity. Token
tables with hundreds of swatches (for example the colour ramps in
`docs/themes/tokens.md`) render in linear time and need no virtualisation.

## Composition

- `useGhostColorSwatch` owns the input guard, `var()` normalisation, and the
  decorative-versus-standalone attribute decision. `GhostColorSwatch` spreads
  those bindings on a native `<span>`.
- The themed wrapper follows the `GhostKbd` and `GhostAvatar` pattern:
  `.ghost-themed-scope` host, `data-size` only for non-default sizes, and
  `--ghost-*` tokens only.
- No existing primitive is reused for naming. `GhostVisuallyHidden` is not
  needed because the name lives on the root (`aria-label`), not in hidden text.
- Behaviour stays in `packages/vue`. Nothing here needs `packages/core`: there
  is no non-Vue consumer, and being framework-independent is not enough reason
  to promote code (`docs/agents/ARCHITECTURE_RULES.md`).

## Test plan

- **Vue component tests (`packages/vue/src`):**
  - decorative by default: `aria-hidden="true"`, no `role`, no `aria-label`;
  - `label` produces `role="img"` and `aria-label`, never with `aria-hidden`;
  - whitespace-only `label` stays decorative;
  - consumer `aria-label` or `aria-labelledby` switches to standalone mode and
    wins over `label`;
  - `color` is applied as `--ghost-color-swatch-color` for hex, functional
    notation, `var(--x)`, and `var(--x, fallback)`;
  - bare `--x` is normalised to `var(--x)`;
  - each rejected input (empty, `;`, braces, `url(`, `image(`, newline,
    backslash) omits the custom property and emits the development warning
    once per value, and stays silent in production mode;
  - consumer `class` and `style` merge and cannot remove the custom property;
  - `renderToString` output matches client markup (no hydration mismatch).
- **Themed tests (`packages/themes/src`):** `data-size` set only for `sm`/`lg`;
  `.ghost-themed-scope` host; props forward to the headless root.
- **Compile-time tests:** `color` is required; `label` is optional; native
  span attributes are accepted on `GhostColorSwatchProps`.
- **Browser tests (`tests/e2e`):** axe on every registered example; computed
  `background-color` matches the authored colour and follows a theme switch
  for `var()` colours; under emulated `forced-colors: active` the fill keeps
  its authored colour and the border computes to `CanvasText`; the accessibility
  tree shows an image with the given name in standalone mode and no node in
  decorative mode. Visual baselines through `pnpm test:visual:docker` only.
- **Not required:** keyboard and focus suites (not a widget) and
  framework-neutral unit tests (no `core` logic).

## Documentation plan

Implementation PR scope, described here and not implemented in this change:

- `packages/vue/src` and `packages/themes/src`: component, composable,
  `ghost-color-swatch.css` recipe, tests, and
  `packages/{vue,themes}/manifests/ghost-color-swatch.manifest.json` generated
  with `pnpm manifests:write`. This spec's `manifests` list is updated to match.
- `examples/color-swatch/`: decorative swatch with a visible label, standalone
  swatch with `label`, token reference (`var(--ghost-…)`) that follows the
  theme, translucent colour, and themed sizes.
- `docs/components/color-swatch.md`: API reference (generated tables), the
  two naming modes with a "which one do I need" rule, the "colour alone must
  not carry meaning" guidance, forced colors behaviour, the input guard and the
  advice not to pass untrusted colours, "when not to use this" (status, picking,
  interaction), and a link to this spec.
- `docs/roadmap.md`: add only this component's row.
- Changeset: minor for `@ghostvue/vue` and `@ghostvue/themes`.
- Replace the bespoke `.ghost-landing__swatch-chip` in `GhostLanding.vue` and
  `landing-page.css` with the themed `GhostColorSwatch` in decorative mode,
  removing the "Bespoke" comment.
- Optional follow-up, not required by the implementation PR: render token
  swatches in `docs/themes/` with the component. `docs/themes/tokens.md` is
  generated, so that change belongs in its generator.

## Compatibility and release impact

This spec changes no package and needs no Changeset. The implementation is
additive (minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`).

Its public contract will be `color`, `label`, the decorative-versus-standalone
rule, the input guard, `useGhostColorSwatch`, the `ghost-color-swatch` class,
`data-part="root"`, the `--ghost-color-swatch-color` and
`--ghost-color-swatch-size` custom properties, and the themed `size` prop.
Later changes to the naming default, the guard's accepted characters, or the
custom property names need compatibility review.

## Open architectural questions

None blocking. Each has a proposed default; Zac resolves them before
`specStatus` becomes `approved`.

1. **Colour input validation.** Should arbitrary strings reach the inline
   style? Proposed: the SSR-safe character guard in
   [Consumer data](#consumer-data). Alternatives: pass values through and
   document the risk, or add a client-only `CSS.supports('color', …)` check
   (SSR markup would differ from the client after mount). Also decide whether
   the guard is exported.
2. **Naming default.** Proposed: decorative unless `label` (or a consumer
   `aria-label` / `aria-labelledby`) is present. Alternative: an explicit
   `decorative` boolean, with a development warning when a swatch has neither
   a name nor `decorative`, so a forgotten label is caught instead of silently
   hidden.
3. **Headless versus themed split.** Proposed: headless `@ghostvue/vue`
   component plus themed wrapper, matching every other component. The headless
   part paints nothing without CSS, so the alternative is a themed-only
   component, which would be the first export without a headless counterpart.
4. **Label or value slot.** Proposed: none; the visible label and any colour
   value are consumer markup beside the chip. Alternative: an optional label
   or value part (for example `<GhostColorSwatch color="…">Primary</GhostColorSwatch>`)
   that renders text next to the chip and sets decorative mode automatically.
5. **Checkerboard for transparent colours.** Proposed: the themed recipe
   always draws a checkerboard under the fill, which opaque colours cover.
   Alternatives: an opt-in prop, or no checkerboard (translucent chips then
   take the page colour behind them).
6. **Size and shape scale.** Proposed: component-local
   `--ghost-color-swatch-size` values (1rem, 1.25rem, 1.5rem) and
   `--ghost-radius-sm` corners. `--ghost-control-size-*` is for 32–40px
   controls and is too large for an inline chip. Alternatives: new DTCG swatch
   size tokens under `packages/themes/tokens/`. Also decide whether a `shape`
   prop (for example a circle using `--ghost-radius-pill`) is needed, or
   consumers set `border-radius` themselves.
