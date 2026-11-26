# GhostToolbar

`GhostToolbar` groups related controls into a single `role="toolbar"` container
with roving tabindex and arrow-key movement. Import it from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for a default flex layout.

## Document formatting toolbar

<GhostExample id="toolbar/editor-actions" />

A single `Tab` stop enters the `GhostToolbar` and arrow keys move focus
across formatting and clear actions, separated by a semantic vertical
`GhostSeparator`.

## Basic use

<GhostExample id="toolbar/basic" />

Compose `GhostButton`, `GhostSwitch`, and other focusable primitives in the
default slot. Disabled items are skipped when moving with arrow keys.

Headless use of the same contract without the SFC. Pass a template ref as
`element` so roving focus attaches to the root:

<GhostExample id="toolbar/composable" />

## API

<!-- @generated docs-api:vue/ghost-toolbar begin -->

<!-- Source: packages/vue/manifests/ghost-toolbar.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop          | Type                      | Default        | Description                                                                |
| ------------- | ------------------------- | -------------- | -------------------------------------------------------------------------- |
| `as`          | `GhostToolbarElement`     | `"div"`        | Root element tag for the toolbar container.                                |
| `dir`         | `GhostToolbarDirection`   | —              | Optional text direction for horizontal arrow reversal in RTL.              |
| `label`       | `string`                  | —              | Accessible name via aria-label when a visible label element is not used.   |
| `loop`        | `boolean`                 | `true`         | Wrap arrow and Home/End movement from last enabled item to first.          |
| `orientation` | `GhostToolbarOrientation` | `"horizontal"` | Toolbar layout and roving arrow axis. Sets aria-orientation when vertical. |

| Slot      | Slot props | Description                                                         |
| --------- | ---------- | ------------------------------------------------------------------- |
| `default` | —          | Toolbar items such as GhostButton, GhostSwitch, and GhostSeparator. |

<!-- @generated docs-api:vue/ghost-toolbar end -->

<!-- @generated docs-api:themes/ghost-toolbar begin -->

<!-- Source: packages/themes/manifests/ghost-toolbar.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostToolbar` API, which it forwards.

<!-- @generated docs-api:themes/ghost-toolbar end -->

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
