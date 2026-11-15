# GhostHoverCard specification

**Status:** Approved for minimal `GhostHoverCard` (GHO-100). Visual baselines use `pnpm test:visual:docker`.

## Purpose and user problems

`GhostHoverCard` shows a rich preview panel on pointer hover or keyboard focus of a
trigger, with open and close delays so users can move the pointer onto interactive
content without the panel vanishing. It composes `@ghostvue/vue` overlay primitives
(`useFloating`, `useDismissableLayer`, `GhostPortal`, `useControllableState`, and
`useGhostId`) so applications get reliable positioning, portaling, delay timing,
Escape/outside dismissal, and non-modal dialog semantics without reimplementing
Floating UI or WCAG 1.4.13 hover/focus behavior.

Typical uses include profile previews, link cards, and contextual summaries with
links or secondary actions.

## Non-goals

- Click-to-toggle disclosure on the trigger (`GhostPopover`).
- Modal dialog behavior (`aria-modal`, scroll lock, focus trapping, or inert
  background). Those belong to `GhostDialog`.
- Brief supplemental `role="tooltip"` hints without interactive descendants.
  Those belong to `GhostTooltip`.
- Menu or listbox keyboard navigation inside the card beyond normal tab order.
- Decorative arrow/caret elements or open/close CSS transition hooks beyond
  `data-state` and `data-placement`.
- Shared skip-delay coordination across adjacent cards (`GhostTooltipProvider` is
  tooltip-specific).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostHoverCard` (root state, delays, and context provider; renderless)
- `GhostHoverCardTrigger` (hover/focus anchor)
- `GhostHoverCardContent` (positioned floating non-modal `role="dialog"` surface)
- `useGhostHoverCard` (composable returning reactive open state, controls, and
  trigger/content IDs)
- Types: `GhostHoverCardProps`, `GhostHoverCardSlotProps`,
  `GhostHoverCardTriggerElement`, `GhostHoverCardTriggerProps`,
  `GhostHoverCardTriggerExposed`, `GhostHoverCardContentElement`,
  `GhostHoverCardContentProps`, `GhostHoverCardContentExposed`,
  `UseGhostHoverCardOptions`, `UseGhostHoverCardReturn`, `GhostHoverCardContext`

Themed exports from `@ghostvue/themes`:

- `GhostHoverCard`, `GhostHoverCardTrigger`, `GhostHoverCardContent` (plus
  re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostHoverCard` (root)

| Prop            | Type                   | Default     | Contract                                                                  |
| --------------- | ---------------------- | ----------- | ------------------------------------------------------------------------- |
| `open`          | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode.                        |
| `defaultOpen`   | `boolean`              | `false`     | Initial open state in uncontrolled mode (discouraged; for tests/SSR).     |
| `openDelay`     | `number`               | `700`       | Milliseconds before showing after hover or focus begins.                  |
| `closeDelay`    | `number`               | `300`       | Milliseconds before hiding after hover/focus leaves the trigger and card. |
| `closeOnEscape` | `boolean`              | `true`      | When `true`, `Escape` dismisses via `useDismissableLayer`.                |

#### `GhostHoverCardTrigger`

| Prop       | Type                                                   | Default    | Contract                                                                                                                             |
| ---------- | ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `as`       | `GhostHoverCardTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                |
| `disabled` | `boolean`                                              | `false`    | Prevents show scheduling when `true`. Uses native `disabled` on `<button>` / button components and `aria-disabled="true"` otherwise. |

Native attributes and listeners fall through to the rendered root element.

#### `GhostHoverCardContent`

| Prop        | Type                                                   | Default      | Contract                                                                   |
| ----------- | ------------------------------------------------------ | ------------ | -------------------------------------------------------------------------- |
| `as`        | `GhostHoverCardContentElement` (`Component \| string`) | `'div'`      | Element tag or component for the card surface.                             |
| `placement` | `Placement`                                            | `'bottom'`   | Preferred placement relative to the trigger.                               |
| `offset`    | `OffsetOptions \| boolean \| undefined`                | `undefined`  | Distance or axis offsets passed to `useFloating`.                          |
| `flip`      | `boolean \| FlipOptions`                               | `true`       | Flip to an opposite side when overflowing.                                 |
| `shift`     | `boolean \| ShiftOptions`                              | `true`       | Shift along the cross axis to stay in view.                                |
| `strategy`  | `Strategy` (`'absolute' \| 'fixed'`)                   | `'absolute'` | CSS positioning strategy passed to `useFloating`.                          |
| `portal`    | `boolean`                                              | `true`       | Renders content through `GhostPortal` when `true`, or inline when `false`. |
| `portalTo`  | `GhostPortalTarget`                                    | `'body'`     | Teleport target passed to `GhostPortal` when `portal` is `true`.           |

Native attributes and listeners fall through to the floating content element.

### v-model contracts

`GhostHoverCard` owns `open` via `useControllableState`:

- `open` (`modelValue: false` — uses explicit `open` + `update:open` per Vue 3
  `v-model:open` convention).
- When `open` is `undefined` (omitted), internal state starts at `defaultOpen`
  and updates on hover/focus timers, pointer/focus leave, Escape, or outside
  pointerdown while still emitting `update:open`.
- When `open` is `boolean`, `update:open` is emitted and the consumer owns the
  state update.

### Events, callbacks, slots, and exposed methods

- `GhostHoverCard` emits `update:open` with `[open: boolean]`.
- `GhostHoverCard` default slot receives `{ open: boolean, close: () => void }`.
- `GhostHoverCardTrigger` and `GhostHoverCardContent` expose
  `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`
  matching `GhostButton`. When `:as="GhostButton"` is used, `element` resolves to
  the underlying `<button>` element.

## State model

- Two binary states: `'closed'` and `'open'`.
- `GhostHoverCardContent` renders with `v-if="open"`, not `v-show`, so closed
  cards unmount cleanly from the DOM, `useDismissableLayer`'s layer stack, and
  `useFloating`'s `autoUpdate`.
- `data-state="open" | "closed"` is set on `GhostHoverCardTrigger`; open content
  uses `data-state="open"`.
- `data-placement` is written on `GhostHoverCardContent` by `useFloating` once the
  resolved placement is computed.
- `GhostHoverCardContent` keeps `visibility: hidden` inline until
  `useFloating().isPositioned` becomes `true`, preventing any first-frame flash
  at `(0, 0)`.

### Loading, empty, disabled, read-only, and error states

`GhostHoverCardTrigger` supports `disabled`. A disabled trigger does not schedule
show on hover or focus.

## Consumer data

`GhostHoverCard` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows WAI-ARIA APG non-modal dialog / disclosure-on-hover guidance and WCAG
1.4.13 (Content on Hover or Focus):

### Semantics and relationships

- `GhostHoverCardTrigger` renders `type="button"` (when `as="button"`),
  `id` (from `useGhostId`, overridable by consumer `id`), `aria-haspopup="dialog"`,
  `aria-expanded="true" | "false"`, `aria-controls="<contentId>"`,
  `data-part="trigger"`, and `data-state="open" | "closed"`. No
  `aria-describedby` (content may be rich and interactive).
- `GhostHoverCardContent` renders `id` (matching `aria-controls`, overridable by
  consumer `id`), `role="dialog"`, `tabindex="-1"`, `data-part="content"`,
  `data-state="open"`, and `aria-labelledby="<triggerId>"` by default unless the
  consumer provides `aria-label` or `aria-labelledby`. No `aria-modal="true"`.
  Interactive descendants are allowed.

### Keyboard interaction

| Key      | Where               | Behavior                                                           |
| -------- | ------------------- | ------------------------------------------------------------------ |
| `Escape` | Document while open | Closes when `closeOnEscape` is `true`; focus stays on the trigger. |
| `Tab`    | Trigger and content | Normal tab order; focus inside content keeps the card open.        |

Opening on hover does **not** move focus. Opening on focus follows delay timing
without auto-moving focus into the card.

### Focus behavior

- Pointer hover open does not move focus.
- The card remains open while the trigger has pointer hover or focus, while the
  pointer is over the card, or while focus is inside the card.
- Closing via `Escape`, outside pointerdown, leaving all hover/focus targets, or
  the `closeDelay` timing elapses after all leave.

### Assistive technology expectations

- The trigger exposes expanded/collapsed state and names the associated dialog
  surface via `aria-controls` / `aria-labelledby`.

## Rendering and customization

- `GhostHoverCardTrigger` (`data-part="trigger"`, `data-state`),
  `GhostHoverCardContent` (`ghost-hover-card-content`, `data-part="content"`,
  `data-state`, `data-placement`, `data-hoverable`).
- Themed `@ghostvue/themes` CSS adds an elevation-3 surface (between tooltip and
  popover density) using `--ghost-*` semantic tokens. Content uses
  `pointer-events: auto` so links and buttons inside the card receive pointer
  input.

## Environment behavior

### SSR and hydration

- `useGhostId` provides deterministic SSR-safe IDs.
- Closed cards render only the trigger (`v-if="false"` for content).
- `defaultOpen: true` SSR renders the card inline via `GhostPortal` without
  accessing `window` or `document`; `useFloating` and dismiss listeners attach
  only after mount.
- Hydration covered by `expectSsrHydration` integration test.

### Mobile and touch

- Pointer show/hide uses `pointerenter` / `pointerleave` (with grace delay).
- `useFloating` (`shift: true`, `flip: true`) keeps cards in view.

## Performance

- `useFloating` (`autoUpdate`) is active only while `GhostHoverCardContent` is open
  and mounted.
- Open/close timers clear on unmount; no global listeners remain when closed.

## Composition

- `useGhostHoverCard` + `useControllableState` + `useGhostId` for state and IDs.
- `GhostPortal` for teleportation.
- `useFloating` for anchor positioning, collision handling, `data-placement`,
  and `isPositioned`.
- `useDismissableLayer` on content for Escape and outside-pointer dismissal
  (trigger ignored).
- Root owns delay timers, pointer/focus/content hover and content focus tracking,
  and timer cleanup on unmount.

## Test plan

- **Unit tests (`packages/vue/src/GhostHoverCard.test.ts`):** controlled/uncontrolled
  `open`, delay timers (Vitest fake timers), `aria-haspopup` / `aria-expanded` /
  `aria-controls`, `role="dialog"`, interactive content hover, `data-*` attrs,
  `isPositioned` visibility guard, `portal` vs `portal=false`, disabled trigger,
  `Escape` dismissal, outside-pointer dismissal, timer/listener cleanup on
  unmount, parent ignoring `update:open`, `as` prop including `GhostButton`,
  `v-if` unmount stopping `autoUpdate`.
- **SSR test (`packages/vue/src/overlay-ssr.test.ts`):** closed and
  `defaultOpen: true` SSR rendering in Node without `window`/`document`.
- **SSR hydration test (`tests/integration/ghost-hover-card-ssr.test.ts`):**
  `expectSsrHydration` for closed and `defaultOpen` fixtures.
- **Theme CSS integration test:** zero hard-coded colors/px/time literals in
  `ghost-hover-card.css`.
- **Browser & Axe E2E tests (`tests/e2e/ghost-hover-card.spec.ts`,
  `tests/e2e/docs-examples.spec.ts`):** hover/focus show with delay, grace delay
  on leave, pointer onto interactive content, `Escape` dismissal, disabled
  trigger, and zero Axe violations.

## Documentation plan

- `docs/components/hover-card.md` with headless and themed executable examples
  (`examples/hover-card/basic.vue`, `examples/hover-card/themed.vue`), API
  tables, and hover/focus accessibility guidance.
- Playground `HoverCardReference.vue` section with unique copy for strict
  locators.
- Sidebar entry in `apps/docs/.vitepress/docs-nav.ts` and roadmap status update
  in `docs/roadmap.md`.
- Machine-readable manifests generated via `pnpm manifests:write`.

## Compatibility and release impact

- Additive minor change (`minor` Changeset) for `@ghostvue/vue` and
  `@ghostvue/themes`.

## Open architectural questions

None for the minimal scope. Styling-hook contract beyond `data-part` /
`data-state` remains deferred (GHO-38).
