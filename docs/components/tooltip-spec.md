# GhostTooltip specification

**Status:** Approved for minimal `GhostTooltip` (GHO-79).

## Purpose and user problems

`GhostTooltip` shows a brief, supplemental description on pointer hover or
keyboard focus without stealing focus or implying required information. It
composes `@ghostvue/vue` overlay primitives (`useFloating`, `GhostPortal`,
`useControllableState`, and `useGhostId`) so applications get reliable
positioning, portaling, open/close delay timing, and assistive-technology wiring
without reimplementing Floating UI or WCAG 1.4.13 hover/focus behavior.

Typical uses include truncated table headers and icon-only actions in future
`GhostDataTable` work.

## Non-goals

- Modal, dialog, or popover disclosure (`aria-haspopup`, `aria-expanded`,
  interactive panels, focus entry). Those belong to `GhostPopover` /
  `GhostDialog`.
- Required field hints, form validation text, or any content that must be read
  to complete a task.
- Interactive tooltip content (links, buttons, inputs). Consumers must not
  place focusable or operable descendants inside `GhostTooltipContent`.
- Menu / listbox semantics or roving focus inside the tooltip.
- Decorative arrow/caret elements or open/close CSS transition hooks beyond
  `data-state` and `data-placement`.
- Click-to-toggle activation on the trigger (tooltips are hover/focus driven).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostTooltip` (root state, delays, and context provider; renderless)
- `GhostTooltipTrigger` (hover/focus anchor)
- `GhostTooltipContent` (positioned floating `role="tooltip"` surface)
- `useGhostTooltip` (composable returning reactive open state, controls, and
  trigger/content IDs)
- Types: `GhostTooltipProps`, `GhostTooltipSlotProps`,
  `GhostTooltipTriggerElement`, `GhostTooltipTriggerProps`,
  `GhostTooltipTriggerExposed`, `GhostTooltipContentElement`,
  `GhostTooltipContentProps`, `GhostTooltipContentExposed`,
  `UseGhostTooltipOptions`, `UseGhostTooltipReturn`, `GhostTooltipContext`

Themed exports from `@ghostvue/themes`:

- `GhostTooltip`, `GhostTooltipTrigger`, `GhostTooltipContent` (plus re-exported
  types and styles via `default.css`)

### Props and configuration

#### `GhostTooltip` (root)

| Prop                      | Type                   | Default     | Contract                                                                                   |
| ------------------------- | ---------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `open`                    | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode.                                         |
| `defaultOpen`             | `boolean`              | `false`     | Initial open state in uncontrolled mode (discouraged; for tests/SSR snapshots).            |
| `delayDuration`           | `number`               | `700`       | Milliseconds before showing after hover or focus begins.                                   |
| `skipDelayDuration`       | `number`               | `300`       | Milliseconds before hiding after hover/focus ends (WCAG 1.4.13 grace / hoverable content). |
| `disableHoverableContent` | `boolean`              | `false`     | When `true`, hides immediately on pointer/focus leave (`skipDelayDuration` ignored).       |

#### `GhostTooltipTrigger`

| Prop       | Type                                                 | Default    | Contract                                                                                                                             |
| ---------- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `as`       | `GhostTooltipTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                |
| `disabled` | `boolean`                                            | `false`    | Prevents show scheduling when `true`. Uses native `disabled` on `<button>` / button components and `aria-disabled="true"` otherwise. |

Native attributes and listeners fall through to the rendered root element.

#### `GhostTooltipContent`

| Prop        | Type                                                 | Default      | Contract                                                                   |
| ----------- | ---------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `as`        | `GhostTooltipContentElement` (`Component \| string`) | `'div'`      | Element tag or component for the tooltip surface.                          |
| `placement` | `Placement`                                          | `'top'`      | Preferred placement relative to the trigger.                               |
| `offset`    | `OffsetOptions \| boolean \| undefined`              | `undefined`  | Distance or axis offsets passed to `useFloating`.                          |
| `flip`      | `boolean \| FlipOptions`                             | `true`       | Flip to an opposite side when overflowing.                                 |
| `shift`     | `boolean \| ShiftOptions`                            | `true`       | Shift along the cross axis to stay in view.                                |
| `strategy`  | `Strategy` (`'absolute' \| 'fixed'`)                 | `'absolute'` | CSS positioning strategy passed to `useFloating`.                          |
| `portal`    | `boolean`                                            | `true`       | Renders content through `GhostPortal` when `true`, or inline when `false`. |
| `portalTo`  | `GhostPortalTarget`                                  | `'body'`     | Teleport target passed to `GhostPortal` when `portal` is `true`.           |

Native attributes and listeners fall through to the floating content element.

### v-model contracts

`GhostTooltip` owns `open` via `useControllableState`:

- `open` (`modelValue: false` — uses explicit `open` + `update:open` per Vue 3
  `v-model:open` convention).
- When `open` is `undefined` (omitted), internal state starts at `defaultOpen`
  and updates on hover/focus timers, pointer/focus leave, or `Escape` while
  still emitting `update:open`.
- When `open` is `boolean`, `update:open` is emitted and the consumer owns the
  state update.

### Events, callbacks, slots, and exposed methods

- `GhostTooltip` emits `update:open` with `[open: boolean]`.
- `GhostTooltip` default slot receives `{ open: boolean }`.
- `GhostTooltipTrigger` and `GhostTooltipContent` expose
  `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`
  matching `GhostButton`. When `:as="GhostButton"` is used, `element` resolves to
  the underlying `<button>` element.

## State model

- Two binary states: `'closed'` and `'open'`.
- `GhostTooltipContent` renders with `v-if="open"`, not `v-show`, so closed
  tooltips unmount cleanly from the DOM and `useFloating`'s `autoUpdate`.
- `data-state="open" | "closed"` is set on `GhostTooltipTrigger`; open content
  uses `data-state="open"`.
- `data-placement` is written on `GhostTooltipContent` by `useFloating` once the
  resolved placement is computed.
- `GhostTooltipContent` keeps `visibility: hidden` inline until
  `useFloating().isPositioned` becomes `true`, preventing any first-frame flash
  at `(0, 0)`.

### Loading, empty, disabled, read-only, and error states

`GhostTooltipTrigger` supports `disabled`. A disabled trigger does not schedule
show on hover or focus.

## Consumer data

`GhostTooltip` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows WAI-ARIA APG Tooltip pattern and WCAG 1.4.13 (Content on Hover or Focus):

### Semantics and relationships

- `GhostTooltipTrigger` renders `type="button"` (when `as="button"`),
  `id` (from `useGhostId`, overridable by consumer `id`), `aria-describedby`
  referencing the tooltip `id` while open, `data-part="trigger"`, and
  `data-state="open" | "closed"`. No `aria-expanded` or `aria-haspopup`.
- `GhostTooltipContent` renders `id` (matching `aria-describedby`, overridable by
  consumer `id`), `role="tooltip"`, no `tabindex`, `data-part="content"`,
  `data-state="open"`, and **must not** contain focusable or interactive
  descendants.

### Keyboard interaction

| Key      | Where                 | Behavior                                                          |
| -------- | --------------------- | ----------------------------------------------------------------- |
| `Escape` | Document while open   | Closes immediately (`hideImmediate`); does not move focus.        |
| `Tab`    | `GhostTooltipTrigger` | Normal tab order; focus scheduling opens the tooltip after delay. |

Tooltip content is not in the tab order and must not receive focus.

### Focus behavior

- Opening a tooltip does **not** move focus.
- Closing via `Escape`, pointer leave, or blur leaves focus on the trigger (or
  the next focused element after blur).

### Assistive technology expectations

- While open, the trigger's accessible description includes tooltip text via
  `aria-describedby`.
- Tooltips are supplemental; they must not be the only source of a required name
  or description.

## Rendering and customization

- `GhostTooltipTrigger` (`data-part="trigger"`, `data-state`),
  `GhostTooltipContent` (`ghost-tooltip-content`, `data-part="content"`,
  `data-state`, `data-placement`).
- Themed `@ghostvue/themes` CSS adds a compact elevation surface using
  `--ghost-elevation-2-*`, `--ghost-radius-md`, `--ghost-border-hairline-width`,
  `--ghost-surface-fg`, `--ghost-space-inset-sm`, and `pointer-events: none` on
  content so tooltips do not intercept pointer events.

## Environment behavior

### SSR and hydration

- `useGhostId` provides deterministic SSR-safe IDs.
- Closed tooltips render only the trigger (`v-if="false"` for content).
- `defaultOpen: true` SSR renders the tooltip inline via `GhostPortal` without
  accessing `window` or `document`; `useFloating` and document `keydown` attach
  only inside `onMounted`.

### Mobile and touch

- Pointer show/hide uses `pointerenter` / `pointerleave` (with grace delay).
- `useFloating` (`shift: true`, `flip: true`) keeps tooltips in view.

## Performance

- `useFloating` (`autoUpdate`) is active only while `GhostTooltipContent` is open
  and mounted.
- Open/close timers clear on unmount; no global listeners remain when closed.

## Composition

- `useGhostTooltip` + `useControllableState` + `useGhostId` for state and IDs.
- `GhostPortal` for teleportation.
- `useFloating` for anchor positioning, collision handling, `data-placement`,
  and `isPositioned`.
- Root owns delay timers, `Escape` dismissal, and timer cleanup on unmount.

## Test plan

- **Unit tests (`packages/vue/src/GhostTooltip.test.ts`):** controlled/uncontrolled
  `open`, delay timers (Vitest fake timers), `aria-describedby` while open,
  `role="tooltip"`, `data-*` attrs, `isPositioned` visibility guard,
  `portal` vs `portal=false`, disabled trigger, `Escape` dismissal, timer/listener
  cleanup on unmount, `as` prop including `GhostButton`, `v-if` unmount stopping
  `autoUpdate`.
- **SSR test (`packages/vue/src/overlay-ssr.test.ts`):** closed and
  `defaultOpen: true` SSR rendering in Node without `window`/`document`.
- **Theme CSS integration test:** zero hard-coded colors/px/time literals in
  `ghost-tooltip.css`.
- **Browser & Axe E2E tests (`tests/e2e/ghost-tooltip.spec.ts`,
  `tests/e2e/docs-examples.spec.ts`):** hover/focus show with delay, grace delay
  on leave, `Escape` dismissal, disabled trigger, viewport positioning, and zero
  Axe violations.

## Documentation plan

- `docs/components/tooltip.md` with headless and themed executable examples
  (`examples/tooltip/basic.vue`, `examples/tooltip/themed.vue`), API tables, and
  supplemental-description accessibility guidance.
- Playground `TooltipReference.vue` section with unique copy for strict locators.
- Sidebar entry in `apps/docs/.vitepress/docs-nav.ts` and roadmap status update
  in `docs/roadmap.md`.
- Machine-readable manifests generated via `pnpm manifests:write`.

## Compatibility and release impact

- Additive minor change (`minor` Changeset) for `@ghostvue/vue` and
  `@ghostvue/themes`.

## Open architectural questions

None.
