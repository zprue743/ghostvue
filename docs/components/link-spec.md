---
schemaVersion: 1.0.0
component: GhostLink
components:
  - GhostLink
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests:
  - packages/vue/manifests/ghost-link.manifest.json
  - packages/themes/manifests/ghost-link.manifest.json
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

# GhostLink specification

**Status:** Proposed for [GHO-98](https://linear.app/ghost-vue/issue/GHO-98)
implementation scope. Approval is PR review of this spec together with the
implementation.

## Purpose and user problems

`GhostLink` is the inline navigation primitive for in-app routes, outbound URLs,
and mixed content (help text, tables, empty states). It preserves native link
semantics on a real anchor (or router-provided anchor) while standardizing
external indicators, `target="_blank"` safety (`rel` augmentation), and disabled
behavior that remains valid for assistive technology.

## Non-goals

- Button, toggle, and menu-item behavior. Use `GhostButton` or action surfaces
  when the control does not navigate.
- Fetching, validating, or rewriting URLs. The consumer owns `href`, `to`, and
  routing configuration.
- Importing or requiring `vue-router`, Nuxt, or any router package. Router
  integration is compositional only (`as` + fallthrough props).
- Visited-link styling policy beyond themed defaults. Consumers may override
  with CSS; headless output does not track visit state.
- Download attribute orchestration, prefetch, or analytics. Pass native
  attributes through fallthrough when needed.
- `useControllableState` and `useGhostId`. There is no model and ids are
  consumer-owned native attributes.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostLink` / `useGhostLink`:

| Prop          | Type               | Default              | Contract                                                                                                                                           |
| ------------- | ------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`          | `'a' \| Component` | `'a'`                | Root tag or component (for example `RouterLink` / `NuxtLink`). Headless output must stay valid HTML for every supported value.                     |
| `disabled`    | `boolean`          | `false`              | Removes navigation: no `href` on native anchors, `aria-disabled="true"`, `tabindex="-1"`, and activation is cancelled in the capture phase.        |
| `external`    | `boolean`          | `false`              | Shows the external-link indicator for same-tab outbound navigation. `target="_blank"` implies an external indicator even when `external` is false. |
| `newTabLabel` | `string`           | `'Opens in new tab'` | Visually hidden text appended when `target` is `_blank` so the accessible name includes new-tab intent.                                            |

Native anchor attributes (`href`, `target`, `rel`, `download`, `hreflang`,
`referrerpolicy`, `type`, `ping`, accessible name, and event listeners) are
included in the public type and fall through to the root host. Named ESM exports:
`GhostLink`, `useGhostLink`, `resolveGhostLinkHtmlElement`, and the types below.

The default slot carries the visible link text. An optional `externalIndicator`
slot replaces the default decorative icon (the slot wrapper stays
`aria-hidden="true"`). A `new-tab-hint` slot is not offered: `newTabLabel` and
`GhostVisuallyHidden` keep the accessible name stable.

Themed `@ghostvue/themes` `GhostLink` wraps the unstyled component and adds
visual props. Same behavioral props; these exist only on the themed wrapper:

| Prop         | Type                                                                | Default                | Contract                                                                                                              |
| ------------ | ------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `appearance` | `'link' \| 'button'`                                                | `'link'`               | Selects inline link styling (`'link'`) or the `GhostButton` visual recipe (`'button'`).                               |
| `variant`    | `'inline' \| 'subtle' \| 'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'inline'` / `'solid'` | `'inline'` \| `'subtle'` when `appearance="link"`; `'solid'` \| `'soft'` \| `'outline'` \| `'ghost'` when `'button'`. |
| `tone`       | `'accent' \| 'neutral' \| 'danger'`                                 | `'accent'`             | Semantic color intent. `'danger'` applies when `appearance="button"`.                                                 |
| `size`       | `'sm' \| 'md' \| 'lg'`                                              | `'md'`                 | Control size matching `GhostButton` when `appearance="button"`.                                                       |

The themed wrapper sets matching `data-appearance`, `data-variant`, `data-tone`,
and `data-size` attributes on the inner host. Defaults omit the attribute so CSS
treats a missing hook as the default (`link` / `inline` (or `solid` when
`appearance="button"`) / `accent` / `md`). It wraps the host in `.ghost-themed-scope`
(`display: contents`) like other themed primitives.

> **API decision (#340):** Button-styled navigation links live on themed
> `GhostLink` via `appearance="button"` rather than adding `as` / `href` to
> `GhostButton`. Keeping navigation on `GhostLink` preserves real `<a>` /
> router-link semantics, `disabled` `href` removal, capture-phase `click` and
> `auxclick` cancellation, `target="_blank"` `rel` safety, and `GhostButton`'s
> invariant that its root is always a native `<button>`.

### v-model contracts

There is no model.

### Events, callbacks, slots, and exposed methods

No component-specific events. Native listeners attach to the root host. Disabled
links cancel `click` and `auxclick` in the capture phase before consumer
handlers run.

Slots:

- `default` — visible link content (required for an accessible name unless
  `aria-label` / `aria-labelledby` is provided).
- `externalIndicator` — decorative icon markup inside `data-part="external-icon"`.

A component template ref exposes:

- `element: HTMLElement | null`
- `focus(options?: FocusOptions): void`
- `blur(): void`

`element` resolves through `resolveGhostLinkHtmlElement` so themed wrappers and
`as` components that expose `.element` resolve to the navigable host. Methods are
no-ops before mount, when disabled, or after unmount.

## State model

States are `enabled` and `disabled`. `data-state="disabled"` reflects the
disabled prop. There is no loading state.

### Loading, empty, disabled, read-only, and error states

Disabled removes `href` on native `<a>` hosts (even when `href` is present in
fallthrough), sets `aria-disabled="true"`, `tabindex="-1"`, and `data-state="disabled"`.
The control is not in sequential focus order and cannot activate. For component
hosts, `disabled` is forwarded as a prop when supported; `aria-disabled` and
capture-phase `click` / `auxclick` cancellation still apply.

### Async behavior

None. Navigation side effects belong to the router or the browser.

## Consumer data

No consumer data is accepted or mutated.

## Accessibility contract

### Semantics and relationships

The default host is a native `<a>` with a real `href` when enabled. Text content
normally provides the accessible name. When `target="_blank"`, visually hidden
text (`newTabLabel`) is included so assistive technology hears new-tab intent.
The decorative external icon is `aria-hidden="true"`.

`as` may be a framework link component that ultimately renders an anchor.
`GhostLink` does not change router semantics; it only merges styling hooks and
disabled/external behavior onto the provided host.

### Keyboard interaction

Native link keys apply on enabled hosts (`Tab` to focus, `Enter` to activate).
Disabled hosts are removed from tab order and ignore activation.

### Focus behavior

Enabled links participate in normal tab order. Disabled links use `tabindex="-1"`
and are not focused programmatically unless the consumer calls `focus()` (which
still does not restore navigation).

Themed focus uses the shared focus-ring tokens (`--ghost-focus-ring-*`) on
`:focus-visible`, matching `GhostButton`.

### Assistive technology expectations

Screen readers announce the link name plus the new-tab hint when
`target="_blank"`. The external icon is supplementary and hidden from the
accessibility tree.

## Rendering and customization

Headless roots use `class="ghost-link"`, `data-part="root"`, optional
`data-state="disabled"`, and `data-part="external-icon"` for the indicator.
Consumers customize through fallthrough attributes, slots, and CSS hooks — not
through internal DOM guarantees beyond those parts.

## Environment behavior

### SSR and hydration

Markup is deterministic: disabled state, `rel` augmentation, external indicator,
and new-tab hint render the same on server and client. Hydration tests cover
disabled plus `target="_blank"` because both affect attributes and supplementary
content.

### Mobile and touch

Native link touch behavior applies. Themed styles do not shrink below readable
text size; consumers own minimum target size when links sit in toolbars.

## Performance

No internal observers or layout reads.

## Composition

Reuses `GhostVisuallyHidden` for the new-tab hint and
`resolveGhostLinkHtmlElement` (same resolution strategy as overlay triggers).
Does not compose `GhostButton`.

## Test plan

- `useGhostLink` unit tests: `rel` merge, disabled `href` removal, indicator
  flags, tabindex.
- `GhostLink` Vue tests: native attrs, disabled activation, `_blank` hint,
  `as` component smoke, expose/focus, SSR string render.
- Themed wrapper tests: `data-*` hooks and expose forwarding.
- Theme CSS token test (no hard-coded colors).
- SSR hydration integration test with `expectSsrHydration`.
- Playwright: keyboard focus, disabled behavior, axe on examples.
- Visual baselines for registered `link/*` examples via `pnpm test:visual:docker`.
- Type consumer fixtures for `GhostLink` props and fallthrough.

## Documentation plan

Publish `docs/components/link.md` with API reference, headless and themed
examples, external/disabled guidance, and `as` router composition. Register
examples in `examples/registry.ts` and the docs sidebar.

## Compatibility and release impact

New public API in `@ghostvue/vue` and `@ghostvue/themes`. Minor Changeset for
both packages.

## Open architectural questions

None. Styling-hooks vocabulary beyond `data-part` / `data-state` remains governed
by [GHO-38](https://linear.app/ghost-vue/issue/GHO-38); this component does not
decide it.
