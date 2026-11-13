# GhostDialog

`GhostDialog` renders a modal or non-modal dialog overlay with accessible
focus trapping, scroll locking, and background isolation. Import
`GhostDialog`, `GhostDialogTrigger`, `GhostDialogOverlay`,
`GhostDialogContent`, `GhostDialogTitle`, `GhostDialogDescription`, and
`GhostDialogClose` from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default elevation-4 surface and scrim backdrop.

## Basic use

<GhostExample id="dialog/basic" />

`GhostDialog` owns `open` via `useControllableState`, generates deterministic
IDs via `useGhostId`, teleports the overlay and surface through `GhostPortal` by
default, unmounts closed layers with `v-if`, locks body scroll with
scrollbar-width compensation, marks background siblings `inert` (while skipping
`[data-ghost-live]`), handles `Escape` and outside `pointerdown` via
`useDismissableLayer`, and traps `Tab` navigation via `useFocusScope`.

## Themed use

<GhostExample id="dialog/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-dialog-overlay` with `var(--ghost-scrim, rgb(0 0 0 / 0.5))` and
`.ghost-dialog-content` with `--ghost-elevation-4-*`, border, hairline width,
radius, inset padding, typography, and focus-ring `--ghost-*` tokens. Composing
`:as="GhostButton"` delegates trigger and close styling cleanly.

## Nested dialogs

<GhostExample id="dialog/nested" />

Opening a dialog from inside another dialog stacks their dismissable layers,
trapped focus scopes, `inert` sibling sets, and scroll locks cleanly. Pressing
`Escape` dismisses only the innermost open dialog and restores focus and
isolation back to the outer dialog.

## Alert dialogs

<GhostExample id="dialog/alert" />

Passing `role="alertdialog"` on `GhostDialogContent` disables outside-click
dismissal by default so destructive confirmations cannot be dismissed
accidentally by clicking the backdrop, and emits a development warning
([GHOST003](../warnings.md#ghost003)) if no description is provided.

## Non-modal and controlled use

- Set `:modal="false"` on `GhostDialog` to disable `aria-modal`, `GhostDialogOverlay`,
  scroll lock, background `inert`, and `Tab` trapping. Non-modal dialogs open at
  mount follow `GhostPopover`'s `openedAtMount` rule so initial render does not
  steal focus on page load, whereas modal dialogs always move focus inside on
  open.
- Use `v-model:open` for controlled state, or omit `open` with `defaultOpen` for
  uncontrolled state.

## API

### `GhostDialog` (root)

| Prop          | Type      | Default     | Description                                                                          |
| ------------- | --------- | ----------- | ------------------------------------------------------------------------------------ |
| `open`        | `boolean` | `undefined` | Controlled open state. Omit for uncontrolled mode.                                   |
| `defaultOpen` | `boolean` | `false`     | Initial open state when running uncontrolled.                                        |
| `modal`       | `boolean` | `true`      | Enables trapped looping focus, scroll lock, inert background, `aria-modal`, overlay. |

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, close: () => void }`.

### `GhostDialogTrigger`

| Prop       | Type                  | Default    | Description                                         |
| ---------- | --------------------- | ---------- | --------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Root element tag or button component.               |
| `disabled` | `boolean`             | `false`    | Prevents toggling on click and keyboard activation. |

Sets `type="button"` (when `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. Exposes `{ element, focus, blur }`.

### `GhostDialogOverlay`

| Prop       | Type                  | Default  | Description                                                                    |
| ---------- | --------------------- | -------- | ------------------------------------------------------------------------------ |
| `as`       | `string \| Component` | `'div'`  | Root element tag or component for the backdrop.                                |
| `portal`   | `boolean`             | `true`   | Teleport overlay via `GhostPortal` when `true`, or render inline when `false`. |
| `portalTo` | `GhostPortalTarget`   | `'body'` | Teleport destination passed to `GhostPortal`.                                  |

Renders only when both `open` and `modal` are `true`. Sets
`aria-hidden="true"`, `data-part="overlay"`, and `data-state="open"`. Exposes
`{ element, focus, blur }`.

### `GhostDialogContent`

| Prop                  | Type                        | Default                              | Description                                                                    |
| --------------------- | --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `as`                  | `string \| Component`       | `'div'`                              | Element tag or component for the dialog surface.                               |
| `role`                | `'dialog' \| 'alertdialog'` | `'dialog'`                           | Semantic role. `'alertdialog'` defaults `closeOnOutsideClick` to `false`.      |
| `closeOnEscape`       | `boolean`                   | `true`                               | Whether pressing `Escape` dismisses the topmost dialog.                        |
| `closeOnOutsideClick` | `boolean`                   | `true` (`false` for `'alertdialog'`) | Whether clicking outside content (including the overlay) closes the dialog.    |
| `portal`              | `boolean`                   | `true`                               | Teleport content via `GhostPortal` when `true`, or render inline when `false`. |
| `portalTo`            | `GhostPortalTarget`         | `'body'`                             | Teleport destination passed to `GhostPortal`.                                  |

Sets `role`, `aria-modal="true"` (when `modal=true`), `tabindex="-1"`,
`data-part="content"`, `data-state="open"`, `aria-labelledby` (linking
`GhostDialogTitle`), and `aria-describedby` (linking `GhostDialogDescription`).
Exposes `{ element, focus, blur }`.

### `GhostDialogTitle`

| Prop | Type                  | Default | Description                               |
| ---- | --------------------- | ------- | ----------------------------------------- |
| `as` | `string \| Component` | `'h2'`  | Element tag or component for the heading. |

Sets `id` and `data-part="title"`, and registers as the dialog's accessible name
unless `aria-label` or `aria-labelledby` is provided directly on
`GhostDialogContent`. Exposes `{ element, focus, blur }`.

### `GhostDialogDescription`

| Prop | Type                  | Default | Description                                   |
| ---- | --------------------- | ------- | --------------------------------------------- |
| `as` | `string \| Component` | `'p'`   | Element tag or component for the description. |

Sets `id` and `data-part="description"`, and registers as the dialog's
description (`aria-describedby`) on `GhostDialogContent`. Exposes
`{ element, focus, blur }`.

### `GhostDialogClose`

| Prop       | Type                  | Default    | Description                                        |
| ---------- | --------------------- | ---------- | -------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Element tag or component for the close button.     |
| `disabled` | `boolean`             | `false`    | Prevents closing on click and keyboard activation. |

Closes the enclosing `GhostDialog` on click or keyboard activation and exposes
`{ element, focus, blur }`.

### `useGhostDialog(options?)`

Returns `{ isOpen, isModal, open, close, toggle, triggerId, contentId, titleId, descriptionId }`
for building custom dialog compositions over the same controllable state and
deterministic IDs.

## Accessibility

- **Accessible name & description:** Always render `GhostDialogTitle` (or pass
  `aria-label` / `aria-labelledby` on `GhostDialogContent`). Missing accessible
  names log [GHOST002](../warnings.md#ghost002) in development. For
  `role="alertdialog"`, also render `GhostDialogDescription` (or pass
  `aria-describedby`) to avoid [GHOST003](../warnings.md#ghost003).
- **Modal isolation:** Modal dialogs combine `aria-modal="true"` with `inert` on
  background siblings (excluding `[data-ghost-live]` regions), ref-counted scroll
  locking, and looped `Tab` trapping.
- **Popovers inside dialogs:** Portaled `GhostPopover` layers opened inside a
  modal dialog receive normal `Tab` navigation without focus pull-back, whereas
  inline popovers (`:portal="false"`) keep `Tab` bounded inside the dialog.
- **Focus restoration:** Closing via `Escape`, `GhostDialogClose`, overlay
  click, or controlled close restores focus to the trigger or previously focused
  element after background `inert` is cleared.

## Specification

See [GhostDialog specification](./dialog-spec.md) and
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md).
