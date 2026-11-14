# GhostToolbar

`GhostToolbar` groups related controls into a single `role="toolbar"` container
with roving tabindex and arrow-key movement. Import it from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for a default flex layout.

## Basic use

<GhostExample id="toolbar/basic" />

Compose `GhostButton`, `GhostSwitch`, and other focusable primitives in the
default slot. Disabled items are skipped when moving with arrow keys.

Headless use of the same contract without the SFC:

<GhostExample id="toolbar/composable" />

## API

| Prop          | Type                                         | Default        | Description                                                                           |
| ------------- | -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`                 | `'horizontal'` | Drives `aria-orientation` when vertical and roving arrow keys.                        |
| `loop`        | `boolean`                                    | `true`         | Wrap arrow and Home/End movement from last to first.                                  |
| `dir`         | `'ltr' \| 'rtl' \| undefined`                | `undefined`    | Optional text direction for horizontal arrow reversal.                                |
| `label`       | `string \| undefined`                        | `undefined`    | Sets `aria-label`. Prefer `aria-labelledby` fallthrough when a heading names the bar. |
| `as`          | `'div' \| 'section' \| 'footer' \| 'header'` | `'div'`        | Root element for the toolbar.                                                         |

Native attributes and listeners fall through to the root. There is no v-model.
`defineExpose` provides `element`, `focus()`, and `blur()` on the toolbar root.

## Vertical layout

<GhostExample id="toolbar/vertical" />

## Separators

Use `GhostSeparator` with `orientation` matching the bar axis. Keep grouping
separators semantic (`decorative={false}`) so assistive technology hears the
clusters:

<GhostExample id="toolbar/separators" />

## Themed use

<GhostExample id="toolbar/themed" />

The themed wrapper adds flex row/column layout under `.ghost-theme` or
`.ghost-themed-scope`. See the [default theme guide](../themes/default.md).

## Styling

The unstyled root uses class `ghost-toolbar`, `data-part="root"`,
`data-ghost-toolbar`, and `data-orientation`. Recipe CSS targets flex direction
from `data-orientation`.

## Accessibility

Follow the WAI-ARIA APG
[Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/). Name the
bar with `label` or `aria-labelledby`. Tab enters the group at the current roving
item; arrow keys move among enabled controls; Tab moves focus out of the group.
