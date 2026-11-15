# GhostLink

`GhostLink` is a headless navigation control that preserves native link semantics,
adds safe new-tab defaults, and supports router composition through `as`. Import
it from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the
default visual treatment.

## Basic use

<GhostExample id="link/basic" />

Native `href`, `target`, and event listeners fall through to the root host. The
default `as` value is `a`.

Headless use of the same contract without the SFC:

<GhostExample id="link/composable" />

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

| Prop          | Type               | Default              | Description                                                     |
| ------------- | ------------------ | -------------------- | --------------------------------------------------------------- |
| `as`          | `'a' \| Component` | `'a'`                | Host element or router component (`RouterLink`, `NuxtLink`, …). |
| `disabled`    | `boolean`          | `false`              | Removes `href`, sets `aria-disabled`, and cancels activation.   |
| `external`    | `boolean`          | `false`              | Shows the external icon for same-tab outbound links.            |
| `newTabLabel` | `string`           | `'Opens in new tab'` | Visually hidden hint when `target="_blank"`.                    |

## External and new-tab links

<GhostExample id="link/external" />

`target="_blank"` adds `rel="noopener noreferrer"`, shows the external icon, and
appends `newTabLabel` for assistive technology. Set `external` when the
destination is outside the app but opens in the same tab.

## Disabled links

<GhostExample id="link/disabled" />

Disabled links drop `href` on native anchors, use `tabindex="-1"`, expose
`data-state="disabled"`, and ignore clicks in the capture phase.

## Router composition

<GhostExample id="link/router" />

Pass your framework link component to `as` and keep supplying its ordinary props
(`to`, `href`, or custom equivalents) through fallthrough attributes. GhostVue
does not bundle or import `vue-router`.

## Themed use

<GhostExample id="link/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop      | Type                    | Default    | Description          |
| --------- | ----------------------- | ---------- | -------------------- |
| `variant` | `'inline' \| 'subtle'`  | `'inline'` | Underline treatment. |
| `tone`    | `'accent' \| 'neutral'` | `'accent'` | Link color intent.   |

Defaults omit matching `data-*` hooks so CSS can treat a missing attribute as
`inline` / `accent`. Focus-visible uses the shared focus-ring tokens.

## Accessibility

- Use real link text or `aria-label` / `aria-labelledby`.
- Decorative external icons stay `aria-hidden`; new-tab intent is carried by
  `GhostVisuallyHidden` text.
- Disabled links are not in the tab order and must not retain an `href`.

Specification: [GhostLink specification](/specs/link).
