# GhostToggleGroup

`GhostToggleGroup` groups toggle buttons that share `aria-pressed` state for
single-choice or multi-choice toolbars—table density pickers, layout switches,
and formatting controls. It is **not** a radio group: a pressed item in single
mode can be toggled off. Keyboard arrow keys rove among items via
`useRovingFocus`; selection uses `useControllableState`.

See the [specification](./toggle-group-spec.md) for the accessibility contract.

## Examples

### Single selection

<GhostExample id="toggle-group/basic" />

### Multiple selection

<GhostExample id="toggle-group/multiple" />

### Themed segmented control

<GhostExample id="toggle-group/themed" />

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GhostToggleGroup, GhostToggleGroupItem } from '@ghostvue/vue'

const layout = ref('list')
</script>

<template>
  <GhostToggleGroup v-model="layout" aria-label="Layout">
    <GhostToggleGroupItem value="list">List</GhostToggleGroupItem>
    <GhostToggleGroupItem value="grid">Grid</GhostToggleGroupItem>
  </GhostToggleGroup>
</template>
```

Label the group with `aria-label` or `aria-labelledby`. Each item is named by its
slot content or `aria-label`.

## API

### `GhostToggleGroup`

| Prop           | Type                              | Default        | Description                                          |
| -------------- | --------------------------------- | -------------- | ---------------------------------------------------- |
| `type`         | `'single' \| 'multiple'`          | `'single'`     | Single allows one pressed item; multiple any subset. |
| `modelValue`   | `string \| string[] \| undefined` | —              | Controlled value(s).                                 |
| `defaultValue` | `string \| string[] \| undefined` | —              | Initial uncontrolled selection (`[]` for multiple).  |
| `orientation`  | `'horizontal' \| 'vertical'`      | `'horizontal'` | Arrow-key roving direction.                          |
| `dir`          | `'ltr' \| 'rtl'`                  | —              | Explicit direction for horizontal arrows.            |
| `as`           | `string \| Component`             | `'div'`        | Root `role="group"` host.                            |
| `disabled`     | `boolean`                         | `false`        | Disables all items.                                  |

**Emits:** `update:modelValue` with `string`, `string[]`, or `undefined`.

**Exposed:** `{ element, focus(), blur() }`.

### `GhostToggleGroupItem`

| Prop       | Type                  | Default    | Description                   |
| ---------- | --------------------- | ---------- | ----------------------------- |
| `value`    | `string`              | required   | Stable id in the group model. |
| `as`       | `string \| Component` | `'button'` | Control element.              |
| `disabled` | `boolean`             | `false`    | Skips roving and toggling.    |

**Exposed:** `{ element, focus(), blur() }`.

### Stable styling hooks

- Classes: `ghost-toggle-group`, `ghost-toggle-group-item`
- Attributes: `data-ghost-toggle-group`, `data-ghost-toggle-group-value`,
  `data-part`, `data-state` (`on` / `off`)

Themed styles ship from `@ghostvue/themes` (`GhostToggleGroup`,
`GhostToggleGroupItem`).

## Accessibility

- Root: `role="group"` with an accessible name.
- Items: native `button` (default) with `aria-pressed="true" | "false"`.
- Arrow keys move focus among enabled items; `Home` / `End` jump to ends.
- Tab enters the group at the primary pressed item (or the first item).

Do not use `radiogroup` semantics for exclusive layout pickers when deselection
should be allowed; use `GhostRadioGroup` when a permanent single choice is
required.
