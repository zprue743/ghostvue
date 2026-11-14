# GhostSkeleton

`GhostSkeleton` is a non-interactive loading placeholder. It holds the
approximate space of content that has not arrived yet so layout does not
collapse, and it stays silent to assistive technology.

Import it from `@ghostvue/vue` for headless use, or from `@ghostvue/themes`
for the default visual treatment. It is not a status message: loading that
must be heard belongs on the surrounding region, not on every bone.

## Basic use

<GhostExample id="skeleton/basic" />

The placeholder is `aria-hidden` and `inert`. Screen readers skip it, and it
is not a tab stop. Dimensions are ordinary CSS (`style` or `class`); there is
no size prop.

Headless use of the same contract without the SFC:

<GhostExample id="skeleton/composable" />

## API

| Prop | Type                                             | Default  | Description                                                        |
| ---- | ------------------------------------------------ | -------- | ------------------------------------------------------------------ |
| `as` | `'span' \| 'div' \| 'p' \| 'li' \| 'td' \| 'th'` | `'span'` | Selects the rendered element so the result is valid in its parent. |

The default slot is optional and should stay empty. Native attributes and
listeners fall through to the single root, which is how you set `class`,
`style`, `data-shape`, and `data-*`. The component always sets `aria-hidden`
and `inert`; those two cannot be unset.

The component does not generate an `id` and has no v-model.

## Themed use

<GhostExample id="skeleton/themed" />

Importing the themed component loads the default stylesheet. Visual props
exist only on this wrapper:

| Prop    | Type                           | Default  | Description                        |
| ------- | ------------------------------ | -------- | ---------------------------------- |
| `shape` | `'text' \| 'rect' \| 'circle'` | `'text'` | Visual treatment via `data-shape`. |

The default `text` shape omits `data-shape` so CSS can treat a missing hook as
a line. `rect` is a block placeholder. `circle` is square with a 50% radius
(geometry, not a roundness token). The wrapper sets `data-themed` on the root
so recipes apply without an extra element — required for `as="td"`. Override
size with CSS:

```vue
<GhostSkeleton shape="circle" style="inline-size: 2.5rem" />
```

You can also import the stylesheet and wrap unstyled skeletons in `.ghost-theme`
when you want a region of headless placeholders to pick up the defaults. See
the [default theme guide](../themes/default.md).

## Table loading rows

DataTable-style loading uses `as="td"` so the bone stays a table cell, plus
`aria-busy` and a caption (or other status text) on the table so assistive
technology hears the wait once:

<GhostExample id="skeleton/table" />

Do not put `aria-busy` or `aria-live` on each `GhostSkeleton`. Twenty cells
would speak twenty times.

## When to use Skeleton, Spinner, or status text

| Pattern     | Use when                                                                                              | Do not use when                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Skeleton    | The resulting layout is known and should stay stable. Decorative. Pair with status or `aria-busy`.    | The wait has no predictable shape, or the wait _is_ the message.  |
| Spinner     | A single control or unknown-shape region is pending (`GhostButton` `loading`, later `GhostSpinner`).  | Many spinners in a table; they still need status text.            |
| Status text | Assistive technology must hear that loading is happening. A caption, `role="status"`, or live region. | As the only treatment when layout collapse would be disorienting. |

Color and motion on the skeleton are not a text alternative. WCAG 4.1.3 is
satisfied by the consumer's status text, not by this component.

## Styling

The unstyled component renders one element with class `ghost-skeleton` and
`data-part="root"`. There is no `data-state` (the placeholder does not
transition) and no internal wrapper.

```css
.ghost-skeleton[data-shape='circle'] {
  /* Applies only to circular placeholders. */
}
```

Themed fill uses `--ghost-surface-muted-bg`. Shimmer uses
`--ghost-surface-subtle-bg` and `--ghost-motion-duration-expressive`. There
are no per-component skeleton tokens.

## Accessibility and environment behavior

The root is never a widget. `aria-hidden="true"` removes it from the
accessibility tree. `inert` keeps it out of tab order even if someone slots a
control. `role="presentation"` is not used, because that role would still
expose descendant text.

`Tab` moves past the placeholder. The component adds no key handling and does
not move focus.

Server-rendered markup is deterministic and identical to the client's,
including `aria-hidden` and `inert`. Setup reads no browser globals. Shimmer
is CSS, so it does not affect hydration.

`prefers-reduced-motion: reduce` disables the shimmer and leaves the static
muted fill. `forced-colors: active` maps the fill to `Canvas`, strokes
`CanvasText`, and drops the overlay.

See the [GhostSkeleton specification](./skeleton-spec.md) for the complete
behavior and compatibility contract.
