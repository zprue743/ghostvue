# GhostDialog specification

**Status:** Approved for minimal `GhostDialog` (GHO-28 PR 2 of 2).
**Predecessor:** [ADR 0012: Modal overlays](../adr/0012-modal-overlays.md) and
PR #66 (`useScrollLock`, `useInertOthers`, and `dismissable-layer-stack.ts`).

## Purpose and user problems

`GhostDialog` provides a composable headless and themed dialog system supporting
modal dialogs, alert dialogs (`role="alertdialog"`), and non-modal dialogs
(`modal=false`). It composes `@ghostvue/vue`'s internal modal primitives
(`useScrollLock`, `useInertOthers`, `dismissable-layer-stack.ts`) with
`GhostPortal`, `useDismissableLayer`, `useFocusScope`, `useControllableState`,
and `useGhostId` so applications get reliable Tab trapping, background isolation,
scroll locking without layout shift, accessible labeling, and nested layer
coordination without relying on native `<dialog>.showModal()`.

## Non-goals

- Exit animations or async unmount transitions (`v-if` unmounts immediately on
  close).
- Anchored floating positioning (`GhostPopover` and `useFloating` handle that).
- Pre-built confirmation state machines or async action spinners.
- Drawers, sheets, or command palettes (those will build on `GhostDialog` in
  later components).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostDialog` (root state and context provider; renderless)
- `GhostDialogTrigger` (control that opens/toggles the dialog)
- `GhostDialogOverlay` (modal backdrop rendered while open and `modal=true`)
- `GhostDialogContent` (dialog/alertdialog surface composing focus scope,
  dismissable layer, scroll lock, and background inert)
- `GhostDialogTitle` (`h2` heading automatically linked via `aria-labelledby`)
- `GhostDialogDescription` (`p` description automatically linked via
  `aria-describedby`)
- `GhostDialogClose` (convenience close button inside dialog content)
- `useGhostDialog` (composable returning reactive open/modal state, controls,
  and deterministic part IDs)
- Types: `GhostDialogProps`, `GhostDialogSlotProps`,
  `GhostDialogTriggerElement`, `GhostDialogTriggerProps`,
  `GhostDialogTriggerExposed`, `GhostDialogOverlayElement`,
  `GhostDialogOverlayProps`, `GhostDialogOverlayExposed`,
  `GhostDialogContentElement`, `GhostDialogContentRole`,
  `GhostDialogContentProps`, `GhostDialogContentExposed`,
  `GhostDialogTitleElement`, `GhostDialogTitleProps`,
  `GhostDialogTitleExposed`, `GhostDialogDescriptionElement`,
  `GhostDialogDescriptionProps`, `GhostDialogDescriptionExposed`,
  `GhostDialogCloseElement`, `GhostDialogCloseProps`,
  `GhostDialogCloseExposed`, `UseGhostDialogOptions`, `UseGhostDialogReturn`,
  `GhostDialogContext`

Themed exports from `@ghostvue/themes`:

- `GhostDialog`, `GhostDialogTrigger`, `GhostDialogOverlay`,
  `GhostDialogContent`, `GhostDialogTitle`, `GhostDialogDescription`,
  `GhostDialogClose` (plus re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostDialog` (root)

| Prop          | Type                   | Default     | Contract                                                                                |
| ------------- | ---------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode.                                      |
| `defaultOpen` | `boolean`              | `false`     | Initial open state in uncontrolled mode.                                                |
| `modal`       | `boolean`              | `true`      | Enables focus trapping/looping, scroll lock, inert siblings, `aria-modal`, and overlay. |

#### `GhostDialogTrigger`

| Prop       | Type                                                | Default    | Contract                                                                                                                              |
| ---------- | --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostDialogTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                 |
| `disabled` | `boolean`                                           | `false`    | Prevents opening/toggling when `true`. Uses native `disabled` on `<button>` / button components and `aria-disabled="true"` otherwise. |

#### `GhostDialogOverlay`

| Prop       | Type                                                | Default  | Contract                                                                   |
| ---------- | --------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `as`       | `GhostDialogOverlayElement` (`Component \| string`) | `'div'`  | Element tag or component for the backdrop.                                 |
| `portal`   | `boolean`                                           | `true`   | Renders overlay through `GhostPortal` when `true`, or inline when `false`. |
| `portalTo` | `GhostPortalTarget`                                 | `'body'` | Teleport target passed to `GhostPortal` when `portal` is `true`.           |

Renders only when both `open` and `modal` are `true`.

#### `GhostDialogContent`

| Prop                  | Type                                                | Default                              | Contract                                                                       |
| --------------------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `as`                  | `GhostDialogContentElement` (`Component \| string`) | `'div'`                              | Element tag or component for the dialog surface.                               |
| `role`                | `'dialog' \| 'alertdialog'`                         | `'dialog'`                           | Semantic role. `'alertdialog'` turns off outside-click close by default.       |
| `closeOnEscape`       | `boolean`                                           | `true`                               | Whether `Escape` dismisses the topmost dialog layer.                           |
| `closeOnOutsideClick` | `boolean \| undefined`                              | `true` (`false` for `'alertdialog'`) | Whether pointer clicks outside content (including overlay) dismiss the dialog. |
| `portal`              | `boolean`                                           | `true`                               | Teleports content through `GhostPortal` when `true`, or inline when `false`.   |
| `portalTo`            | `GhostPortalTarget`                                 | `'body'`                             | Teleport target passed to `GhostPortal` when `portal` is `true`.               |

#### `GhostDialogTitle`

| Prop | Type                                              | Default | Contract                                      |
| ---- | ------------------------------------------------- | ------- | --------------------------------------------- |
| `as` | `GhostDialogTitleElement` (`Component \| string`) | `'h2'`  | Element tag or component for the dialog name. |

#### `GhostDialogDescription`

| Prop | Type                                                    | Default | Contract                                             |
| ---- | ------------------------------------------------------- | ------- | ---------------------------------------------------- |
| `as` | `GhostDialogDescriptionElement` (`Component \| string`) | `'p'`   | Element tag or component for the dialog description. |

#### `GhostDialogClose`

| Prop       | Type                                              | Default    | Contract                         |
| ---------- | ------------------------------------------------- | ---------- | -------------------------------- |
| `as`       | `GhostDialogCloseElement` (`Component \| string`) | `'button'` | Element tag or component.        |
| `disabled` | `boolean`                                         | `false`    | Disables activation when `true`. |

### v-model contracts

`GhostDialog` owns `open` via `useControllableState`:

- `v-model:open` (`open` + `update:open`).
- When `open` is `undefined`, internal state initializes to `defaultOpen` and
  transitions automatically on trigger, dismissable-layer, or close control
  events while emitting `update:open`.
- When `open` is boolean, `update:open` is emitted and the consumer owns the
  state update.

### Events, callbacks, slots, and exposed methods

- `GhostDialog` emits `update:open` with `[open: boolean]`.
- `GhostDialog` default slot receives `{ open: boolean, close: () => void }`.
- `GhostDialogTrigger`, `GhostDialogOverlay`, `GhostDialogContent`,
  `GhostDialogTitle`, `GhostDialogDescription`, and `GhostDialogClose` expose
  `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`.

## State model

- Two binary open states: `'closed'` and `'open'`.
- `GhostDialogOverlay` and `GhostDialogContent` render via `v-if`, so closed
  dialogs release scroll lock, inert attributes, `layerStack` entries, and
  `trappedStack` entries immediately on close.
- `data-state="open" | "closed"` is set on `GhostDialogTrigger` and
  `data-state="open"` on `GhostDialogOverlay` and `GhostDialogContent` while
  mounted.

### Loading, empty, disabled, read-only, and error states

`GhostDialogTrigger` and `GhostDialogClose` support `disabled`.

## Consumer data

`GhostDialog` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows WAI-ARIA APG Dialog (Modal) and Alert Dialog patterns:

### Semantics and relationships

- `GhostDialogTrigger`: `type="button"` (when `as="button"`),
  `aria-haspopup="dialog"`, `aria-expanded="true" | "false"`,
  `aria-controls="<contentId>"`, `data-part="trigger"`, `data-state`.
- `GhostDialogOverlay`: `aria-hidden="true"`, `data-part="overlay"`,
  `data-state="open"`.
- `GhostDialogContent`: `role="dialog" | "alertdialog"`,
  `aria-modal="true"` when `modal=true` (omitted when `modal=false`),
  `tabindex="-1"`, `data-part="content"`, `data-state="open"`,
  `aria-labelledby="<titleId>"` when `GhostDialogTitle` is mounted (unless
  `aria-label` or `aria-labelledby` is explicitly provided), and
  `aria-describedby="<descriptionId>"` when `GhostDialogDescription` is mounted
  (unless `aria-describedby` is explicitly provided).
- **Development diagnostics:**
  - `GHOST002`: warns in development if `GhostDialogContent` mounts without an
    accessible name (`GhostDialogTitle`, `aria-label`, or `aria-labelledby`).
  - `GHOST003`: warns in development if `GhostDialogContent` with
    `role="alertdialog"` mounts without a description (`GhostDialogDescription`
    or `aria-describedby`).

### Keyboard interaction

| Key                 | Where                             | Behavior                                                                            |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| `Enter` / `Space`   | `GhostDialogTrigger`              | Opens/toggles the dialog (`role="button"` + `tabindex="0"` for non-button `as`).    |
| `Escape`            | Topmost open `GhostDialogContent` | Closes the dialog when `closeOnEscape` is `true` and restores focus to the trigger. |
| `Enter` / `Space`   | `GhostDialogClose`                | Closes the dialog and restores focus to the trigger.                                |
| `Tab` / `Shift+Tab` | Inside `GhostDialogContent`       | Loops within the dialog when `modal=true`; moves freely when `modal=false`.         |

### Focus behavior

- When `modal=true`: uses `useFocusScope` with `{ trapped: true, loop: true,
autoFocus: true, restoreFocus: true }`. Even when open at mount (`defaultOpen`
  or initial `open=true`), a modal dialog moves initial focus inside the dialog
  (matching APG Dialog entry behavior) and traps `Tab` / `Shift+Tab`.
- When `modal=false`: sets `trapped: false, loop: false`, and follows
  `GhostPopover`'s `openedAtMount` rule (`autoFocus: () => !openedAtMount`).
  Allows clicking outside focusable controls without pulling focus back, while
  still restoring focus to the trigger on `Escape`, `GhostDialogClose`, or
  outside clicks on non-focusable areas.
- Upper dismissable layers: per [ADR 0012](../adr/0012-modal-overlays.md) and
  `dismissable-layer-stack.ts`, a portaled `GhostPopover` opened inside a modal
  dialog owns `Tab` while focus sits outside the dialog root, while an inline
  (`portal=false`) popover inside the dialog keeps `Tab` bounded inside the modal
  dialog.
- On modal close, `useInertOthers` releases `inert` from background elements
  before `useFocusScope` restores focus to the trigger/previous element.

## Rendering and customization

- Headless `data-part` hooks: `trigger`, `overlay`, `content`, `title`,
  `description`, `close`. `data-state`: `open` | `closed`.
- Classes: `.ghost-dialog-overlay` and `.ghost-dialog-content`.
- `@ghostvue/themes` CSS (`ghost-dialog.css`) under `@layer ghostvue-theme`
  styles `.ghost-dialog-overlay` with `var(--ghost-scrim, rgb(0 0 0 / 0.5))`
  and `.ghost-dialog-content` with `--ghost-elevation-4-*`, `--ghost-radius-lg`,
  `--ghost-border-hairline-width`, `--ghost-surface-fg`, `--ghost-space-inset-lg`,
  `--ghost-space-gap-*`, focus-ring tokens, typography tokens, and
  `@media (forced-colors: active)`. No exit animations.

## Environment behavior

### SSR and hydration

- `useGhostId` generates deterministic IDs across server and client.
- Closed dialogs render only the trigger (`v-if="false"` on overlay/content).
- `defaultOpen: true` renders overlay and content inline cleanly via
  `GhostPortal` with zero `window` or `document` access during setup.

### Mobile and touch

- `useDismissableLayer` uses capture-phase `pointerdown` for mouse, touch, and
  pen parity. `GhostDialogContent` stays constrained to viewport bounds.

## Performance

- Zero global listeners, scroll locks, or `inert` attributes exist when the
  dialog is closed.

## Composition

- `useGhostDialog` + `useControllableState` + `useGhostId`
- `GhostPortal`
- `useDismissableLayer` + `dismissable-layer-stack.ts`
- `useFocusScope`
- `useScrollLock`
- `useInertOthers` (keeping both `contentElement` and `overlayElement` active)

## Test plan

- **Unit & SSR (`packages/vue/src/GhostDialog.test.ts`,
  `use-focus-scope.test.ts`, `overlay-ssr.test.ts`, `dev-codes.test.ts`):**
  every part, props, exposed refs, `modal` vs non-modal, `alertdialog`, `GHOST002`/
  `GHOST003`, inline `portal=false` popover Tab containment inside a modal
  dialog, overlay order before/after content keeping both non-inert, nested
  dialogs, Node SSR without globals.
- **Theme integration (`tests/integration/ghost-dialog-themed.test.ts`,
  `ghost-dialog-theme-css.test.ts`):** all themed wrappers preserving >= 80%
  line coverage in `packages/themes/src`, CSS tokens (`--ghost-scrim` fallback)
  with no exit animations or unexpected literals.
- **Browser E2E (`tests/e2e/dialog.spec.ts`):** Tab/Shift+Tab wrap, Escape,
  overlay click, `closeOnEscape`/`closeOnOutsideClick=false`, scroll lock with
  no layout shift, inert background (skipping `[data-ghost-live]`), focus
  restore, nested dialogs, popover inside dialog (portaled and `portal=false`),
  `alertdialog`, `modal=false`, and Axe clean.

## Documentation plan

- `docs/components/dialog.md` with API reference and `<GhostExample />` entries
  for `dialog/basic`, `dialog/themed`, `dialog/nested`, and `dialog/alert`.
- Sidebar entry in `apps/docs/.vitepress/docs-nav.ts`, roadmap status update in
  `docs/roadmap.md`, `docs/warnings.md` updated via `renderGhostCodeDocs()`, and
  manifests regenerated via `pnpm manifests:write`.

## Compatibility and release impact

- Additive minor release (`minor` Changeset) for `@ghostvue/vue` and
  `@ghostvue/themes`.
- PR 1 review fix in `dismissable-layer-stack.ts` ensures non-portaled child
  layers inside a trapped root do not bypass the dialog's Tab trap.

## Open architectural questions

None.
