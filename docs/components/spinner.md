# GhostSpinner

`GhostSpinner` is a compact indeterminate loading indicator. Import it from
`@ghostvue/vue` for headless status semantics, or from `@ghostvue/themes` for the
default spinning ring. The consumer owns when it mounts; the primitive does not
start, cancel, or announce the result of asynchronous work.

## Basic use

<GhostExample id="spinner/basic" />

The root is a `<span role="status">`. The default message is "Loading", rendered
as visually hidden live-region content. Pass `label` when the workflow needs a
more specific status ("Refreshing reports") so page translation tools can see
the copy. Status names come from the author (`aria-label`); announcements come
from this hidden text.

Headless use of the same contract without the SFC:

<GhostExample id="spinner/composable" />

## API

| Prop    | Type     | Default     | Description                                                     |
| ------- | -------- | ----------- | --------------------------------------------------------------- |
| `label` | `string` | `'Loading'` | Status message rendered as visually hidden live-region content. |

Native attributes and listeners fall through to the status span. There is no
default slot, no v-model, and no exposed ref. The component does not generate an
`id`; pass one as a native attribute when a surrounding `aria-labelledby`
relationship needs it.

## Themed use

<GhostExample id="spinner/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop   | Type                                | Default    | Description            |
| ------ | ----------------------------------- | ---------- | ---------------------- |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color intent. |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Compact status size.   |

Size scales through `--ghost-control-size-*-font` because
`--ghost-action-spinner-size` is `em`-relative. Color uses
`--ghost-action-*-bg`. Defaults omit `data-size` / `data-tone` so CSS can treat
a missing hook as `md` / `accent`.

Under `prefers-reduced-motion: reduce`, rotation becomes an opacity pulse at
`--ghost-action-spinner-duration` so the ring does not spin and does not flicker
faster than `GhostButton`'s loading indicator.

You can also import the stylesheet and wrap unstyled spinners in `.ghost-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md).

## Table refresh

Keep loading-state orchestration on the table (or the query that feeds it). The
spinner only names the pending status:

<GhostExample id="spinner/table-refresh" />

`aria-busy` on the table, request cancellation, and the eventual "refreshed" or
error announcement stay outside this primitive. Remount the spinner when a new
"loading" message should be spoken; keep it mounted across a refresh if the
announcement should not repeat.

## Decorative use

When a parent already exposes busy state (a named `GhostButton` with `loading`,
a region with `aria-busy` and its own live text), hide the spinner from
assistive technology:

```vue
<GhostSpinner aria-hidden="true" />
```

Do not also pass a custom `label` in that case; the parent owns the name.

If a surrounding caption already names the pending region, you may still pass
`aria-labelledby` as an author name. Keep `label` set to the message that should
be announced; do not rely on `aria-label` alone, because live regions speak
their contents, not their accessible name.

## Styling without a theme

The unstyled component ships no dimensions or color. Size and color are ordinary
CSS on `.ghost-spinner` (`color`, `font-size`, `inline-size` / `block-size`).
When the default stylesheet is loaded, the ring uses `currentColor` and
`--ghost-action-spinner-*`.

Stable styling hooks are class `ghost-spinner` and `data-part="root"`. There is
no `data-state`; presence of the element is the pending state. The themed wrapper
adds `data-tone` and `data-size` when they are not the defaults:

```css
.ghost-spinner[data-size='sm'] {
  /* Compact status mark. */
}
```

The themed wrapper's `.ghost-themed-scope` span is `display: contents` and is
not a layout surface. Do not target internal wrapper nesting.

Custom graphics are the composable escape hatch: spread `rootProps` onto a host
and render decorative content next to `GhostVisuallyHidden` for the status
message. Do not invent a `pt` passthrough object.

## Accessibility and environment behavior

Assistive technology encounters a named `status` live region (implicit polite,
atomic). The component adds no keyboard handling and is not focusable, so it
cannot steal focus from a pending button or a refreshing grid.

SSR markup is deterministic from props and attributes. Reduced motion is a CSS
media query, not a client-only JavaScript branch, so server and client agree on
semantics.

Automated checks cannot tell you whether "Loading" is the right copy for the
workflow. Verify announcement timing with a screen reader.

See the [approved GhostSpinner specification](./spinner-spec.md) for the complete
behavior and compatibility contract.
