# GhostCollapsible specification

**Status:** Proposed for `GhostCollapsible` (GHO-86). Spec and implementation
ship together; Zac approves both in PR review.

## Purpose and user problems

`GhostCollapsible` is an accessible **disclosure** primitive: a trigger control
expands or collapses associated content in place. Immediate consumers include
DataTable expandable rows and grouped table sections where content must stay in
document order, not float or trap focus.

The component composes `useControllableState` and `useGhostId` so applications
get controlled/uncontrolled open state, deterministic `id` / `aria-controls`
relationships, and SSR-stable markup without reimplementing disclosure wiring.

## Non-goals

- Accordion coordination (only one open panel, roving focus, or arrow-key
  navigation). That belongs to a future `GhostAccordion` built on
  `GhostCollapsible`.
- Floating overlays, portaling, focus trapping, or modal semantics (`GhostPopover`,
  `GhostDialog`).
- DataTable row expansion state machines or server-driven lazy load. Consumers
  own data; this primitive only toggles visibility.
- Built-in heading styles, chevron icons, or animation presets beyond optional
  theme CSS driven by `data-state` and `prefers-reduced-motion`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostCollapsible` (root state and context provider; renderless)
- `GhostCollapsibleTrigger` (disclosure button)
- `GhostCollapsibleContent` (in-flow panel hidden when collapsed)
- `useGhostCollapsible` (composable with reactive open state, controls, and IDs)
- Types: `GhostCollapsibleProps`, `GhostCollapsibleSlotProps`,
  `GhostCollapsibleTriggerElement`, `GhostCollapsibleTriggerProps`,
  `GhostCollapsibleTriggerExposed`, `GhostCollapsibleContentElement`,
  `GhostCollapsibleContentProps`, `GhostCollapsibleContentExposed`,
  `UseGhostCollapsibleOptions`, `UseGhostCollapsibleReturn`,
  `GhostCollapsibleContext`

Themed exports from `@ghostvue/themes`:

- `GhostCollapsible`, `GhostCollapsibleTrigger`, `GhostCollapsibleContent`
  (plus re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostCollapsible` (root)

| Prop          | Type                   | Default     | Contract                                                                |
| ------------- | ---------------------- | ----------- | ----------------------------------------------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode.                      |
| `defaultOpen` | `boolean`              | `false`     | Initial open state in uncontrolled mode.                                |
| `disabled`    | `boolean`              | `false`     | When `true`, the trigger cannot toggle open state (root-level disable). |

#### `GhostCollapsibleTrigger`

| Prop       | Type                                                     | Default    | Contract                                                                                                                                 |
| ---------- | -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostCollapsibleTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                                                    |
| `disabled` | `boolean`                                                | `false`    | Prevents toggling when `true` or when the root is `disabled`. Uses native `disabled` on `<button>` and `aria-disabled="true"` otherwise. |

#### `GhostCollapsibleContent`

| Prop               | Type                                                     | Default | Contract                                                                                                      |
| ------------------ | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `as`               | `GhostCollapsibleContentElement` (`Component \| string`) | `'div'` | Element tag or component for the panel.                                                                       |
| `disableAnimation` | `boolean`                                                | `false` | When `true`, sets `data-animation="off"` so theme height transitions are skipped even when motion is allowed. |

Native attributes and listeners fall through to the rendered root element.

### v-model contracts

`GhostCollapsible` owns `open` via `useControllableState`:

- When `open` is `undefined` (omitted), internal state starts at `defaultOpen`
  and updates on user toggles while still emitting `update:open`.
- When `open` is `boolean`, `update:open` is emitted and the consumer owns the
  state update.

### Events, callbacks, slots, and exposed methods

- `GhostCollapsible` emits `update:open` with `[open: boolean]`.
- `GhostCollapsible` default slot receives `{ open: boolean, toggle: () => void }`.
- `GhostCollapsibleTrigger` and `GhostCollapsibleContent` expose
  `{ element: HTMLElement | null, focus(options?: FocusOptions): void, blur(): void }`.

## State model

- Two binary states: `'closed'` and `'open'`.
- `GhostCollapsibleContent` stays mounted in document order. When closed it uses
  the native `hidden` attribute (not `v-if`) so layout identity is stable for
  tables and SSR.
- `data-state="open" | "closed"` is set on trigger and content.
- `data-animation="off"` is set on content when `disableAnimation` is `true`.

### Loading, empty, disabled, read-only, and error states

`GhostCollapsibleTrigger` honors root and local `disabled`. Disabled triggers
ignore click and disclosure keyboard activation.

## Consumer data

`GhostCollapsible` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows
[WAI-ARIA APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/):

### Semantics and relationships

- `GhostCollapsibleTrigger` renders `type="button"` (when `as="button"`),
  `id` (from `useGhostId`, overridable by consumer `id`), `aria-expanded="true" |
"false"`, `aria-controls="<contentId>"`, `data-part="trigger"`, and
  `data-state="open" | "closed"`. No `aria-haspopup`.
- `GhostCollapsibleContent` renders `id` (matching `aria-controls`), `hidden`
  when closed, `data-part="content"`, `data-state="open" | "closed"`, and
  `aria-labelledby="<triggerId>"` by default unless the consumer provides
  `aria-label` or `aria-labelledby`.

### Keyboard interaction

- **Trigger (button host):** native `Enter` and `Space` toggle (no extra handler
  required on `<button>`).
- **Trigger (non-button host with `role="button"`):** `Enter` and `Space` toggle
  unless disabled or default-prevented on a consumer handler.
- **Content:** no roving keys; focus moves normally through focusable descendants
  when the panel is open and visible.

### Focus behavior

- Toggling does not move focus into content automatically (disclosure pattern).
- Focus remains on the trigger unless the consumer moves it.

### Assistive technology expectations

- Collapsed content is removed from the accessibility tree via `hidden` and
  hidden from sighted users via `display: none` from the user agent or theme CSS.

## Rendering and customization

- Headless parts use classes `ghost-collapsible-trigger` and
  `ghost-collapsible-content` for theme recipes.
- Theme CSS may animate open/close using `data-state` and semantic
  `--ghost-motion-*` tokens, gated with `@media (prefers-reduced-motion: reduce)`.

## Environment behavior

### SSR and hydration

- Deterministic `id` values from `useGhostId` populate `aria-controls` on the
  server.
- Closed collapsibles render the content node with `hidden` in SSR HTML.
- No `window` / `document` access during setup of root state or IDs.

### Mobile and touch

- Trigger uses native click activation; no custom gestures.

## Performance

- Content remains one DOM subtree; toggling only flips `hidden` and ARIA state.

## Composition

- Reuses `useControllableState`, `useGhostId`, and the `as` + `inheritAttrs:
false` attribute-splitting pattern from `GhostPopover` / `GhostDialog` triggers.

## Test plan

- Vue: uncontrolled and controlled `open`, `disabled` on root and trigger,
  `aria-expanded` / `aria-controls` / `hidden`, SSR render, cleanup on unmount,
  exposed `element` / `focus` / `blur`.
- Browser: keyboard toggle, axe on examples, playground disclosure exercise.
- Type: public exports consumed from themed and headless entry points.

## Documentation plan

- API reference (`docs/components/collapsible.md`), basic and themed examples, and
  playground `CollapsibleReference` with unique copy.

## Compatibility and release impact

New minor export from `@ghostvue/vue` and `@ghostvue/themes`. Requires Changeset.

## Open architectural questions

None for the minimal disclosure scope; accordion coordination is explicitly
out of scope (GHO-34).
