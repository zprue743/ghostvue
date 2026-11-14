# GhostProgress specification

**Status:** Proposed for GHO-90. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostProgress` is a determinate progress indicator. It tells the user how far
a known-duration task has gone (`value` of `max`) and names that task for
assistive technology. When the current value is unknown, it falls back to an
indeterminate bar so the same primitive still occupies the slot.

The immediate consumers are upload and download rows, table or report
generation that can report percent-complete, and any other region that needs a
named `progressbar` rather than a compact spinner or a silent skeleton.
`GhostSpinner` (GHO-72) remains the compact **status** for work with no
percent; `GhostSkeleton` (GHO-73) remains the non-speaking placeholder for
unready layout. This primitive does not replace either.

## Non-goals

- It does not start, cancel, time, or retry asynchronous work. Updating
  `value` and mounting or unmounting the bar is the consumer's orchestration.
- It is not a compact spinner, skeleton, toast, or live-region manager. Those
  are separate primitives (`GhostSpinner`, `GhostSkeleton`, `GhostToast`).
- It is not a slider, meter, or range input. Users cannot change `value`.
  Measurement of a static quantity (disk used, score) belongs to a later
  `GhostMeter` if one is needed; this role is task progress.
- It does not generate ids (`useGhostId` is unused) and has no
  controlled/uncontrolled model (`useControllableState` is unused). `value` is
  a one-way prop; there is no `v-model`.
- Vertical orientation, circular/ring visuals, and buffer/`valueBuffer` (video
  download vs playback) are out of scope. Horizontal is the only axis.
- The unstyled component ships no visual styles. Thickness, color, and motion
  belong to the consumer or the themed wrapper. Visual `size` and `tone` props
  live only on the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostProgress` / `useGhostProgress`:

| Prop        | Type               | Default     | Contract                                                                                                                                                                                                                              |
| ----------- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`     | `number \| null`   | omitted     | Current progress in the same unit as `max`. Omit or pass `null` for the indeterminate fallback. Non-finite numbers are treated as unknown (indeterminate). Finite values are clamped to `[0, max]`.                                    |
| `max`       | `number`           | `100`       | Exclusive upper bound of the range. Must be a finite number greater than `0`; otherwise the ARIA default `100` is used so `aria-valuemax` is never `0` or `NaN`.                                                                      |
| `label`     | `string`           | omitted     | Accessible name, applied as `aria-label`. `role="progressbar"` is `nameFrom: author`; contents are presentational and cannot name the widget. Prefer `aria-labelledby` fallthrough when a visible heading already names the task.     |
| `valueText` | `string`           | omitted     | Accessible value text (`aria-valuetext`) for determinate instances. When omitted, the default is the rounded percent (`"40%"`). Ignored while indeterminate.                                                                          |

```ts
type GhostProgressMax = number
```

`max` defaults to `100`, matching the ARIA `progressbar` default for
`aria-valuemax`, not the HTML `<progress>` default of `1`. Consumers think in
percent-complete for the stated upload/table jobs; a `0–1` fraction remains
available by passing `max={1}`. Changing the default later would rewrite every
unnamed `value={40}` call site and is breaking.

The root is always a `<div>`. Named ESM exports: `GhostProgress`,
`useGhostProgress`, and the types above. Headless behavior lives in the
composable; the SFC is a thin unstyled root that spreads `rootProps` onto the
div and renders one `data-part="indicator"` child from `indicatorProps`.

Native attributes and listeners fall through to the root. That fallthrough, not
dedicated props, is how consumers attach `id`, `class`, `data-*`,
`aria-labelledby`, and `aria-describedby`. The component owns `role`,
`aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext`, and
`aria-label` when `label` is set. Do not redeclare those as camelCase props.

Themed `@ghostvue/themes` `GhostProgress` wraps the unstyled component and adds
visual props. Same behavioral props; these exist only on the themed wrapper:

| Prop   | Type                                | Default    | Contract                                                                                        |
| ------ | ----------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color intent. The default omits `data-tone` so CSS can treat a missing hook as accent. |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Track thickness. The default omits `data-size` so CSS can treat a missing hook as md.           |

The themed wrapper sets matching `data-tone` and `data-size` on the inner
progress root and wraps it in `.ghost-themed-scope` (`display: contents`) so
default CSS can style that instance without forcing every `.ghost-progress` on
the page.

### Native `<progress>` versus `role="progressbar"`

Prefer native HTML when it already expresses the widget. Native `<progress>`
was considered and **rejected** for this primitive:

- The issue names `role="progressbar"` with accessible label and value text as
  the contract. That maps directly onto ARIA `progressbar`, not onto a replaced
  form control.
- Native `<progress>` is a replaced element. WebKit
  (`::-webkit-progress-bar` / `::-webkit-progress-value`) and Gecko
  (`::-moz-progress-bar`) expose incompatible fill pseudo-elements. There is
  no single `data-part="indicator"` child a headless consumer or the themed
  recipe can target. ADR 0004 requires `data-part` for structure.
- Indeterminate native progress cannot host a reduced-motion pulse that matches
  `GhostSpinner` / `GhostButton`. UA animation is not a `--ghost-*` token and
  cannot be swapped under `prefers-reduced-motion` in a cross-browser recipe.
- `aria-valuetext` on `<progress>` is not interoperable enough for the
  required custom value text (`"3 of 10 files"`). Explicit
  `role="progressbar"` plus `aria-valuetext` is.
- A visually-hidden native `<progress>` plus a styled sibling would add a
  wrapper on the headless path, duplicate value/max onto two nodes, and still
  fail the `data-part` contract. That is more machinery, not more native.

The root is therefore a `div` with `role="progressbar"`. `value` and `max`
mirror the HTML attribute names so the mental model stays native even though
the element is not.

### v-model contracts

There is no model. `value` is consumer-owned and one-way. The bar never emits
`update:value`; users cannot change progress.

### Events, callbacks, slots, and exposed methods

No component-specific events; native listeners attach to the root. There is no
default slot: `progressbar` children are presentational (ARIA 1.2), and a
visible percent belongs next to the bar, not inside it. Named slots are not
used; the fill is `data-part="indicator"`, not a slot invented to target CSS.

Custom graphics are the composable escape hatch: spread `rootProps` onto a host
and `indicatorProps` onto a fill. Do not invent a `pt` passthrough object.

No methods are exposed. The root is never interactive, so there is no
`focus()` / `blur()` contract. Consumers that need the element can attach a
plain template ref through normal Vue attribute fallthrough.

## State model

The component has two behavioral states derived from `value`:

| `value`                         | State           | `data-state`      | ARIA value attributes                                      |
| ------------------------------- | --------------- | ----------------- | ---------------------------------------------------------- |
| omitted, `null`, or non-finite  | indeterminate   | `indeterminate`   | `aria-valuemin="0"`, `aria-valuemax` set; `aria-valuenow` and `aria-valuetext` omitted |
| finite number (clamped)         | determinate     | omitted           | `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` |

There is no `data-state="complete"`. Completion is `value >= max` (after
clamp) and is already visible as `aria-valuenow` equal to `aria-valuemax`.
Inventing a complete hook would duplicate that.

`max` and `valueText` are configuration, not states. They may change
independently; each render is a pure function of the current props.

### Loading, empty, disabled, read-only, and error states

None apply as component states. Loading of the surrounding workflow is why the
bar is mounted. Disabled, read-only, and error belong to that workflow or to
other primitives. An unnamed bar (no `label`, no `aria-label` /
`aria-labelledby`) is a consumer error: the widget has no accessible name.
There is no empty-value state distinct from indeterminate.

### Async behavior

The component performs no asynchronous work and owns no races, cancellation,
stale results, or result announcements. Assistive technology reads the current
`aria-valuenow` / `aria-valuetext` when focus is on a related control or when
the user inspects the bar; this role is **not** a live region. Announcing every
percent tick would be noisy. Completion, errors, and "done" copy belong to the
consumer's own status (`GhostSpinner` unmount, `GhostVisuallyHidden` live
region, or the control that became busy).

## Consumer data

The component accepts no data objects and mutates nothing. `value`, `max`,
`label`, and `valueText` are scalars owned by the consumer.

## Accessibility contract

### Semantics and relationships

Follow WAI-ARIA `progressbar`
([ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#progressbar)). APG has no
dedicated Progress Bar pattern; the closest APG widget is
[Meter](https://www.w3.org/WAI/ARIA/apg/patterns/meter/), which explicitly
says a meter must not display task progress — use a progressbar instead.

| Attribute          | Determinate                                      | Indeterminate            |
| ------------------ | ------------------------------------------------ | ------------------------ |
| `role`             | `progressbar`                                    | `progressbar`            |
| `aria-valuemin`    | `"0"` (explicit; ARIA default is 0)              | `"0"`                    |
| `aria-valuemax`    | string of resolved `max`                         | string of resolved `max` |
| `aria-valuenow`    | string of the clamped `value`                    | omitted                  |
| `aria-valuetext`   | `valueText` or the default rounded percent       | omitted                  |
| `aria-label`       | `label` when that prop is set                    | same                     |

`aria-labelledby` fallthrough wins in the accessible-name calculation when both
it and `aria-label` are present, so a visible heading can name the bar without
dropping `label`. Prefer one naming method.

The indicator child is presentational (ARIA children-presentational on
`progressbar`) and has no role of its own.

The component never sets `aria-busy` or `aria-live`. Busy belongs on the
surrounding region when the consumer wants a live announcement.

### Keyboard interaction

None. The component adds no key handling and is not in sequential tab order.

### Focus behavior

The root is never itself focusable and never receives a `tabindex`. The
component does not move, trap, or restore focus. A loading workflow that must
preserve focus (a pending button, a refreshing grid) keeps focus on that
control.

### Assistive technology expectations

Assistive technology encounters a named progressbar. In determinate mode it
can report the accessible name plus the value text (or the numeric now/max).
In indeterminate mode it reports the name and the progressbar role without a
current value, which is the ARIA signal that the value is unknown.

Automated checks cannot tell whether `label` / `valueText` match the workflow
("Uploading invoice.pdf" vs "Progress", "3 of 10 files" vs "30%"). That
judgment requires human review. Axe is a baseline for missing names and invalid
ARIA, not evidence of a good announcement.

## Rendering and customization

Attribute fallthrough, `label` / `valueText`, and the composable are the
customization API for the unstyled component. It renders exactly two elements:
the root and the indicator. There is no extra wrapper on the headless path.
The themed wrapper's extra `span.ghost-themed-scope` is not a public layout
surface (`display: contents`).

Stable styling hooks follow ADR 0004. This component does not invent a
parallel styling-hooks contract (GHO-38 remains undecided):

- class `ghost-progress`
- `data-part="root"` on the progressbar
- `data-part="indicator"` on the fill
- `data-state="indeterminate"` while the value is unknown; omitted when
  determinate
- themed visual hooks `data-tone` and `data-size`, omitted at the defaults
- determinate fill size from an inline `inline-size` percentage on the
  indicator (also returned as `indicatorProps.style`) so headless consumers
  get a functional fill without the theme

Visual values in the recipe come from existing `--ghost-*` tokens. There are
no per-component progress tokens:

- track fill `--ghost-surface-muted-bg`
- indicator `--ghost-action-primary-bg` / `neutral` / `danger`
- thickness `--ghost-space-gap-xs` / `sm` / `md` for `sm` / `md` / `lg`
- rounding `--ghost-radius-pill`
- determinate transition `--ghost-motion-duration-fast` and
  `--ghost-motion-easing-standard`
- indeterminate motion `--ghost-action-spinner-duration` so the bar does not
  loop at a different rate from `GhostSpinner` / `GhostButton`

Under `prefers-reduced-motion: reduce`, the determinate width transition uses
the token's reduced duration (already ~80ms). Indeterminate translation is
replaced by an opacity pulse at `--ghost-action-spinner-duration` and
`--ghost-action-spinner-opacity`, matching the spinner so the two do not
flicker at different rates. `--ghost-motion-duration-*` is not used for that
pulse because those tokens collapse to 80ms under reduced motion.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostProgress` on the same page stays unstyled when the stylesheet is
loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

Forced colors map the track to `Canvas` and the fill to `Highlight`.

## Environment behavior

### SSR and hydration

Rendering is a pure function of props and attributes. Setup reads no browser
globals, registers no lifecycle hooks, and produces identical markup on server
and client. Reduced-motion handling is CSS `@media`; it does not require a
client-only motion query in JavaScript, so hydration cannot disagree with the
server about semantics.

### Mobile and touch

The progressbar is not a touch target and adds no gesture handling. Consumers
own layout. Themed sizes are track thicknesses, not 44px controls.

## Performance

Rendering is constant-time and allocates two elements. The component registers
no global listeners, timers, observers, or registries. CSS animation is the
only motion; there is no cleanup obligation.

## Composition

`useGhostProgress` owns clamping, determinate vs indeterminate, ARIA value
attributes, `aria-label` from `label`, and `data-part` / `data-state` bindings.
`GhostProgress` spreads those onto a `div` and renders the indicator child.
Themed `GhostProgress` wraps that component. Behavior stays in `packages/vue`
because its component, attribute-fallthrough, and Vue SFC contracts are
Vue-specific. No framework-neutral core abstraction is needed: clamping a
number is not sufficient justification to promote this to `core`.

`GhostSpinner` and `GhostSkeleton` are complementary, not dependencies. This
component does not import them.

The machine-readable contracts are
`packages/vue/manifests/ghost-progress.manifest.json` and
`packages/themes/manifests/ghost-progress.manifest.json`.

## Test plan

- Vue tests cover defaults (indeterminate, `max` 100, no `aria-valuenow`),
  determinate `aria-valuenow` / default percent `aria-valuetext`, custom
  `valueText`, `label` → `aria-label`, `aria-labelledby` fallthrough, clamping
  below 0 and above `max`, non-finite `value` as indeterminate, invalid `max`
  falling back to 100, class / `data-part` / `data-state` hooks, indicator
  `inline-size`, and deterministic SSR markup.
- Composable tests cover the same determinate/indeterminate matrix and
  clamping.
- Compile-time tests cover native attribute types on `GhostProgressProps`.
- Browser tests cover a named determinate progressbar, custom value text, the
  indeterminate fallback, themed size/tone hooks, reduced-motion pulse vs
  translation, and an axe smoke check on the playground section and registered
  examples.
- Theme CSS tests forbid hardcoded colors and duration/size literals so the
  recipe stays on `--ghost-*` tokens.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite (already `animations: 'disabled'` plus `prefers-reduced-motion: reduce`).

## Documentation plan

Publish `docs/components/progress.md` with an API reference, a minimal
determinate example, the composable escape hatch, indeterminate fallback,
custom `valueText`, themed size/tone, when to use Progress vs Spinner vs
Skeleton, reduced-motion and SSR notes, and a link to this spec. Register the
same examples in `examples/registry.ts`. Mirror determinate, value-text, and
indeterminate cases in the playground so e2e can target them.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises `value` / `max` / `label` / `valueText`,
`useGhostProgress`, single-root attribute fallthrough, `role="progressbar"`,
the determinate/indeterminate ARIA matrix, class `ghost-progress` /
`data-part` / `data-state`, the indicator part, and the themed `tone` / `size`
props plus CSS custom properties.

Future changes require compatibility review even when prop names are unchanged:
switching the root to native `<progress>`, changing the default `max` from
100, announcing value changes from a live region, adding a wrapper on the
headless path, or changing the styling hooks.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This spec uses the existing `data-part` /
  `data-state` / `class` / `--ghost-*` contract from ADR 0004. It does not
  introduce a new hook vocabulary.
- **Native `<progress>`.** Rejected for this primitive; see Public API. Revisit
  only if a future UA makes the fill a restyleable child that can carry
  `data-part="indicator"` without a wrapper.
- **Meter.** Deferred. APG Meter is a different role.
- **Circular / vertical.** Deferred. Horizontal track is the smallest complete
  indicator for GHO-90.
