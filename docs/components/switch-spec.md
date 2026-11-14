# GhostSwitch specification

**Status:** Proposed for GHO-31. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostSwitch` is a binary on/off control. Assistive technology encounters a
`switch`, not a checkbox or a toggle button. Sighted users see a track and
thumb. The immediate consumers are settings rows (notifications, airplane
mode, dark mode) where "on" and "off" match the decision better than
"checked" and "unchecked".

The control participates in native HTML forms: a named switch contributes
`name=value` when on and nothing when off, and a form reset restores the
value the switch had when it mounted. `GhostField` (GHO-71) is not built
yet, so labeling is native `id` / `<label for>` / `aria-*` fallthrough.

## Non-goals

- It is not a checkbox. There is no mixed/indeterminate state. `GhostCheckbox`
  (GHO-74) is a parallel component; this issue does not share markup,
  composables, or form helpers with it.
- It is not a toggle button (`aria-pressed`). A switch represents a durable
  setting, not a momentary pressed action.
- It is not `GhostField`. Description, error, and control grouping stay with
  that later primitive. This component does not generate ids (`useGhostId` is
  unused).
- It does not own a group of switches. Several switches in one `fieldset` are
  a composition, not a compound widget.
- The unstyled component ships no visual styles. Track size, thumb travel,
  and on-color belong to the consumer or the themed wrapper.

## Host element: `button[role="switch"]` vs `input[type="checkbox"][role="switch"]`

APG's
[Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) requires
`role="switch"` and `aria-checked` `"true"` / `"false"`. It documents two
hosts. This component uses a **native `button` with `role="switch"`**, plus a
**hidden `input type="hidden"`** when `name` is set so the value still rides
native form submit.

| Requirement                          | `button[role="switch"]`                                                                                                                               | `input[type="checkbox"][role="switch"]`                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| APG examples                         | [Button example](https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-button/) is the documented HTML host.                                | Allowed when the element is a checkbox; then `checked` replaces `aria-checked`.                                           |
| Keyboard                             | Native activation is Space **and** Enter. APG lists Space as required and Enter as optional; a button host therefore implements the optional key too. | Native checkbox activation is Space only. Enter typically submits the nearest form.                                       |
| `readonly`                           | Not a native button attribute. Implemented with `aria-readonly` and ignored activation, which matches the ARIA `switch` property.                     | The HTML `readonly` attribute does not apply to checkbox; browsers ignore it. User-toggling cannot be prevented natively. |
| Accessible name via `<label for>`    | Buttons are labelable.                                                                                                                                | Checkboxes are labelable.                                                                                                 |
| Form submit / reset                  | Buttons with `type="button"` do not contribute a value. A named hidden input does, and submit/reset stay native.                                      | Native `name` / `value` / `checked` / `defaultChecked` already submit and reset.                                          |
| Wrapping `<label>`                   | The button is the only labelable descendant. The hidden input is not labelable, so it cannot steal label activation.                                  | A visible switch plus a form checkbox would be two labelable descendants.                                                 |
| Theming a track and thumb            | The button is an empty host; inner `data-part` hooks are ordinary flow content.                                                                       | UA checkbox appearance has to be fully replaced; `appearance: none` still leaves host-specific quirks.                    |
| Mixing with `GhostCheckbox` (GHO-74) | Distinct host, so the two components do not converge on one "binary input" abstraction.                                                               | Same host as a checkbox would invite a shared primitive this issue forbids.                                               |

Rejected alternative: `input[type="checkbox"]` as the sole root. Form
participation would be free, but `readonly` would be fake, Enter would not
toggle (and might submit), and GHO-74 would be under pressure to share the
host. Hidden-input form participation is a small, Switch-local cost.

`type="hidden"` is the form participant rather than a visually hidden
checkbox so the control has exactly one labelable element. The sibling
input is always in the tree; its `name` is set only while the switch is
named, on, and enabled, matching native checkbox submit rules
(`name=value` only when on and enabled). Unnamed, off, and disabled
switches leave `name` unset so they contribute nothing. Form reset is
observed on the switch's `HTMLButtonElement.form` and writes the mounted
default, because a hidden input has no `checked` state to restore.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostSwitch` / `useGhostSwitch`:

| Prop           | Type      | Default | Contract                                                                                                                                                        |
| -------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `boolean` | omitted | Controlled on/off. `undefined` (omitted) is uncontrolled. Vue boolean-prop coercion is defeated with an explicit `undefined` default, as on `GhostDialog.open`. |
| `defaultValue` | `boolean` | `false` | Initial on/off when `modelValue` is omitted. Later changes are ignored. Form reset restores this mounted value.                                                 |
| `disabled`     | `boolean` | `false` | Native disabled: not focusable, not operable, not submitted.                                                                                                    |
| `readonly`     | `boolean` | `false` | Focusable, announced `aria-readonly="true"`, not user-operable. Still submitted. Programmatic writes to the model still apply.                                  |
| `name`         | `string`  | omitted | Form field name. When set, a hidden input submits `name=value` while on and enabled.                                                                            |
| `value`        | `string`  | `'on'`  | Submitted string when on. Same default as a native checkbox.                                                                                                    |
| `form`         | `string`  | omitted | Associates the hidden input (and the button's `form` IDL) with an external form id.                                                                             |

Native button attributes, including `id`, accessible-name attributes, and
event listeners, are included in the public type and fall through to the
root `<button>`. The component owns `type`, `role`, `aria-checked`,
`aria-readonly`, and `disabled`. Do not redeclare `aria-*` as camelCase
props. `name`, `value`, and `form` are declared props so they route to the
hidden input rather than turning the button into a named submitter.

Named ESM exports: `GhostSwitch`, `useGhostSwitch`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled host
that spreads `rootProps` onto the button and renders the hidden input when
needed.

Themed `@ghostvue/themes` `GhostSwitch` wraps the unstyled component and
adds visual props. Same behavioral props; these exist only on the themed
wrapper:

| Prop   | Type                                | Default    | Contract                                                                             |
| ------ | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Control size. The default omits `data-size` so CSS can treat a missing hook as `md`. |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color of the on track. The default omits `data-tone`.                       |

The themed wrapper sets matching `data-size` and `data-tone` on the inner
button and wraps the instance in `.ghost-themed-scope` (`display: contents`)
so default CSS can style that instance without forcing every `.ghost-switch`
on the page.

### v-model contracts

`v-model` binds `modelValue` / `update:modelValue` with a `boolean` value.
`useControllableState` is the write path, matching
[component-state.md](../architecture/component-state.md):

- Omitted `modelValue` is uncontrolled. Local state starts at `defaultValue`
  (`false` when that is also omitted) and updates immediately on toggle.
- A defined `modelValue` (`true` or `false`) is controlled. Toggle emits
  `update:modelValue` and does not write local state; if the parent ignores
  the emit, the getter still returns the prop.
- `null` is not a legal switch value. There is no mixed state.
- Assignment is synchronous and skipped when `Object.is(current, next)`.
- Switching between controlled and uncontrolled at runtime logs `GHOST001`
  in development, same as other `useControllableState` consumers.
- **Reset baseline (GhostVue policy).** `defaultValue` establishes the reset
  baseline, captured once at mount (later prop changes ignored). This is not
  native `defaultChecked` timing: [native `form.reset()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset)
  uses the control's current default attributes. Reuse across records needs
  controlled state or `:key` when the baseline must change.
- **Form reset reconciliation** matches [GhostInput](./input-spec.md#v-model-contracts):
  request the captured baseline, not the displayed `modelValue`; skip redundant
  emit; parent-owned controlled state; microtask after full dispatch (late cancel
  on `document` / `window` is a no-op).

### Events, callbacks, slots, and exposed methods

The default slot is optional inner content (usually a visible name, or
decorative glyphs). The track and thumb are not slots; they are `data-part`
hooks. Prefer a sibling `<label for>` or `aria-label` / `aria-labelledby`
when the name should not sit inside the control. Slot text that describes
on/off state (for example "On") is forbidden by APG: the accessible name
must not change with state.

No component-specific events besides `update:modelValue`. Native listeners
such as `@click` attach to the button and receive the native event. User
activation still toggles unless `disabled` or `readonly` applies, or the
listener calls `preventDefault()`.

A component template ref exposes:

- `element: HTMLButtonElement | null`
- `checked: boolean` — current on/off
- `toggle(): void` — user-activation path; no-op when disabled or readonly
- `focus(options?: FocusOptions): void`
- `blur(): void`

The methods are no-ops before mount or after unmount. Consumers should not
depend on the hidden input or the track/thumb spans as a public layout
surface (the themed wrapper's extra scope span is also not a layout
surface). `element` is the button.

`useGhostSwitch` returns `checked` (writable computed), `isDisabled`,
`isReadonly`, `rootProps`, `inputProps`, and `toggle`. Composable callers
who need form participation render `<input v-bind="inputProps">` themselves
when `inputProps.name` is set. Pass `element` so form reset can see
`button.form`; omit it if reset is not needed.

## State model

The switch is on or off. `disabled` and `readonly` are independent
availability flags.

| User input                      | `disabled` | `readonly` | Result                                   |
| ------------------------------- | ---------- | ---------- | ---------------------------------------- |
| click / Space / Enter           | `false`    | `false`    | Toggle                                   |
| click / Space / Enter           | `true`     | any        | Native disabled; no activation, no focus |
| click / Space / Enter           | `false`    | `true`     | Focusable; activation ignored            |
| `checked = next` (programmatic) | any        | any        | Always applied                           |

When `disabled` and `readonly` overlap, native `disabled` wins: the control
is not focusable and is not submitted.

### Loading, empty, disabled, read-only, and error states

No loading or error states. An empty default slot is permitted only when
another naming mechanism (`aria-label`, `aria-labelledby`, or `<label for>`)
gives the switch an accessible name. Disabled uses native semantics.
Readonly uses `aria-readonly="true"` and does not set `aria-disabled`.

### Async behavior

The component performs no asynchronous work. Pending settings changes are
consumer-owned.

## Consumer data

The model is a boolean. The component does not accept object data and does
not mutate consumer-owned values; it only emits the next boolean.

## Accessibility contract

### Semantics and relationships

Follow the WAI-ARIA
[Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) and the
[button example](https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-button/).

The root is always `<button type="button" role="switch">`. `aria-checked` is
`"true"` when on and `"false"` when off; it is never omitted and never
`"mixed"`. `aria-pressed` is not used.

Accessible name comes from, in document order of typical use:

1. Visible slot text inside the button, or
2. A `<label for>` pointing at the button `id`, or
3. `aria-labelledby` / `aria-label` fallthrough.

The track and thumb are `aria-hidden` decorative structure. They must not
contribute "on" / "off" to the accessible name.

`id` is consumer-supplied. The component does not generate ids, so it does
not invent a Field-like label relationship.

The hidden form input is not in the accessibility tree (`type="hidden"`).

### Keyboard interaction

Enabled, non-readonly switches use native button activation:

| Key   | Behavior                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------- |
| Tab   | Moves sequential focus to the switch when it is not disabled.                                     |
| Space | Toggles on/off. Native button click; not reimplemented as a key handler.                          |
| Enter | Toggles on/off. **Implemented** because the host is a button; documented as APG's optional Enter. |

Disabled switches are not in the tab order and do not activate. Readonly
switches are in the tab order; Space and Enter do not toggle.

No arrow-key behavior. A group of switches is not a composite widget.

### Focus behavior

Enabled and readonly switches participate in the document's native tab
order and use consumer-supplied (or themed) focus styling. Toggling does
not move focus. Disabled switches do not receive sequential focus. The
exposed `focus` / `blur` methods delegate to the native button and do not
restore or trap focus.

### Assistive technology expectations

Assistive technology encounters a named switch whose state is on or off.
Toggling does not rename the control. Readonly is conveyed through
`aria-readonly`. There is no live region; the role and `aria-checked`
change are the announcement.

## Rendering and customization

The default slot, fallthrough attributes, and `data-part` / `data-state`
hooks are the customization API for the unstyled component. It ships no
visual styles.

Stable styling hooks follow ADR 0004 and the existing `data-*`
configuration used by `GhostButton` (`data-size`, `data-tone`). They are
not a new styling-hooks contract (GHO-38 remains undecided):

- class `ghost-switch` on the button
- `data-part="root"` on the button
- `data-part="track"` on the decorative track
- `data-part="thumb"` on the decorative thumb
- `data-state="checked"` when on; `data-state="unchecked"` when off
- native `[disabled]` and `[aria-readonly="true"]` for availability
  styling, so on/off remains stylable while disabled or readonly
- themed `data-size` / `data-tone` as on `GhostButton`

`data-state` is the on/off hook because a native button has no `checked`
attribute. Availability is already expressed natively, matching
`GhostButton`'s rule that `data-state` is for what native attributes do
not cover, except that here the distinctive visual is on/off rather than
pending.

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostSwitch` on the same page stays unstyled when the stylesheet
is loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

Themed visual values use existing semantic tokens only (no per-component
tokens):

- `--ghost-control-size-*-min` for track block size
- `--ghost-space-gap-xs` for thumb inset
- `--ghost-action-primary-*` / `--ghost-action-neutral-*` /
  `--ghost-action-danger-*` and `--ghost-gradient-action-*` for the on
  track
- `--ghost-surface-muted-bg` for the off track
- `--ghost-action-disabled-*` for disabled
- `--ghost-focus-ring-*` and `--ghost-state-layer-*` for focus, hover, and
  press
- `--ghost-action-duration` and `--ghost-motion-easing-standard` for thumb
  travel; reduced motion snaps without travel

Forced colors map the track to `ButtonFace` / `ButtonText` and the on
thumb to `Highlight`. There is no `pt` passthrough object.

## Environment behavior

### SSR and hydration

Rendering is deterministic from props and slot content. `aria-checked` and
`data-state` reflect the model on the server. The hidden input is always
in the markup; its `name` is present only when the switch is named, on,
and enabled. Setup does not read browser globals. The form-reset listener
is registered in `onMounted` and removed in `onBeforeUnmount`. The exposed
element is `null` until mount.

### Mobile and touch

Native pointer and touch activation are preserved (the host is a button).
The themed wrapper sizes the track to `--ghost-control-size-*-min` so the
control meets the same minimum as `GhostButton`. Applications remain
responsible for adequate targets in a full settings row (label plus
control).

## Performance

Rendering and state derivation are constant-time. One document-level `reset`
listener (bubble phase, not capture) is registered while mounted and released on
unmount so associated forms and canceled resets match native timing. No timers,
observers, or registries beyond the form-reset microtask and controlled DOM reconciliation.

## Composition

`useGhostSwitch` owns controllable on/off state, disabled/readonly
activation rules, `aria-checked` / `data-part` / `data-state` bindings,
hidden-input form props, and form-reset. Unstyled `GhostSwitch` spreads
those onto a native `<button>` and optional hidden input. Themed
`GhostSwitch` wraps that component. Behavior stays in `packages/vue`
because its component, slot, attribute-fallthrough, v-model, and template
ref contracts are Vue-specific. No framework-neutral core abstraction is
needed, and no shared binary-input helper is introduced for GHO-74.

The machine-readable contracts are
`packages/vue/manifests/ghost-switch.manifest.json` and
`packages/themes/manifests/ghost-switch.manifest.json`.

## Test plan

- Vue tests cover defaults (off, `type="button"`, `role="switch"`,
  `aria-checked="false"`), slot content, labeled `id` fallthrough, typed
  fallthrough attributes/listeners, controlled and uncontrolled `v-model`,
  `defaultValue`, disabled (no toggle, native `disabled`, not submitted),
  readonly (focusable, no toggle, still submitted), Space/Enter via click
  activation, `preventDefault` on click skipping the toggle, named form
  submit (`FormData` includes `name=value` only when on), form reset to the
  mounted default, hidden-input `name` omitted when unnamed/off/disabled,
  exposed refs, SSR markup, and `data-part` / `data-state`.
- Composable tests cover the same state matrix, `rootProps` / `inputProps`,
  and toggle no-ops under disabled/readonly.
- Compile-time tests cover native attribute types on `GhostSwitchProps` and
  the exposed ref contract, matching `GhostButton`.
- Browser tests cover click and keyboard toggle, disabled and readonly,
  form submit/reset, themed on/off geometry, associated label activation,
  and an axe scan of pages that use the component.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite.

## Documentation plan

Publish `docs/components/switch.md` with an API reference, a minimal labeled
example, the composable path, themed size/tone, disabled and readonly,
form participation, ref, styling hooks, and accessibility / SSR guidance
including why Enter toggles and how to name the control without
`GhostField`. Mirror the same examples in the playground gallery. Update
`docs/roadmap.md` status for GHO-31.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the behavioral props, `v-model` boolean,
`useGhostSwitch`, button-root attribute fallthrough, hidden-input form
rules, exposed refs, `ghost-switch` / `data-part` / `data-state`, the
role / keyboard / readonly matrix, and the themed visual props plus CSS
custom properties.

Future changes require compatibility review even when prop names are
unchanged: changing the host element, dropping Enter, changing form
submit/reset timing, adding a mixed state, generating ids, or changing the
styling hooks.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This component uses the existing `data-part` /
  `data-state` / `data-size` / `data-tone` attributes. It does not
  introduce a parallel hooks contract.
- **GHO-71 Field.** Label, description, and error composition wait for
  Field. Native `id` / `aria-*` / `<label>` are sufficient until then.
- **GHO-74 Checkbox.** Kept as a separate component on purpose. No shared
  binary-input abstraction in this change.
