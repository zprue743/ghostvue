# GhostMenubar specification

**Status:** Approved pending review.

**Follow-up (out of scope):** nested submenus inside menu content (no submenu primitive
exists yet; tracked with [GHO-92](https://linear.app/ghost-vue/issue/GHO-92)).

## Purpose and user problems

`GhostMenubar` exposes a horizontal **menubar** (`role="menubar"`) of
`GhostMenubarMenu` children—each a dropdown-style flat menu anchored to a
top-level `role="menuitem"` trigger. It composes overlay primitives
(`useDismissableLayer`, `useFloating`, `GhostPortal`, `useFocusScope`,
`useControllableState`, `useGhostId`) with `useGhostMenuCollection` and
`useRovingFocus` so applications get WAI-ARIA APG **Menubar** behavior: one tab
stop on the bar, horizontal roving among top-level triggers, opening adjacent
menus when a menu is already open, Down/Enter/Space to open, Escape to close and
restore trigger focus, Home/End on the bar and in menus, and typeahead in open
menus—without reimplementing keyboard wiring.

## Non-goals

- Nested submenus (menu item that opens a child menu). Deferred until submenu
  support exists (GHO-92).
- Menu button in isolation (`GhostDropdownMenu` remains the menu-button pattern).
- Modal dialog, popover disclosure, tooltip, or native `<select>` semantics.
- Decorative chrome, swipe gestures, or animation hooks beyond `data-state`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostMenubar` (`role="menubar"` root; coordinates menus)
- `GhostMenubarMenu` (per-menu open state and context; renderless)
- `GhostMenubarTrigger` (top-level `menuitem` with `aria-haspopup="menu"`)
- `GhostMenubarContent` (positioned dismissable floating `role="menu"`)
- `GhostMenubarItem`, `Group`, `Label`, `Separator`, `CheckboxItem`,
  `RadioGroup`, `RadioItem` (same contracts as dropdown menu items)
- `useGhostMenubar`, `useGhostMenubarMenu` (composables)
- `useGhostMenuCollection`, `getMenuItems`, `focusFirstMenuItem`,
  `focusLastMenuItem`, `useRovingFocus` (shared primitives)
- Types mirroring dropdown placement/options plus menubar-specific props

Themed exports from `@ghostvue/themes`: all parts as thin `defineComponent`
wrappers plus `ghost-menubar.css` via `default.css`.

### Props and configuration

#### `GhostMenubar` (root)

| Prop  | Type                  | Default | Contract                                  |
| ----- | --------------------- | ------- | ----------------------------------------- |
| `as`  | `string \| Component` | `'div'` | Menubar container element.                |
| `dir` | `'ltr' \| 'rtl'`      | omitted | Text direction for horizontal arrow keys. |

#### `GhostMenubarMenu` (menu root)

| Prop          | Type                   | Default     | Contract                           |
| ------------- | ---------------------- | ----------- | ---------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state.             |
| `defaultOpen` | `boolean`              | `false`     | Initial open in uncontrolled mode. |

#### `GhostMenubarTrigger`

| Prop       | Type                         | Default    | Contract                                        |
| ---------- | ---------------------------- | ---------- | ----------------------------------------------- |
| `as`       | `GhostMenubarTriggerElement` | `'button'` | Host element; `role="menuitem"` on the menubar. |
| `disabled` | `boolean`                    | `false`    | Skips roving; not activatable.                  |

#### `GhostMenubarContent`

Same floating props as `GhostDropdownMenuContent`; default `placement`
is `'bottom-start'`. Default `portal` is `true`.

Item, group, label, separator, checkbox, and radio parts match
`GhostDropdownMenu*` contracts (including `v-model` on checkbox/radio group).

### v-model contracts

- `GhostMenubarMenu`: `open` + `update:open` (`v-model:open`).
- Checkbox and radio items: same as dropdown menu.

### Events, slots, and exposed methods

- `GhostMenubarMenu` default slot: `{ open: boolean, close: () => void }`.
- Focusable parts expose `{ element, focus, blur }`.

## State model

- At most one `GhostMenubarMenu` is open at a time; opening another closes the rest.
- Binary open/closed per menu; content mounts with `v-if="open"`.
- `data-state` on triggers and content; `data-part` hooks on all parts.

## Consumer data

No domain collections on the menubar. Checkbox/radio state is consumer-owned via
`v-model`.

## Accessibility contract

WAI-ARIA APG **Menubar** pattern (flat menus per top-level item):

### Semantics

- Menubar root: `role="menubar"`, `data-part="root"`.
- Trigger: `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`,
  `aria-controls`, `data-part="trigger"`.
- Content: `role="menu"`, `tabindex="-1"`, `data-part="content"`.
- Items: `menuitem` / `menuitemcheckbox` / `menuitemradio` as in dropdown menu.

### Keyboard interaction

| Key                             | Where             | Behavior                                                                                    |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `Tab`                           | Menubar           | Single tab stop into the bar; Tab moves out.                                                |
| `ArrowLeft` / `Right`           | Menubar (trigger) | Roving focus among triggers (wrap); if a menu is open, close it and open the adjacent menu. |
| `ArrowDown` / `Enter` / `Space` | Closed trigger    | Open menu; focus first item (`ArrowUp` on trigger focuses last item).                       |
| Menu keys                       | Open menu         | Same as `GhostDropdownMenu` via `useGhostMenuCollection`.                                   |
| `Home` / `End`                  | Menubar triggers  | First / last enabled trigger.                                                               |
| `Escape`                        | Open menu         | Close; restore focus to owning trigger.                                                     |

### Focus behavior

- `useRovingFocus` on the menubar root for horizontal trigger roving (one tab stop).
- On menu open: `focusFirstMenuItem` / `focusLastMenuItem` on content after positioned.
- On dismiss: restore focus to trigger via `useFocusScope`.

## Rendering and customization

- `GhostMenubarMenu` is renderless; `GhostMenubar` renders the bar container.
- Content uses class `ghost-menubar-content`; themed tokens mirror dropdown menu.

## Environment behavior

### SSR and hydration

- `useGhostId` for SSR-safe IDs; closed menus render triggers only.
- Overlay composables guard browser APIs in `onMounted`.
- SSR hydration fixture with `expectSsrHydration`.

### Mobile and touch

- `useDismissableLayer` for outside pointer dismissal.

## Performance

- Floating and dismiss listeners active only while a menu content is mounted and open.

## Composition

- `useGhostMenubarMenu` reuses `useGhostDropdownMenu` with menubar-specific ID
  namespaces.
- `useGhostMenubar` registers menus and enforces a single open menu.
- `useRovingFocus` on the menubar root; `useGhostMenuCollection` on each content.

## Test plan

- **Unit (`GhostMenubar.test.ts`):** controlled/uncontrolled open; single open menu;
  menubar roving; arrow opens adjacent when open; trigger `aria-*`; menu roving,
  typeahead, Escape; checkbox/radio behavior.
- **SSR:** closed menubar and `overlay-ssr` / `expectSsrHydration` fixture.
- **Theme CSS integration:** token-only stylesheet.
- **E2E (`ghost-menubar.spec.ts`):** axe, horizontal navigation, open adjacent,
  Down open, items, checkbox, radio, Escape.
- **Visual:** Docker baselines for headless and themed examples.

## Documentation plan

- `docs/components/menubar.md` with headless and themed examples.
- Executable examples `menubar/basic`, `menubar/themed`.

## Compatibility and release impact

- Additive minor Changeset for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

- Submenu items inside menu content (GHO-92) once submenu primitive exists.
