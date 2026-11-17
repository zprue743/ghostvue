# GhostContextMenu specification

**Status:** Approved pending review.

**Follow-up (out of scope):** nested submenus ([GHO-107](https://linear.app/ghost-vue/issue/GHO-107))
and menubar-hosted submenus.

## Purpose and user problems

`GhostContextMenu` exposes a **context menu** (right-click, long-press, and keyboard
context-menu shortcuts) anchored at the pointer. It reuses the same item model,
`useGhostMenuCollection` keyboard behavior, overlay dismissal, and focus restoration
patterns as `GhostDropdownMenu`, but positions the surface with `useFloating` against
a **virtual reference** at the event coordinates instead of a menu-button anchor.

Primary use cases include DataTable row actions and any surface where a right-click
or long-press should reveal actions without a visible menu button.

## Non-goals

- Menu **button** toggle semantics (`GhostDropdownMenu`).
- Modal dialog, popover, tooltip, or native `<select>` behavior.
- **Submenus** inside content (no child menu trigger in items).
- Replacing the browser default context menu when the component is closed or when
  `event.preventDefault()` is called by the consumer before open.
- Decorative icons, swipe navigation, or custom animation contracts beyond
  `data-state`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostContextMenu` (root state and context provider; renderless)
- `GhostContextMenuTrigger` (context target; not a menu button)
- `GhostContextMenuContent` (positioned, dismissable floating `role="menu"`)
- `GhostContextMenuItem` (`role="menuitem"`)
- `GhostContextMenuGroup` (logical grouping container)
- `GhostContextMenuLabel` (non-focusable section label)
- `GhostContextMenuSeparator` (horizontal rule between sections)
- `GhostContextMenuCheckboxItem` (`role="menuitemcheckbox"`)
- `GhostContextMenuRadioGroup` / `GhostContextMenuRadioItem` (`menuitemradio` set)
- `useGhostContextMenu` (composable for open state, IDs, and pointer anchor)
- Shared menu utilities remain `useGhostMenuCollection`, `getMenuItems`,
  `focusFirstMenuItem`, `focusLastMenuItem` from the existing module.

Themed exports from `@ghostvue/themes`: all parts above plus `ghost-context-menu.css`
via `default.css`.

### Props and configuration

#### `GhostContextMenu` (root)

| Prop          | Type                   | Default     | Contract                                           |
| ------------- | ---------------------- | ----------- | -------------------------------------------------- |
| `open`        | `boolean \| undefined` | `undefined` | Controlled open state. Omit for uncontrolled mode. |
| `defaultOpen` | `boolean`              | `false`     | Initial open state in uncontrolled mode.           |

#### `GhostContextMenuTrigger`

| Prop             | Type                             | Default  | Contract                                                          |
| ---------------- | -------------------------------- | -------- | ----------------------------------------------------------------- |
| `as`             | `GhostContextMenuTriggerElement` | `'span'` | Host element wrapping the context target.                         |
| `disabled`       | `boolean`                        | `false`  | Suppresses open gestures and keyboard shortcuts.                  |
| `longPressDelay` | `number`                         | `500`    | Milliseconds before a long-press opens the menu (touch/pen only). |

Opens on `contextmenu` (right-click), long-press (pointer hold without scroll),
`Shift+F10`, and the `ContextMenu` key when focused. Does not open on primary click
or tap. Does not call `preventDefault()` on `contextmenu` unless the menu actually
opens (after `disabled` checks and consumer `onContextmenu` without
`defaultPrevented`).

#### `GhostContextMenuContent`

Same floating and portal props as `GhostDropdownMenuContent` (`placement`, `offset`,
`flip`, `shift`, `strategy`, `portal`, `portalTo`). Default `placement` is
`bottom-start` relative to the virtual pointer anchor.

#### Items, checkbox, radio, label, separator, group

Behavior matches `GhostDropdownMenu` counterparts (roles, `v-model` contracts,
`select` emits, disabled skip, checkbox stays open, radio closes unless
`preventDefault()`).

### v-model contracts

- `GhostContextMenu`: `open` + `update:open` (`v-model:open`).
- `GhostContextMenuCheckboxItem`: `checked` + `update:checked`.
- `GhostContextMenuRadioGroup`: `modelValue` + `update:modelValue`.

### Events, slots, and exposed methods

- Root default slot: `{ open: boolean, close: () => void }`.
- Parts expose `{ element, focus, blur }` where focusable.

## State model

- Binary open/closed on the root; content mounts with `v-if="open"`.
- Pointer coordinates captured when open is requested; frozen for that open cycle
  (reposition via `autoUpdate` on scroll/resize only).
- `data-state` on trigger and content matches dropdown conventions.
- First-paint guard: `visibility: hidden` until `useFloating` resolves `isPositioned`.

## Accessibility contract

WAI-ARIA APG **Menu** pattern (context menu variant):

### Semantics

- Trigger: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` while applicable,
  `data-part="trigger"`.
- Content: `role="menu"`, `tabindex="-1"`, `data-part="content"`.
- Items: same roles and `data-part` hooks as `GhostDropdownMenu`.

### Keyboard interaction

| Key                     | Where           | Behavior                                                 |
| ----------------------- | --------------- | -------------------------------------------------------- |
| `ContextMenu`           | Focused trigger | Open at trigger focus rect center or last pointer.       |
| `Shift+F10`             | Focused trigger | Open at trigger focus rect center or last pointer.       |
| `Escape`                | Open menu       | Close; restore focus to trigger.                         |
| Arrow/Home/End/typeable | Open menu       | Same as `useGhostMenuCollection` (shared with dropdown). |
| `Tab`                   | Open menu       | Close without restoring focus to trigger.                |

### Focus behavior

- On open after positioned: `focusFirstMenuItem` on content (no “focus last” on
  context open).
- On close (Escape, outside pointer without focusable target, item/radio select):
  restore focus to the trigger element via `useFocusScope`.

## Rendering and customization

- Root: renderless provider.
- Content: class `ghost-context-menu-content`, `data-part="content"`. Consumer
  `class` and `style` merge with the library class and floating position styles.
- Themed CSS mirrors dropdown menu tokens on `.ghost-context-menu-content`.

## Environment behavior

### SSR and hydration

Closed menus render trigger only (`v-if` content). `useGhostId` supplies SSR-safe IDs.
Integration: `tests/integration/ssr-hydration.test.ts` closed fixture.

### Mobile and touch

Long-press opens only when the pointer stays within a small movement threshold and
the delay elapses; `pointercancel`, `pointerup`, and scroll-like movement cancel the
timer. Native `contextmenu` may still fire on long-press on some platforms; opening
suppresses default only when this menu opens.

## Composition

- `useGhostContextMenu` for open state, IDs, and virtual reference coordinates.
- `useFloating` with a virtual `ReferenceElement`.
- `useDismissableLayer`, `useFocusScope`, `GhostPortal` (same overlay stack as dropdown).
- `useGhostMenuCollection` unchanged for item keyboard behavior.

## Test plan

- **Unit (`packages/vue/src/GhostContextMenu.test.ts`):** controlled/uncontrolled
  open; right-click opens at coordinates; long-press timing and cancel on move/up;
  no open on quick tap; `contextmenu` default not prevented when disabled; keyboard
  open; menu collection behavior; focus restore; native context menu not prevented
  when menu does not open.
- **SSR:** closed menu hydration fixture.
- **Theme CSS:** token-only stylesheet integration test.
- **E2E:** axe, open via contextmenu, item activation, Escape, disabled trigger.
- **Visual:** `context-menu/basic` and `context-menu/themed` via Docker baselines.

## Documentation plan

- `docs/components/context-menu.md` with headless and themed examples (including
  DataTable-style row target).
- Executable examples under `examples/context-menu/`.

## Compatibility and release impact

- Additive minor Changeset for `@ghostvue/vue` and `@ghostvue/themes`.
- Additive changes to `use-ghost-menu-collection.ts` only if required (must not alter
  dropdown behavior).

## Open architectural questions

- Submenu layering on context menu items (GHO-107).
