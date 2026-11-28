---
schemaVersion: 1.0.0
component: GhostDrawer
components:
  - GhostDrawer
  - GhostDrawerTrigger
  - GhostDrawerOverlay
  - GhostDrawerContent
  - GhostDrawerTitle
  - GhostDrawerDescription
  - GhostDrawerClose
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Approved by Zac (maintainer) in chat on 2026-11-17; recorded in the GHO-91 Linear document (Drawer / Sheet design plan and specification). See the Status line in this spec.'
manifests:
  - packages/vue/manifests/ghost-drawer.manifest.json
  - packages/vue/manifests/ghost-drawer-trigger.manifest.json
  - packages/vue/manifests/ghost-drawer-overlay.manifest.json
  - packages/vue/manifests/ghost-drawer-content.manifest.json
  - packages/vue/manifests/ghost-drawer-title.manifest.json
  - packages/vue/manifests/ghost-drawer-description.manifest.json
  - packages/vue/manifests/ghost-drawer-close.manifest.json
  - packages/themes/manifests/ghost-drawer.manifest.json
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

# GhostDrawer specification

**Status:** Approved. Approved by Zac (maintainer) in chat, November 17, 2026 —
see GHO-91 Linear document
([GHO-91 — Drawer / Sheet design plan and specification](https://linear.app/ghost-vue/document/gho-91-drawer-sheet-design-plan-and-specification-7f49fb2f9637)).
Direction (Option A) approved by Zac in chat on the same date.
**Predecessors:** [GhostDialog specification](/specs/dialog) (GHO-28) and
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md).

## Purpose and user problems

`GhostDrawer` (also called a Sheet) is an edge-anchored modal or non-modal
overlay panel anchored to the `start`, `end`, `top`, or `bottom` viewport edge.
It serves secondary workflows such as DataTable filter panels, row-detail
inspectors, navigation drawers, and multi-field creation flows that benefit from
full viewport height or width without leaving the current page.

It is a Dialog variant: it follows the same APG Dialog (Modal) contract and
reuses the exact focus, dismissal, scroll-lock, and background-isolation
mechanics as `GhostDialog` through an internal shared module.

## Non-goals

- Touch swipe / drag-to-dismiss gestures or multi-stop snap points (deferred by
  the approved Option A direction).
- JavaScript exit orchestration. Exit motion is CSS-only and owned by the
  [presence lifecycle](/specs/presence), matching `GhostDialog`.
- Anchored floating callouts positioned relative to a trigger (`GhostPopover`
  and `useFloating` own anchored positioning).
- Persistent in-flow split-pane sidebars that are not dialogs.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostDrawer` (root state and context provider; renderless)
- `GhostDrawerTrigger` (control that opens/toggles the drawer)
- `GhostDrawerOverlay` (modal backdrop rendered while `open` and `modal=true`)
- `GhostDrawerContent` (edge-anchored `dialog` or `alertdialog` surface)
- `GhostDrawerTitle` (`h2` heading linked via `aria-labelledby`)
- `GhostDrawerDescription` (`p` description linked via `aria-describedby`)
- `GhostDrawerClose` (close control inside drawer content)
- `useGhostDrawer` (composable returning reactive open/modal/side/dir state,
  controls, and deterministic part IDs)
- `resolveDrawerDir` (pure SSR-safe helper resolving `'ltr' | 'rtl'`)
- Types: `GhostDrawerSide`, `GhostDrawerDirection`, `GhostDrawerProps`,
  `GhostDrawerSlotProps`, `GhostDrawerTriggerElement`,
  `GhostDrawerTriggerProps`, `GhostDrawerTriggerExposed`,
  `GhostDrawerOverlayElement`, `GhostDrawerOverlayProps`,
  `GhostDrawerOverlayExposed`, `GhostDrawerContentElement`,
  `GhostDrawerContentRole`, `GhostDrawerContentProps`,
  `GhostDrawerContentExposed`, `GhostDrawerTitleElement`,
  `GhostDrawerTitleProps`, `GhostDrawerTitleExposed`,
  `GhostDrawerDescriptionElement`, `GhostDrawerDescriptionProps`,
  `GhostDrawerDescriptionExposed`, `GhostDrawerCloseElement`,
  `GhostDrawerCloseProps`, `GhostDrawerCloseExposed`, `UseGhostDrawerOptions`,
  `UseGhostDrawerReturn`, `GhostDrawerContext`, and `ResolveDrawerDirOptions`
  (the options object of `resolveDrawerDir`)

Themed exports from `@ghostvue/themes`: `GhostDrawer`, `GhostDrawerTrigger`,
`GhostDrawerOverlay`, `GhostDrawerContent`, `GhostDrawerTitle`,
`GhostDrawerDescription`, `GhostDrawerClose` (plus re-exported types and styles
via `ghost-drawer.css` in `default.css`).

### Props and configuration

```ts
export type GhostDrawerSide = 'start' | 'end' | 'top' | 'bottom'
export type GhostDrawerDirection = 'ltr' | 'rtl'
export type GhostDrawerContentRole = 'dialog' | 'alertdialog'
```

#### `GhostDrawer` (root)

| Prop          | Type                                | Default     | Contract                                                                                             |
| ------------- | ----------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `open`        | `boolean \| undefined`              | `undefined` | Controlled open state. Omit for uncontrolled mode.                                                   |
| `defaultOpen` | `boolean`                           | `false`     | Initial open state when `open` is omitted.                                                           |
| `modal`       | `boolean`                           | `true`      | Enables focus trapping/looping, scroll lock, `inert` background siblings, `aria-modal`, and overlay. |
| `side`        | `GhostDrawerSide`                   | `'end'`     | Default viewport edge placement.                                                                     |
| `dir`         | `GhostDrawerDirection \| undefined` | `undefined` | Optional explicit writing direction for logical `start` / `end` edge mapping.                        |

#### `GhostDrawerTrigger`

| Prop       | Type                                                | Default    | Contract                                                                                                                              |
| ---------- | --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostDrawerTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                 |
| `disabled` | `boolean`                                           | `false`    | Prevents opening/toggling when `true`. Uses native `disabled` on `<button>` / button components and `aria-disabled="true"` otherwise. |

#### `GhostDrawerOverlay`

| Prop       | Type                                                | Default  | Contract                                                                   |
| ---------- | --------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `as`       | `GhostDrawerOverlayElement` (`Component \| string`) | `'div'`  | Element tag or component for the modal backdrop.                           |
| `portal`   | `boolean`                                           | `true`   | Renders overlay through `GhostPortal` when `true`, or inline when `false`. |
| `portalTo` | `GhostPortalTarget`                                 | `'body'` | Teleport target passed to `GhostPortal` when `portal` is `true`.           |

Renders only when both `open` and `modal` are `true`.

#### `GhostDrawerContent`

| Prop                  | Type                                                | Default                              | Contract                                                                                |
| --------------------- | --------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| `as`                  | `GhostDrawerContentElement` (`Component \| string`) | `'div'`                              | Element tag or component for the drawer surface.                                        |
| `side`                | `GhostDrawerSide \| undefined`                      | `undefined`                          | Overrides the root `side` when provided; otherwise inherits the root `side` (`'end'`).  |
| `dir`                 | `GhostDrawerDirection \| undefined`                 | `undefined`                          | Overrides the root `dir` when provided; otherwise resolves from root/ancestor/document. |
| `role`                | `'dialog' \| 'alertdialog'`                         | `'dialog'`                           | Semantic role. `'alertdialog'` turns off outside-click close by default.                |
| `closeOnEscape`       | `boolean`                                           | `true`                               | Whether `Escape` dismisses the topmost open layer.                                      |
| `closeOnOutsideClick` | `boolean \| undefined`                              | `true` (`false` for `'alertdialog'`) | Whether pointerdown outside content (including the overlay) dismisses the drawer.       |
| `portal`              | `boolean`                                           | `true`                               | Teleports content through `GhostPortal` when `true`, or renders inline when `false`.    |
| `portalTo`            | `GhostPortalTarget`                                 | `'body'`                             | Teleport target passed to `GhostPortal` when `portal` is `true`.                        |

#### `GhostDrawerTitle`, `GhostDrawerDescription`, `GhostDrawerClose`

| Component                | Prop       | Type                            | Default    | Contract                                       |
| ------------------------ | ---------- | ------------------------------- | ---------- | ---------------------------------------------- |
| `GhostDrawerTitle`       | `as`       | `GhostDrawerTitleElement`       | `'h2'`     | Element tag or component for the heading.      |
| `GhostDrawerDescription` | `as`       | `GhostDrawerDescriptionElement` | `'p'`      | Element tag or component for the description.  |
| `GhostDrawerClose`       | `as`       | `GhostDrawerCloseElement`       | `'button'` | Element tag or component for the close button. |
| `GhostDrawerClose`       | `disabled` | `boolean`                       | `false`    | Disables closing when `true`.                  |

### v-model contracts

- `GhostDrawer` owns `open` via `useControllableState` (`v-model:open` /
  `open` + `update:open`).
- When `open` is `undefined`, internal state starts from `defaultOpen` and
  changes on trigger, dismissable-layer, or close-control events while emitting
  `update:open`.
- If a controlled parent ignores `update:open(false)` on Escape, Close click,
  or outside pointerdown, the drawer remains open, keeps `useScrollLock` and
  `useInertOthers` active, and does not restore focus to the trigger.

### Events, callbacks, slots, and exposed methods

- `GhostDrawer` emits `update:open` with `[open: boolean]`.
- `GhostDrawer` default slot receives
  `{ open: boolean, close: () => void, side: GhostDrawerSide }`, where `side`
  is the effective side (content override when set, otherwise the root side).
- `GhostDrawerTrigger`, `GhostDrawerOverlay`, `GhostDrawerContent`,
  `GhostDrawerTitle`, `GhostDrawerDescription`, and `GhostDrawerClose` each
  expose `{ readonly element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`.

## State model

- Two binary open states: `'closed'` and `'open'`.
- Closed drawers release scroll lock, `inert` attributes, dismissable-layer
  entries, and trapped focus scopes immediately on logical close.
  `GhostDrawerOverlay` and `GhostDrawerContent` render with `v-if` on
  `useGhostPresence` and stay mounted with `data-state="closed"` (keeping
  `data-side` / `data-dir`) only while their CSS exit slide runs
  ([presence spec](/specs/presence#state-model)).
- `data-state="open" | "closed"` on the trigger, overlay, and content.

### Loading, empty, disabled, read-only, and error states

`GhostDrawerTrigger` and `GhostDrawerClose` support `disabled`. Disabled guards
run before consumer `onClick` / `onKeydown` handlers.

### Async behavior

None. Open state changes synchronously; consumers own any async work inside the
panel.

## Consumer data

`GhostDrawer` holds no domain collections and never mutates consumer props.

## Placement and RTL resolution

A portaled drawer (`portal=true`, `portalTo="body"`) is a `position: fixed`
child of `document.body`, so CSS `inset-inline-start` alone resolves against
`<html>`'s direction rather than a localized `<div dir="rtl">` subtree that
wraps the trigger. `GhostDrawerContent` resolves its effective direction in
priority order:

1. Explicit `dir` prop on `GhostDrawerContent`, then on `GhostDrawer`.
2. Closest `[dir="ltr" | "rtl"]` ancestor of the content element (excluding
   `<html>`).
3. Closest `[dir="ltr" | "rtl"]` ancestor of the trigger element (excluding
   `<html>`).
4. `document.documentElement.dir` on the client, otherwise `'ltr'` (including
   SSR when no explicit `dir` is given).

`<html>` is excluded from steps 2–3 so a portaled drawer can still see the
trigger's localized subtree; `dir="auto"` and other values are skipped. The
resolution runs after mount (and again after an initial portal move), so the
server and first client render agree on `explicitDir ?? 'ltr'`.

`GhostDrawerContent` binds `data-side`, `data-dir="ltr" | "rtl"`, and sets the
`dir` attribute on the host when the resolved direction is `rtl` (or when a
direction was passed explicitly) so interior content flow matches the edge.

| `side`     | `data-dir="ltr"` edge | `data-dir="rtl"` edge | Entry slide vector (`@starting-style`) |
| ---------- | --------------------- | --------------------- | -------------------------------------- |
| `'start'`  | Left (`left: 0`)      | Right (`right: 0`)    | `-100% 0` in LTR; `100% 0` in RTL      |
| `'end'`    | Right (`right: 0`)    | Left (`left: 0`)      | `100% 0` in LTR; `-100% 0` in RTL      |
| `'top'`    | Top (`top: 0`)        | Top (`top: 0`)        | `0 -100%`                              |
| `'bottom'` | Bottom (`bottom: 0`)  | Bottom (`bottom: 0`)  | `0 100%`                               |

## Accessibility contract

Follows the WAI-ARIA APG Dialog (Modal) and Alert Dialog patterns.

### Semantics and relationships

- `GhostDrawerTrigger`: `type="button"` (when `as="button"`),
  `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="<contentId>"`,
  `data-part="trigger"`, `data-state`, `data-side`.
- `GhostDrawerOverlay`: `aria-hidden="true"`, `data-part="overlay"`,
  `data-state="open"`, `data-side`.
- `GhostDrawerContent`: `role="dialog" | "alertdialog"`, `aria-modal="true"`
  when `modal=true` (omitted otherwise), `tabindex="-1"`, `data-part="content"`,
  `data-state="open"`, `data-side`, `data-dir`, `aria-labelledby` when
  `GhostDrawerTitle` is mounted (unless `aria-label` / `aria-labelledby` is
  passed), and `aria-describedby` when `GhostDrawerDescription` is mounted
  (unless `aria-describedby` is passed).
- Development diagnostics `GHOST002` (missing accessible name) and `GHOST003`
  (`role="alertdialog"` without a description) are shared with `GhostDialog`.

### Keyboard interaction

| Key                 | Where                       | Behavior                                                                         |
| ------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `Enter` / `Space`   | `GhostDrawerTrigger`        | Opens/toggles the drawer (`role="button"` + `tabindex="0"` for non-button `as`). |
| `Escape`            | Topmost open layer          | Closes the drawer when `closeOnEscape` is `true` and restores focus to trigger.  |
| `Enter` / `Space`   | `GhostDrawerClose`          | Closes the drawer and restores focus to the trigger.                             |
| `Tab` / `Shift+Tab` | Inside `GhostDrawerContent` | Loops within the drawer when `modal=true`; moves freely when `modal=false`.      |

The drawer is not a composite widget, so there is no roving tabindex; every
tabbable descendant is a normal Tab stop. Arrow keys are not handled, so writing
direction does not change keyboard behavior, only placement.

### Focus behavior

- **Modal:** `useFocusScope({ trapped: true, loop: true, autoFocus: true, restoreFocus: true })`,
  `useScrollLock(true)`, and `useInertOthers([content, overlay], true)` (skipping
  `[data-ghost-live]`). A modal drawer open at mount still moves focus inside.
- **Non-modal:** no overlay or `aria-modal`; `trapped: false, loop: false`,
  `autoFocus: () => !openedAtMount`; dismissing via an outside pointerdown on a
  focusable control keeps focus on that control.
- **Nested overlays:** per ADR 0012 and `dismissable-layer-stack.ts`, an upper
  portaled `GhostPopover` / `GhostSelect` / `GhostCombobox` /
  `GhostDropdownMenu` or a nested `GhostDialog` / `GhostDrawer` opened inside
  `GhostDrawerContent` owns `Escape` and `Tab` while active; inline
  (`portal=false`) popovers stay bounded inside the modal drawer's focus trap.
  `GhostDrawer` uses its own injection key, so a nested `GhostDialog`'s parts
  never register on the drawer (and vice versa).

### Assistive technology expectations

Screen readers announce the drawer as a dialog with its title and description,
exactly like `GhostDialog`; side and direction are visual-only.

## Rendering and customization

- Headless classes: `.ghost-drawer-overlay` and `.ghost-drawer-content`.
  `data-part` hooks: `trigger`, `overlay`, `content`, `title`, `description`,
  `close`. Placement hooks: `data-side`, `data-dir`.
- Themed CSS (`packages/themes/src/ghost-drawer.css`) under
  `@layer ghostvue-theme`:
  - Uses `--ghost-scrim`, `--ghost-elevation-4-*`, `--ghost-radius-lg`,
    `--ghost-border-hairline-width`, `--ghost-surface-fg`,
    `--ghost-space-inset-lg`, `--ghost-space-gap-md`, `--ghost-focus-ring-*`,
    and `overscroll-behavior: contain`, with no hardcoded colors or non-zero
    `px` / `ms` / `s` / `rem` / `em` literals.
  - Side panels (`start` / `end`): `block-size: 100dvh`,
    `inline-size: min(calc(100dvw - 2 * var(--ghost-space-inset-lg)), 42ch)`,
    inner-edge `--ghost-radius-lg` corners, outer-edge border `0`.
  - Sheet panels (`top` / `bottom`): `inline-size: 100dvw`,
    `max-block-size: min(calc(100dvh - 2 * var(--ghost-space-inset-lg)), 85dvh)`,
    inner-edge radius, outer-edge border `0`.
  - Entry: `@starting-style` slide + fade (`opacity` and `translate` with
    `--ghost-motion-enter-*`) under `prefers-reduced-motion: no-preference`.
  - `prefers-reduced-motion: reduce`: `translate: none` in resting and starting
    states, opacity-only fade with `--ghost-motion-fade-duration` /
    `--ghost-motion-easing-standard`.
  - `forced-colors: active`: `Canvas` / `CanvasText` surface, no shadows,
    `Highlight` focus outline.
  - Title/description rules use child combinators so a nested dialog's parts
    are not restyled.

## Environment behavior

### SSR and hydration

- Deterministic IDs via `useGhostId('ghost-drawer-*')`.
- Closed drawers render only the trigger.
- `defaultOpen: true` renders cleanly with no `window` / `document` reads during
  setup; `focusPortalReady` defers initial focus scope activation by one tick
  when portaling on mount so Teleport does not drop focus.
- Without an explicit `dir`, server HTML always has `data-dir="ltr"`; RTL
  subtrees refine it after mount. Pass `dir` explicitly for RTL pages that render
  a drawer open on the server.

### Mobile and touch

`useDismissableLayer` uses capture-phase `pointerdown` for mouse, touch, and pen
parity. Dynamic viewport units (`dvh` / `dvw`) keep panels inside the visible
viewport when mobile browser chrome collapses. No gestures (non-goal).

## Performance

Zero global listeners, scroll locks, or `inert` attributes exist while closed.
Direction resolution walks DOM ancestors only on open/mount changes.

## Composition

- Internal `packages/vue/src/dialog-shared.ts` (shared with `GhostDialog*`):
  controllable state + IDs, part registration, trigger/close activation,
  overlay, and content mechanics.
- `GhostPortal`, `useDismissableLayer` + `dismissable-layer-stack.ts`,
  `useFocusScope`, `useScrollLock`, `useInertOthers`, `useControllableState`,
  `useGhostId`.
- Distinct injection keys (`ghostDialogContextKey` / `ghostDrawerContextKey`).
  No focus, dismissal, scroll-lock, or isolation code is duplicated.

## Test plan

- **Unit / behavior (`packages/vue/src/GhostDrawer.test.ts`):** `resolveDrawerDir`
  priority (explicit, content ancestor, trigger ancestor, `<html>`, SSR fallback,
  `dir="auto"`), `useGhostDrawer`, ARIA linking, side override propagation,
  portaled RTL subtree, explicit `dir`, modal trap / scroll lock / inert / focus
  restore, overlay and Close dismissal, controlled parent ignoring
  `update:open(false)`, non-modal behavior, `closeOnEscape` /
  `closeOnOutsideClick` / `alertdialog`, nested `GhostDialog`, `GHOST002` /
  `GHOST003`, exposed refs, `as` / `disabled`, and errors outside the root.
- **Dialog regression:** `packages/vue/src/GhostDialog.test.ts` and
  `tests/integration/ghost-dialog-themed.test.ts` pass unchanged.
- **SSR:** `packages/vue/src/overlay-ssr.test.ts` (Node, no globals) and
  `tests/integration/ssr-hydration.test.ts` (closed and open with explicit
  `dir`).
- **Themes:** `tests/integration/ghost-drawer-themed.test.ts` and
  `tests/integration/ghost-drawer-theme-css.test.ts` (tokens, physical edge
  mapping, `@starting-style`, reduced motion, forced colors, no literals).
- **Browser (`tests/e2e/drawer.spec.ts`):** Tab / Shift+Tab wrap with
  `toBeFocused()`, Escape, overlay click, Close, Enter/Space on the trigger,
  physical edge geometry for every side in LTR and inside an RTL subtree,
  reduced-motion `translate: none`, non-modal page interaction, nested dialog
  Escape order, and Axe with the drawer open and closed.
- **Cross-browser (`@cross-browser`):** the RTL-subtree edge flip and nested
  dialog Escape order also run in Firefox and WebKit. The drawer shares the
  dialog's modal outside-press handling, including the WebKit focus reapply
  described under Focus behavior in `docs/components/dialog-spec.md`.

## Documentation plan

`docs/components/drawer.md` with `<GhostExample />` entries for `drawer/basic`,
`drawer/themed`, `drawer/sides`, `drawer/non-modal`, and `drawer/nested`;
generated reference pages from manifests; roadmap row 41; playground fixtures.

## Compatibility and release impact

- Additive `minor` Changeset for `@ghostvue/vue` and `@ghostvue/themes`.
- `GhostDialog*` parts now delegate to `dialog-shared.ts`; their public API,
  markup, and tests are unchanged. `GHOST002` / `GHOST003` messages now name
  both dialog families.

## Open architectural questions

None.
