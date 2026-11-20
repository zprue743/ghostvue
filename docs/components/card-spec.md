---
schemaVersion: 1.0.0
component: GhostCard
components:
  - GhostCard
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests:
  - packages/vue/manifests/ghost-card.manifest.json
  - packages/themes/manifests/ghost-card.manifest.json
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
unresolvedQuestions: []
---

# GhostCard specification

**Status:** Proposed for [GHO-96](https://linear.app/ghost-vue/issue/GHO-96).
Spec and implementation ship together; Zac approves both in PR review.

## Purpose and user problems

`GhostCard` is a composable surface container with optional **header**, **content**,
and **footer** parts. Dashboards, settings panels, and catalog grids need a
predictable structure and stable styling hooks without prescribing layout or
chrome. Optional ambient **spotlight** reuses `useGhostInteractiveSurface` (ADR 0009) so a resting card can feel alive while semantics stay on the root element the
consumer chooses.

The consumer owns copy, density, and whether the whole card navigates or only
in-card actions activate. This primitive supplies part wrappers, accessibility
guards for action roots, and token-driven themed defaults.

## Non-goals

- Fixed grid layouts, media-object presets, or built-in cover images.
- Card selection, multi-select, or roving focus across a card list.
- Replacing `GhostDialog`, `GhostPopover`, or disclosure primitives.
- A parallel styling-hooks vocabulary. GHO-38 remains undecided; this uses
  `data-part`, `data-ghost-card`, `data-interactive`, and existing classes from
  ADR 0004.
- Ship layout in the unstyled package. Spacing and elevation belong to the themed
  wrapper or consumer CSS.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostCard` / `useGhostCard`:

| Prop      | Type                  | Default     | Contract                                                                                                                                 |
| --------- | --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `as`      | `GhostCardElement`    | `'article'` | Root element. Native `article` suits self-contained summaries; use `div` inside foreign contexts; `a` / `button` for whole-card actions. |
| `effects` | `InteractiveEffect[]` | `[]`        | Spotlight recipes on `data-interactive`. Empty array keeps the card inert (no glow, no pointer listeners).                               |

```ts
type GhostCardElement = 'div' | 'article' | 'section' | 'aside' | 'a' | 'button'

type InteractiveEffect = 'spotlight' // from ghost-interactive-surface
```

Named ESM exports: `GhostCard`, `useGhostCard`, spotlight types re-exported
from `ghost-interactive-surface`, and the types above.

Native attributes and listeners fall through to the root (`href`, `type`,
`aria-*`, `class`, and so on). When `effects` includes `spotlight`, the
component composes `useGhostInteractiveSurface` with
`stateAttribute: 'data-interactive-state'` so a future `data-state` on the card
is not overwritten. A decorative `data-part="glow"` child is rendered when
spotlight is active.

### v-model contracts

None.

### Events, callbacks, slots, and exposed methods

| Slot      | Part      | Contract                                                                                          |
| --------- | --------- | ------------------------------------------------------------------------------------------------- |
| `header`  | `header`  | Optional top region. `div` by default; `span` on `a` / `button` roots for valid phrasing content. |
| `default` | `content` | Primary body copy or controls.                                                                    |
| `footer`  | `footer`  | Optional bottom region for secondary actions when the root is **not** an action element.          |

When `as` is `button` and `type` is omitted, the root defaults to `type="button"`.

No component-specific events. Exposed API:

- `element: HTMLElement | null` — root after mount.

### Themed `@ghostvue/themes` `GhostCard`

Wraps the unstyled primitive. Adds optional ambient spotlight:

| Prop          | Type                       | Default | Contract                                                        |
| ------------- | -------------------------- | ------- | --------------------------------------------------------------- |
| `interactive` | `'spotlight' \| undefined` | omitted | When `'spotlight'`, forwards `effects: ['spotlight']` and glow. |

Sets `data-themed` on the inner root (same pattern as `GhostEmptyState`).
Elevation and padding use existing `--ghost-elevation-*` and spacing tokens only.

## State model

Stateless aside from `useGhostInteractiveSurface` off / idle / tracking on
`data-interactive-state` when spotlight is enabled.

### Loading, empty, disabled, read-only, and error states

None as first-class props. Consumers express disabled navigation with native
`aria-disabled` on an `a` root or `disabled` on `button`.

## Consumer data

No data props; slot content is consumer-owned.

## Accessibility contract

### Semantics and relationships

There is no WAI-ARIA **card** role. Prefer native elements:

- **`article`** (default) for self-contained summaries in a feed or grid.
- **`div` / `section` / `aside`** when landmark rules require a different host.
- **`a`** when the **entire card** navigates. One tab stop; do not nest links or
  buttons inside header, content, or footer (HTML interactive content model).
- **`button`** when the entire card submits a single action (rare). Same nesting
  rule: no descendant focusable controls.

### Clickable card pattern (required documentation)

1. **Navigational card:** `as="a"` with `href` on the root. Header, content, and
   footer contain only non-interactive markup. Put secondary actions on a
   sibling card or outside the link.
2. **Card with in-place actions:** keep `as="article"` (or `div`) and place
   `GhostButton` / links in `#footer` or `#content`. The root is not focusable.
3. **Decorative spotlight:** `effects` / `interactive="spotlight"` does not make
   the card actionable; it must not be the only carrier of information (ADR 0009).

Automated axe runs cover examples; nested interactives in an action root are a
consumer mistake documented here, not silently prevented at runtime.

### Keyboard interaction

No root key handlers unless the consumer uses `button` or an `a` root. Spotlight
does not change focus order.

### Focus behavior

Action roots participate in tab order once. Static roots are not focusable.

### Assistive technology expectations

Reading order follows DOM: header, content, footer. The glow layer is
`aria-hidden="true"`.

## Rendering and customization

Stable hooks:

- class `ghost-card` on the root
- `data-ghost-card=""` on the root
- `data-part="root" | "header" | "content" | "footer" | "glow"`
- spotlight: `data-interactive`, `data-interactive-state`, `--ghost-pointer-*`

Themed: `data-themed` on the inner root.

## Environment behavior

### SSR and hydration

`useGhostInteractiveSurface` does not read browser globals during setup. SSR
markup uses `data-interactive-state="off"`. Hydration tests cover a spotlight
card.

### Mobile and touch

Coarse pointers disable spotlight tracking per ADR 0009.

## Performance

Constant-time render; pointer tracking follows the interactive-surface budget.

## Composition

`useGhostCard` owns root bindings. `GhostCard` optionally composes
`useGhostInteractiveSurface`. Themed wrapper mirrors `GhostButton` spotlight
opt-in.

## Test plan

- Part wrappers and hook attributes; optional sections omitted when slots empty.
- Spotlight: glow presence, `data-interactive`, SSR off state.
- Action root: `a` forwards `href`; nesting guidance covered by axe on link example.
- WCAG: glow hidden from AT; no spurious roles on static root.
- SSR hydration via `expectSsrHydration` for spotlight card.
- Type tests for props and exposed ref.
- Browser: axe on examples; visual baselines for registered examples.

## Documentation plan

- API reference in `docs/components/card.md`
- Examples: basic, actions footer, link card, interactive spotlight, themed, composable
- Accessibility section for clickable card patterns
- Roadmap status update for GHO-96

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. No changes
to existing public APIs.

## Open architectural questions

None blocking v1. GHO-38 may later standardize additional `data-ghost-*` hooks.
