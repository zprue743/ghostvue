# GhostCheckbox specification

**Status:** Proposed for GHO-74. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostCheckbox` is a binary (and optionally mixed) choice control. It is the
row-selection and select-all primitive DataTable will compose, and the ordinary
form checkbox for settings, filters, and consent.

Sighted users see checked, unchecked, or mixed. Assistive technology encounters
a native checkbox with those same states. Keyboard, focus, form submission,
label association, and disabled behavior stay native.

The immediate consumers are a single labeled checkbox, an unlabeled checkbox
named with `aria-label` (row selection), and a parent checkbox whose mixed
state the consumer computes from children (select-all). DataTable-specific
selection orchestration stays with DataTable.

## Non-goals

- It is not a switch. `GhostSwitch` (GHO-31) is a separate binary control with
  its own APG pattern. This component does not share a toggle primitive, a
  base checkbox, or a `useGhostToggle` helper with Switch.
- It is not Field. `GhostField` (GHO-71) will own label, description, error,
  and control id wiring. Until Field exists, consumers use a native `<label>`
  (wrapping or `for`/`id`) and native `aria-*` fallthrough.
- It does not orchestrate multi-row selection, select-all, or "some selected"
  derivation. Those are DataTable responsibilities. This component only
  renders and emits a single control's checked and mixed states.
- It does not implement a checkbox group, array `v-model`, or `true-value` /
  `false-value`. Vue's native checkbox-group pattern is out of scope; each
  instance is one boolean.
- It is not a tri-state machine that cycles mixed → checked → unchecked on
  its own. Mixed is a consumer-owned display state. Activation always yields a
  boolean `checked` following native HTML.
- The unstyled component ships no visual styles. Size, tone, checkmark, and
  target sizing belong to the consumer or the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostCheckbox` / `useGhostCheckbox`:

| Prop            | Type      | Default     | Contract                                                                                                                                                         |
| --------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`    | `boolean` | `undefined` | Controlled checked state. `undefined` is uncontrolled; `false` is a defined unchecked value. Never `'indeterminate'`.                                            |
| `defaultValue`  | `boolean` | `false`     | Initial unchecked/checked value when `modelValue` is `undefined`. Later changes are ignored.                                                                     |
| `indeterminate` | `boolean` | `false`     | Mixed visual and AT state. Consumer-owned; not part of the v-model. Applied through the DOM `indeterminate` property, which HTML cannot express as an attribute. |
| `disabled`      | `boolean` | `false`     | Native disabled semantics: no activation, no sequential focus, excluded from submission.                                                                         |

```ts
type GhostCheckboxState = 'checked' | 'indeterminate' | undefined
```

`type` is always `"checkbox"`. It is not a prop. `checked` is not a prop or
fallthrough attribute: the model owns that state, so a competing `checked`
attribute cannot fight `:checked`. Native input attributes otherwise included
in the public type (`name`, `value`, `form`, `required`, `autofocus`, `id`,
`aria-*`, event listeners) fall through to the root `<input>`.

Named ESM exports: `GhostCheckbox`, `useGhostCheckbox`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled
`<input type="checkbox">` that spreads `rootProps`.

`useControllableState` owns `modelValue` / `defaultValue` per
[component-state.md](../architecture/component-state.md). `useGhostId` is
unused: Field is not built, and generating an id the consumer cannot see
would not help wrapping labels. Pass `id` as a native attribute when a
`for` association needs it.

Themed `@ghostvue/themes` `GhostCheckbox` wraps the unstyled component and
adds visual props. Same behavioral props and v-model; these exist only on
the themed wrapper:

| Prop   | Type                                | Default    | Contract                                                                   |
| ------ | ----------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Control size. Maps to existing `data-size` used by `GhostButton`.          |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color intent. Maps to existing `data-tone` used by `GhostButton`. |

The themed wrapper sets matching `data-size` and `data-tone` on the inner
input. Defaults omit the attribute so CSS can treat a missing hook as the
default. It also wraps the input in `.ghost-themed-scope` (`display: contents`)
so default CSS can style that instance without forcing every `.ghost-checkbox`
on the page.

### Why a native checkbox, not `role="checkbox"`

The APG [Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
documents both a native `<input type="checkbox">` and an ARIA `role="checkbox"`
widget. This component uses the native element:

- **Keyboard.** `Space` toggles. `Enter` does not (it submits a form). A
  `role="checkbox"` host would have to reimplement that and keep it from
  colliding with buttons.
- **Forms.** `name`, `value`, `checked`, `required`, and `form` already
  participate in native submission. Mixed state is not submitted; the
  `checked` boolean is. A `div` would need a hidden input or Form-Associated
  Custom Element to match.
- **Labels.** Wrapping `<label>` and `for`/`id` already name the control.
  `role="checkbox"` needs an explicit accessible name and `tabindex`.
- **Disabled.** Native `disabled` removes sequential focus and activation.
  ARIA `aria-disabled` would keep the widget focusable unless we also
  manage `tabindex`.
- **Mixed.** The DOM `indeterminate` property is what browsers and AT already
  map to mixed. `aria-checked="mixed"` on a native checkbox is ignored
  ([ARIA in HTML](https://www.w3.org/TR/html-aria/)); on a `role="checkbox"`
  host it would be required.

A custom `role="checkbox"` is justified when the visual cannot be an `<input>`.
The themed recipe styles the native input with `appearance: none` and
pseudo-elements, so that exception does not apply.

### v-model contracts

| Role    | Prop         | Emit                | Uncontrolled initial |
| ------- | ------------ | ------------------- | -------------------- |
| Checked | `modelValue` | `update:modelValue` | `defaultValue`       |

The value is always `boolean`. Mixed is not a third model value.

- **Uncontrolled:** `modelValue` is `undefined`. The composable seeds from
  `defaultValue` (default `false`) and writes local state on activation.
- **Controlled:** `modelValue` is `true` or `false`. Activation emits
  `update:modelValue` with the native post-click `checked`. If the parent
  ignores the emit, the getter still returns the prop and `:checked`
  restores the DOM. Same timing as `useControllableState` / `defineModel`:
  skip when `Object.is(current, next)`, write local state only when
  uncontrolled, emit before the setter returns.
- **Switching** controlled ↔ uncontrolled after setup is unsupported
  ([GHOST001](../warnings.md#ghost001)).

`indeterminate` is not a v-model. The parent that computes mixed (select-all)
passes it as a prop and recomputes it when selection changes. Native click
clears the DOM property; if the prop is still `true`, the component writes
it back after render so controlled mixed does not flash off unless the
parent updates.

Activation from mixed follows native HTML: the browser toggles `checked`
from its current boolean (usually `false` when mixed) and sets
`indeterminate` to `false` in the DOM. The emit is that new boolean. Typical
select-all therefore starts mixed with `modelValue === false` and becomes
checked (`true`) on click. If a consumer sets both `modelValue` and
`indeterminate` true, native click unchecks. That is native behavior, not a
library cycle.

**Reset baseline and form reset** follow the same GhostVue policy as
[GhostInput](./input-spec.md#v-model-contracts): captured `defaultValue`
baseline (not live native defaults), reset requests that baseline rather than
the displayed `modelValue`, parent authority with deferred DOM restore
(including `indeterminate` when applicable), microtask after full `reset`
dispatch, and no-op on late cancel.

### Events, callbacks, slots, and exposed methods

No default slot: native `<input>` is void. Labels wrap the component or use
`for`/`id`. No named slots. No component-specific events other than
`update:modelValue`; native listeners such as `@change` and `@click` attach
to the input and receive the native event.

A component template ref exposes:

- `element: HTMLInputElement | null`
- `focus(options?: FocusOptions): void`
- `blur(): void`

The methods are no-ops before mount or after unmount. Consumers should not
depend on any markup beyond the root input (the themed wrapper's extra span
is not a public layout surface).

## State model

Three check states plus disabled:

| `indeterminate` | `checked` (`modelValue` / internal) | `data-state`    | Native DOM                                     |
| --------------- | ----------------------------------- | --------------- | ---------------------------------------------- |
| `false`         | `false`                             | omitted         | `checked === false`, `indeterminate === false` |
| `false`         | `true`                              | `checked`       | `checked === true`, `indeterminate === false`  |
| `true`          | `true` or `false`                   | `indeterminate` | `indeterminate === true` (visual mixed wins)   |

Disabled is the native attribute. It composes with any check state.
`data-state` reports the check triad only; native `disabled` is already
sufficient for unavailability (ADR 0004). Mixed wins `data-state` over
checked because that is what AT and the visual communicate.

### Loading, empty, disabled, read-only, and error states

Disabled uses native `disabled`. There is no loading, read-only, or error
state. Native checkbox `readonly` does not prevent toggling in browsers;
inventing a library read-only would be a new contract. Validation
presentation belongs to Field.

An unlabeled checkbox is permitted only when `aria-label`,
`aria-labelledby`, or a wrapping / `for` label gives it an accessible name.
Empty is otherwise a name failure, not a component state.

### Async behavior

The component performs no asynchronous work. Mixed and checked are
synchronous consumer state.

## Consumer data

The component accepts no collection, no row objects, and no selection
adapter. It does not mutate consumer-owned arrays or row records. The parent
writes its own model when it handles `update:modelValue`.

## Accessibility contract

### Semantics and relationships

The root is always a native `<input type="checkbox">`. It has implicit
`role="checkbox"`. The component never sets `role` or `aria-checked`:
native `checked` and `indeterminate` already expose checked / mixed, and
`aria-checked` on this element is not used ([ARIA in HTML](https://www.w3.org/TR/html-aria/)).

Accessible name comes from:

- a wrapping `<label>`
- `<label for>` matching a fallthrough `id`
- `aria-label` or `aria-labelledby` fallthrough

`GhostField` is not required. `aria-describedby` and other ARIA fall
through for descriptions and errors until Field exists.

Disabled uses native `disabled`, not `aria-disabled`. Mixed is the DOM
property, not `aria-checked="mixed"`.

### Keyboard interaction

Enabled checkboxes use native platform behavior:

| Key     | Behavior                                                              |
| ------- | --------------------------------------------------------------------- |
| `Space` | Toggle checked. Follows the native mixed rule above.                  |
| `Enter` | Does not toggle. In a form, submits (platform / user-agent behavior). |

Disabled checkboxes cannot be activated and are not in sequential tab
order. The component does not listen for keys; it does not reimplement
`Space`.

### Focus behavior

Enabled checkboxes participate in the document's native tab order and use
consumer-supplied (or themed) focus styling. Disabled checkboxes do not
receive sequential focus. The exposed methods delegate to the native
element and do not restore or trap focus. There is no roving tabindex;
a select-all plus row checkboxes are sibling tab stops unless a parent
widget (DataTable) introduces one later.

### Assistive technology expectations

Assistive technology encounters an ordinary named checkbox. Mixed is
announced as mixed / indeterminate from the DOM property after mount.
The component does not use a live region; selection-count announcements
belong to DataTable.

## Rendering and customization

Attribute fallthrough is the customization API for the unstyled component.
It renders exactly one native `<input>` and no wrappers.

Stable styling hooks follow ADR 0004 and the existing `data-part` /
`data-state` vocabulary. They are not a new styling-hooks contract
(GHO-38 remains undecided):

- class `ghost-checkbox`
- `data-part="root"` on the input
- `data-state="checked"` while checked and not mixed
- `data-state="indeterminate"` while mixed
- omitted `data-state` while unchecked and not mixed

Consumers may also set `data-size` and `data-tone` on the unstyled input
when they style it themselves. The themed wrapper sets those from visual
props.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostCheckbox` on the same page stays unstyled when the
stylesheet is loaded. Token values inherit from the nearest `.ghost-theme`
/ `[data-ghost-theme]`. There is no `pt` passthrough object.

Themed visual values use existing semantic tokens only (no per-component
tokens):

- `--ghost-action-primary-*` / `--ghost-action-neutral-*` /
  `--ghost-action-danger-*` for tone
- `--ghost-action-disabled-*` for unavailable
- `--ghost-control-size-*-min` for the hit target
- `--ghost-action-icon-size` for the painted box
- `--ghost-radius-sm` for the box corner (`--ghost-action-radius` is
  sized for buttons and would pill a 1.1em box)
- `--ghost-border-hairline-width` for the box stroke
- `--ghost-state-layer-*` for hover / press
- `--ghost-focus-ring-*` for `:focus-visible`
- `--ghost-action-duration` / `--ghost-motion-easing-standard` for color
  transitions

Forced colors map the box to `ButtonFace` / `ButtonText` / `GrayText` and
keep the checkmark as `ButtonText`. Coarse pointers pick up the existing
`--ghost-control-size-*-min` floor from the token pipeline; this
component does not add a second touch-target rule.

## Environment behavior

### SSR and hydration

Checked and disabled serialize as HTML attributes from props. Mixed cannot:
`indeterminate` is a DOM property, not a content attribute. SSR markup
still sets `data-state="indeterminate"` so CSS can paint mixed before
hydration. After mount, an effect writes `element.indeterminate`. That
write is not in the HTML, so it does not mismatch hydration.

Setup does not read browser globals during render. The exposed element is
`null` until mount.

### Mobile and touch

Native pointer and touch activation are preserved. Wrapping labels enlarge
the target. The themed wrapper sizes the input to the control-size tokens
(and therefore to the coarse-pointer floor). Applications remain
responsible for adequate targets in unlabeled, headless use.

## Performance

Rendering and state derivation are constant-time. The only ongoing work is
a post-flush effect that writes `indeterminate` onto the host element when
the prop or the element changes. No global listeners, timers, observers, or
registries.

## Composition

`useGhostCheckbox` owns controlled/uncontrolled checked state,
`indeterminate` as a separate flag, disabled, and `data-part` / `data-state`
bindings. Unstyled `GhostCheckbox` spreads those onto a native checkbox and
syncs the DOM property. Themed `GhostCheckbox` wraps that component.
Behavior stays in `packages/vue` because its component, v-model,
attribute-fallthrough, and template ref contracts are Vue-specific. No
framework-neutral core abstraction is needed.

Do not extract a shared toggle helper for Switch. Duplication of
`useControllableState` wiring is cheaper than a premature abstraction
(GHO-31 lands in parallel).

The machine-readable contracts are
`packages/vue/manifests/ghost-checkbox.manifest.json` and
`packages/themes/manifests/ghost-checkbox.manifest.json`.

## Test plan

- Vue tests cover defaults (unchecked, not mixed), controlled and
  uncontrolled `v-model`, `defaultValue` seed, `indeterminate` DOM property
  and `data-state`, mixed + checked overlap, disabled activation and focus,
  native attribute / listener fallthrough (`id`, `name`, `value`, `form`,
  `aria-label`, `@change`), exposed refs, SSR markup (checked / disabled /
  `data-state="indeterminate"` without a content `indeterminate`
  attribute), and `data-part` / `data-state`.
- Composable tests cover the check triad, disabled, and the emit timing of
  `useControllableState` (no emit on unchanged assignment; controlled does
  not write local state).
- Compile-time tests cover native attribute types on `GhostCheckboxProps`
  (including that `type` / `checked` are not competing props) and the
  exposed ref contract.
- Browser tests cover `Space` toggle, `Enter` not toggling outside submit,
  wrapping label and `for`/`id` naming, form participation, mixed
  select-all display, disabled, themed size/tone hooks, and an axe scan of
  pages that use the component.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite.

## Documentation plan

Publish `docs/components/checkbox.md` with an API reference, a labeled
basic example, the composable path, themed size/tone, controlled mixed
(select-all illustration, not DataTable), disabled, unlabeled
`aria-label`, form/`name`, ref, styling hooks, and accessibility / SSR
guidance including why mixed is a prop rather than a model value. Mirror
the same examples in the playground.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the behavioral props, `useGhostCheckbox`, boolean
`v-model`, `indeterminate` as a non-model prop, single-root attribute
fallthrough, exposed refs, `ghost-checkbox` / `data-part` / `data-state`,
and the themed visual props plus CSS custom properties.

Future changes require compatibility review even when prop names are
unchanged: folding mixed into `modelValue`, generating ids, adding a label
slot, changing activation from mixed, wrapping the input, or changing the
styling hooks.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This component uses existing `data-part` /
  `data-state` plus Button's `data-size` / `data-tone`. It does not
  introduce a parallel hooks contract.
- **Field (GHO-71).** Label, description, and error wiring wait for Field.
  Native label / `id` / `aria-*` passthrough is the interim contract.
- **Switch (GHO-31).** No shared toggle abstraction in this change.
- **Checkbox groups / array v-model.** Deferred. Each instance is one
  boolean until a group primitive exists.
- **useGhostId.** Unused here. The helper's docs example remains valid;
  Field or a later labeled checkbox API can adopt it without a breaking
  change to this control.
