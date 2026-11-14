# GhostTabs

`GhostTabs` implements the WAI-ARIA APG tabs pattern with list, trigger, and
content parts. Import the compound pieces from `@ghostvue/vue` for headless use,
or from `@ghostvue/themes` for the default tab strip and panel surfaces.

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
`ArrowUp` / `ArrowDown` for roving focus.

## Themed use

<GhostExample id="tabs/themed" />

Themed list, trigger, and content parts set `data-themed` so elevated surfaces
and focus rings apply under `.ghost-theme` or `.ghost-themed-scope`.

## API

See the [specification](./tabs-spec.md) for the full contract. Generated manifest
data is available under `packages/vue/manifests/ghost-tabs*.manifest.json`.

| Part               | Role       | Key attributes                                     |
| ------------------ | ---------- | -------------------------------------------------- |
| `GhostTabs`        | —          | `v-model`, `activationMode`, `orientation`, `dir`  |
| `GhostTabsList`    | `tablist`  | `aria-orientation`                                 |
| `GhostTabsTrigger` | `tab`      | `value`, `aria-selected`, `aria-controls`          |
| `GhostTabsContent` | `tabpanel` | `value`, `aria-labelledby`, `hidden` when inactive |

## Accessibility

Follow the [tabs specification](./tabs-spec.md#accessibility-contract) for the
keyboard map and assistive-technology relationships. Disabled triggers are
skipped during roving navigation.
