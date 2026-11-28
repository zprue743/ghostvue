# GhostSegmentedControl

`GhostSegmentedControl` is a single-select segmented bar for switching views,
layout modes, or filters. It reuses `useGhostToggleGroup` toggle-button
semantics (`aria-pressed`, roving focus) and adds a sliding `data-part="indicator"`
positioned from CSS variables—no layout reads during SSR.

See the [specification](/specs/segmented-control) for the accessibility contract.

<GhostExample id="segmented-control/analytics-period" />

The API traffic card uses two `GhostSegmentedControl` bars to switch time
windows and metric series with roving keyboard focus.

## Examples

### Headless

<GhostExample id="segmented-control/basic" />

### Themed

<GhostExample id="segmented-control/themed" />

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GhostSegmentedControl, GhostSegmentedControlItem } from '@ghostvue/vue'

const view = ref('list')
</script>

<template>
  <GhostSegmentedControl v-model="view" aria-label="Content view">
    <GhostSegmentedControlItem value="list">List</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="grid">Grid</GhostSegmentedControlItem>
  </GhostSegmentedControl>
</template>
```

By default `deselectable` is `false`, so the active segment stays pressed when
clicked again (typical view switching). Set `deselectable` to allow clearing the
selection like `GhostToggleGroup` single mode.

## API

### `GhostSegmentedControl`

<!-- @generated docs-api:vue/ghost-segmented-control begin -->

<!-- Source: packages/vue/manifests/ghost-segmented-control.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                           | Default        | Description                                                                         |
| -------------- | ------------------------------ | -------------- | ----------------------------------------------------------------------------------- |
| `as`           | `GhostSegmentedControlElement` | `"div"`        | Root host element.                                                                  |
| `defaultValue` | `GhostSegmentedControlValue`   | —              | Initial selection when `modelValue` is omitted.                                     |
| `deselectable` | `boolean`                      | `false`        | When false, pressing the active segment keeps it selected (default view switching). |
| `dir`          | `'ltr' \| 'rtl'`               | —              | Explicit text direction for horizontal roving.                                      |
| `disabled`     | `boolean`                      | `false`        | Disables every item.                                                                |
| `modelValue`   | `GhostSegmentedControlValue`   | —              | Controlled selection.                                                               |
| `orientation`  | `'horizontal' \| 'vertical'`   | `"horizontal"` | Arrow-key roving layout and indicator slide axis.                                   |

| Slot      | Slot props | Description    |
| --------- | ---------- | -------------- |
| `default` | —          | Segment items. |

<!-- @generated docs-api:vue/ghost-segmented-control end -->

<!-- @generated docs-api:themes/ghost-segmented-control begin -->

<!-- Source: packages/themes/manifests/ghost-segmented-control.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostSegmentedControl` API, which it forwards.

<!-- @generated docs-api:themes/ghost-segmented-control end -->

**Emits:** `update:modelValue` with `string | undefined`.

**Exposed:** `{ element, focus(), blur() }`.

### `GhostSegmentedControlItem`

<!-- @generated docs-api:vue/ghost-segmented-control-item begin -->

<!-- Source: packages/vue/manifests/ghost-segmented-control-item.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type                               | Default    | Description                                       |
| ---------- | ---------------------------------- | ---------- | ------------------------------------------------- |
| `as`       | `GhostSegmentedControlItemElement` | `"button"` | Tag name or component for the segment control.    |
| `disabled` | `boolean`                          | `false`    | Disables toggling and roving focus for this item. |
| `value`    | `string`                           | Required   | Stable value for this item in the group model.    |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Primary content. |

<!-- @generated docs-api:vue/ghost-segmented-control-item end -->

**Exposed:** `{ element, focus(), blur() }`.

### Stable styling hooks

- Classes: `ghost-segmented-control`, `ghost-segmented-control-item`,
  `ghost-segmented-control-indicator`
- Attributes: `data-ghost-segmented-control`, `data-ghost-segmented-control-value`,
  `data-indicator-visible`, `data-part`, `data-state` (`on` / `off`)
- CSS variables: `--ghost-segmented-item-count`, `--ghost-segmented-selected-index`

Themed styles ship from `@ghostvue/themes` (`GhostSegmentedControl`,
`GhostSegmentedControlItem`).

### Sizing

Themed segments always share the control equally, because the sliding indicator
is positioned as an equal fraction of the track. By default the control is an
inline grid that sizes to its widest label. To stretch it across a container,
set `display: grid` (or a width) on the root:

```css
.view-switcher {
  display: grid;
}
```

Existing block-level `display: flex` overrides that fill their container (as
in the Popover sharing example), or flex roots with an explicit width, keep equal segments
through a `flex: 1 1 0` fallback. Avoid `display: inline-flex`: a
shrink-to-fit flex root splits the total label width evenly, so long labels
overflow their segment and the indicator.

## Accessibility

- Root: `role="group"` with an accessible name.
- Items: native `button` (default) with `aria-pressed="true" | "false"`.
- Indicator: `aria-hidden="true"`, decorative only.
- Arrow keys, `Home`, `End`, and Tab behavior match `GhostToggleGroup` single mode.
