# GhostToggleGroup

`GhostToggleGroup` groups toggle buttons that share `aria-pressed` state for
single-choice or multi-choice toolbars—table density pickers, layout switches,
and formatting controls. It is **not** a radio group: a pressed item in single
mode can be toggled off. Keyboard arrow keys rove among items via
`useRovingFocus`; selection uses `useControllableState`.

See the [specification](/specs/toggle-group) for the accessibility contract.

<GhostExample id="toggle-group/editor-toolbar" />

The announcement composer pairs a `multiple` formatting `GhostToggleGroup`
with a `single` alignment `GhostToggleGroup`, updating the live preview text.

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

<!-- @generated docs-api:vue/ghost-toggle-group begin -->

<!-- Source: packages/vue/manifests/ghost-toggle-group.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                         | Default        | Description                                     |
| -------------- | ---------------------------- | -------------- | ----------------------------------------------- |
| `as`           | `GhostToggleGroupElement`    | `"div"`        | Root host element.                              |
| `defaultValue` | `GhostToggleGroupValue`      | —              | Initial selection when `modelValue` is omitted. |
| `dir`          | `'ltr' \| 'rtl'`             | —              | Explicit text direction for horizontal roving.  |
| `disabled`     | `boolean`                    | `false`        | Disables every item.                            |
| `modelValue`   | `GhostToggleGroupValue`      | —              | Controlled selection; shape follows `type`.     |
| `orientation`  | `'horizontal' \| 'vertical'` | `"horizontal"` | Arrow-key roving layout.                        |
| `type`         | `'multiple' \| 'single'`     | `"single"`     | Single vs multiple pressed items.               |

| Slot      | Slot props | Description         |
| --------- | ---------- | ------------------- |
| `default` | —          | Toggle group items. |

<!-- @generated docs-api:vue/ghost-toggle-group end -->

<!-- @generated docs-api:themes/ghost-toggle-group begin -->

<!-- Source: packages/themes/manifests/ghost-toggle-group.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostToggleGroup` API, which it forwards.

<!-- @generated docs-api:themes/ghost-toggle-group end -->

**Emits:** `update:modelValue` with `string`, `string[]`, or `undefined`.

**Exposed:** `{ element, focus(), blur() }`.

### `GhostToggleGroupItem`

<!-- @generated docs-api:vue/ghost-toggle-group-item begin -->

<!-- Source: packages/vue/manifests/ghost-toggle-group-item.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type                          | Default    | Description                                       |
| ---------- | ----------------------------- | ---------- | ------------------------------------------------- |
| `as`       | `GhostToggleGroupItemElement` | `"button"` | Tag name or component for the toggle control.     |
| `disabled` | `boolean`                     | `false`    | Disables toggling and roving focus for this item. |
| `value`    | `string`                      | Required   | Stable value for this item in the group model.    |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Primary content. |

<!-- @generated docs-api:vue/ghost-toggle-group-item end -->

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
