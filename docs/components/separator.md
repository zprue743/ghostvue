# GhostSeparator

`GhostSeparator` is a visual and semantic divider for menus, toolbars, and
layouts. Import it from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default hairline treatment.

## Basic use

<GhostExample id="separator/basic" />

The default is a native `<hr>`: implicit `role="separator"`, horizontal
orientation, and no extra ARIA. It is empty; the component has no content slot
because native `hr` cannot have children and `separator` descendants would be
presentational.

Headless use of the same contract without the SFC:

<GhostExample id="separator/composable" />

## API

| Prop          | Type                         | Default                                       | Description                                                        |
| ------------- | ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'`                                | Axis of the line.                                                  |
| `decorative`  | `boolean`                    | `false`                                       | Omits the line from the accessibility tree (`role="none"`).        |
| `as`          | `'hr' \| 'div' \| 'li'`      | `'hr'` when horizontal; `'div'` when vertical | Selects the rendered element so the result is valid in its parent. |

Native attributes fall through to the single root. The component owns `role`
and `aria-orientation`; pass `id`, `class`, `data-*`, or `aria-label` as
ordinary attributes when you need them. There is no v-model and no exposed
ref contract.

## Vertical grouping

Vertical rules have no native element, so the default host is a `div` with
`role="separator"` and `aria-orientation="vertical"`. Place them in a stretching
flex or grid row so they have a block size:

<GhostExample id="separator/vertical" />

## Decorative lines

When the line is only visual and does not group anything for assistive
technology, set `decorative`. The element stays in the layout but is not a
separator in the accessibility tree:

<GhostExample id="separator/decorative" />

Do not mark menu or toolbar grouping separators decorative. Those need
`role="separator"` so grouped items are announced as separate sets.

## Lists and menus

Inside a list-shaped menu, render the separator as an `li`. The parent should
use `role="menu"` so the `li` is a grouping separator rather than a broken
list item:

<GhostExample id="separator/list" />

## Themed use

<GhostExample id="separator/themed" />

Importing the themed component loads the default stylesheet. There are no extra
visual props; color is `--ghost-border-default` and thickness is
`--ghost-border-hairline-width`. You can also import the stylesheet and wrap
unstyled separators in `.ghost-theme` when you want a region of headless
components to pick up the defaults. See the
[default theme guide](../themes/default.md).

## Styling

The unstyled component renders one element with class `ghost-separator`,
`data-part="root"`, and `data-orientation="horizontal"` or
`data-orientation="vertical"`. There is no `data-state` and no internal wrapper
to target.

```css
.ghost-separator[data-orientation='vertical'] {
  /* Applies only to vertical rules. */
}
```

## Accessibility and environment behavior

Semantic horizontal `hr` uses native separator semantics. Other semantic hosts
set `role="separator"`; vertical ones also set `aria-orientation="vertical"`.
Decorative instances set `role="none"` and omit `aria-orientation`. The
component is not focusable and adds no keyboard behavior. Window splitters
(focusable, resizable) are out of scope.

SSR markup is deterministic from props. Setup does not read browser globals.

See the [GhostSeparator specification](./separator-spec.md) for the complete
behavior and compatibility contract.
