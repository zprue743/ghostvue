# GhostPopover specification

**Status:** Approved for minimal `GhostPopover` (GHO-27 / GHO-78 PR 2 of 2).

## Purpose and user problems

`GhostPopover` displays a floating, non-modal disclosure surface anchored to a
trigger control. It composes `@ghostvue/vue`'s overlay primitives
(`useDismissableLayer`, `useFloating`, `GhostPortal`, `useFocusScope`,
`useControllableState`, and `useGhostId`) so applications get reliable
positioning, portaling, Escape/outside-pointer dismissal, and focus entry/return
without reimplementing layer stacking or Floating UI wiring.

## Non-goals

- Modal dialog behavior (`aria-modal="true"`, backdrop, or `Tab` focus
  trapping). Those belong to a future `GhostDialog`.
- Tooltip hover/focus delay timing (`aria-describedby` / `role="tooltip"`).
  Those belong to `GhostTooltip`.
- Menu or listbox keyboard navigation (`aria-haspopup="menu"`, arrow-key roving,
  typeahead). Those belong to `GhostDropdownMenu` and `GhostSelect`.
- Decorative arrow/caret elements or open/close CSS transition hooks beyond
  `data-state` and `data-placement`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostPopover` (root state and context provider; renderless)
- `GhostPopoverTrigger` (anchor and toggle button)
- `GhostPopoverContent` (positioned, dismissable floating `role="dialog"` surface)
- `GhostPopoverClose` (convenience close button inside content)
- `useGhostPopover` (composable returning reactive open state, controls, and
  trigger/content IDs)
- Types: `GhostPopoverProps`, `GhostPopoverSlotProps`,
  `GhostPopoverTriggerElement`, `GhostPopoverTriggerProps`,
  `GhostPopoverTriggerExposed`, `GhostPopoverContentElement`,
  `GhostPopoverContentProps`, `GhostPopoverContentExposed`,
  `GhostPopoverCloseElement`, `GhostPopoverCloseProps`,
  `GhostPopoverCloseExposed`, `UseGhostPopoverOptions`,
  `UseGhostPopoverReturn`, `GhostPopoverContext`

Themed exports from `@ghostvue/themes`:

- `GhostPopover`, `GhostPopoverTrigger`, `GhostPopoverContent`,
  `GhostPopoverClose` (plus re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostPopover` (root)

| Prop          | Type                   | Default     | Contract                                           |
| ------------- | ---------------------- | ----------- | -------------------------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode. |
| `defaultOpen` | `boolean`              | `false`     | Initial open state in uncontrolled mode.           |

#### `GhostPopoverTrigger`

| Prop       | Type                                                 | Default    | Contract                                                                                                                               |
| ---------- | ---------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostPopoverTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                  |
| `disabled` | `boolean`                                            | `false`    | Prevents toggling when `true`. Uses native `disabled` on `<button>` / button components and `aria-disabled="true"` on non-button tags. |

Native attributes and listeners fall through to the rendered root element.

#### `GhostPopoverContent`

| Prop        | Type                                                 | Default      | Contract                                                                   |
| ----------- | ---------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `as`        | `GhostPopoverContentElement` (`Component \| string`) | `'div'`      | Element tag or component for the dialog surface.                           |
| `placement` | `Placement`                                          | `'bottom'`   | Preferred placement relative to the trigger.                               |
| `offset`    | `OffsetOptions \| boolean \| undefined`              | `undefined`  | Distance or axis offsets passed to `useFloating`.                          |
| `flip`      | `boolean \| FlipOptions`                             | `true`       | Flip to an opposite side when overflowing.                                 |
| `shift`     | `boolean \| ShiftOptions`                            | `true`       | Shift along the cross axis to stay in view.                                |
| `strategy`  | `Strategy` (`'absolute' \| 'fixed'`)                 | `'absolute'` | CSS positioning strategy passed to `useFloating`.                          |
| `portal`    | `boolean`                                            | `true`       | Renders content through `GhostPortal` when `true`, or inline when `false`. |
| `portalTo`  | `GhostPortalTarget`                                  | `'body'`     | Teleport target passed to `GhostPortal` when `portal` is `true`.           |

Native attributes and listeners fall through to the floating content element.

#### `GhostPopoverClose`

| Prop       | Type                                               | Default    | Contract                         |
| ---------- | -------------------------------------------------- | ---------- | -------------------------------- |
| `as`       | `GhostPopoverCloseElement` (`Component \| string`) | `'button'` | Element tag or component.        |
| `disabled` | `boolean`                                          | `false`    | Disables activation when `true`. |

### v-model contracts

`GhostPopover` owns `open` via `useControllableState`:

- `open` (`modelValue: false` — uses explicit `open` + `update:open` per Vue 3
  `v-model:open` convention).
- When `open` is `undefined` (omitted), internal state starts at `defaultOpen`
  and updates automatically on trigger, Escape, outside pointerdown, or close
  activations while still emitting `update:open`.
- When `open` is `boolean`, `update:open` is emitted and the consumer owns the
  state update.

### Events, callbacks, slots, and exposed methods

- `GhostPopover` emits `update:open` with `[open: boolean]`.
- `GhostPopover` default slot receives `{ open: boolean, close: () => void }`.
- `GhostPopoverTrigger`, `GhostPopoverContent`, and `GhostPopoverClose` expose
  `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`
  matching `GhostButton`. When `:as="GhostButton"` is used, `element` resolves to
  the underlying `<button>` element.

## State model

- Two binary states: `'closed'` and `'open'`.
- `GhostPopoverContent` renders with `v-if="open"`, not `v-show`, so closed
  layers unmount cleanly from the DOM, `useDismissableLayer`'s `layerStack`,
  `useFloating`'s `autoUpdate`, and `useFocusScope`.
- `data-state="open" | "closed"` is set on `GhostPopoverTrigger` and
  `data-state="open"` on `GhostPopoverContent` while mounted.
- `data-placement` is written on `GhostPopoverContent` by `useFloating` once the
  resolved placement is computed.
- `GhostPopoverContent` keeps `visibility: hidden` inline until
  `useFloating().isPositioned` becomes `true`, preventing any first-frame flash
  at `(0, 0)`.

### Loading, empty, disabled, read-only, and error states

`GhostPopoverTrigger` and `GhostPopoverClose` support `disabled`. A disabled
trigger ignores click and keyboard activation.

## Consumer data

`GhostPopover` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows WAI-ARIA APG disclosure / non-modal dialog guidance:

### Semantics and relationships

- `GhostPopoverTrigger` renders `type="button"` (when `as="button"`),
  `id` (from `useGhostId`, overridable by consumer `id`), `aria-haspopup="dialog"`,
  `aria-expanded="true" | "false"`, `aria-controls="<contentId>"`,
  `data-part="trigger"`, and `data-state="open" | "closed"`.
- `GhostPopoverContent` renders `id` (matching `aria-controls`, overridable by
  consumer `id`), `role="dialog"`, `tabindex="-1"`, `data-part="content"`,
  `data-state="open"`, and `aria-labelledby="<triggerId>"` by default unless the
  consumer provides `aria-label` or `aria-labelledby`. No `aria-modal="true"`.
- `GhostPopoverClose` renders `type="button"` (when `as="button"`),
  `data-part="close"`.

### Keyboard interaction

| Key                 | Where                              | Behavior                                                                                                         |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Enter` / `Space`   | `GhostPopoverTrigger`              | Toggles `open`. Non-button `as` elements also support `Enter` / `Space` with `role="button"` and `tabindex="0"`. |
| `Escape`            | Topmost open `GhostPopoverContent` | Closes the topmost popover layer via `useDismissableLayer` and restores focus to the trigger.                    |
| `Enter` / `Space`   | `GhostPopoverClose`                | Closes the popover and restores focus to the trigger.                                                            |
| `Tab` / `Shift+Tab` | Inside `GhostPopoverContent`       | Moves freely without trapping (`useFocusScope` with `trapped: false`).                                           |

### Focus behavior

- Reuses `useFocusScope` with `{ trapped: false, autoFocus: true, restoreFocus }`
  (no second focus implementation).
- Focus activation waits until the content is both teleported (if `portal` is
  enabled) and positioned (`isPositioned === true`, i.e., `visibility: hidden`
  removed) so `getTabbableElements()` and `.focus()` succeed reliably.
- On open, focus moves to `[data-autofocus]` if present and focusable, else the
  first tabbable descendant inside `GhostPopoverContent`, else
  `GhostPopoverContent` itself (`tabindex="-1"`).
- On close via Escape, `GhostPopoverClose`, trigger toggle, or outside click on a
  non-focusable target, focus restores to the trigger (the active element at
  open). Outside clicks targeting another focusable element allow focus to move
  to that target without yanking it back.

## Rendering and customization

- `GhostPopoverTrigger` (`data-part="trigger"`, `data-state`),
  `GhostPopoverContent` (`ghost-popover-content`, `data-part="content"`,
  `data-state`, `data-placement`), `GhostPopoverClose` (`data-part="close"`).
- Styled `@ghostvue/themes` CSS adds minimal dialog surface tokens under
  `@layer ghostvue-theme` using `--ghost-elevation-3-*`, `--ghost-radius-lg`,
  `--ghost-border-hairline-width`, `--ghost-surface-fg`, `--ghost-space-inset-md`,
  focus ring tokens, and `@media (forced-colors: active)`. No new tokens added.

## Environment behavior

### SSR and hydration

- `useGhostId` provides deterministic SSR-safe IDs.
- Closed popovers render only the trigger (`v-if="false"` for content).
- `defaultOpen: true` SSR renders the dialog inline via `GhostPortal` without
  accessing `window` or `document`; `useFloating`, `useDismissableLayer`, and
  `useFocusScope` only attach browser behavior inside `onMounted`.

### Mobile and touch

- `useDismissableLayer` listens to capture-phase `pointerdown`, supporting mouse,
  touch, and pen input consistently. `GhostPopoverContent` shifts within
  viewport edges by default (`shift: true`, `flip: true`).

## Performance

- `useFloating` (`autoUpdate`) and `useDismissableLayer` document listeners are
  active only while `GhostPopoverContent` is open and mounted. Closed popovers
  register zero global listeners and zero observers.

## Composition

- `useGhostPopover` + `useControllableState` + `useGhostId` for state and IDs.
- `GhostPortal` for teleportation.
- `useFloating` for anchor positioning, collision handling, `data-placement`,
  and `isPositioned`.
- `useDismissableLayer` for stacked Escape and outside-pointer dismissal with
  trigger `ignore`.
- `useFocusScope` (`trapped: false`) for focus entry and restoration.

## Test plan

- **Unit tests (`packages/vue/src/GhostPopover.test.ts`, `use-floating.test.ts`):**
  controlled/uncontrolled `open`, `aria-*` and `data-*` attrs, `aria-labelledby`
  fallback vs override, `isPositioned` & `visibility: hidden` first-paint guard,
  `portal` vs `portal=false`, `as` prop (including `GhostButton`), `GhostPopoverClose`,
  focus entry (first tabbable + container fallback) and return on close, Escape,
  outside `pointerdown`, trigger toggle without close-then-reopen, `v-if`
  unmount removing the layer from `layerStack`, nested popovers closing one at a time.
- **SSR test (`packages/vue/src/overlay-ssr.test.ts`):** Node environment with no
  `window`/`document`, closed and `defaultOpen: true` SSR rendering.
- **Theme CSS integration test (`tests/integration/ghost-popover-theme-css.test.ts`):**
  zero hard-coded colors/px/time literals in `ghost-popover.css`.
- **Browser & Axe E2E tests (`tests/e2e/popover.spec.ts`, `tests/e2e/docs-examples.spec.ts`):**
  click and keyboard open/close, Escape focus return, outside click dismissal,
  viewport-edge flip, nested popover one-layer-at-a-time dismissal, popover inside
  an offset `position: relative` parent landing at the expected offset from its
  anchor, production docs page demo verification, and `@axe-core/playwright` zero
  violations.

## Documentation plan

- `docs/components/popover.md` with headless and themed executable examples
  (`examples/popover/basic.vue`, `examples/popover/themed.vue`), API tables, and
  non-modal dialog accessibility guidance.
- Sidebar entry in `apps/docs/.vitepress/docs-nav.ts` and roadmap status update
  in `docs/roadmap.md`.
- Machine-readable manifests generated via `pnpm manifests:write`.

## Compatibility and release impact

- Additive minor change (`minor` Changeset) for `@ghostvue/vue` and
  `@ghostvue/themes`.
- Additive `isPositioned` property on `UseFloatingReturn` (non-breaking).

## Open architectural questions

None.
