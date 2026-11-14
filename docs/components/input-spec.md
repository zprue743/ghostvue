# GhostInput specification

**Status:** Proposed for GHO-70. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostInput` is the foundational single-line text control. It keeps native
`<input>` and form behavior while standardizing controlled Vue model updates
and the disabled, readonly, invalid, and required states.

The immediate consumers are DataTable surfaces: global search, column filters,
and editable text values. The same primitive covers ordinary form fields once
`GhostField` (GHO-71) exists. Until then, consumers wire labels and
descriptions with native `id` / `aria-*` fallthrough.

## Non-goals

- It is not a multiline editor. `GhostTextarea` (GHO-87) is a separate
  primitive. This component always renders `<input>` and does not share a
  form-control abstraction with Textarea.
- It is not checkbox, radio, file, hidden, button, submit, reset, image,
  color, or range. Those are not text-like types.
- It is not `GhostNumberInput` (GHO-89). Native `type="number"` steppers,
  clamping, and parsing belong there.
- It is not a date, time, month, or week picker. Those widgets belong to later
  date primitives.
- It is not `GhostField` (GHO-71). This component does not render a label,
  description, or error message, and it does not generate ids. Field will
  compose with native `id`, `aria-labelledby`, `aria-describedby`, and
  `aria-invalid` fallthrough.
- It is not an input group. Prefix/suffix addons, clear buttons, and inline
  icons are out of scope. Decorative content is not slotted into a replaced
  element.
- The unstyled component ships no visual styles. Size, tone, and chrome belong
  to the consumer or the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostInput` / `useGhostInput`:

| Prop           | Type             | Default  | Contract                                                                                                                              |
| -------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `string`         | omitted  | Controlled value. `undefined` is uncontrolled; `''` is a real empty value.                                                            |
| `defaultValue` | `string`         | `''`     | Initial uncontrolled value only. Later changes are ignored, matching `useControllableState`.                                          |
| `type`         | `GhostInputType` | `'text'` | Native text-like input type.                                                                                                          |
| `disabled`     | `boolean`        | `false`  | Native disabled: not focusable, not editable, omitted from form submit.                                                               |
| `readonly`     | `boolean`        | `false`  | Native readonly: focusable and submitted, not editable.                                                                               |
| `invalid`      | `boolean`        | `false`  | Consumer-owned validity. Sets `aria-invalid="true"` and `data-state="invalid"`. Does not run or replace native constraint validation. |
| `required`     | `boolean`        | `false`  | Native required constraint.                                                                                                           |

```ts
type GhostInputType = 'text' | 'search' | 'email' | 'password' | 'tel' | 'url'
```

The union is closed on the HTML text-like types that remain ordinary typed
entry. Widening later is additive; narrowing is not. `number` is deferred to
`GhostNumberInput`. Checkbox, radio, file, and other non-text types are
rejected rather than forwarded: a mistaken `type` must not silently become a
different widget.

Named ESM exports: `GhostInput`, `useGhostInput`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled
`<input>` that spreads `rootProps`.

Native attributes and event listeners fall through to that single root. That
fallthrough, not dedicated props, is how consumers attach `id`, `name`,
`placeholder`, `autocomplete`, `maxlength`, `pattern`, `inputmode`,
`aria-label`, `aria-labelledby`, `aria-describedby`, and anything else a
future Field or a native `<label for>` needs. The component owns `type`,
`value`, `disabled`, `readonly`, `required`, and `aria-invalid`. Do not
redeclare `aria-*` as camelCase props. Do not pass a native `value` attribute
to set the current text; use `v-model` / `modelValue` or `defaultValue`.

`useGhostId` is unused: the component does not generate ids. Label
association stays native so Field can own id wiring later.

Themed `@ghostvue/themes` `GhostInput` wraps the unstyled component and adds
visual props. Same behavioral props; these exist only on the themed wrapper:

| Prop    | Type                   | Default | Contract                                                                          |
| ------- | ---------------------- | ------- | --------------------------------------------------------------------------------- |
| `size`  | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control size. The default omits `data-size` so CSS treats a missing hook as `md`. |
| `block` | `boolean`              | `false` | Stretch to the available inline size via `data-block`.                            |

Importing the themed component loads the default stylesheet and wraps the
instance in `.ghost-themed-scope` so recipe CSS applies without forcing every
`.ghost-input` on the page.

### v-model contracts

`v-model` binds `modelValue` as a `string` and emits `update:modelValue` with
the next string. Control follows
[component-state.md](../architecture/component-state.md): **`modelValue` is
defined**. `undefined` is uncontrolled. `''` is a controlled empty field.
`null` is not part of this contract; the value type is `string`.

`useControllableState` is the write path:

1. Skip when `Object.is(current, next)` — no double-emit.
2. Uncontrolled: write local state immediately.
3. Emit `update:modelValue` synchronously, like `defineModel`.

Update timing is the native `input` event, matching Vue's native `v-model` on
`<input>`. There is no `change`-only model and no `lazy` modifier. Consumers
who need blur-committed values listen to native `@change`.

Do not restore the DOM synchronously in the input handler: `modelValue` still
holds the previous string until the parent re-renders, so a same-turn write
resets the caret to the end. If the parent ignores the emit, restore on
`nextTick` only when the DOM still differs, and preserve `selectionStart` /
`selectionEnd`.

`defaultValue` seeds uncontrolled state at setup. Later `defaultValue`
changes are ignored. Switching controlled ↔ uncontrolled after setup is
unsupported; development reports GHOST001 and keeps the last rendered value.

**Reset baseline (GhostVue policy).** `defaultValue` establishes GhostVue's
reset baseline, captured once at mount; later `defaultValue` changes are
ignored. `modelValue` controls the current value. This is not native reset
semantics: [native `form.reset()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset)
restores from the control's current default content/attributes. The library
pins the baseline at mount so uncontrolled instances stay predictable. When a
control first represents record A and later record B without remounting, the
reset baseline still belongs to A — apps should drive the baseline through
controlled state or remount the control (for example `:key`).

**Form reset reconciliation.** An owner or associated `<form>` `reset` asks
parents to adopt the captured baseline: emit `update:modelValue` with that
seed (skip when `Object.is` with the current value — no redundant emit).
**Uncontrolled:** write local state and sync the native control when needed.
**Controlled:** the parent stays authoritative; if it ignores the emit, restore
the DOM on `nextTick` to match the parent. The reset request is always the
captured `defaultValue`, not the displayed `modelValue` (for example
controlled `'Alice'` with omitted `defaultValue` requests `''`).

Reconciliation runs in a microtask after the `reset` event has fully
dispatched so `defaultPrevented` is final (including `document` and `window`
listeners registered later). A canceled reset is a no-op: no emit and no model
or DOM write. The root `defaultValue` attribute mirrors the captured baseline
for native participation, not a live prop.

### Events, callbacks, slots, and exposed methods

No slots. Native `<input>` is a replaced element and cannot host prefix or
suffix structure.

No component-specific events besides `update:modelValue`. Native listeners
such as `@input`, `@change`, `@focus`, and `@blur` attach to the input and
receive native events. The composable's `input` listener updates the model
and does not call `stopPropagation` or `preventDefault`, so consumer
listeners still run.

A component template ref exposes:

- `element: HTMLInputElement | null`
- `focus(options?: FocusOptions): void`
- `blur(): void`

The methods are no-ops before mount or after unmount. Consumers that need
`select()`, `setSelectionRange()`, or `setRangeText()` use `element`.
Consumers should not depend on any markup beyond the root input (the themed
wrapper's extra span is not a public layout surface).

## State model

The component has value state plus configuration flags. Value is owned either
by the parent (`modelValue`) or by the composable (`defaultValue` plus
typing). `disabled`, `readonly`, `invalid`, and `required` are
consumer-owned props and may change independently.

### Loading, empty, disabled, read-only, and error states

There is no loading state. Pending search or filter work belongs to the
consumer (for example a DataTable), not the text field.

An empty string is a valid value, not an empty-state UI.

Disabled sets the native `disabled` attribute: the field is not editable, is
removed from sequential focus, and is omitted from form submission.

Readonly sets the native `readonly` attribute: the field remains focusable
and is submitted, but the user cannot edit it. Selection and copy stay
native.

When disabled and readonly overlap, both attributes may be present. Native
disabled wins for focus and submit. `data-state` uses the precedence below.

Invalid is consumer-owned, not a mirror of `ValidityState`. Native
`required` / `pattern` / `maxlength` still participate in constraint
validation on submit. This component does not set `aria-invalid` from native
validity on its own — Field can own that later. `invalid` sets
`aria-invalid="true"` and is omitted when false (do not write
`aria-invalid="false"`).

Required sets the native `required` attribute. It is not a `data-state`.
Required-but-empty is not announced as invalid until the consumer sets
`invalid` or native constraint validation runs.

`data-state` is a single styling hook with documented precedence, matching
`GhostButton`'s one-state model:

1. `invalid` — validity is the strongest visual cue; native `disabled` /
   `readonly` already cover unavailability.
2. `disabled`
3. `readonly`
4. omitted

### Async behavior

The component performs no asynchronous work. It does not debounce, cancel, or
announce search results. DataTable and Field own races, errors, and live
regions.

## Consumer data

The model is a `string`. The component does not parse, trim, coerce, or
mutate caller-owned objects. It never writes back to a consumer object
identity; assignment goes through `update:modelValue`.

## Accessibility contract

### Semantics and relationships

The root is always a native `<input>` with a text-like `type`. The component
adds no `role`. Assistive technology encounters the native textbox.

Accessible name is **not** provided by this component. Consumers must supply
one through a native `<label for>`, wrapping `<label>`, `aria-label`, or
`aria-labelledby`. Icon-only or placeholder-only naming is insufficient
(WCAG 3.3.2). `GhostField` will be the ordinary labeled wrapper; until it
exists, fallthrough is the wiring.

Descriptions and errors attach through `aria-describedby` fallthrough. This
component does not render hint or error text.

`disabled` uses native semantics. `readonly` uses native semantics.
`required` uses native semantics. `invalid` exposes `aria-invalid="true"`.

### Keyboard interaction

The component adds no key handling and intercepts no keys. Enabled and
readonly fields use native platform behavior: `Tab` / `Shift+Tab` move
focus; printable keys, `Backspace`, `Delete`, arrows, `Home`, `End`, and
platform editing chords insert or move the caret; `Enter` may submit an
ancestor form for `type="text"` and `type="search"` per browser rules.
Disabled fields are not in sequential tab order and cannot be edited.
Readonly fields accept focus and selection keys but not edits.

### Focus behavior

Enabled and readonly inputs participate in the document's native tab order
and use consumer-supplied (or themed) focus styling. Disabled inputs do not
receive sequential focus. The exposed methods delegate to the native element
and do not restore or trap focus. Autofocus is native fallthrough.

### Assistive technology expectations

Assistive technology encounters an ordinary named textbox. Invalid is
conveyed with `aria-invalid`. Required and disabled are native. The
component does not use a live region; error text and its announcement belong
to Field or the consuming form.

Automated checks cannot establish that a given instance is labeled. Examples
and the playground must include visible labels so axe is an honest baseline,
not a silenced one.

## Rendering and customization

Attribute fallthrough, `v-model`, and the native `type` are the
customization API for the unstyled component. It ships no wrapper or visual
styles.

Stable styling hooks follow ADR 0004 and the existing `data-*` configuration
used by `GhostButton`. They are not a new styling-hooks contract (GHO-38
remains undecided):

- class `ghost-input`
- `data-part="root"`
- `data-state="invalid"` | `"disabled"` | `"readonly"` as specified above

Consumers may also set `data-size` and `data-block` on the unstyled input
when they style it themselves. The themed wrapper sets those from visual
props. Defaults omit the attribute so CSS can treat a missing hook as the
default.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostInput` on the same page stays unstyled when the stylesheet is
loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

Themed visual values use existing semantic tokens only. There are no
per-component tokens:

- fill `--ghost-surface-bg`, text `--ghost-text-default`, placeholder
  `--ghost-text-muted`
- border `--ghost-border-default`; hover `--ghost-border-strong`
- radius `--ghost-action-radius`; control sizes `--ghost-control-size-*`
- type `--ghost-type-family-sans`, `--ghost-type-weight-regular`,
  `--ghost-type-letter-normal`, `--ghost-control-size-*-font`
- invalid `--ghost-border-danger` and `--ghost-status-danger-bg`
- disabled `--ghost-action-disabled-*`
- readonly fill `--ghost-surface-muted-bg`
- focus `--ghost-focus-ring-*`

Forced colors map the field to `Field` / `FieldText` / `GrayText`. Native UA
search decorations remain native.

## Environment behavior

### SSR and hydration

Rendering is deterministic from props and the current model string. Setup
reads no browser globals. The exposed element is `null` until mount. Form
reset listening uses a bubble-phase document `reset` listener filtered by
`element.form`, reconciling in a microtask after dispatch; it attaches on
mount and is removed on unmount; server markup
does not depend on it.

### Mobile and touch

Native virtual-keyboard behavior follows `type` and fallthrough
`inputmode` / `autocomplete`. The themed wrapper provides minimum control
sizes from density tokens, including the coarse-pointer floor. Applications
remain responsible for adequate targets in their full interface.

## Performance

Rendering and state derivation are constant-time. The component creates no
global listeners. The only optional listener is `reset` on the owner form,
cleaned up on unmount.

## Composition

`useGhostInput` owns type, model, disabled/readonly/invalid/required, and
`data-part` / `data-state` bindings. Unstyled `GhostInput` spreads those onto
a native `<input>`. Themed `GhostInput` wraps that component. Behavior stays
in `packages/vue` because its component, attribute-fallthrough, v-model, and
template ref contracts are Vue-specific. No framework-neutral core
abstraction is needed, and none is shared with Textarea.

The machine-readable contracts are
`packages/vue/manifests/ghost-input.manifest.json` and
`packages/themes/manifests/ghost-input.manifest.json`.

## Test plan

- Vue tests cover defaults (`type="text"`, empty value), uncontrolled
  `defaultValue`, controlled `v-model` (including `''` and caret position
  when inserting mid-value), ignored later `defaultValue` changes, disabled
  / readonly / invalid / required attributes, `data-state` precedence, typed
  fallthrough attributes and native listeners, each `GhostInputType` member,
  exposed refs, form submit of a named enabled field, uncontrolled form
  reset, SSR markup, and `ghost-input` / `data-part` / `data-state`.
- Composable tests cover the same state matrix and `input`-event writes that
  skip when disabled or readonly.
- Compile-time tests cover native attribute types on `GhostInputProps` (with
  `value` omitted in favor of `modelValue`) and the exposed ref contract.
- Browser tests cover typing into labeled fields, keyboard tab order for
  enabled vs disabled vs readonly, `aria-invalid` on invalid, form submit,
  themed sizes, and an axe scan of pages that use the component. Examples
  must be labeled so axe can fail if a name is missing.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite.

## Documentation plan

Publish `docs/components/input.md` with an API reference, a minimal labeled
example, the composable path, themed sizes, disabled/readonly/invalid/required,
`type="search"` for DataTable-style filtering, ref usage, styling hooks, and
accessibility / SSR guidance including that Field is not required and that
placeholder is not a label. Mirror the same examples in the playground
gallery.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the behavioral props, `useGhostInput`,
`modelValue` / `defaultValue` timing, single-root attribute fallthrough, the
`GhostInputType` union, exposed refs, `ghost-input` / `data-part` /
`data-state`, and the themed visual props plus CSS custom properties.

Future changes to event timing, native semantics, the type union, exposed
refs, `aria-invalid`, or styling hooks require compatibility review.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This component uses the existing `data-part` /
  `data-state` configuration attributes. It does not introduce a parallel
  hooks contract.
- **GhostField (GHO-71).** Deferred. Id and ARIA fallthrough are the
  integration surface.
- **GhostTextarea (GHO-87).** Built in parallel. No shared form-control
  helper is introduced here.
- **GhostNumberInput (GHO-89).** Native `type="number"` is out of this
  union.
