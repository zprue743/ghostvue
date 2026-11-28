# GhostDialog

`GhostDialog` renders a modal or non-modal dialog overlay with accessible
focus trapping, scroll locking, and background isolation. Import
`GhostDialog`, `GhostDialogTrigger`, `GhostDialogOverlay`,
`GhostDialogContent`, `GhostDialogTitle`, `GhostDialogDescription`, and
`GhostDialogClose` from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default elevation-4 surface and scrim backdrop.

<GhostExample id="dialog/edit-profile" />

The profile card opens an edit dialog that works on a draft copy. **Save
changes** validates the name and email, writes the draft back to the card, and
closes; focus returns to **Edit profile**. If a field is invalid, the dialog
stays open and focus moves to the first field that needs attention. **Cancel**,
`Escape`, and a backdrop click close without saving and the card stays as it
was. Focus enters on the first field, the default when no `initialFocus` is
set. The form keeps a 36rem width, the name row stacks when it gets narrow,
and on short screens the whole dialog scrolls so the actions stay reachable.

## Basic use

<GhostExample id="dialog/basic" />

`GhostDialog` owns `open` via `useControllableState`, generates deterministic
IDs via `useGhostId`, teleports the overlay and surface through `GhostPortal` by
default, unmounts closed layers once their CSS exit motion ends (see
[GhostPresence](./presence.md)), locks body scroll with
scrollbar-width compensation, marks background siblings `inert` (while skipping
`[data-ghost-live]`), handles `Escape` and outside `pointerdown` via
`useDismissableLayer`, and traps `Tab` navigation via `useFocusScope`.

## Themed use and long content

<GhostExample id="dialog/themed" />

The themed surface caps its width and height to the viewport, minus the
`--ghost-space-inset-lg` inset, and scrolls when the content is taller. It stays
centered in both left-to-right and right-to-left documents.

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-dialog-overlay` with `var(--ghost-scrim)` and
`.ghost-dialog-content` with `--ghost-elevation-4-*`, border, hairline width,
radius, inset padding, typography, and focus-ring `--ghost-*` tokens. Composing
`:as="GhostButton"` delegates trigger and close styling cleanly.

## Nested dialogs

<GhostExample id="dialog/nested" />

Opening a dialog from inside another dialog stacks their dismissable layers,
trapped focus scopes, `inert` sibling sets, and scroll locks cleanly. Pressing
`Escape` dismisses only the innermost open dialog and restores focus and
isolation back to the outer dialog.

Revoking the link disables the **Revoke link** button that opened the
confirmation, so focus cannot return to it. The confirmation passes
`returnFocus` to send focus to **Done** instead. While the link is active,
`returnFocus` returns `null` and the default target is kept.

## Alert dialogs

<GhostExample id="dialog/alert" />

Passing `role="alertdialog"` on `GhostDialogContent` disables outside-click
dismissal by default so destructive confirmations cannot be dismissed
accidentally by clicking the backdrop, and emits a development warning
([GHOST003](../warnings.md#ghost003)) if no description is provided. The result
is announced in a polite `role="status"` next to the trigger.

## Non-modal and controlled use

- Set `:modal="false"` on `GhostDialog` to disable `aria-modal`, `GhostDialogOverlay`,
  scroll lock, background `inert`, and `Tab` trapping. Non-modal dialogs open at
  mount follow `GhostPopover`'s `openedAtMount` rule so initial render does not
  steal focus on page load, whereas modal dialogs always move focus inside on
  open.
- Use `v-model:open` for controlled state, or omit `open` with `defaultOpen` for
  uncontrolled state.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

<!-- @generated docs-api:vue/ghost-dialog begin -->

<!-- Source: packages/vue/manifests/ghost-dialog.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop          | Type      | Default | Description                                                                     |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is omitted.                                      |
| `modal`       | `boolean` | `true`  | Enables modal behavior (trapped focus, scroll lock, inert background, overlay). |
| `open`        | `boolean` | —       | Controlled open state. Omit for uncontrolled mode.                              |

| Slot      | Slot props                           | Description                                                                                                  |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `default` | `close: () => void`, `open: boolean` | Trigger, overlay, content, title, description, close parts, and optional custom UI reading the scoped state. |

<!-- @generated docs-api:vue/ghost-dialog end -->

<!-- @generated docs-api:themes/ghost-dialog begin -->

<!-- Source: packages/themes/manifests/ghost-dialog.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostDialog` API, which it forwards.

<!-- @generated docs-api:themes/ghost-dialog end -->

### `GhostDialog` (root)

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, close: () => void }`.

### `GhostDialogTrigger`

Sets `type="button"` (when `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. Exposes `{ element, focus, blur }`.

### `GhostDialogOverlay`

Renders only when both `open` and `modal` are `true`. Sets
`aria-hidden="true"`, `data-part="overlay"`, and `data-state="open"`. Exposes
`{ element, focus, blur }`.

### `GhostDialogContent`

Sets `role`, `aria-modal="true"` (when `modal=true`), `tabindex="-1"`,
`data-part="content"`, `data-state="open"`, `aria-labelledby` (linking
`GhostDialogTitle`), and `aria-describedby` (linking `GhostDialogDescription`).
Exposes `{ element, focus, blur }`.

Three optional props control focus entry and exit. Most dialogs never need
them.

| Prop           | Default     | Behavior                                                                                                                                                           |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focusReady`   | `true`      | While `false`, focus does not enter the dialog yet. Use it while content is still positioning or rendering. Once focus has entered, the trap stays on until close. |
| `initialFocus` | `undefined` | Function returning the element to focus on entry. `null` or an invalid element keeps the default: `[data-autofocus]`, then the first tabbable element.             |
| `returnFocus`  | `undefined` | Function returning the element to focus on close. `null`, or a removed or disabled element, keeps the default: the element focused when the dialog opened.         |

```vue
<GhostDialogContent
  :focus-ready="positioned"
  :initial-focus="() => selectedCell"
  :return-focus="() => (triggerEnabled ? null : inputElement)"
>
  ...
</GhostDialogContent>
```

Both functions run in the browser only, at the moment focus moves. They are
never called during server rendering.

### `GhostDialogTitle`

Sets `id` and `data-part="title"`, and registers as the dialog's accessible name
unless `aria-label` or `aria-labelledby` is provided directly on
`GhostDialogContent`. Exposes `{ element, focus, blur }`.

### `GhostDialogDescription`

Sets `id` and `data-part="description"`, and registers as the dialog's
description (`aria-describedby`) on `GhostDialogContent`. Exposes
`{ element, focus, blur }`.

### `GhostDialogClose`

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

See [GhostDialog specification](/specs/dialog) and
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md).
