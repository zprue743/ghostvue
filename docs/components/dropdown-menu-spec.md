# GhostDropdownMenu specification

**Status:** Approved pending review.

**Follow-up (out of scope):** nested submenus ([GHO-92](https://linear.app/ghost-vue/issue/GHO-92),
[GHO-107](https://linear.app/ghost-vue/issue/GHO-107)).

## Purpose and user problems

`GhostDropdownMenu` exposes a floating **menu button** surface anchored to a
trigger. It composes `@ghostvue/vue` overlay primitives (`useDismissableLayer`,
`useFloating`, `GhostPortal`, `useFocusScope`, `useControllableState`, and
`useGhostId`) with `useGhostMenuCollection` so applications get correct menu
ARIA, roving item focus, typeahead, collision-safe positioning, portaling,
Escape/outside dismissal, and focus restoration without reimplementing menu
keyboard behavior or Floating UI wiring.

## Non-goals

- Modal dialog behavior (`aria-modal="true"`, scroll lock, or focus trapping).
- Non-modal disclosure dialog semantics (`aria-haspopup="dialog"`). Those belong
  to `GhostPopover`.
- Tooltip timing or `aria-describedby` tooltips (`GhostTooltip`).
- Native `<select>` / listbox semantics (`GhostSelect`).
- **Submenus** (separate trigger inside content that opens a child menu). Tracked
  as GHO-92 / GHO-107; current content is a flat `role="menu"` only.
- Decorative menu icons, swipe gestures, or animation hooks beyond `data-state`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostDropdownMenu` (root state and context provider; renderless)
- `GhostDropdownMenuTrigger` (menu button anchor)
- `GhostDropdownMenuContent` (positioned, dismissable floating `role="menu"`)
- `GhostDropdownMenuItem` (`role="menuitem"`)
- `GhostDropdownMenuGroup` (logical grouping container)
- `GhostDropdownMenuLabel` (non-focusable section label)
- `GhostDropdownMenuSeparator` (horizontal rule between sections)
- `GhostDropdownMenuCheckboxItem` (`role="menuitemcheckbox"`)
- `GhostDropdownMenuRadioGroup` / `GhostDropdownMenuRadioItem` (`menuitemradio`
  set with shared selection)
- `useGhostDropdownMenu` (composable for open state and IDs)
- `useGhostMenuCollection`, `getMenuItems`, `focusFirstMenuItem`,
  `focusLastMenuItem` (shared menu keyboard utilities)
- Types: props, exposed handles, context, placement/flip/shift options, and
  `UseGhostDropdownMenuReturn`

Themed exports from `@ghostvue/themes`:

- All parts above as thin `defineComponent` `h()` wrappers plus
  `ghost-dropdown-menu.css` via `default.css`

### Props and configuration

#### `GhostDropdownMenu` (root)

| Prop          | Type                   | Default     | Contract                                           |
| ------------- | ---------------------- | ----------- | -------------------------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode. |
| `defaultOpen` | `boolean`              | `false`     | Initial open state in uncontrolled mode.           |

#### `GhostDropdownMenuTrigger`

| Prop       | Type                                                      | Default    | Contract                                                                                                    |
| ---------- | --------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `as`       | `GhostDropdownMenuTriggerElement` (`Component \| string`) | `'button'` | Element tag or component (for example `GhostButton`).                                                       |
| `disabled` | `boolean`                                                 | `false`    | Prevents toggling when `true`. Uses native `disabled` on `<button>` and `aria-disabled` on non-button tags. |

#### `GhostDropdownMenuContent`

| Prop        | Type                                    | Default      | Contract                                     |
| ----------- | --------------------------------------- | ------------ | -------------------------------------------- |
| `as`        | `GhostDropdownMenuContentElement`       | `'div'`      | Menu surface element.                        |
| `placement` | `Placement`                             | `'bottom'`   | Preferred placement relative to the trigger. |
| `offset`    | `OffsetOptions \| boolean \| undefined` | `undefined`  | Distance passed to `useFloating`.            |
| `flip`      | `boolean \| FlipOptions`                | `true`       | Flip when overflowing.                       |
| `shift`     | `boolean \| ShiftOptions`               | `true`       | Shift along cross axis.                      |
| `strategy`  | `Strategy`                              | `'absolute'` | CSS positioning strategy.                    |
| `portal`    | `boolean`                               | `true`       | Teleport via `GhostPortal` when `true`.      |
| `portalTo`  | `GhostPortalTarget`                     | `'body'`     | Teleport target.                             |

#### `GhostDropdownMenuItem`

| Prop       | Type                           | Default | Contract                            |
| ---------- | ------------------------------ | ------- | ----------------------------------- |
| `as`       | `GhostDropdownMenuItemElement` | `'div'` | Item element.                       |
| `disabled` | `boolean`                      | `false` | Skipped in roving; not activatable. |

Emits `select` with the activating `Event` when activated. The menu closes after
activation unless the consumer calls `event.preventDefault()` on that event (or on
`click` for checkbox toggles).

#### `GhostDropdownMenuCheckboxItem`

| Prop             | Type      | Default     | Contract                                      |
| ---------------- | --------- | ----------- | --------------------------------------------- |
| `checked`        | `boolean` | `undefined` | Controlled checked state (`v-model:checked`). |
| `defaultChecked` | `boolean` | `false`     | Uncontrolled initial checked.                 |
| `disabled`       | `boolean` | `false`     | Skipped in roving.                            |

Toggles on click or `Space` / `Enter` without closing the menu.

#### `GhostDropdownMenuRadioGroup` / `GhostDropdownMenuRadioItem`

| Part        | Prop / emit        | Contract                                                        |
| ----------- | ------------------ | --------------------------------------------------------------- |
| Radio group | `modelValue`       | Controlled selected value (`v-model`).                          |
| Radio group | `defaultValue`     | Uncontrolled initial value.                                     |
| Radio group | `disabled`         | Disables all items when `true`.                                 |
| Radio item  | `value` (required) | Value reported on selection.                                    |
| Radio item  | `disabled`         | Skipped in roving.                                              |
| Radio item  | emits `select`     | Emits `(value, event)`; closes unless `event.preventDefault()`. |

#### Structural parts

`GhostDropdownMenuLabel`, `GhostDropdownMenuSeparator`, and `GhostDropdownMenuGroup`
accept `as` only (separator also `decorative`). They are not menu items and do
not receive roving focus.

### v-model contracts

- `GhostDropdownMenu`: `open` + `update:open` (`v-model:open`).
- `GhostDropdownMenuCheckboxItem`: `checked` + `update:checked`
  (`v-model:checked`).
- `GhostDropdownMenuRadioGroup`: `modelValue` + `update:modelValue` (`v-model`).

### Events, slots, and exposed methods

- Root default slot: `{ open: boolean, close: () => void }`.
- Parts expose `{ element: HTMLElement | null, focus(), blur() }` where focusable.

## State model

- Binary open/closed on the root; content mounts with `v-if="open"`.
- `data-state="open" | "closed"` on trigger; `data-state="open"` on content while
  mounted.
- `data-placement` on content from `useFloating`.
- First-paint guard: `visibility: hidden` until `isPositioned`.
- `focusLastOnOpen` flag set when opened via `ArrowUp` on the trigger.

## Consumer data

The menu holds no domain collections. Checkbox and radio state are consumer-owned
via `v-model` props; the primitives emit updates only.

## Accessibility contract

WAI-ARIA APG **Menu Button** pattern (flat menu):

### Semantics

- Trigger: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, `id`,
  `data-part="trigger"`.
- Content: `role="menu"`, `tabindex="-1"`, `id`, `data-part="content"`.
- Items: `role="menuitem" | menuitemcheckbox | menuitemradio"`, `tabindex="-1"`,
  `aria-disabled` when disabled, `aria-checked` on checkbox/radio items.
- Label: `data-part="label"` with deterministic `id` from `useGhostId` (not a
  menu item).
- Separator: `data-part="separator"` via `useGhostSeparator`.

### Keyboard interaction

| Key                     | Where          | Behavior                                                                      |
| ----------------------- | -------------- | ----------------------------------------------------------------------------- |
| `Enter` / `Space`       | Trigger        | Toggle open (non-anchor `as`).                                                |
| `ArrowDown` / `ArrowUp` | Closed trigger | Open; focus first / last item.                                                |
| `ArrowDown` / `ArrowUp` | Open menu      | Roving focus among enabled items.                                             |
| `Home` / `End`          | Open menu      | First / last enabled item.                                                    |
| Printable key           | Open menu      | Typeahead among item labels.                                                  |
| `Space`                 | Checkbox item  | Toggle checked; menu stays open.                                              |
| `Enter` / `Space`       | Item / radio   | Activate (radio closes menu).                                                 |
| `Escape`                | Open menu      | Close; restore focus to trigger.                                              |
| `Tab` / `Shift+Tab`     | Open menu      | Closes the menu and moves focus to the next tab stop (no restore to trigger). |

Disabled items are omitted from roving and typeahead.

### Focus behavior

- On open after positioned: `focusFirstMenuItem` or `focusLastMenuItem` on content.
- On close (Escape, outside pointer without focusable target, item/radio select):
  restore focus to trigger via `useFocusScope`.
- Outside pointer on another focusable control leaves focus on that control.

## Rendering and customization

- Root: renderless provider.
- Content: class `ghost-dropdown-menu-content`, `data-part="content"`. Consumer
  `class` and `style` merge with the library class and floating position styles.
- Trigger / items / label / separator: `data-part` hooks as above; checkbox and
  radio use `data-state` where applicable.
- Themed CSS under `@layer ghostvue-theme` uses `--ghost-elevation-3-*`, radius,
  spacing, interactive hover (`--ghost-elevation-2-bg`), focus ring tokens, and
  `forced-colors` overrides.

## Environment behavior

### SSR and hydration

- `useGhostId` for SSR-safe IDs; closed menus render trigger only (`v-if` content).
- Composables guard browser APIs in `onMounted`.
- Integration: `tests/integration/ssr-hydration.test.ts` closed menu fixture.

### Mobile and touch

- `useDismissableLayer` capture-phase `pointerdown` for touch/mouse/pen.

## Performance

- Floating and dismiss listeners active only while content is mounted and open.

## Composition

- `useGhostDropdownMenu` + overlay stack (same as `GhostPopover` for open/position/
  dismiss).
- `useGhostMenuCollection` for item queries and keyboard (shared with future
  menubar/submenu work).

## Test plan

- **Unit (`packages/vue/src/GhostDropdownMenu.test.ts`):** controlled/uncontrolled
  open; trigger `aria-*`; arrow open focusing first/last; roving, typeahead,
  Home/End; disabled skip; Escape/outside/select close; checkbox toggle without
  close; radio select closes.
- **SSR (`packages/vue/src/overlay-ssr.test.ts`, `tests/integration/ssr-hydration.test.ts`):**
  closed and `defaultOpen` server render.
- **Theme CSS (`tests/integration/ghost-dropdown-menu-theme-css.test.ts`):** token-only
  stylesheet.
- **E2E (`tests/e2e/dropdown-menu.spec.ts`):** axe, open/close, menu ARIA, arrows,
  typeahead, Escape, item select, checkbox Space, radio select, outside click,
  disabled skip.
- **Docs examples (`tests/e2e/docs-examples.spec.ts`):** when wired to
  `dropdown-menu/*` ids.

## Documentation plan

- `docs/components/dropdown-menu.md` with headless and themed examples.
- `docs/components/dropdown-menu-spec.md` (this document).
- Sidebar and roadmap entries; manifests via `pnpm manifests:write`.

## Compatibility and release impact

- Additive minor Changeset for `@ghostvue/vue` and `@ghostvue/themes`.
- Reuses existing overlay and menu-collection utilities (no breaking changes).

## Open architectural questions

- Submenu layering and `aria-haspopup` on items (GHO-92 / GHO-107).
