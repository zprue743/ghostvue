# GhostBadge

`GhostBadge` is a compact, non-interactive label for short status and metadata
values. Import it from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default visual treatment.

## Basic use

<GhostExample id="badge/basic" />

The root is a native `<span>`. Slot text is the accessible name. The component
adds no `role` and is not a tab stop.

Headless use of the same contract without the SFC:

<GhostExample id="badge/composable" />

## API

The unstyled component declares no behavioral props. All native span attributes
and event listeners fall through to the root. The default slot is the only
content slot. The component does not generate an `id`; pass one as a native
attribute when you need it. There is no model.

## Themed use

<GhostExample id="badge/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop      | Type                                        | Default     | Description                               |
| --------- | ------------------------------------------- | ----------- | ----------------------------------------- |
| `variant` | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'soft'`    | Visual treatment.                         |
| `tone`    | `'accent' \| 'neutral' \| 'danger'`         | `'neutral'` | Semantic color intent, not a status enum. |
| `size`    | `'sm' \| 'md'`                              | `'sm'`      | Compact type and padding.                 |

Defaults omit the matching `data-*` attribute so CSS can treat a missing hook as
`soft` / `neutral` / `sm`. `tone` matches themed `GhostButton`. Do not treat
`danger` as the word "error": put the status in the slot (`Overdue`) and use
tone only as color intent.

There is no `success` / `warning` / `info` vocabulary. Domain status belongs in
the text (and in any `data-*` attributes you own).

Themed badges do not use control minimum sizes. Those minima are touch targets
and would make table-cell badges too tall. Applications that wrap a badge in a
control own that control's target size.

## Icons

Optional decorative icons live in the default slot and opt into theme sizing
with `data-part="icon"`. Hide them from assistive technology.

<GhostExample id="badge/icon" />

Icon-only badges need real text, typically via `GhostVisuallyHidden`. Do not
put `aria-label` on the badge span: a role-less `<span>` cannot host it. Color
and iconography must not be the only encoding of meaning.

## Table cells, counts, and filters

Cell statuses, numeric counts, and active-filter summaries are the first
DataTable uses. Keep the strings short.

<GhostExample id="badge/table" />

## When not to use it

- **Anything clickable, toggleable, or dismissible.** Use `GhostButton` or a
  later chip/filter control. This component does not add `tabindex`, click
  handling, or a close affordance.
- **As a live region.** Do not set `role="status"` on the badge. If a change
  must be announced, put `aria-live` on a container you own.
- **As the only encoding of status.** A red unlabeled mark is not a badge.

## Styling

The unstyled component renders one native `<span>` with class `ghost-badge` and
`data-part="root"`. There is no `data-state` hook and no internal wrapper to
target.

```css
.ghost-badge [data-part='icon'] {
  /* Optional decorative icon. */
}
```

You can also import the stylesheet and wrap unstyled badges in `.ghost-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md) for tokens and overrides.

## Accessibility and environment behavior

Assistive technology encounters ordinary phrasing content. The badge is not a
tab stop and adds no keyboard behavior. SSR markup is deterministic from slot
content and themed visual props. Setup does not read browser globals.

See the [GhostBadge specification](./badge-spec.md) for the complete behavior
and compatibility contract.
