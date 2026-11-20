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

| Prop           | Type                         | Default        | Description                               |
| -------------- | ---------------------------- | -------------- | ----------------------------------------- |
| `modelValue`   | `string \| undefined`        | —              | Controlled selection.                     |
| `defaultValue` | `string \| undefined`        | —              | Initial uncontrolled selection.           |
| `orientation`  | `'horizontal' \| 'vertical'` | `'horizontal'` | Roving arrows and indicator axis.         |
| `dir`          | `'ltr' \| 'rtl'`             | —              | Explicit direction for horizontal arrows. |
| `as`           | `string \| Component`        | `'div'`        | Root `role="group"` host.                 |
| `disabled`     | `boolean`                    | `false`        | Disables all items.                       |
| `deselectable` | `boolean`                    | `false`        | Allow clearing the pressed segment.       |

**Emits:** `update:modelValue` with `string | undefined`.

**Exposed:** `{ element, focus(), blur() }`.

### `GhostSegmentedControlItem`

| Prop       | Type                  | Default    | Description                   |
| ---------- | --------------------- | ---------- | ----------------------------- |
| `value`    | `string`              | required   | Stable id in the group model. |
| `as`       | `string \| Component` | `'button'` | Control element.              |
| `disabled` | `boolean`             | `false`    | Skips roving and toggling.    |

**Exposed:** `{ element, focus(), blur() }`.

### Stable styling hooks

- Classes: `ghost-segmented-control`, `ghost-segmented-control-item`,
  `ghost-segmented-control-indicator`
- Attributes: `data-ghost-segmented-control`, `data-ghost-segmented-control-value`,
  `data-indicator-visible`, `data-part`, `data-state` (`on` / `off`)
- CSS variables: `--ghost-segmented-item-count`, `--ghost-segmented-selected-index`

Themed styles ship from `@ghostvue/themes` (`GhostSegmentedControl`,
`GhostSegmentedControlItem`).

## Accessibility

- Root: `role="group"` with an accessible name.
- Items: native `button` (default) with `aria-pressed="true" | "false"`.
- Indicator: `aria-hidden="true"`, decorative only.
- Arrow keys, `Home`, `End`, and Tab behavior match `GhostToggleGroup` single mode.
