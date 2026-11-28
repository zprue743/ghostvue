---
schemaVersion: 1.0.0
component: GhostSelect
components:
  - GhostSelect
  - GhostSelectTrigger
  - GhostSelectValue
  - GhostSelectContent
  - GhostSelectOption
  - GhostSelectGroup
  - GhostSelectLabel
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: proposed
manifests:
  - packages/vue/manifests/ghost-select.manifest.json
  - packages/vue/manifests/ghost-select-trigger.manifest.json
  - packages/vue/manifests/ghost-select-value.manifest.json
  - packages/vue/manifests/ghost-select-content.manifest.json
  - packages/vue/manifests/ghost-select-option.manifest.json
  - packages/vue/manifests/ghost-select-group.manifest.json
  - packages/vue/manifests/ghost-select-label.manifest.json
  - packages/themes/manifests/ghost-select.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions:
  - question: 'Issue #415 (0.2.0 multiple GhostSelect): maintainer decision S1 — a `multiple` boolean prop on the existing GhostSelect root with generic `Multiple` typing vs a separate GhostMultiSelect root — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S2 — model and FormData order follows selection order (append on select, matching GhostCombobox multiple) vs rendered option order (native select multiple and Vue vModelSelect) — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S3 — Enter and Space both toggle and keep the listbox open, APG range and select-all keys (Shift+Arrow, Shift+Space, Ctrl+A) are out of scope, and focus moves to the nearest enabled option when the focused option unmounts — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S4 — GhostSelectValue default rendering (labels joined in model order with a messages.listSeparator override) and its new scoped slot props { values, labels } vs a count summary — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S5 — a selected option that is disabled stays submitted (current GhostSelect and GhostCombobox behavior) vs excluded from FormData like a disabled native option — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S6 — exported type surface: generic useGhostSelect and GhostSelect props, widened GhostSelectContext.selectedValue plus selectedValues, and a generic setup overload for the themed wrapper — before implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #415: maintainer decision S7 — `multiple` is fixed for the lifetime of an instance with a new development warning on change vs reactive switching that converts the value — before implementation.'
    blocking: false
    reviewer: Zac
---

# GhostSelect specification

**Status:** Proposed for GHO-83. Spec and implementation ship together; Zac
approves both in PR review.

> [!IMPORTANT]
> **Multiple selection is a draft.** [Multiple selection proposal](#multiple-selection-proposal)
> extends this spec for [#415](https://github.com/zprue743/ghostvue/issues/415)
> (target `0.2.0`, "Schema forms and multi-value inputs"). It is docs-only: no
> runtime code, manifest change, or export exists for it yet. Implementation
> waits until a maintainer resolves S1–S7 in
> [Open architectural questions](#open-architectural-questions) and records the
> approval link here. Every other section describes the published single-value
> contract, which does not change.

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

- Tag chips, toggle-all, or range selection. Multiple selection itself is the
  draft [Multiple selection proposal](#multiple-selection-proposal); until it is
  approved and implemented, `GhostSelect` selects one value.
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

## Consumer data

Single-value mode takes no consumer collections. Options are compound
`GhostSelectOption` children identified by a stable string `value`, and the
model is one string the component replaces, never mutates.

The draft multiple mode adds one consumer-owned collection: the `string[]`
model. [Collection ownership](#collection-ownership-empty-values-and-duplicates)
defines who owns that array, how it is copied, and how duplicates and empty
values are read. Options still are not data-driven: there are no item
accessors, object values, or key callbacks.

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

Keys that belong to an active IME composition (`isComposing`, or the legacy
`keyCode` 229 that WebKit reports for an IME-processed key after
`compositionend`) are ignored by the open listbox: they do not run typeahead,
move focus, select, or close.

Native `button` trigger: `Space`/`Enter` on the closed trigger opens without
duplicate activation from native button semantics (same guard pattern as
`GhostPopoverTrigger`).

### Focus

- One tab stop on the trigger while closed.
- On open: focus first selected enabled option, else first enabled option; listbox
  receives `useRovingFocus` with vertical orientation.
- Order: "first", "last", typeahead matching, and roving all follow the
  rendered DOM order of the mounted options, not the order they registered in.
  Keyed reordering, inserting options before existing ones, and filtering then
  restoring a list therefore never change keyboard order relative to what is
  displayed. Unmounted options are not navigable.
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

Option registration, unregistration, and disabled / `textValue` updates do
constant work each (one insertion-ordered record map plus the label cache), so
mounting, filtering, restoring, or reordering _n_ options costs O(_n_)
bookkeeping, and each option's own state re-evaluates only when that option
changes. Registry state stays synchronous after every call. Measure with
`pnpm bench:registry` (`tests/bench/select-combobox-registry.bench.ts`, not part
of `pnpm verify`).

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
  survive option unmount/reorder/remount without emits, first/last open focus
  and typeahead in DOM order after keyed reorder, insertion, filter + restore;
  IME-owned keys (`isComposing`, `keyCode` 229) skip typeahead, roving,
  selection, and Escape, and typeahead resumes afterwards
- **SSR:** `overlay-ssr.test.ts` closed/open; `expectSsrHydration` integration
- **E2E + axe:** open/select/close keyboard paths, form submit, docs example,
  real focus / typeahead / selection in rendered order after list changes,
  WebKit-style `keyCode` 229 keys ignored in the listbox
  (`tests/e2e/ime-composition.spec.ts`)
- **Manual:** Manual IME validation (automation cannot drive a real input method editor):
  with a Japanese, Chinese, or Korean IME on macOS Safari, macOS Chrome, Windows
  Chrome/Edge, and Firefox, compose text, move through candidates with the arrow
  keys, confirm with `Enter`, and cancel with `Escape`; the widget state must not
  change until the composition is committed, and the first keys after commit must
  behave normally.
- **Visual:** `examples/select/themed` baselines via `pnpm test:visual:docker`
- **Type:** consumer compile fixture
- **Multiple (draft):** the additional cases, including single-select type and
  keyboard regressions, are listed in [Multiple selection test plan](#multiple-selection-test-plan).

## Documentation plan

`docs/components/select.md`, examples `basic`, `field`, `form`, `themed`,
playground section, sidebar + roadmap status, manifests via `pnpm manifests:write`.
The draft multiple mode adds the pages and examples in
[Multiple selection documentation plan](#multiple-selection-documentation-plan).

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

The draft multiple mode is additive: `multiple` defaults to `false`, and the
single-value props, emits, keyboard map, and FormData shape stay as published.
[Multiple selection compatibility](#multiple-selection-compatibility) lists the
exported types it touches.

## Multiple selection proposal

> [!NOTE]
> Draft for [#415](https://github.com/zprue743/ghostvue/issues/415). Nothing in
> this section is implemented or approved. Each decision that needs a
> maintainer is tagged with its question ID (S1–S7, see
> [Open architectural questions](#open-architectural-questions)). Where a rule
> is not tagged, this spec proposes it as the natural extension of the
> published single-value contract or of `GhostCombobox` `multiple`.

### Purpose and non-goals

Filters, label pickers, and notification settings often need several values
from a list too long to keep on screen. `GhostCheckboxGroup`
([#463](https://github.com/zprue743/ghostvue/issues/463)) covers choices that
stay visible. `GhostCombobox` `multiple` covers lists users search by typing.
A multiple `GhostSelect` covers the case in between: a compact trigger, a
popup listbox without a text field, and one `string[]` model that submits with
the form like a native `<select multiple>`.

Out of scope for this proposal:

- Removable tag chips inside the trigger, a "select all" option, or option
  limits (`min` / `max`). Consumers build these from the model and the
  `GhostSelectValue` slot. Rules such as "choose at most three" belong to
  `GhostForm` ([#414](https://github.com/zprue743/ghostvue/issues/414)) or the
  consumer.
- APG range and select-all keys (`Shift+Arrow`, `Shift+Space`,
  `Ctrl+Shift+Home` / `End`, `Ctrl+A`) (S3).
- Object values, item accessors, or data-driven options. Option values stay
  strings.
- Changing `GhostCombobox` `multiple` behavior. Differences between the two
  are noted where they matter.

### Scalar and multiple examples

The published scalar select and the proposed multiple select use the same
parts. Only the root changes.

**Scalar (published, unchanged)**

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Emitted as `string | undefined`.
const region = ref<string | undefined>()
</script>

<template>
  <GhostSelect v-model="region" name="region" placeholder="Choose a region">
    <GhostSelectTrigger aria-label="Region">
      <GhostSelectValue />
    </GhostSelectTrigger>
    <GhostSelectContent>
      <GhostSelectOption value="us-east">US East</GhostSelectOption>
      <GhostSelectOption value="eu-west">EU West</GhostSelectOption>
    </GhostSelectContent>
  </GhostSelect>
</template>
```

**Multiple (proposed)**

```vue
<script setup lang="ts">
import { ref } from 'vue'

// Emitted as a new `string[]` on every change; never `undefined`.
const labels = ref<string[]>(['bug'])
</script>

<template>
  <GhostSelect v-model="labels" multiple name="labels" placeholder="Add labels">
    <GhostSelectTrigger aria-label="Labels">
      <GhostSelectValue />
    </GhostSelectTrigger>
    <GhostSelectContent>
      <GhostSelectOption value="bug">Bug</GhostSelectOption>
      <GhostSelectOption value="docs">Docs</GhostSelectOption>
      <GhostSelectOption value="triage">Needs triage</GhostSelectOption>
    </GhostSelectContent>
  </GhostSelect>
</template>
```

**Uncontrolled with `defaultValue`**

```vue
<!-- Scalar: Multiple = false, defaultValue is `string | undefined` -->
<GhostSelect name="region" default-value="us-east">…</GhostSelect>

<!-- Multiple: Multiple = true, defaultValue is `readonly string[]` -->
<GhostSelect
  name="labels"
  multiple
  :default-value="['bug', 'docs']"
>…</GhostSelect>
```

#### Type inference

`GhostSelect` becomes a generic component,
`<script setup lang="ts" generic="Multiple extends boolean = false">` (S1, S6),
following `GhostDataTable`'s `generic="TData"`. The bare `multiple` attribute
passes the literal `true`, so `Multiple` is inferred from the template.
Proposed exported helpers:

```ts
/** Value accepted by `modelValue` / `defaultValue` for a root. */
export type GhostSelectValueInput<Multiple extends boolean = false> =
  Multiple extends true ? readonly string[] : string

/** Value emitted by `update:modelValue`. */
export type GhostSelectModelValue<Multiple extends boolean = false> =
  Multiple extends true ? string[] : string | undefined
```

| Template                                                 | `Multiple` | `modelValue` / `defaultValue` accepted     | `update:modelValue` payload       |
| -------------------------------------------------------- | ---------- | ------------------------------------------ | --------------------------------- |
| `<GhostSelect v-model="region">`                         | `false`    | `string \| undefined`                      | `string \| undefined` (unchanged) |
| `<GhostSelect default-value="us-east">`                  | `false`    | `string \| undefined`                      | `string \| undefined` (unchanged) |
| `<GhostSelect multiple v-model="labels">`                | `true`     | `readonly string[] \| undefined`           | `string[]`                        |
| `<GhostSelect multiple :default-value="['bug']">`        | `true`     | `readonly string[] \| undefined`           | `string[]`                        |
| `<GhostSelect :multiple="isMulti">` (`isMulti: boolean`) | `boolean`  | `string \| readonly string[] \| undefined` | `string \| string[] \| undefined` |

Rejected at compile time (type regression fixtures):

- `<GhostSelect v-model="labels">` with `labels: Ref<string[]>` and no
  `multiple`: the array is not a `string`.
- `<GhostSelect :default-value="['bug']">` without `multiple`.
- `<GhostSelect multiple default-value="bug">` and
  `<GhostSelect multiple v-model="region">` with `region: Ref<string | undefined>`.
- `<GhostSelect multiple :default-value="[1, 2]">`: members are strings.

A wide `boolean` flag compiles to the union and is documented as discouraged;
the value shape is still fixed at setup (S7). If `vue-tsc` cannot infer
`Multiple` from the bare attribute in the consumer fixture, S1 falls back to
the separate-root alternative rather than to an untyped
`string | string[]` model like `GhostCombobox`'s.

### Public API additions

#### `GhostSelect` (root)

| Prop           | Type                                           | Default     | Contract                                                                                                                                   |
| -------------- | ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `multiple`     | `Multiple` (`boolean`)                         | `false`     | Selects the multiple model. Read once at setup (S7).                                                                                       |
| `modelValue`   | `GhostSelectValueInput<Multiple> \| undefined` | `undefined` | Multiple: controlled `readonly string[]`. `undefined` is uncontrolled, as in single mode. `[]` is the controlled empty value.              |
| `defaultValue` | `GhostSelectValueInput<Multiple> \| undefined` | `undefined` | Multiple: uncontrolled seed, copied at setup and again at form reset. Omitted means `[]`.                                                  |
| `messages`     | `GhostSelectMessages`                          | `undefined` | Adds `listSeparator?: string` (default `', '`) for the default multiple value text (S4). `required` keeps its default `'Select a value.'`. |

`name`, `form`, `disabled`, `required`, `invalid`, `open`, `defaultOpen`, and
`placeholder` keep their single-mode meaning; the differences are in
[Native forms](#native-forms-reset-and-disabled). No part gains a prop.

#### `GhostSelectValue` slots (S4)

| Slot          | Props (both modes)                                         | Rendered when                   |
| ------------- | ---------------------------------------------------------- | ------------------------------- |
| `default`     | `{ values: readonly string[]; labels: readonly string[] }` | At least one value is selected. |
| `placeholder` | none                                                       | Nothing is selected.            |

`values` is the model in model order; `labels[i]` is the label for
`values[i]`. Single mode passes one-element arrays, so the props are additive:
an existing `<GhostSelectValue>` default slot that ignores props renders as
before.

#### `useGhostSelect` (S6)

`useGhostSelect<Multiple extends boolean = false>(options)` gains
`multiple?: MaybeRefOrGetter<Multiple>`. Calls without it keep today's
`selectedValue: Ref<string | undefined>` type. Additions:

- `multiple: ComputedRef<boolean>`.
- `selectedValues: ComputedRef<readonly string[]>`: the selection in model
  order with duplicates removed; `[]` or one value in single mode. Value text,
  `aria-selected`, and the form mirrors read this.
- `select(value)`: single mode sets the value and closes (unchanged). Multiple
  mode toggles membership and leaves `open` alone, matching
  `GhostCombobox`'s `select`.
- `formInputProps` stays the single-mode object. A new
  `formInputs: ComputedRef<GhostSelectFormInputProps[]>` lists one mirror per
  value in multiple mode (see [Native forms](#native-forms-reset-and-disabled)).

### Collection ownership, empty values, and duplicates

- **Ownership.** In controlled mode the parent owns the array. The component
  reads it and never mutates it (no `push`, `splice`, or sort). Every user
  change emits a new array. A frozen controlled array works. In uncontrolled
  mode the component copies `defaultValue` at setup and at reset, so later
  in-place mutation of the seed array is not observed until the next reset.
- **Emitted arrays** are new, mutable `string[]` instances owned by the
  receiver. The component never emits the array it received.
- **Empty value.** `[]`. Multiple mode never emits `undefined`. A controlled
  parent that passes `undefined` makes the root uncontrolled, as in single
  mode (GHOST001 covers switching).
- **`''` as an option value** is unsupported in both modes. Single mode already
  treats `''` as "no selection" for `required`, and its keyboard path ignores
  an option whose `data-value` is empty. Multiple mode treats a `''` member in a
  controlled model like any unknown value: it is retained and rendered as text,
  but no option can toggle it.
- **Duplicates in the model** (a controlled `['bug', 'bug']`) are read as one
  membership. `selectedValues`, value text, and the form mirrors use the first
  occurrence. The component does not emit to normalize them. The first user
  toggle of that value removes every occurrence, and every emitted array is
  duplicate-free.
- **Duplicate option values** stay a consumer error, as in single mode
  (`value` must be unique within the root).

### Selection ordering (S2)

The model is kept in **selection order**:

1. Selecting a value appends it: `['bug']` then `Docs` gives `['bug', 'docs']`.
2. Deselecting removes it and keeps the rest in place: toggling `Bug` off gives
   `['docs']`.
3. Reselecting appends again: `['docs', 'bug']`.
4. Option reordering, insertion, filtering, and remounting never reorder the
   model.

`defaultValue` and a controlled `modelValue` keep the order the parent gave.
Value text, `GhostSelectValue` slot props, and FormData all use model order.
Keyboard order is unrelated: it follows rendered DOM order, as in single mode.

The alternative (S2) is rendered option order, which is what native
`<select multiple>` submits and what Vue's `v-model` on a native multiple
select produces.

### State model

| State         | Owner                                      | Changes when                                                                 |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| Selected set  | `modelValue` (controlled) or internal copy | User toggles an option, native form reset, or the parent's controlled value. |
| Open          | `open` (controlled) or internal            | Trigger, `Escape`, `Tab`, outside pointer. Toggling never changes `open`.    |
| Active option | DOM focus inside the listbox               | Arrow keys, `Home` / `End`, typeahead, pointer, open-time focus.             |

**Active versus selected.** The active option is the one that holds DOM focus
(roving `tabindex` through `useRovingFocus`, as today; no
`aria-activedescendant`). Selected options are the model members, shown with
`aria-selected="true"` and `data-state="checked"`. The two are independent:
moving focus never selects, and toggling never moves focus. Styling the
active option uses `:focus-visible`; no new styling hook is added.

Each toggle emits `update:modelValue` once, immediately, with the full new
array. There is no "commit on close". A controlled parent that rejects a
change (keeps its array) keeps its value, and `aria-selected` follows the
parent's array.

#### Options that disappear or reorder

The single-value rule extends to every member:

- Unregistering an option (conditional rendering, filtering, keyed reorder,
  remount) never removes its value from the model, never emits, and keeps
  submitting it.
- `GhostSelectValue` keeps the last registered `textValue` for a member whose
  option has unmounted. A member that never had an option (for example a
  controlled value from the server) renders as the raw value string, as single
  mode does today.
- When the option mounts again it shows `aria-selected="true"` without an
  emit.
- Reordering options changes keyboard order only. Model order, value text, and
  FormData stay the same (S2).
- If the focused option unmounts while the listbox is open, focus moves to the
  next enabled option in rendered order, else the previous, else the listbox
  container (`tabindex="-1"`), so `Escape` and `Tab` still work (S3).

#### Disabled options and root

- A disabled option cannot be toggled by pointer, keyboard, or typeahead. If
  it is already selected it stays selected, keeps `aria-selected="true"`, and
  keeps submitting (S5).
- Root `disabled` disables the trigger and every option. The value text still
  renders. All form mirrors are `disabled`, so nothing submits.

### Accessibility contract (multiple)

#### Semantics

| Element              | Single mode (published)                                                        | Multiple mode (proposed)                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `GhostSelectTrigger` | `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` | Same attributes. No `aria-multiselectable` on the combobox (not a supported state there).                                  |
| Listbox              | `role="listbox"`, `aria-labelledby` → trigger                                  | Adds `aria-multiselectable="true"`.                                                                                        |
| `GhostSelectOption`  | `aria-selected="true"` on the value, `"false"` on the rest                     | `aria-selected="true"` on every member and `"false"` on every other option, so screen readers announce "not selected" too. |
| Disabled option      | `aria-disabled="true"`                                                         | Same; selected and disabled reads both states.                                                                             |

The trigger's text content is its value as announced by screen readers: the
value text below when something is selected, otherwise the placeholder. The
accessible name still comes from the Field label or `aria-label`, never from
the value.

#### Keyboard

Trigger keys are unchanged. Listbox keys in multiple mode:

| Key                                         | Where            | Single mode (published, regression-tested)             | Multiple mode (proposed)                                                                                                    |
| ------------------------------------------- | ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `Enter` / `Space` / `ArrowDown` / `ArrowUp` | Trigger (closed) | Opens; focus to selected or first/last enabled option. | Same. Focus goes to the first selected enabled option in rendered order, else first (or last for `ArrowUp`) enabled option. |
| `Space`                                     | Focused option   | Selects, closes, focuses trigger.                      | Toggles the option. List stays open; focus stays on the option.                                                             |
| `Enter`                                     | Focused option   | Selects, closes, focuses trigger.                      | Toggles, like `Space` (S3).                                                                                                 |
| Arrow keys / `Home` / `End`                 | Listbox          | Moves focus among enabled options.                     | Same; never changes selection.                                                                                              |
| Printable keys                              | Listbox          | Typeahead moves focus.                                 | Same; never changes selection.                                                                                              |
| `Escape`                                    | Listbox          | Closes; focus to trigger.                              | Same. Selection made while open is kept.                                                                                    |
| `Tab` / `Shift+Tab`                         | Listbox          | Closes; default tab navigation.                        | Same.                                                                                                                       |

IME-owned keys (`isComposing`, `keyCode` 229) are ignored exactly as in single
mode, including the toggle keys. `Space` and `Enter` on a toggle call
`preventDefault` so the page does not scroll and the native button trigger is
not re-activated.

#### Pointer, open, and close

- Clicking an enabled option toggles it, keeps the list open, and moves focus
  to that option so keyboard use continues from there.
- Clicking the trigger while open closes the list and keeps focus on the
  trigger. An outside pointer closes without restoring focus, as in single
  mode. Neither changes the selection.
- Controlled `open` stays parent-owned; toggling never emits `update:open`.

#### Assistive technology expectations

`aria-multiselectable` makes screen readers announce a multi-select list on
entry. Toggling changes `aria-selected` on the focused option, which NVDA and
VoiceOver announce as "selected" / "not selected", so no live region is added.
On close, focus returns to the trigger and its text reads the new value list.
AT verification (NVDA + Firefox, VoiceOver + Safari) follows the existing
assistive-technology review before the manifest can move to `stable`.

### Value and placeholder rendering

| Model                                      | Default `GhostSelectValue` text (S4)        | `data-state` on value part |
| ------------------------------------------ | ------------------------------------------- | -------------------------- |
| `[]`                                       | `placeholder` slot, else root `placeholder` | none                       |
| `['bug']`                                  | `Bug`                                       | `checked`                  |
| `['docs', 'bug']`                          | `Docs, Bug` (model order, `listSeparator`)  | `checked`                  |
| `['bug', 'gone']`, `gone` never registered | `Bug, gone` (raw value fallback)            | `checked`                  |

The default text is plain text, so long lists are truncated by consumer or
themed CSS (the themed trigger already ends long text with an ellipsis). The
scoped default slot covers summaries such as "3 labels" or chips that are not
interactive. Interactive chips with remove buttons inside the trigger are out
of scope because the trigger is a `button`.

### Native forms, reset, and disabled

With `name` set, multiple mode renders one visually hidden
`input[type="text"]` per distinct member, in model order, all sharing `name`
and `form`. Values containing commas therefore need no encoding (the same rule
as `GhostCombobox` `multiple`).

```vue
<form ref="form">
  <GhostSelect multiple name="labels" :default-value="['bug', 'docs']">
    …options: bug, docs, triage…
  </GhostSelect>
  <GhostSelect name="region" default-value="us-east">…</GhostSelect>
</form>
```

```ts
new FormData(form).getAll('labels') // ['bug', 'docs']
// User toggles "Needs triage" on, then "Bug" off.
new FormData(form).getAll('labels') // ['docs', 'triage']
// User toggles every option off.
new FormData(form).getAll('labels') // []
form.reset() // update:modelValue(['bug', 'docs']), a new array
new FormData(form).getAll('labels') // ['bug', 'docs']

// Scalar select in the same form (published behavior, unchanged):
new FormData(form).getAll('region') // ['us-east']; [''] when nothing is selected
```

- **Empty.** An empty multiple select submits nothing, so `getAll(name)` is
  `[]`, as with native `<select multiple>`. This differs from
  `GhostCombobox` `multiple`, which submits one empty mirror (`['']`); the
  combobox is not changed by this proposal.
- **Required.** When `required` and empty, one mirror without `name` carries
  `required` and the custom validity message, so it blocks submit and focuses
  the trigger without adding a FormData entry. With members, the first mirror
  carries `required`. `messages.required` applies in both cases.
- **Reset.** Native form reset restores a copy of the current `defaultValue`
  (or `[]`) and emits `update:modelValue` only when membership or order
  differs from the current value, matching single mode's no-op on an equal
  value.
- **Root `disabled`.** Every mirror is disabled: `getAll(name)` is `[]`, the
  value text still renders.
- **`<fieldset disabled>` ancestor.** Native rules exclude the mirrors from
  submission and disable the native `button` trigger, the same as single mode.
- **Disabled selected option.** Keeps submitting (S5).

### Environment behavior (multiple)

SSR renders the trigger with the value text for the members whose options are
registered during render, `aria-multiselectable` on the closed listbox, and
one mirror per member when `name` is set, so the server markup submits the
same entries as the hydrated control. Hydration must not emit. Touch uses the
same pointer path as click; options keep the themed minimum block size.

### Performance

Membership checks read a `Set` derived from the model once per model change,
so `isSelected` stays O(1) per option and a toggle costs O(_n_) in the number
of members (one new array). The registry and its O(1) bookkeeping are
unchanged. The `pnpm bench:registry` benchmark gains a multiple-mode case with
3000 options and 500 members.

### Composition

Reuses everything single mode uses (`useControllableState`, `useGhostId`,
`useNativeFormReset`, `useFloating`, `GhostPortal`, `useDismissableLayer`,
`useFocusScope`, `useRovingFocus`, the typeahead helper) plus:

- The multiple-mirror pattern from `useGhostCombobox`, changed so the empty
  required mirror has no `name`.
- The generic setup overload pattern from the themed `GhostDataTable`
  wrapper for the themed `GhostSelect` (S6). Its runtime `update:modelValue`
  validator must also accept `string[]`.

No new package, dependency, or shared primitive.

### Multiple selection test plan

- **Vue unit tests (multiple):** toggle on and off by click, `Space`, and
  `Enter`; list stays open and focus stays on the option; selection order
  (append, remove in place, reselect appends); emitted arrays are new and
  duplicate-free; a frozen controlled array is never mutated; controlled
  parent rejecting a toggle keeps `aria-selected` on its value; duplicates in
  a controlled model read as one member without an emit; `[]` vs `undefined`;
  `defaultValue` copied at setup and reset; reset emits only when different;
  options unmounting, reordering, inserting, and remounting keep model, value
  text, and FormData without emits; focused option unmount moves focus (S3);
  disabled selected option stays selected and submits (S5); root `disabled`;
  `required` with the unnamed empty mirror; IME keys ignored for toggles;
  `GhostSelectValue` slot props and `listSeparator`.
- **Single-select regressions (must pass unchanged):** every existing
  `GhostSelect.test.ts`, `select-combobox-*.test.ts`, and `ghost-select*.test.ts`
  case; plus explicit assertions that single `Space` / `Enter` still select,
  close, and focus the trigger; the listbox has no `aria-multiselectable`;
  unselected options keep `aria-selected="false"`; empty single still submits
  `['']`; `GhostSelectValue` default slot without props renders unchanged.
- **Type tests:** new `packages/vue/type-tests/GhostSelectConsumer.ts` and
  `.vue` covering every row of the [type inference](#type-inference) table,
  and `packages/vue/type-tests-negative` cases for each rejected form. The
  single-mode cases (`v-model` with `Ref<string | undefined>`,
  `default-value="…"`, `update:modelValue` payload `string | undefined`) are
  the regression fixture for existing consumers. Same cases against the
  `@ghostvue/themes` wrapper.
- **SSR:** closed multiple select renders value text, `aria-multiselectable`,
  and one mirror per member; hydration emits nothing.
- **Browser (Playwright):** in a multiple playground section, press every
  documented key and assert real focus (`toBeFocused()`), `aria-selected`,
  `aria-expanded`, and that the list stays open after toggles; pointer
  toggles; `FormData.getAll(name)` after toggles, after clearing, and after
  `form.reset()`; axe with the list open and closed. The existing
  `tests/e2e/select.spec.ts` single-select tests run unchanged as the keyboard
  regression suite.
- **Visual:** themed multiple trigger with zero, one, and many values (long
  list ellipsis) via `pnpm test:visual:docker`.
- **Manual / AT:** NVDA + Firefox and VoiceOver + Safari announce the
  multi-select list, "selected" / "not selected" on toggle, and the value list
  on the trigger after close.

### Multiple selection documentation plan

- `docs/components/select.md`: a "Multiple selection" section with a themed
  example (`examples/select/multiple-labels.vue`) and a form example showing
  `FormData.getAll` and reset (`examples/select/multiple-form.vue`), both
  listed in the manifest.
- Guidance on choosing between multiple `GhostSelect`, `GhostCombobox`
  `multiple`, and `GhostCheckboxGroup`.
- Generated API tables via `pnpm manifests:write` and `pnpm docs:api:write`
  (`multiple` prop, `GhostSelectValue` slot props, emit payload).
- Playground section with test ids for the browser tests.

### Multiple selection compatibility

- **Additive at runtime.** `multiple` defaults to `false`; single-mode props,
  emits, keyboard behavior, FormData, and markup do not change.
- **Exported types (S6).** `GhostSelect` becomes generic with
  `Multiple = false` as the default, so existing single consumers infer the
  same types; the type regression fixture proves it. `GhostSelectMessages`
  gains an optional field. `GhostSelectContext.selectedValue` widening is a
  type-level change for consumers who read the context directly; S6 decides
  whether that is acceptable for `0.2.0` or a separate field is used.
- **Themed wrapper.** Gains `multiple` and the generic overload; its emit
  validator widens.
- **Changesets.** Minor for `@ghostvue/vue` and `@ghostvue/themes` in the
  implementation PR. This docs-only spec PR needs none.

## Open architectural questions

The single-value contract has no blocking questions. The draft multiple mode
needs a maintainer decision on each item below before implementation starts.
Each entry gives the proposal this spec is written against and the alternative.
They are recorded with `blocking: false` in frontmatter so `pnpm specs:check`
keeps validating the published single-value contract; they still block the
multiple-mode implementation.

| ID  | Question                        | Proposal in this spec                                                                                                                                                                                                                               | Alternative                                                                                                                   |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| S1  | API shape                       | `multiple` boolean on the existing `GhostSelect` root. The root becomes generic over `Multiple extends boolean = false`, so the flag selects the model type.                                                                                        | A separate `GhostMultiSelect` root that shares the parts. Simpler types, but a second root to document and theme.             |
| S2  | Value order                     | Selection order. Selecting appends; deselecting removes in place. FormData uses the same order. Matches `GhostCombobox` `multiple` and Vue's checkbox array `v-model`.                                                                              | Rendered option order, like native `<select multiple>` and Vue's `vModelSelect`. Order then changes when options reorder.     |
| S3  | Keyboard and focus              | `Enter` and `Space` both toggle the focused option and keep the list open. `Shift+Arrow`, `Shift+Space`, and `Ctrl+A` are not handled. If the focused option unmounts, focus moves to the next enabled option, then the previous, then the listbox. | `Enter` closes the list instead of toggling, or v1 adds the APG range and select-all keys.                                    |
| S4  | Value rendering                 | `GhostSelectValue` joins option labels in model order with `', '` (`messages.listSeparator` overrides it). New scoped slot props `{ values, labels }` cover custom summaries.                                                                       | A count summary such as "3 selected", with a `messages.selectedCount` callback.                                               |
| S5  | Disabled selected options       | A selected option that is `disabled` stays selected and keeps submitting. `disabled` blocks user toggling only, as it already does in single mode and in `GhostCombobox`.                                                                           | Exclude it from FormData, like a disabled native `<option>`. The model and the submitted values would then differ.            |
| S6  | Exported type surface           | Generic `useGhostSelect<Multiple>` and `GhostSelect` props. `GhostSelectContext` widens `selectedValue` to `string \| string[] \| undefined` and adds `multiple` and `selectedValues`. The themed root gets a generic setup overload.               | Keep `GhostSelectContext.selectedValue` single-only and add a separate `selectedValues` field, at the cost of two value refs. |
| S7  | Changing `multiple` after mount | Unsupported. The value keeps its original shape, and development builds log a new `GHOST0xx` warning (code assigned at implementation).                                                                                                             | Reactive switching that converts `'a'` to `['a']` and keeps the first member on the way back, with an emit.                   |
