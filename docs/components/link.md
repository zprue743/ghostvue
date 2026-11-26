# GhostLink

`GhostLink` is a headless navigation control that preserves native link semantics,
adds safe new-tab defaults, and supports router composition through `as`. Import
it from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the
default visual treatment.

## Documentation resource links

<GhostExample id="link/documentation-footer" />

A resource card combines inline and subtle `GhostLink` variants, a new-tab
link with automatic `rel="noopener noreferrer"` and hidden hint, a same-tab
external link, and a disabled link.

## Basic use

<GhostExample id="link/basic" />

Native `href`, `target`, and event listeners fall through to the root host. The
default `as` value is `a`.

Headless use of the same contract without the SFC:

<GhostExample id="link/composable" />

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

<!-- @generated docs-api:vue/ghost-link begin -->

<!-- Source: packages/vue/manifests/ghost-link.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop          | Type               | Default              | Description                                                     |
| ------------- | ------------------ | -------------------- | --------------------------------------------------------------- |
| `as`          | `GhostLinkElement` | `"a"`                | Host element or router component (`RouterLink`, `NuxtLink`, …). |
| `disabled`    | `boolean`          | `false`              | Removes `href`, sets `aria-disabled`, and cancels activation.   |
| `external`    | `boolean`          | `false`              | Shows the external icon for same-tab outbound links.            |
| `newTabLabel` | `string`           | `"Opens in new tab"` | Visually hidden hint when `target="_blank"`.                    |

| Slot                | Slot props | Description                                                                                |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `default`           | —          | Visible link text. Provide aria-label or aria-labelledby when the slot is empty.           |
| `externalIndicator` | —          | Decorative external icon inside data-part=external-icon. Hidden from assistive technology. |

<!-- @generated docs-api:vue/ghost-link end -->

## External and new-tab links

<GhostExample id="link/external" />

`target="_blank"` adds `rel="noopener noreferrer"`, shows the external icon, and
appends `newTabLabel` for assistive technology. Set `external` when the
destination is outside the app but opens in the same tab.

## Disabled links

<GhostExample id="link/disabled" />

Disabled links drop `href` on native anchors, use `tabindex="-1"`, expose
`data-state="disabled"`, and ignore `click` and `auxclick` (middle-click) in
the capture phase.

## Router composition

<GhostExample id="link/router" />

Pass your framework link component to `as` and keep supplying its ordinary props
(`to`, `href`, or custom equivalents) through fallthrough attributes. GhostVue
does not bundle or import `vue-router`.

## Themed use

<GhostExample id="link/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

<!-- @generated docs-api:themes/ghost-link begin -->

<!-- Source: packages/themes/manifests/ghost-link.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostLink` API, which it forwards:

| Prop         | Type                                                                | Default    | Description                                                                               |
| ------------ | ------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `appearance` | `'link' \| 'button'`                                                | `"link"`   | Visual presentation mode. Use button for GhostButton-styled navigation links.             |
| `variant`    | `'inline' \| 'subtle' \| 'solid' \| 'soft' \| 'outline' \| 'ghost'` | `"inline"` | Visual treatment. Defaults to inline for link appearance and solid for button appearance. |
| `tone`       | `'accent' \| 'neutral' \| 'danger'`                                 | `"accent"` | Color intent. Danger applies when appearance is button. The default omits data-tone.      |
| `size`       | `'sm' \| 'md' \| 'lg'`                                              | `"md"`     | Control size when appearance is button. The default omits data-size.                      |

<!-- @generated docs-api:themes/ghost-link end -->

Defaults omit matching `data-*` hooks so CSS can treat a missing attribute as
`inline` / `accent`. Focus-visible uses the shared focus-ring tokens.

## Button-styled links

<GhostExample id="link/button" />

Set `appearance="button"` when a navigation link should look like a
`GhostButton` (for example hero calls to action). It keeps real `<a>` semantics,
`disabled` `href` removal, and `target="_blank"` safety while accepting
`variant` (`solid`, `soft`, `outline`, `ghost`), `tone` (`accent`, `neutral`,
`danger`), and `size` (`sm`, `md`, `lg`).

## Accessibility

- Use real link text or `aria-label` / `aria-labelledby`.
- Decorative external icons stay `aria-hidden`; new-tab intent is carried by
  `GhostVisuallyHidden` text.
- Disabled links are not in the tab order and must not retain an `href`.

Specification: [GhostLink specification](/specs/link).
