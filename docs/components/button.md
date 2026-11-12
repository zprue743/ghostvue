# GhostButton

`GhostButton` is an unstyled native action control with safe form behavior and a
consumer-owned loading state. Import it from `@ghostvue/vue` for headless use, or
from `@ghostvue/themes` for the default visual treatment.

## Basic use

<GhostExample id="button/basic" />

The default `type` is `button`, so placing the component in a form does not
submit accidentally. Set `type="submit"` or `type="reset"` explicitly when that
native behavior is intended.

Headless use of the same contract without the SFC:

<GhostExample id="button/composable" />

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

<GhostExample id="button/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop          | Type                                        | Default    | Description                               |
| ------------- | ------------------------------------------- | ---------- | ----------------------------------------- |
| `variant`     | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | `'solid'`  | Visual treatment.                         |
| `tone`        | `'accent' \| 'neutral' \| 'danger'`         | `'accent'` | Semantic color intent.                    |
| `size`        | `'sm' \| 'md' \| 'lg'`                      | `'md'`     | Control size.                             |
| `block`       | `boolean`                                   | `false`    | Stretch to the available width.           |
| `iconOnly`    | `boolean`                                   | `false`    | Square icon-button treatment.             |
| `interactive` | `'spotlight'`                               | omitted    | Opt-in pointer spotlight. Off by default. |

Themed size, padding, gap, radius, and type come from density, spacing, and
roundness tokens. Comfortable `md` is 40px tall with an 8px radius at
`--ghost-roundness: 1`. Compact and spacious nest through `data-ghost-density`;
coarse pointers floor heights to 44px. See
[density, type, and roundness](../themes/density.md).

Solid accent (the default), neutral, and danger fills use oklch gradients
(`--ghost-gradient-action-*`) with an inset highlight and elevation-2 shadow.
Hover, press, selected, and dragged are **state-layer overlays**
(`--ghost-state-layer-*`) mixed onto the current tone, so they work in every
mode without per-tone hover colors. There are no per-component tokens.

### State matrix

Headless `GhostButton` has no `pressed` model. The theme still styles
`aria-pressed` and `aria-grabbed` when a consumer sets them, so later
toggle and drag controls can reuse the same overlay tokens.

| State                 | How it appears        | Overlay                        | Motion                                                                        | Notes                                                                                                |
| --------------------- | --------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Rest                  | Default               | none                           | —                                                                             | Solid: gradient fill, inner highlight, elevation 2.                                                  |
| Hover                 | `:hover`              | `--ghost-state-layer-hover`    | color                                                                         | Not applied while disabled or loading.                                                               |
| Focus-visible         | `:focus-visible`      | two-tone ring                  | ring entrance (`--ghost-focus-ring-duration`)                                 | Inner `--ghost-focus-ring-contrast`, outer `--ghost-focus-ring-color`. Instant under reduced motion. |
| Hover + focus-visible | both                  | hover overlay + ring           | ring entrance                                                                 | Overlay and ring compose.                                                                            |
| Pressed               | `:active`             | `--ghost-state-layer-press`    | scale `--ghost-motion-press-scale` (0.98), elevation 1, snappy spring release | No scale under reduced motion; color overlay stays.                                                  |
| Pressed + focus       | both                  | press overlay + ring           | press + ring                                                                  |                                                                                                      |
| Loading               | `loading`             | none                           | spinner                                                                       | Fixed width, `aria-busy`, focusable. Focus-visible still draws the ring.                             |
| Loading + focus       | both                  | ring                           | spinner + ring                                                                | Activation stays cancelled.                                                                          |
| Disabled              | `disabled`            | none                           | none                                                                          | Desaturated `--ghost-action-disabled-*` colors, `cursor: not-allowed`. Not a low-opacity rest tone.  |
| Selected              | `aria-pressed="true"` | `--ghost-state-layer-selected` | —                                                                             | CSS hook only; not a headless API.                                                                   |
| Dragged               | `aria-grabbed="true"` | `--ghost-state-layer-dragged`  | —                                                                             | CSS hook for later drag controls.                                                                    |

Docs and visual snapshots freeze hover/press/focus with `data-visual-state`.
That attribute is not a component prop.

You can also import the stylesheet and wrap unstyled buttons in `.ghost-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md) for tokens and overrides.

## Loading and disabled actions

<GhostExample id="button/loading" />

Loading adds `aria-disabled="true"`, `aria-busy="true"`, and
`data-state="loading"`. Activation is blocked while the native button remains
focusable, so an action becoming pending does not discard the user's focus
position. Slot content remains rendered so the button keeps the same accessible
name. The application still owns the asynchronous operation, errors,
cancellation, and any success or failure announcement.

## Icon-only actions

Icon-only buttons require an accessible name. Hide decorative icon content from
assistive technology.

<GhostExample id="button/icon-only" />

With the themed wrapper, `iconOnly` is a prop rather than a data attribute. The
unstyled component uses `data-icon-only` instead. Text buttons normally receive
their accessible name from the slot. You can also forward `aria-labelledby` or
`aria-describedby`, or compose with `GhostVisuallyHidden` when the name should
be translated as content.

## Component refs

<GhostExample id="button/ref" />

The ref exposes `element`, `focus(options?)`, and `blur()`. Before mount and after
unmount, `element` is `null` and the methods are safe no-ops.

## Styling

The unstyled component renders one native `<button>` with class `ghost-button`,
`data-part="root"`, `data-state="loading"` while pending, and
`data-state="disabled"` while disabled and not loading. There is no internal
wrapper to target.

```css
.ghost-button[data-state='loading'] {
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

See the [approved GhostButton specification](./button-spec.md) for the complete
behavior and compatibility contract.
