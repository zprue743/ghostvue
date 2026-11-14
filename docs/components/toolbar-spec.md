# GhostToolbar specification

**Status:** Proposed for GHO-93. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostToolbar` groups related controls — buttons, toggles, and future menu
triggers — into a single tab stop with arrow-key movement among items. Table
action bars, rich-text formatting rows, and chart controls need one
`role="toolbar"` container, APG-correct roving tabindex, and predictable
horizontal or vertical arrow behavior without reimplementing focus queries or
disabled skipping.

The component composes `useRovingFocus` and the shared tabbable helpers so
consumers place `GhostButton`, `GhostSwitch`, and `GhostSeparator` in the
default slot and get correct semantics and keyboard behavior.

## Non-goals

- It is not a menubar. Top-level application menus, cascading submenus, and
  `aria-haspopup` menu-button behavior belong in `GhostDropdownMenu` and related
  primitives.
- It is not a tab list. `GhostTabs` owns selection, `tab` / `tabpanel`
  relationships, and activation modes.
- It does not register global shortcut chords. Hotkey managers stay
  consumer-owned; `GhostKbd` is display-only.
- It does not implement `aria-activedescendant` command surfaces. Items are
  ordinary focusable descendants located by roving tabindex.
- It does not coordinate multiple toolbars with F6. Moving between sibling
  toolbars on a page is a later composite if needed.
- The unstyled component ships no layout styles. Flex alignment, wrapping, and
  density belong to the consumer or the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostToolbar` / `useGhostToolbar`:

| Prop          | Type                          | Default        | Contract                                                                                                        |
| ------------- | ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`  | `'horizontal'` | Sets `aria-orientation` when `vertical` and drives roving arrow keys (left/right vs up/down).                   |
| `loop`        | `boolean`                     | `true`         | When `true`, arrow/Home/End movement wraps from last to first. When `false`, movement stops at the ends.        |
| `dir`         | `'ltr' \| 'rtl' \| undefined` | `undefined`    | Optional text direction for horizontal arrow reversal. When omitted, read from the root or document.            |
| `label`       | `string \| undefined`         | `undefined`    | Accessible name via `aria-label`. Prefer `aria-labelledby` fallthrough when a visible heading already names it. |
| `as`          | `GhostToolbarElement`         | `'div'`        | Element tag or component for the toolbar root.                                                                  |

```ts
type GhostToolbarElement = 'div' | 'section' | 'footer' | 'header'
```

Native container attributes and listeners fall through to the rendered root.
The component owns `role`, `aria-orientation`, and `aria-label` when `label` is
set. Do not redeclare owned `aria-*` as camelCase props.

Named ESM exports: `GhostToolbar`, `useGhostToolbar`, and the types above.
`useGhostToolbar` returns computed `rootProps`, `focus`, and `blur`, and invokes
`useRovingFocus` on the supplied root ref after mount so SSR setup does not
touch `document`.

Themed `@ghostvue/themes` `GhostToolbar` wraps the unstyled component. Same
behavioral props; no extra visual props in this issue. Default CSS is a flex row
or column with a small gap and stretch alignment so vertical `GhostSeparator`
rules can span the bar.

### v-model contracts

None. Focus position is managed by roving tabindex and is not consumer-owned
state.

### Events, callbacks, slots, and exposed methods

The default slot holds toolbar items. Consumers compose `GhostButton`,
`GhostSwitch`, `GhostCheckbox`, and `GhostSeparator`; disabled items use each
child's native `disabled` or `aria-disabled` and are skipped by roving focus.

No component-specific events are declared; native listeners on the root receive
DOM events.

`defineExpose` matches other focusable containers:

| Member    | Type                               | Contract                              |
| --------- | ---------------------------------- | ------------------------------------- |
| `element` | `HTMLElement \| null`              | Root after mount.                     |
| `focus`   | `(options?: FocusOptions) => void` | Focuses the root (toolbar container). |
| `blur`    | `() => void`                       | Blurs the root.                       |

Programmatic `focus()` on the toolbar targets the current roving tab stop, or
the first enabled item when none is selected. The root is not focusable.

### State model

Configuration props (`orientation`, `loop`, `dir`, `label`, `as`) may change at
runtime; roving tabindex resyncs on focus and when focusable descendants change.

### Loading, empty, disabled, read-only, and error states

The toolbar itself has no loading or error states. Child controls keep their
own semantics. An empty slot renders an empty toolbar; consumers should still
provide an accessible name when the bar is meaningful.

## Consumer data

The component accepts no item data. Lists of actions are consumer markup in the
slot.

## Accessibility contract

### Semantics and relationships

Follow the WAI-ARIA APG
[Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

| Aspect      | Contract                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Role        | `toolbar` on the root.                                                                                     |
| Name        | Required from author: `label` prop or `aria-labelledby` / `aria-label` fallthrough.                        |
| Orientation | `aria-orientation="vertical"` when `orientation` is `vertical`; omitted when horizontal (default).         |
| Items       | Focusable descendants supplied by the consumer; not owned by this component.                               |
| Separators  | Compose `GhostSeparator` with `orientation` matching the bar axis; keep `decorative={false}` for grouping. |

### Keyboard interaction

Delegated to `useRovingFocus` inside the toolbar root:

| Key                 | Behavior                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| `ArrowRight`        | Next enabled item when `orientation` is `horizontal` (flipped in RTL).     |
| `ArrowLeft`         | Previous enabled item when `orientation` is `horizontal` (flipped in RTL). |
| `ArrowDown`         | Next enabled item when `orientation` is `vertical`.                        |
| `ArrowUp`           | Previous enabled item when `orientation` is `vertical`.                    |
| `Home`              | First enabled item.                                                        |
| `End`               | Last enabled item.                                                         |
| `Tab` / `Shift+Tab` | Not intercepted; moves focus into or out of the composite.                 |

Arrow keys do not move focus when the event target is an editable field inside
the toolbar. Disabled and `aria-disabled` items are skipped.

### Focus behavior

Roving tabindex: exactly one enabled item has `tabIndex={0}`; siblings use
`-1`. Focusing a sibling updates the tab stop. The toolbar root may be focused
via `expose.focus()` but is not inserted into the tab order by this component.

### Assistive technology expectations

Assistive technology encounters a single named toolbar landmark. Tab enters the
group at the current roving item; arrow keys move among controls. Separators
between groups are announced when semantic `GhostSeparator` instances are used.

## Rendering and customization

Attribute fallthrough and `as` are the customization API. One root element, no
internal wrappers.

Stable styling hooks (ADR 0004):

- class `ghost-toolbar`
- `data-part="root"`
- `data-ghost-toolbar`
- `data-orientation="horizontal"` or `data-orientation="vertical"`

Recipe CSS under `.ghost-theme` / `.ghost-themed-scope` sets `display: flex`,
`align-items: center`, `gap`, and `flex-direction` from `data-orientation`.

## Environment behavior

### SSR and hydration

`useRovingFocus` attaches listeners in `onMounted`. SSR output is a static
`role="toolbar"` container with slot contents; tabindex sync runs after
hydration.

### Mobile and touch

No pointer-specific behavior. Touch users activate child controls directly.
Target sizing remains each child's responsibility.

## Performance

Expected scale is tens of items per bar, not hundreds. Roving focus scans
focusable descendants on key events and focus sync; no virtualization.

## Composition

- `useRovingFocus` — arrow and Home/End movement, disabled skipping, RTL.
- `getFocusableElements` / `isDisabledElement` from `get-tabbable-elements.ts`.
- `GhostSeparator` — visual and semantic grouping between item clusters.
- Future menu buttons and toggles compose as slot children without API changes.

## Test plan

- Unit: role, `aria-orientation`, `data-orientation`, `label` → `aria-label`,
  fallthrough attrs, exposed `element` / `focus` / `blur`.
- Unit: roving tabindex with multiple buttons, disabled skip, vertical arrows,
  loop false at ends, RTL horizontal flip (via `useRovingFocus` integration in
  `GhostToolbar.test.ts`).
- SSR: listeners not attached during `renderToString`.
- Browser: playground section, axe on toolbar region, arrow moves focus between
  buttons, Tab leaves the bar.
- Examples: axe via `examples.spec.ts` for each registry example in light and dark.
- Type: consumer fixture imports public props.

## Documentation plan

- API table on `docs/components/toolbar.md`.
- Examples: basic horizontal bar, composable, vertical stack, separators,
  themed flex layout.
- Playground section with unique heading and aria-labelledby name.
- Roadmap entry for GHO-93 marked shipped when merged.

## Compatibility and release impact

New `@ghostvue/vue` and `@ghostvue/themes` exports. Changeset required for
publishable packages.

## Open architectural questions

None for this issue. Styling-hooks (`GHO-38`) stay undecided; this component
uses the existing `data-*` convention only.
