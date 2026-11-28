# GhostProgress

`GhostProgress` is a determinate progress indicator with an indeterminate
fallback. Import it from `@ghostvue/vue` for headless `progressbar` semantics,
or from `@ghostvue/themes` for the default track and fill. The consumer owns
`value`; the primitive does not start, cancel, or announce the result of
asynchronous work.

Use this when percent-complete is known. [`GhostSpinner`](./spinner.md) is the
compact status for work with no percent; [`GhostSkeleton`](./skeleton.md) is the
silent layout placeholder. The distinction is the contract, not a runtime
dependency.

## Artifact upload queue

<GhostExample id="progress/upload-queue" />

An upload queue card combines determinate percent progress, custom `valueText`
for shard counts, and an indeterminate bar when the total is unknown.

## Basic use

<GhostExample id="progress/basic" />

The root is a `<div role="progressbar">`. Pass `label` so the bar has an
accessible name (`aria-label`). `value` and `max` (default `100`) set
`aria-valuenow` / `aria-valuemax`. The default value text is the rounded
percent.

Headless use of the same contract without the SFC:

<GhostExample id="progress/composable" />

## API

<!-- @generated docs-api:vue/ghost-progress begin -->

<!-- Source: packages/vue/manifests/ghost-progress.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop        | Type             | Default | Description                                                                                                                                                                   |
| ----------- | ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`     | `string`         | —       | Accessible name applied as aria-label. role=progressbar is nameFrom author; contents are presentational and cannot name the widget.                                           |
| `max`       | `number`         | `100`   | Exclusive upper bound of the range. Defaults to 100 (ARIA progressbar valuemax), not HTML progress's 1. Invalid values fall back to 100.                                      |
| `value`     | `null \| number` | —       | Current progress in the same unit as max. Omit or pass null for the indeterminate fallback. Non-finite numbers are treated as unknown. Finite values are clamped to [0, max]. |
| `valueText` | `string`         | —       | Accessible value text (aria-valuetext) for determinate instances. When omitted, the default is the rounded percent. Ignored while indeterminate.                              |

<!-- @generated docs-api:vue/ghost-progress end -->

Native attributes and listeners fall through to the progressbar root. There is
no default slot, no v-model, and no exposed ref. The fill is
`data-part="indicator"`, not a Vue slot.

## Indeterminate fallback

When the current value is unknown, omit `value` (or pass `null`). The bar keeps
`role="progressbar"` and `aria-valuemax` but drops `aria-valuenow` /
`aria-valuetext` and sets `data-state="indeterminate"`:

<GhostExample id="progress/indeterminate" />

## Custom value text

Override the percent when the unit is not 0–100:

<GhostExample id="progress/value-text" />

## Themed use

<GhostExample id="progress/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

<!-- @generated docs-api:themes/ghost-progress begin -->

<!-- Source: packages/themes/manifests/ghost-progress.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostProgress` API, which it forwards:

| Prop   | Type                                | Default    | Description                                                                                   |
| ------ | ----------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `"accent"` | Semantic color intent. The default omits data-tone so CSS can treat a missing hook as accent. |
| `size` | `'sm' \| 'md' \| 'lg'`              | `"md"`     | Track thickness. The default omits data-size so CSS can treat a missing hook as md.           |

<!-- @generated docs-api:themes/ghost-progress end -->

Defaults omit `data-size` / `data-tone` so CSS can treat a missing hook as `md`
/ `accent`. Thickness uses `--ghost-track-thickness-sm` / `md` / `lg` (4 / 6 /
8px at every density and theme, so `sm` stays visible under compact Calm). Fill uses
`--ghost-action-*-bg`. The track is `--ghost-border-default`.

Across the bundled themes, a value update takes 120 ms and an indeterminate
sweep takes 700 ms. Under `prefers-reduced-motion: reduce`, the update takes
80 ms and the sweep becomes an opacity pulse with the same 700 ms period as
`GhostSpinner`.

You can also import the stylesheet and wrap unstyled progress bars in
`.ghost-theme` when you want a region of headless components to pick up the
defaults. See the [default theme guide](../themes/default.md).

## Progress vs Spinner vs Skeleton

| Need                                     | Primitive       |
| ---------------------------------------- | --------------- |
| Known percent-complete of a task         | `GhostProgress` |
| Compact pending status, duration unknown | `GhostSpinner`  |
| Unready layout that must not speak       | `GhostSkeleton` |

Do not put `aria-busy` on the progressbar itself. Busy belongs on the
surrounding region when the workflow should announce.

## Styling

The unstyled component renders a root with class `ghost-progress` and
`data-part="root"`, plus an indicator with `data-part="indicator"`. Determinate
fill size is the indicator's inline `inline-size` percentage.
`data-state="indeterminate"` is present only while the value is unknown.

```css
.ghost-progress[data-state='indeterminate'] [data-part='indicator'] {
  /* Applies only to the unknown-value fallback. */
}
```

The themed wrapper's `.ghost-themed-scope` span is `display: contents` and is
not a layout surface. Do not target internal wrapper nesting. There is no `pt`
passthrough object.

## Accessibility and environment behavior

Assistive technology encounters a named `progressbar`. Determinate instances
expose `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow`, and
`aria-valuetext`. Indeterminate instances omit now/text because the value is
unknown. The component is not a live region and does not announce every tick.

The bar is not focusable and adds no keyboard handling. Native `<progress>` is
not used: it is a replaced element and cannot host `data-part="indicator"` or a
tokenized reduced-motion recipe. See the spec for the full justification.

SSR markup is deterministic from props. Reduced motion is a CSS media query,
not a client-only JavaScript branch.

See the [GhostProgress specification](/specs/progress) for the complete
behavior and compatibility contract.
