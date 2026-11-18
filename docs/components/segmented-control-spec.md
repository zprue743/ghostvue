# GhostSegmentedControl specification

**Status:** Proposed for GHO-101. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostSegmentedControl` is a **styled single-select** control for switching
views, layout modes, or filters where one segment is always visually active—a
segmented bar with a sliding selection indicator. It reuses
`GhostToggleGroup` / `useGhostToggleGroup` toggle-button semantics
(`aria-pressed`, roving focus) rather than radio semantics, because the same
headless model already powers toolbar toggles and only needs a different chrome.

Consumers get equal-width segments, a theme token–driven sliding thumb, and
`prefers-reduced-motion` support without wiring layout measurements.

## Non-goals

- Multiple independent selections (`type="multiple"`). Use `GhostToggleGroup`.
- Radio / form submission semantics (`GhostRadioGroup`).
- Per-segment unequal widths driven by `getBoundingClientRect` or other
  post-layout reads (equal flex segments only).
- Overflow menus, drag reorder, or icons-only segments without visible labels.
- Changing `GhostToggleGroup` public props or behavior.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostSegmentedControl` (root `role="group"` with sliding `data-part="indicator"`)
- `GhostSegmentedControlItem` (`aria-pressed` segment)
- `useGhostSegmentedControl` (single-mode toggle group + indicator indices)
- Types: `GhostSegmentedControlProps`, `GhostSegmentedControlItemProps`,
  `GhostSegmentedControlExposed`, `GhostSegmentedControlItemExposed`,
  `GhostSegmentedControlValue`, `GhostSegmentedControlOrientation`,
  `UseGhostSegmentedControlOptions`, `UseGhostSegmentedControlReturn`

Themed exports from `@ghostvue/themes`:

- `GhostSegmentedControl`, `GhostSegmentedControlItem` (plus types and styles
  via `default.css`)

### Props and configuration

#### `GhostSegmentedControl` (root)

| Prop           | Type                          | Default        | Contract                                                                           |
| -------------- | ----------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `modelValue`   | `string \| undefined`         | `undefined`    | Controlled selection. Omit for uncontrolled.                                       |
| `defaultValue` | `string \| undefined`         | `undefined`    | Initial selection when uncontrolled.                                               |
| `orientation`  | `'horizontal' \| 'vertical'`  | `'horizontal'` | Roving arrows and indicator slide axis.                                            |
| `dir`          | `'ltr' \| 'rtl' \| undefined` | `undefined`    | Explicit text direction for horizontal roving.                                     |
| `as`           | `string \| Component`         | `'div'`        | Root host; must not be interactive.                                                |
| `disabled`     | `boolean`                     | `false`        | Disables every item.                                                               |
| `deselectable` | `boolean`                     | `false`        | When false, pressing the active segment keeps it pressed (typical view switching). |

#### `GhostSegmentedControlItem`

Same contract as `GhostToggleGroupItem`: `as` (default `'button'`), required
`value`, optional `disabled`.

Native attributes fall through to each part’s rendered root.

### v-model contracts

`modelValue` is `string | undefined`. Behavior follows single-mode
`useGhostToggleGroup` except when `deselectable` is `false`: clicking the active
segment does not emit `undefined`. Controlled consumers must apply emitted
values on user interaction while uncontrolled.

### Events, callbacks, slots, and exposed methods

- Emits `update:modelValue` with `[value: string | undefined]`.
- Default slot holds items (no slot props).
- Root and items expose `{ element, focus(), blur() }`.

## State model

- At most one pressed item (`aria-pressed="true"`).
- `data-state="on" | "off"` on items.
- Root sets CSS variables from registration order (never from layout):
  `--ghost-segmented-item-count`, `--ghost-segmented-selected-index` (`-1` when
  none selected).
- Sliding `data-part="indicator"` is present in SSR markup; position uses those
  variables only.

### Loading, empty, disabled, read-only, and error states

Group and per-item `disabled` only.

## Consumer data

The component does not mutate consumer collections. Labels are slot content.

## Accessibility contract

[WAI-ARIA toggle button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) in a
**group**, matching `GhostToggleGroup` single mode.

### Semantics and relationships

- Root: `role="group"`, optional `aria-orientation` when vertical,
  `aria-disabled` when disabled, `data-part="root"`, class
  `ghost-segmented-control`, `data-ghost-segmented-control`.
- Indicator: `data-part="indicator"`, `aria-hidden="true"`, not focused.
- Item: native `button` default, `type="button"`, `aria-pressed`, `useGhostId`,
  `data-part="item"`, class `ghost-segmented-control-item`,
  `data-ghost-segmented-control`, `data-ghost-segmented-control-value`.
- Group label via `aria-label` or `aria-labelledby`.

### Keyboard interaction

Same roving and activation table as `GhostToggleGroup` (arrows, Home, End,
Space/Enter, click). Disabled items skipped.

### Focus behavior

Same primary tab stop rules as `GhostToggleGroup` via
`applyToggleGroupSelectionTabStops`.

### Assistive technology expectations

Toggle buttons with pressed state—not radios.

## Rendering and customization

- Classes: `ghost-segmented-control`, `ghost-segmented-control-item`,
  `ghost-segmented-control-indicator`
- Attributes: `data-ghost-segmented-control`, `data-ghost-segmented-control-value`,
  `data-part`, `data-state`
- Themed CSS under `.ghost-theme` using `--ghost-*` tokens; indicator motion uses
  `--ghost-motion-*` with `@media (prefers-reduced-motion: reduce)` snapping
  position without transition.

## Environment behavior

### SSR and hydration

- Item count and selected index come from registration order and model value only.
- No `window` / `document` layout reads during SSR setup for indicator position.
- Indicator markup is identical server and client for the same props/state.
- `useRovingFocus` attaches listeners in `onMounted` only (inherited pattern).

### Mobile and touch

Pointer toggles segments; equal-width flex targets.

## Performance

One passive indicator element; roving listeners on the group root while mounted.

## Composition

- `useGhostSegmentedControl` delegates to `useGhostToggleGroup` with
  `type: 'single'`.
- `useGhostId`, `useRovingFocus`, `applyToggleGroupSelectionTabStops`.
- No changes to `GhostToggleGroup.vue` or its exported props.

## Test plan

- **Unit (`GhostSegmentedControl.test.ts`):** selection, `deselectable`,
  disabled, roving keys, controlled/uncontrolled, indicator CSS variables,
  `aria-pressed`, SSR HTML includes indicator variables.
- **SSR hydration:** `expectSsrHydration` with default selection and ids.
- **Browser (`ghost-segmented-control.spec.ts`):** pointer/keyboard, Axe,
  `@component:GhostSegmentedControl`. The RTL indicator alignment and mirrored
  roving case is tagged `@cross-browser` and also runs in Firefox and WebKit.
- **Themed integration:** themed wrapper ref reaches root.
- **Visual:** `segmented-control/themed` in `examples-visual` via
  `pnpm test:visual:docker`.

## Documentation plan

- `docs/components/segmented-control.md` with examples.
- Registry: `segmented-control/basic`, `segmented-control/themed`.
- Playground `SegmentedControlReference`.
- Manifests via `pnpm manifests:write`.

## Compatibility and release impact

Additive `minor` Changeset for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None.
