# GhostTabs

`GhostTabs` implements the WAI-ARIA APG tabs pattern with list, trigger, and
content parts. Import the compound pieces from `@ghostvue/vue` for headless use,
or from `@ghostvue/themes` for the default tab strip and panel surfaces.

<GhostExample id="tabs/workspace" />

The workspace page switches between **Overview**, **Members**, and
**Activity** panels. **Billing** is a disabled tab: it stays visible but arrow
keys skip it and clicks do nothing. Because `GhostTabs` renders no element, the
example wraps the list and the panels in one grid so the strip always sits
above the panel; the themed panel's top margin is the gap between them. The
selected tab is raised on the elevation-2 surface, an unselected tab tints on
hover, and focus draws an outline ring, so neither hover nor focus moves the
strip.

The **Interface language** switch exercises long translated labels and
right-to-left layout with deterministic local copy. German labels such as
**Mitglieder und Berechtigungen** wrap inside their tab, and the strip wraps
whole tabs onto a new row in narrow previews. Arabic sets `dir="rtl"` on the
example root; the tab list reads the nearest `dir`, so `ArrowLeft` moves to
the next tab and `ArrowRight` to the previous one. Class names passed to
`GhostTabsList`, `GhostTabsTrigger`, and `GhostTabsContent` are merged with the
part classes, so example-owned layout classes sit beside the themed styles.

### Keyboard

| Key                        | Behavior                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| `Tab`                      | Moves into the strip on the selected tab, then into the panel.    |
| `ArrowRight` / `ArrowLeft` | Next / previous enabled tab, wrapping at the ends (mirrored RTL). |
| `ArrowDown` / `ArrowUp`    | Next / previous enabled tab in a vertical list.                   |
| `Home` / `End`             | First / last enabled tab.                                         |
| `Enter` / `Space`          | Selects the focused tab in manual activation mode.                |

In the default automatic mode, moving focus to a tab also selects it. Arrow,
`Home`, and `End` combined with Alt, Ctrl, or Meta are left to the platform.

## Basic use

<GhostExample id="tabs/basic" />

`GhostTabs` owns `modelValue` via `useControllableState`, wires `aria-controls` and
`aria-labelledby` through internal registries, and attaches `useRovingFocus` to
`GhostTabsList` for arrow, Home, and End movement. Automatic activation (default)
selects a tab when it receives focus; set `activation-mode="manual"` to require
click or Enter/Space on non-button hosts.

## Manual activation

<GhostExample id="tabs/manual" />

Manual mode keeps roving focus independent from selection until the user
activates the focused tab.

## Vertical orientation

<GhostExample id="tabs/vertical" />

`orientation="vertical"` sets `aria-orientation="vertical"` and maps
`ArrowUp` / `ArrowDown` for roving focus. The example places the list beside
the panel from about 24rem of preview width and stacks it above the panel
when narrower.

## Themed use

<GhostExample id="tabs/themed" />

Themed list, trigger, and content parts set `data-themed` so elevated surfaces
and focus rings apply under `.ghost-theme` or `.ghost-themed-scope`. Unselected
tabs tint on hover, disabled tabs use the disabled opacity with a
`not-allowed` cursor, and the focusable active panel draws the same focus ring
as the tabs. In forced-colors mode the selected tab is painted with
`Highlight` and `HighlightText`.

## API

See the [specification](/specs/tabs) for the full contract. Generated manifest
data is available under `packages/vue/manifests/ghost-tabs*.manifest.json`.

<!-- @generated docs-api:vue/ghost-tabs begin -->

<!-- Source: packages/vue/manifests/ghost-tabs.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop             | Type                         | Default        | Description                                                                 |
| ---------------- | ---------------------------- | -------------- | --------------------------------------------------------------------------- |
| `activationMode` | `'automatic' \| 'manual'`    | `"automatic"`  | Focus-driven (`automatic`) vs explicit activation (`manual`) tab selection. |
| `defaultValue`   | `string`                     | —              | Initial selected value when `modelValue` is omitted.                        |
| `dir`            | `'ltr' \| 'rtl'`             | —              | Explicit text direction for roving focus within the tab list.               |
| `modelValue`     | `string`                     | —              | Controlled selected tab value. Omit for uncontrolled mode.                  |
| `orientation`    | `'horizontal' \| 'vertical'` | `"horizontal"` | Tab list orientation for arrow-key roving and `aria-orientation`.           |

| Slot      | Slot props                        | Description        |
| --------- | --------------------------------- | ------------------ |
| `default` | `modelValue: string \| undefined` | Container content. |

<!-- @generated docs-api:vue/ghost-tabs end -->

<!-- @generated docs-api:themes/ghost-tabs begin -->

<!-- Source: packages/themes/manifests/ghost-tabs.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostTabs` API, which it forwards.

<!-- @generated docs-api:themes/ghost-tabs end -->

| Part               | Role       | Key attributes                                     |
| ------------------ | ---------- | -------------------------------------------------- |
| `GhostTabs`        | —          | `v-model`, `activationMode`, `orientation`, `dir`  |
| `GhostTabsList`    | `tablist`  | `aria-orientation`                                 |
| `GhostTabsTrigger` | `tab`      | `value`, `aria-selected`, `aria-controls`          |
| `GhostTabsContent` | `tabpanel` | `value`, `aria-labelledby`, `hidden` when inactive |

## Accessibility

Follow the [tabs specification](/specs/tabs#accessibility-contract) for the
keyboard map and assistive-technology relationships. Disabled triggers are
skipped during roving navigation.
