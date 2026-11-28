---
schemaVersion: 1.0.0
component: GhostDialog
components:
  - GhostDialog
  - GhostDialogTrigger
  - GhostDialogOverlay
  - GhostDialogContent
  - GhostDialogTitle
  - GhostDialogDescription
  - GhostDialogClose
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Approved for minimal `GhostDialog` (GHO-28 PR 2 of 2).'
manifests:
  - packages/vue/manifests/ghost-dialog.manifest.json
  - packages/vue/manifests/ghost-dialog-trigger.manifest.json
  - packages/vue/manifests/ghost-dialog-overlay.manifest.json
  - packages/vue/manifests/ghost-dialog-content.manifest.json
  - packages/vue/manifests/ghost-dialog-title.manifest.json
  - packages/vue/manifests/ghost-dialog-description.manifest.json
  - packages/vue/manifests/ghost-dialog-close.manifest.json
  - packages/themes/manifests/ghost-dialog.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

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

- Exit motion is CSS-only and owned by the
  [presence lifecycle](/specs/presence): no JavaScript leave hooks, keyframe
  orchestration, or `forceMount` prop.
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
| `focusReady`          | `boolean`                                           | `true`                               | Gates the first focus-scope activation of each opening (see Focus behavior).   |
| `initialFocus`        | `(() => HTMLElement \| null) \| undefined`          | `undefined`                          | Preferred initial focus target; invalid or `null` keeps the default order.     |
| `returnFocus`         | `(() => HTMLElement \| null) \| undefined`          | `undefined`                          | Preferred close focus target; invalid or `null` keeps the saved opener.        |

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
- Closed dialogs release scroll lock, inert attributes, `layerStack` entries,
  and `trappedStack` entries immediately on logical close.
  `GhostDialogOverlay` and `GhostDialogContent` render via `v-if` on
  `useGhostPresence`: they stay mounted with `data-state="closed"` only while
  their own CSS exit motion runs (content also `inert` and both
  `pointer-events: none`), then unmount
  ([presence spec](/specs/presence#state-model)).
- `data-state="open" | "closed"` is set on `GhostDialogTrigger`,
  `GhostDialogOverlay`, and `GhostDialogContent`.

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
- Focus readiness and targets (GHO-209, added for the anchored
  DatePicker, specified in `docs/components/date-picker-spec.md`):
  - `focusReady` (default `true`) gates the first focus-scope activation of
    each opening. Activation also waits for portal placement. Scroll lock,
    background `inert`, and dismissal start when the dialog opens. Once the
    scope has activated, it stays active (and a modal trap stays on) until
    close, even if `focusReady` turns `false` again.
  - The element focused when an opening starts is captured before background
    `inert` applies, because browsers blur a focused element once it becomes
    inert. When activation was deferred, that element is the restore fallback.
    A dialog closed before it ever activated restores focus the same way if
    focus was left on `<body>`.
  - `initialFocus` is resolved at activation, after mount. A missing,
    disconnected, unfocusable, or outside-the-content element keeps the default
    order (`[data-autofocus]`, first tabbable, the content).
  - `returnFocus` is resolved on each close that restores focus, after mount.
    A missing, disconnected, or unfocusable (for example disabled) element
    keeps the saved opener. It is not called while a controlled parent keeps
    the dialog open, and focus does not move in that case.
  - Resolvers are plain functions read at those moments, so a descendant can
    register its target (for example a Calendar grid cell) without timers or
    DOM queries into undocumented nesting.
  - `GhostDrawerContent` shares this implementation but does not expose these
    props; drawers keep the default behavior.
- On modal close, `useInertOthers` releases `inert` from background elements
  before `useFocusScope` restores focus to the trigger/previous element.
- Modal outside-pointer close happens on `pointerdown`, so the overlay is gone
  before the press finishes. Chromium and Firefox then dispatch `mousedown` at
  the uncovered page, which the dialog cancels so it cannot blur the restored
  focus. WebKit dispatches no `mousedown` once its target is removed but still
  moves focus to `<body>` as the press default action; the dialog therefore
  reapplies the restored focus in the next task when, and only when, focus was
  dropped to `<body>` (a deliberate move to another control is kept). Covered in
  Chromium, Firefox, and WebKit by the `@cross-browser` dialog e2e spec.

## Rendering and customization

- Headless `data-part` hooks: `trigger`, `overlay`, `content`, `title`,
  `description`, `close`. `data-state`: `open` | `closed`.
- Classes: `.ghost-dialog-overlay` and `.ghost-dialog-content`.
- `@ghostvue/themes` CSS (`ghost-dialog.css`) under `@layer ghostvue-theme`
  styles `.ghost-dialog-overlay` with `var(--ghost-scrim)`
  and `.ghost-dialog-content` with `--ghost-elevation-4-*`, `--ghost-radius-lg`,
  `--ghost-border-hairline-width`, `--ghost-surface-fg`, `--ghost-space-inset-lg`,
  `--ghost-space-gap-*`, focus-ring tokens, typography tokens, and
  `@media (forced-colors: active)`. Exit recipes on `[data-state='closed']`
  use `--ghost-motion-exit-*` (fade-only under reduced motion); geometry and
  forced-colors rules do not depend on `[data-state='open']`.

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
  dialogs, Node SSR without globals, and `focusReady` / `initialFocus` /
  `returnFocus` defaults, fallbacks, SSR without resolver calls, and hydration
  of an initially open, not-yet-ready dialog.
- **Theme integration (`tests/integration/ghost-dialog-themed.test.ts`,
  `ghost-dialog-theme-css.test.ts`):** all themed wrappers preserving >= 80%
  line coverage in `packages/themes/src`, CSS tokens (`--ghost-scrim`)
  with token-only exit recipes and no unexpected literals.
- **Browser E2E (`tests/e2e/dialog.spec.ts`):** Tab/Shift+Tab wrap, Escape,
  overlay click, `closeOnEscape`/`closeOnOutsideClick=false`, scroll lock with
  no layout shift, inert background (skipping `[data-ghost-live]`), focus
  restore, nested dialogs, popover inside dialog (portaled and `portal=false`),
  `alertdialog`, `modal=false`, and Axe clean. Deferred focus entry
  (`focusReady`, registered `initialFocus` target, trap continuity, nested
  dialogs, disabled and removed opener with `returnFocus`, close before
  readiness, ignored controlled close, and cleanup).
- **Cross-browser (`@cross-browser`, Chromium, Firefox, WebKit):** focus trap
  and overlay-click restore, nested dialog Escape, root scroll lock with
  `html { overflow-y: scroll }`, and the modal primitives (portaled popover Tab
  inside a trap, body scroll lock, inert background). Headless Firefox and
  WebKit on Linux only have 0px overlay scrollbars, so scroll-lock specs assert
  `padding-right` compensation equal to the classic scrollbar width in Chromium
  and no compensation (untouched inline padding) in Firefox and WebKit; the
  overflow lock, zero scroll delta, and zero layout shift are asserted
  everywhere.

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
