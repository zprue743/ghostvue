# GhostAccordion specification

**Status:** Proposed for `GhostAccordion` (GHO-34). Spec and implementation ship
together; Zac approves both in PR review.

## Purpose and user problems

`GhostAccordion` coordinates multiple in-flow disclosure panels so only one (or
a chosen set) stays expanded at a time. Settings sections, FAQ lists, and filter
groups need APG-correct accordion headers, predictable single vs multiple
expansion, and arrow-key movement between section triggers without reimplementing
`useControllableState` or duplicating `GhostCollapsible` open/close logic.

The component composes `GhostCollapsible`, `useControllableState`, `useGhostId`,
and `useRovingFocus` so applications get controlled/uncontrolled expansion values,
heading-wrapped triggers, and SSR-stable relationships.

## Non-goals

- Standalone disclosure without accordion coordination (`GhostCollapsible`).
- Floating overlays, focus trapping, or modal semantics.
- Built-in chevron icons, drag-and-drop reorder, or lazy panel loading.
- A separate styling-hooks ADR contract (GHO-38).

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostAccordion` (root state, roving focus host)
- `GhostAccordionItem` (per-panel `GhostCollapsible` wiring)
- `GhostAccordionTrigger` (heading-wrapped disclosure trigger)
- `GhostAccordionContent` (in-flow panel)
- `useGhostAccordion` (composable for expansion state)
- Types in `ghost-accordion.ts`

Themed exports from `@ghostvue/themes`:

- `GhostAccordion`, `GhostAccordionItem`, `GhostAccordionTrigger`,
  `GhostAccordionContent` (plus re-exported types and styles via `default.css`)

### Props and configuration

#### `GhostAccordion` (root)

| Prop           | Type                              | Default     | Contract                                                                    |
| -------------- | --------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `type`         | `'single' \| 'multiple'`          | `'single'`  | Single allows at most one open item; multiple allows many.                  |
| `collapsible`  | `boolean`                         | `false`     | When `type` is `single`, allows closing the open item so none are expanded. |
| `modelValue`   | `string \| string[] \| undefined` | `undefined` | Controlled expansion. Omit for uncontrolled. Shape depends on `type`.       |
| `defaultValue` | `string \| string[] \| undefined` | `undefined` | Initial expansion in uncontrolled mode.                                     |
| `headingLevel` | `1 \| 2 \| 3 \| 4 \| 5 \| 6`      | `3`         | Heading element wrapping each trigger (`h1`–`h6`).                          |
| `disabled`     | `boolean`                         | `false`     | Disables toggling on all items (root-level disable).                        |

#### `GhostAccordionItem`

| Prop       | Type      | Default  | Contract                                          |
| ---------- | --------- | -------- | ------------------------------------------------- |
| `value`    | `string`  | required | Stable id for this panel.                         |
| `disabled` | `boolean` | `false`  | Prevents toggling; combines with root `disabled`. |

#### `GhostAccordionTrigger`

| Prop | Type                           | Default    | Contract                                |
| ---- | ------------------------------ | ---------- | --------------------------------------- |
| `as` | `GhostAccordionTriggerElement` | `'button'` | Forwarded to `GhostCollapsibleTrigger`. |

#### `GhostAccordionContent`

| Prop               | Type                           | Default | Contract                                |
| ------------------ | ------------------------------ | ------- | --------------------------------------- |
| `as`               | `GhostAccordionContentElement` | `'div'` | Forwarded to `GhostCollapsibleContent`. |
| `disableAnimation` | `boolean`                      | `false` | Forwarded to `GhostCollapsibleContent`. |

Native attributes fall through to each part root (trigger/content) or the accordion root.

### v-model contracts

`GhostAccordion` owns `modelValue` via `useControllableState`:

- **`type="single"`:** `modelValue` is `string | undefined`. `undefined` means no
  panel is open (only when `collapsible` is `true`, or initially uncontrolled with
  no `defaultValue`).
- **`type="multiple"`:** `modelValue` is `string[]`. An empty array means none open.

Emits `update:modelValue` on every expansion change. Items wire `GhostCollapsible`
in controlled mode from the root value.

### Events, callbacks, slots, and exposed methods

- `GhostAccordion` emits `update:modelValue` with `[value: string | string[]]`.
- Default slots on all parts are presentational unless noted.
- `GhostAccordionTrigger` and `GhostAccordionContent` expose
  `{ element, focus, blur }` via the underlying collapsible parts.

## State model

- Each item is open or closed. Root value coordinates which item(s) are open.
- `GhostAccordionItem` renders `GhostCollapsible` with controlled `:open` derived
  from the root and forwards `update:open` to the root coordinator.
- `data-state="open" | "closed"` comes from `GhostCollapsible` parts.
- `data-ghost-accordion-value` is set on items for testing.

### Disabled behavior

Root or item `disabled` prevents toggling on that item’s collapsible.

## Consumer data

`GhostAccordion` holds no domain collections and never mutates consumer props.

## Accessibility contract

Follows
[WAI-ARIA APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/):

### Semantics and relationships

- Each `GhostAccordionTrigger` sits inside a heading (`h1`–`h6` per
  `headingLevel`) and uses `GhostCollapsibleTrigger` disclosure semantics
  (`aria-expanded`, `aria-controls`, `type="button"`).
- Panels use `GhostCollapsibleContent` (`hidden` when collapsed,
  `aria-labelledby` to trigger when unlabeled).

### Keyboard interaction

- **Enter / Space** on a trigger: toggle its panel (via `GhostCollapsibleTrigger`).
- **ArrowDown / ArrowUp:** move focus among accordion triggers (roving tabindex on
  the root host; vertical orientation).
- **Home / End:** focus first/last trigger when supported by `useRovingFocus`.
- Roving skips disabled triggers.

### Focus behavior

One trigger tab stop at a time within the accordion root; arrow keys move among
triggers. Focus does not move into panel content on expand.

## Rendering and customization

- `class="ghost-accordion"` and `data-ghost-accordion` on the root.
- `data-part="header"` on the heading wrapper; trigger/content use collapsible
  `data-part` values.
- Themed CSS stacks items and reuses collapsible trigger/content surface styles.

## Environment behavior

### SSR and hydration

Deterministic ids from `useGhostId` inside each `GhostCollapsible`. No
browser-only APIs in root setup except roving listeners mounted on the client
(matching `GhostTabsList`).

## Composition

Reuses `GhostCollapsible` / `GhostCollapsibleTrigger` / `GhostCollapsibleContent`
without copying open state, `hidden`, or disclosure keyboard activation.

## Test plan

- Unit: single/multiple modes, collapsible single, controlled/uncontrolled value,
  disabled items, coordination when opening one closes another.
- Unit: `useGhostAccordion` value transitions.
- Browser: basic and themed examples, axe clean, keyboard arrows between triggers.
- Playground: `AccordionReference` section with unique copy.
- Type: exported props and exposed types.

## Documentation plan

- `docs/components/accordion.md` with basic, single-collapsible, multiple, themed
  examples via `<GhostExample />`.

## Compatibility and release impact

New exports in `@ghostvue/vue` and `@ghostvue/themes`. Minor version Changeset.

## Open architectural questions

None for GHO-34 scope.
