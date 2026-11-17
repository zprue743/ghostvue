# GhostSelect specification

**Status:** Proposed for GHO-83. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostSelect` is an accessible single-value select built from the WAI-ARIA APG
[Select-Only Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)
pattern. It targets DataTable surfaces (page-size choices, categorical filters,
filter operators) and ordinary form fields composed with `GhostField`.

Sighted users get a compact trigger showing the current choice and a positioned
list of options. Keyboard and assistive-technology users get combobox + listbox
semantics, arrow-key roving among options, printable-character typeahead, and
labeled options inside `GhostField`. The control participates in native HTML
forms via a visually hidden submit input and `useNativeFormReset`, consistent with
`GhostSwitch` and `GhostNumberInput`.

## Non-goals

- Multi-select, tag chips, or toggle-all behavior.
- Combobox with free text entry, filtering, or async search. Use `GhostInput` or
  a future searchable combobox.
- `GhostDropdownMenu` action-menu semantics (`menu` / `menuitem`).
- Option virtualization or async option loading.
- Replacing native `<select>` globally on mobile. Native OS pickers are
  documented as a consumer progressive-enhancement path (see Environment).
- Changing overlay primitive public APIs or inventing a new styling-hooks
  contract (GHO-38).

## Public API

### Parts and exports

Headless `@ghostvue/vue`:

- `GhostSelect` — root provider, value model, form submit input
- `GhostSelectTrigger` — `role="combobox"` anchor
- `GhostSelectValue` — selected label / placeholder slot
- `GhostSelectContent` — portaled listbox surface
- `GhostSelectOption` — `role="option"` item
- `GhostSelectGroup` — optional `role="group"` wrapper
- `GhostSelectLabel` — group label (`id` for `aria-labelledby`)
- `useGhostSelect` — state, registry, and form helpers
- Types for props, exposed refs, context, and composable options

Themed `@ghostvue/themes`:

- The same part names with default list surface, trigger, and option styles

### Props and configuration

#### `GhostSelect` (root)

| Prop           | Type                   | Default     | Contract                                                                                                                           |
| -------------- | ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `string \| undefined`  | `undefined` | Controlled selected value. `undefined` is uncontrolled.                                                                            |
| `defaultValue` | `string \| undefined`  | `undefined` | Initial value when uncontrolled; omitted means no selection. Form reset restores the current `defaultValue`.                       |
| `name`         | `string`               | `undefined` | Visually hidden input `name` for native submit. When omitted, the control does not submit.                                         |
| `disabled`     | `boolean`              | `false`     | Disables trigger and options; omits value from submit.                                                                             |
| `required`     | `boolean`              | `false`     | Native `required` and constraint validation on the submit input when `name` is set (not `type=hidden`).                            |
| `invalid`      | `boolean`              | `false`     | Sets `aria-invalid` on the trigger for Field integration.                                                                          |
| `open`         | `boolean \| undefined` | `undefined` | Controlled listbox open state. Omit for uncontrolled.                                                                              |
| `defaultOpen`  | `boolean`              | `false`     | Initial open state when `open` is omitted.                                                                                         |
| `placeholder`  | `string`               | `undefined` | Placeholder text when nothing is selected (also exposed to assistive tech via trigger `aria-label` composition when no selection). |

`GhostFieldControl` slot props (`id`, `disabled`, `required`, `aria-describedby`,
`aria-invalid`) spread onto `GhostSelectTrigger` (the single tab stop).

#### `GhostSelectTrigger`

| Prop       | Type                  | Default    | Contract                                                          |
| ---------- | --------------------- | ---------- | ----------------------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Focusable combobox host. Native `button` uses `type="button"`.    |
| `disabled` | `boolean`             | `false`    | Disables open/close and selection. Combines with root `disabled`. |

#### `GhostSelectValue`

| Prop | Type | Default | Contract                                                                                                                   |
| ---- | ---- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| —    | —    | —       | Renders the registered `textValue` of the selected option, else root `placeholder`, else default slot placeholder content. |

#### `GhostSelectContent`

| Prop                          | Type                  | Default                | Contract                 |
| ----------------------------- | --------------------- | ---------------------- | ------------------------ |
| `as`                          | `string \| Component` | `'div'`                | Listbox host.            |
| `placement`                   | `Placement`           | `'bottom'`             | Passed to `useFloating`. |
| `offset`                      | same as Popover       | `undefined`            | Floating offset.         |
| `flip` / `shift` / `strategy` | same as Popover       | defaults match Popover | Collision handling.      |
| `portal`                      | `boolean`             | `true`                 | `GhostPortal` when open. |
| `portalTo`                    | `GhostPortalTarget`   | `'body'`               | Teleport target.         |

#### `GhostSelectOption`

| Prop        | Type      | Default | Contract                                                         |
| ----------- | --------- | ------- | ---------------------------------------------------------------- |
| `value`     | `string`  | —       | Stable option value; unique within the root.                     |
| `disabled`  | `boolean` | `false` | Skipped by pointer, keyboard, and typeahead.                     |
| `textValue` | `string`  | —       | Typeahead string; defaults to trimmed text content when omitted. |

#### `GhostSelectGroup` / `GhostSelectLabel`

`GhostSelectGroup` renders `role="group"` with `aria-labelledby` referencing the
nearest preceding `GhostSelectLabel` id in the same group subtree.
`GhostSelectLabel` renders a non-interactive label element with `useGhostId`.

### v-model contracts

| Role     | Prop         | Emit                | Uncontrolled initial   |
| -------- | ------------ | ------------------- | ---------------------- |
| Selected | `modelValue` | `update:modelValue` | `defaultValue` or none |
| Open     | `open`       | `update:open`       | `defaultOpen`          |

Both use `useControllableState`. Switching controlled ↔ uncontrolled after setup
is unsupported ([GHOST001](../warnings.md#ghost001)).

Unregistering an option (conditional rendering, consumer filtering, reordering,
or remounting) only removes it from the keyboard and typeahead registry. It never
changes the selection: an uncontrolled value stays selected, keeps submitting
through the form mirror, and `GhostSelectValue` keeps showing the last registered
label for it. No `update:modelValue` is emitted. The selection changes only
through user selection, native form reset, or the parent's controlled
`modelValue`. This intentionally differs from `GhostRadioGroup`, whose items are
the visible control rather than a filtered suggestion list.

### Events, slots, and exposed methods

- `GhostSelect` default slot holds trigger, value, content, and options.
- `GhostSelectValue` default slot is a placeholder when nothing is selected.
- Exposed template refs (each part): `{ element: HTMLElement \| null, focus(), blur() }`.
- `GhostSelect` exposed: `element` on hidden input when present, else trigger;
  `focus()` focuses the trigger.

## State model

| Surface           | Attribute / state                                            |
| ----------------- | ------------------------------------------------------------ |
| Trigger           | `data-part="trigger"`, `data-state="open" \| "closed"`       |
| Content (mounted) | `data-part="content"`, `data-state="open"`, `data-placement` |
| Option            | `data-part="option"`, `data-state="checked" \| "disabled"`   |
| Root (Field)      | `data-state="invalid" \| "disabled"` when applicable         |

Open listbox content mounts with `v-if="open"` (not `v-show`) so floating and
dismiss layers stay clean while closed.

## Accessibility contract

### Semantics

- `GhostSelectTrigger`: `role="combobox"`, `aria-haspopup="listbox"`,
  `aria-expanded`, `aria-controls` → listbox id, optional `aria-invalid`,
  `aria-required` when root `required`.
- `GhostSelectContent`: `role="listbox"`, `tabindex="-1"` on the listbox
  container, `aria-labelledby` → trigger id unless overridden.
- `GhostSelectOption`: `role="option"`, `aria-selected`, roving `tabindex` via
  `useRovingFocus` (`orientation: vertical`).
- Groups: `role="group"` + `aria-labelledby`.

### Keyboard

| Key                                         | Where            | Behavior                                                                                            |
| ------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `Enter` / `Space` / `ArrowDown` / `ArrowUp` | Trigger (closed) | Opens listbox; focus moves to selected enabled option or first/last enabled option for Up/Down.     |
| `Escape`                                    | Content          | Closes listbox; focus returns to trigger.                                                           |
| `Tab`                                       | Content          | Closes listbox; default tab navigation.                                                             |
| Arrow keys / `Home` / `End`                 | Content          | `useRovingFocus` among enabled options.                                                             |
| Printable keys                              | Content          | Typeahead: accumulate within ~500ms, match `textValue` prefix, cycle matches; focus moves to match. |
| `Enter` / `Space`                           | Focused option   | Selects option, closes listbox, focuses trigger.                                                    |

Native `button` trigger: `Space`/`Enter` on the closed trigger opens without
duplicate activation from native button semantics (same guard pattern as
`GhostPopoverTrigger`).

### Focus

- One tab stop on the trigger while closed.
- On open: focus first selected enabled option, else first enabled option; listbox
  receives `useRovingFocus` with vertical orientation.
- On close: restore focus to trigger unless an outside focusable was clicked
  (`useDismissableLayer` + `useFocusScope` `trapped: false`, matching Popover).
- `visibility: hidden` on content until `useFloating().isPositioned` is true.

## Rendering and customization

Stable hooks: `data-part`, `data-state`, `data-placement` on content, class
`ghost-select-content` on themed content. Options carry `data-part="option"`.
Themed CSS uses existing `--ghost-*` tokens only. Content merges consumer
`class` (string, array, or object) and `style` with `ghost-select-content` and
its floating position styles, portaled or inline.

## Environment behavior

### SSR and hydration

- `useGhostId` for trigger, listbox, and option ids.
- Closed select: SSR outputs trigger, closed listbox (`hidden` / `data-state="closed"`,
  options registered), and submit input when `name` is set so labels resolve without opening.
- `defaultOpen: true` may render listbox through deferred `GhostPortal` without
  touching `window`/`document` in setup; browser listeners attach in `onMounted`
  (`overlay-ssr.test.ts` pattern).

### Portal, positioning, dismissal

Reuses `GhostPortal`, `useFloating`, `useDismissableLayer`, and
`useFocusScope` exactly as `GhostPopoverContent` does. Content defaults:
`placement: bottom`, `flip: true`, `shift: true`, `portal: true`, `portalTo: body`.

### Native fallback and mobile

**Decision (v1):** No automatic responsive swap to native `<select>`. Custom
listbox is the sole headless implementation so semantics and styling stay
consistent. Consumers who need OS pickers on specific breakpoints may render a
native `<select>` beside or instead of `GhostSelect`, or hide the custom control
with CSS and show native — outside this package.

**Mobile / touch:** Opening uses the same pointer path as click (`useDismissableLayer`
capture `pointerdown`). Themed options use minimum block size from
`--ghost-control-min-height` (or space tokens) for touch targets. Virtual keyboard
does not interact with the listbox (no text field).

## Performance

Floating observers and dismiss listeners run only while the listbox is open; content
stays mounted while closed so option labels remain registered.

## Composition

- `useControllableState` — value and open
- `useGhostId` — ids
- `useNativeFormReset` + visually hidden `input[type="text"]` — submit, `required`,
  and reset (`aria-hidden` so axe ignores the mirror; the combobox trigger is the
  accessible control)
- `useFloating`, `GhostPortal`, `useDismissableLayer`, `useFocusScope` — overlay
- `useRovingFocus` — option keyboard navigation
- Local typeahead helper in `useGhostSelect` (no new package dependency)

## Test plan

- **Vue unit tests:** v-model, uncontrolled/defaultValue, disabled options,
  controlled emit ignore, open/close, typeahead, roving keys, required submit
  input constraint validation, form reset, Field aria wiring, value survives
  close, defaultValue label while closed, SSR hydration, value + label + FormData
  survive option unmount/reorder/remount without emits
- **SSR:** `overlay-ssr.test.ts` closed/open; `expectSsrHydration` integration
- **E2E + axe:** open/select/close keyboard paths, form submit, docs example
- **Visual:** `examples/select/themed` baselines via `pnpm test:visual:docker`
- **Type:** consumer compile fixture

## Documentation plan

`docs/components/select.md`, examples `basic`, `field`, `form`, `themed`,
playground section, sidebar + roadmap status, manifests via `pnpm manifests:write`.

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking.
