# SlButton

`SlButton` is an unstyled native action control with safe form behavior and a
consumer-owned loading state. Import it from `@slop-ui/vue` for headless use, or
from `@slop-ui/themes` for the default visual treatment.

## Basic use

```vue
<script setup lang="ts">
import { SlButton } from '@slop-ui/vue'

function save() {
  // Start the application-owned action.
}
</script>

<template>
  <SlButton @click="save">Save changes</SlButton>
</template>
```

The default `type` is `button`, so placing the component in a form does not
submit accidentally. Set `type="submit"` or `type="reset"` explicitly when that
native behavior is intended.

Headless use of the same contract without the SFC:

```vue
<script setup lang="ts">
import { useSlButton } from '@slop-ui/vue'

const { rootProps } = useSlButton({ loading: saving })
</script>

<template>
  <button v-bind="rootProps" @click="save">Save</button>
</template>
```

## API

| Prop       | Type                              | Default    | Description                                                                   |
| ---------- | --------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `type`     | `'button' \| 'submit' \| 'reset'` | `'button'` | Selects native button behavior.                                               |
| `disabled` | `boolean`                         | `false`    | Disables activation and sequential focus.                                     |
| `loading`  | `boolean`                         | `false`    | Prevents duplicate activation while preserving focus and exposing busy state. |

All native button attributes and event listeners fall through to the root
button. The default slot is the only content slot. The component does not
generate an `id`; pass one as a native attribute when you need it. There is no
toggle/`pressed` model.

## Themed use

```vue
<script setup lang="ts">
import { SlButton } from '@slop-ui/themes'
</script>

<template>
  <SlButton variant="outline" tone="danger" :loading="saving">
    Delete
  </SlButton>
</template>
```

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop       | Type                                        | Default    | Description                     |
| ---------- | ------------------------------------------- | ---------- | ------------------------------- |
| `variant`  | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'solid'`  | Visual treatment.               |
| `tone`     | `'accent' \| 'neutral' \| 'danger'`         | `'accent'` | Semantic color intent.          |
| `size`     | `'sm' \| 'md' \| 'lg'`                      | `'md'`     | Control size.                   |
| `block`    | `boolean`                                   | `false`    | Stretch to the available width. |
| `iconOnly` | `boolean`                                   | `false`    | Square icon-button treatment.   |

You can also import the stylesheet and wrap unstyled buttons in `.slop-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md) for tokens and overrides.

## Loading and disabled actions

```vue
<SlButton :loading="saving" @click="save">Save changes</SlButton>
<SlButton disabled>Unavailable action</SlButton>
```

Loading adds `aria-disabled="true"`, `aria-busy="true"`, and
`data-state="loading"`. Activation is blocked while the native button remains
focusable, so an action becoming pending does not discard the user's focus
position. Slot content remains rendered so the button keeps the same accessible
name. The application still owns the asynchronous operation, errors,
cancellation, and any success or failure announcement.

## Icon-only actions

Icon-only buttons require an accessible name. Hide decorative icon content from
assistive technology.

```vue
<SlButton data-icon-only aria-label="Close dialog">
  <CloseIcon data-part="icon" aria-hidden="true" />
</SlButton>
```

With the themed wrapper, `iconOnly` is a prop rather than a data attribute. Text
buttons normally receive their accessible name from the slot. You can also
forward `aria-labelledby` or `aria-describedby`, or compose with
`SlVisuallyHidden` when the name should be translated as content.

## Component refs

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { SlButton, type SlButtonExposed } from '@slop-ui/vue'

const saveButton = useTemplateRef<SlButtonExposed>('saveButton')

function returnFocus() {
  saveButton.value?.focus()
}
</script>

<template>
  <SlButton ref="saveButton">Save changes</SlButton>
</template>
```

The ref exposes `element`, `focus(options?)`, and `blur()`. Before mount and after
unmount, `element` is `null` and the methods are safe no-ops.

## Styling

The unstyled component renders one native `<button>` with class `slop-button`,
`data-part="root"`, `data-state="loading"` while pending, and
`data-state="disabled"` while disabled and not loading. There is no internal
wrapper to target.

```css
.slop-button[data-state='loading'] {
  /* Applies only while the action is pending. */
}
```

## Accessibility and environment behavior

Enabled buttons retain native `Enter`, `Space`, pointer, touch, and focus
behavior. Disabled buttons use native disabled semantics; loading buttons remain
focusable while activation is suppressed. Without the themed wrapper, you own
visible focus indication, sufficient contrast, and an adequate touch target.

SSR markup is deterministic from props and slot content, and setup does not read
browser globals. No listeners, timers, or observers require cleanup.

See the [approved SlButton specification](./button-spec.md) for the complete
behavior and compatibility contract.
