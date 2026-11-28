---
schemaVersion: 1.0.0
component: GhostCheckboxGroup
components:
  - GhostCheckboxGroup
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Design sign-off on the recommended CG1–CG7 decisions at commit 28ae0b6 (28ae0b6efc75f3ad698c84f07fdb3b1180939aa4), recorded by repo admin zprue743 on behalf of Zac on 2026-11-28 in PR #504: https://github.com/zprue743/ghostvue/pull/504#issuecomment-7240055885. Design approval only; not merge approval or release inclusion.'
manifests: []
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
unresolvedQuestions: []
---

# Component specification: `GhostCheckboxGroup`

> [!IMPORTANT]
> **Status:** Design approved for
> [#463](https://github.com/zprue743/ghostvue/issues/463). Zac signed off on the
> recommended [CG1–CG7 decisions](#resolved-decisions) at commit `28ae0b6`. The
> repo admin `zprue743` recorded the sign-off on his behalf on 2026-11-28 in
> [PR #504](https://github.com/zprue743/ghostvue/pull/504#issuecomment-7240055885).
> This is design approval only, not merge approval or release inclusion.
> Later review findings (group-level invalid state, external form owner,
> same-tick controlled activations, and the headless custom root) were applied at the maintainer's
> request; see [Post-approval amendments](#post-approval-amendments).
>
> This is a docs-only specification. No runtime code, manifest, or export exists
> yet. Implementation ([#467](https://github.com/zprue743/ghostvue/issues/467))
> stays blocked until this approved spec is merged into `master` and the #467
> implementation criteria are reconciled with it.

## Purpose and user problems

Settings screens often show every choice at once: notification channels, data
export columns, feature toggles for a workspace. Each choice is a checkbox, and
the screen wants one typed collection back, such as
`['mentions', 'assignments']`, not one boolean per option.

The published [`GhostCheckbox`](/specs/checkbox) is deliberately one boolean.
Its spec defers "a checkbox group, array `v-model`, or `true-value` /
`false-value`". The themed preferences example
(`examples/checkbox/notification-preferences.vue`) shows what that costs today:

- It keeps a reactive `{ id, label, description, enabled }` record per option
  and binds `v-model="item.enabled"` on each checkbox.
- It counts `enabled` flags to derive `allProject` and `someProject` for the
  mixed select-all, and loops the records in `setAllProject`.
- `restoreDefaults()` walks two seed arrays by index to put every boolean back.
- The submitted shape (`FormData.getAll('notifications')`) and the in-memory
  shape (booleans on records) differ. The screen has to convert between them
  before saving.

Vue's built-in `v-model` on an array works only on a plain
`<input type="checkbox">`. On `GhostCheckbox` it binds the array to a
`modelValue: boolean` prop, so the consumer cannot use it.

`GhostCheckboxGroup` gives a set of visible checkboxes one `string[]` model. It
keeps the native pieces that already work: one `<input type="checkbox">` per
option, a shared `name`, `FormData.getAll(name)`, native `Tab`/`Space`,
`<fieldset>`/`<legend>` naming, and native form reset. A standalone
`GhostCheckbox` keeps its boolean contract unchanged.

## Non-goals

- **Not a multiple Select or Combobox.** Hidden options in a popup listbox
  belong to the multiple `GhostSelect` proposal
  ([#415](https://github.com/zprue743/ghostvue/issues/415)) and the existing
  `GhostCombobox` `multiple` mode. This group is for choices that should all
  stay visible.
- **Not a Fieldset primitive.** A named section that groups unrelated fields
  (for example a billing address) belongs to `GhostFieldset`
  ([#464](https://github.com/zprue743/ghostvue/issues/464)). The checkbox group
  renders a `fieldset` root only because its options form one control.
- **No validation.** Rules such as "choose at least one" or "at most three" are
  schema concerns for `GhostForm`
  ([#414](https://github.com/zprue743/ghostvue/issues/414)) or the consumer. The
  group has no `min`, `max`, or group-level `required`.
- **No select-all component, tree, or nested hierarchy.** The mixed parent is a
  plain `GhostCheckbox` the consumer derives (see
  [Select-all derivation](#select-all-derivation)). Nested trees of checkboxes
  are out of scope.
- **No roving focus or arrow keys.** Every enabled checkbox stays its own tab
  stop, as in the
  [APG checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/).
- **No `true-value` / `false-value`, no `Set` model, no object values.** Values
  are opaque strings, matching `GhostRadioGroup`, `GhostToggleGroup`, and
  `GhostCombobox`.
- **No custom group root in v1.** Connecting `GhostCheckbox` members to a
  consumer-built root (for example a table of checkboxes) would need a public
  provider or injection key, which the approved export surface does not
  include. Use `GhostCheckboxGroup` with `as` instead. A provider can be added
  later as an additive export (see
  [Post-approval amendments](#post-approval-amendments)).
- **No change to standalone `GhostCheckbox`.** Its props, boolean v-model,
  `indeterminate`, form reset, and exposed ref are unchanged outside a group.
- **No visual styling in `@ghostvue/vue`.** Spacing and option layout live in
  `@ghostvue/themes` or consumer CSS.

## Public API

### Comparison with existing composition

| Approach                                        | Model                                     | Tab stops                                | Form data                                             | Why it is not enough                                                                                                       |
| ----------------------------------------------- | ----------------------------------------- | ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Native `<fieldset>` + `<input type="checkbox">` | Vue `v-model="array"` on each plain input | One per enabled checkbox                 | `getAll(name)` in DOM order                           | Works only on plain inputs. No themed control, no mixed recipe, no reset baseline. `GhostCheckbox` rejects an array model. |
| `GhostCheckbox` per option (today)              | One boolean per record                    | One per enabled checkbox                 | `getAll(name)` in DOM order                           | The consumer converts booleans to an array, derives mixed state by hand, and restores defaults index by index.             |
| `GhostRadioGroup`                               | One `string`, or none                     | One per group (native radio arrows)      | One value                                             | Single choice only. Its generated `name` is needed for native radio grouping; checkboxes need no grouping name.            |
| Multiple `GhostSelect` (#415) / `GhostCombobox` | `string[]`                                | One trigger or input; options in a popup | One hidden mirror input per selected value            | Hides options behind a popup. Right for long lists; wrong when every choice should stay visible.                           |
| **`GhostCheckboxGroup` (this spec)**            | `string[]` (typed by `TValue`)            | One per enabled checkbox                 | `getAll(name)` in DOM order, from the real checkboxes | —                                                                                                                          |

The array model deliberately matches the multi-value contracts that already
ship, so a screen can swap a checkbox group for a multiple Select or Combobox
without changing its data:

- Selecting a value appends it: Vue native `modelValue.concat(value)`,
  `GhostCombobox` `[...current, value]`, and `GhostDataTable` row selection
  `[...current, ...missing]` all append.
- Deselecting filters it out.
- Options that unmount never change the selection (`GhostCombobox`
  [option removal](/specs/combobox#option-removal)).

### Package boundary and exports

Approved surface ([CG7](#resolved-decisions)):

`@ghostvue/vue`:

- `GhostCheckboxGroup`: root component (`generic="TValue extends string"`).
- `useGhostCheckboxGroup`: composable that owns selection state, membership,
  and reset, mirroring `useGhostRadioGroup`. It returns state and handlers
  only. It does not install a context, so it cannot connect `GhostCheckbox`
  members to a root other than `GhostCheckboxGroup`.
- Types: `GhostCheckboxGroupProps<TValue>`, `GhostCheckboxGroupEmits<TValue>`,
  `GhostCheckboxGroupExposed`, `UseGhostCheckboxGroupOptions<TValue>`,
  `GhostCheckboxGroupContext` (the composable's return type).
- No provider component, `provide` helper, or injection key is exported. The
  group context is installed only by `GhostCheckboxGroup`.
- Additive internal change to `GhostCheckbox`: it injects the nearest group
  context. No new `GhostCheckbox` prop, emit, or type.

`@ghostvue/themes`:

- `GhostCheckboxGroup`: thin wrapper that adds the `.ghost-themed-scope` root
  and a vertical stack gap from existing spacing tokens. It adds no per-component
  tokens and no visual props.
- The themed `GhostCheckbox` already forwards to the unstyled checkbox, so it
  joins a group through the same injection.

No code is added to `@ghostvue/core`. Membership, the array model, and form
reset are Vue component contracts; no framework-neutral logic is large enough
to justify a core module.

### Typed consumer example (themed, preferences)

The preferences screen rewritten against the proposed API. It needs no per-option
booleans, the select-all is derived from the array, and **Restore defaults**
assigns one array.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostButton,
  GhostCard,
  GhostCheckbox,
  GhostCheckboxGroup,
} from '@ghostvue/themes'

type ProjectNotification = 'mentions' | 'assignments' | 'digest'
type AccountNotification = 'security' | 'billing'

interface Option<TValue extends string> {
  value: TValue
  label: string
  description: string
  /** Workspace policy owns this choice; members cannot change it. */
  locked?: boolean
}

const projectOptions: readonly Option<ProjectNotification>[] = [
  {
    value: 'mentions',
    label: 'Comments and mentions',
    description: 'Someone replies to you or mentions you by name.',
  },
  {
    value: 'assignments',
    label: 'Task assignments',
    description: 'A task is assigned to you or its due date changes.',
  },
  {
    value: 'digest',
    label: 'Weekly digest',
    description: 'A Monday summary of activity across your projects.',
  },
]

const accountOptions: readonly Option<AccountNotification>[] = [
  {
    value: 'security',
    label: 'Security alerts',
    description:
      'New sign-ins and password changes. Required by your workspace.',
    locked: true,
  },
  {
    value: 'billing',
    label: 'Billing receipts',
    description: 'Invoices, payment confirmations, and failed charges.',
  },
]

const projectDefaults: readonly ProjectNotification[] = [
  'mentions',
  'assignments',
]
const accountDefaults: readonly AccountNotification[] = ['security']

// The consumer owns these arrays. The group emits new arrays and never
// mutates them.
const project = ref<ProjectNotification[]>([...projectDefaults])
const account = ref<AccountNotification[]>([...accountDefaults])

// Select-all counts enabled options only (see "Select-all derivation").
const projectEnabled = computed(() =>
  projectOptions.filter((option) => !option.locked).map((o) => o.value),
)
const projectOnCount = computed(
  () => projectEnabled.value.filter((v) => project.value.includes(v)).length,
)
const allProject = computed(
  () =>
    projectEnabled.value.length > 0 &&
    projectOnCount.value === projectEnabled.value.length,
)
const someProject = computed(
  () => projectOnCount.value > 0 && !allProject.value,
)

function setAllProject(checked: boolean): void {
  const enabled = new Set<ProjectNotification>(projectEnabled.value)
  project.value = checked
    ? [
        ...project.value,
        ...projectEnabled.value.filter((v) => !project.value.includes(v)),
      ]
    : project.value.filter((v) => !enabled.has(v))
}

function restoreDefaults(): void {
  project.value = [...projectDefaults]
  account.value = [...accountDefaults]
}

function save(event: SubmitEvent): void {
  // Submits the real checkboxes: getAll('notifications') is the enabled,
  // checked members of both groups in DOM order.
  const form = event.currentTarget as HTMLFormElement
  void new FormData(form).getAll('notifications')
}
</script>

<template>
  <form class="prefs" @submit.prevent="save($event as SubmitEvent)">
    <GhostCard as="section" aria-labelledby="prefs-title">
      <template #header>
        <h2 id="prefs-title">Email notifications</h2>
      </template>

      <GhostCheckboxGroup
        v-model="project"
        name="notifications"
        aria-describedby="prefs-project-hint"
      >
        <legend>Project activity</legend>
        <p id="prefs-project-hint">Updates from projects you follow.</p>

        <!-- No `value`: this checkbox is not a member. It keeps the boolean contract. -->
        <label class="pref">
          <GhostCheckbox
            :model-value="allProject"
            :indeterminate="someProject"
            @update:model-value="setAllProject"
          />
          All project activity
        </label>

        <label
          v-for="option in projectOptions"
          :key="option.value"
          class="pref"
        >
          <GhostCheckbox :value="option.value" :disabled="option.locked" />
          {{ option.label }}
        </label>
      </GhostCheckboxGroup>

      <GhostCheckboxGroup v-model="account" name="notifications">
        <legend>Account</legend>
        <label
          v-for="option in accountOptions"
          :key="option.value"
          class="pref"
        >
          <GhostCheckbox :value="option.value" :disabled="option.locked" />
          {{ option.label }}
        </label>
      </GhostCheckboxGroup>

      <template #footer>
        <GhostButton
          type="button"
          variant="ghost"
          tone="neutral"
          @click="restoreDefaults"
        >
          Restore defaults
        </GhostButton>
        <GhostButton type="submit">Save preferences</GhostButton>
      </template>
    </GhostCard>
  </form>
</template>
```

The shipped documentation example keeps the existing `GhostField` +
`GhostFieldDescription` per option (each option keeps its own label and
description). The sketch above uses wrapping labels only to keep the excerpt
short. Two groups may share `name="notifications"`. Native submission then
yields one combined list in DOM order, exactly as the page does today.

### Props and configuration

#### `GhostCheckboxGroup<TValue extends string = string>`

| Prop           | Type                             | Default      | Contract                                                                                                                                                                      |
| -------------- | -------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `readonly TValue[] \| undefined` | `undefined`  | Controlled selection. `undefined` is uncontrolled. `[]` is a defined empty selection. Accepts readonly and frozen arrays; never mutated.                                      |
| `defaultValue` | `readonly TValue[]`              | `[]`         | Uncontrolled seed and form-reset baseline. Shallow-copied once at setup; later prop changes and later mutation of the passed array are ignored.                               |
| `name`         | `string \| undefined`            | `undefined`  | Native `name` applied to every member input. No generated name: checkboxes need no shared name to behave as a group, and an unnamed group submits nothing (native parity).    |
| `disabled`     | `boolean`                        | `false`      | Disables every member input natively. On a `fieldset` root it also sets the native `disabled` attribute (see [Disabled](#loading-empty-disabled-read-only-and-error-states)). |
| `invalid`      | `boolean`                        | `false`      | Group-level error hook for Field or form integration. Sets `data-state="invalid"` and `aria-invalid="true"` on the root, as `GhostRadioGroup` does. Members are not marked.   |
| `as`           | `string \| Component`            | `'fieldset'` | Root host. A `fieldset` needs no role. Any other host gets `role="group"`.                                                                                                    |

There is intentionally no `required`, `orientation`, `min`, `max`, or `options`
prop.

- **No `required`.** Native `required` on a checkbox means "this box must be
  checked", not "at least one". ARIA has no `aria-required` on `role="group"`.
  Group-level required belongs to schema validation (#414).
- **No `orientation`.** Checkboxes have no arrow-key navigation, so orientation
  would be layout only. Themed CSS or consumer CSS handles layout.
- **No `options`.** Options are slot children so each keeps its own label,
  description, and field wiring.

Native attributes and listeners on the group fall through to the root
(`id`, `aria-labelledby`, `aria-describedby`, `class`, `style`).

- **`invalid` / `aria-invalid`.** The `invalid` and `aria-invalid` keys from
  `GhostFieldControl` slot props are consumed. The root renders
  `aria-invalid="true"` exactly when `invalid` is `true` and omits it otherwise,
  matching `GhostRadioGroup` (`packages/vue/src/GhostRadioGroup.vue`).
  `aria-invalid` is a global ARIA state, so it is valid on the `fieldset` /
  `role="group"` root. A group constraint such as "choose at least one" is
  therefore exposed once, on the group, together with the root's
  `aria-describedby` error text. It stays exposed when the group has no
  members, or when every member is disabled. The group never copies
  `aria-invalid` onto member inputs, so assistive technology does not report
  each option as invalid when no option has its own error. A real per-option
  error is the consumer's: pass `aria-invalid` (or a per-option `GhostField`
  `invalid`) to that `GhostCheckbox`, where it falls through unchanged.
- **`required`.** Consumed and not rendered. A `fieldset` does not support
  `required`, and the group has no "at least one" constraint.
- **`form` (external form owner): unsupported.** The group must be a
  descendant of the `<form>` it submits to. Under the
  [HTML form-owner rules](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#association-of-controls-and-forms)
  a `form` attribute on the fieldset associates only the fieldset, not its
  descendant checkboxes. `new FormData(external)` would then omit every
  selection while the group still reacted to that form's reset. The group
  therefore consumes a root `form` attribute, does not render it, and gives a
  development warning (new `GHOST0xx` code, registered in `docs/warnings.md` at
  implementation). Members consume their own `form` attribute the same way
  (see the member table): it is never rendered on the native input, so a
  member always submits and resets with the group's ancestor form.
  **Why drop instead of propagate:** supporting it
  needs a declared `form` prop copied onto every member (overriding each
  member's own attribute), reset listening on a form outside the group's
  subtree, and browser coverage for both. No example, issue, or sibling
  component (`GhostRadioGroup` has no `form` prop) needs it. Placing the group
  inside the form covers every documented workflow, and a `form` prop can be
  added later without breaking this contract.

#### Member checkboxes: which `GhostCheckbox` props stay authoritative

Approved ([CG1](#resolved-decisions)): a `GhostCheckbox` becomes a
member when it has a group ancestor **and** a string `value` attribute. Without
a `value` it stays a standalone boolean checkbox, even inside the group. That is
how the select-all lives inside the same `fieldset`.

| `GhostCheckbox` input            | Standalone (today, unchanged) | Member of a group                                                                                                                                              |
| -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value` (native attribute)       | Native `value` only           | Membership key **and** native `value`. Compared as a string.                                                                                                   |
| `modelValue` / `v-model`         | Boolean checked state         | Ignored. Checked state is `group.includes(value)`. Development warning (new `GHOST0xx` code, registered in `docs/warnings.md` at implementation).              |
| `defaultValue`                   | Seed and reset baseline       | Ignored, with the same development warning. The group's `defaultValue` is the baseline.                                                                        |
| `indeterminate`                  | Mixed display                 | Still authoritative and display-only. It never adds or removes the value.                                                                                      |
| `disabled`                       | Native disabled               | Authoritative. Effective disabled is `item.disabled \|\| group.disabled`.                                                                                      |
| `name` (native attribute)        | Native `name`                 | When the group has a `name`, the group's `name` wins. A different item `name` gives a development warning. Without a group `name`, the item `name` is kept.    |
| `id`, `aria-*`, listeners        | Fall through                  | Fall through unchanged. `GhostFieldControl` slot props per option keep working, including a per-option `aria-invalid`.                                         |
| `form` (native attribute)        | Native form owner             | **Consumed.** Never rendered on the native input, in development and production, so the member's form owner is the group's ancestor form. Development warning. |
| `required` (native attribute)    | Native required               | Falls through unchanged (for example a consent box). It never means "at least one".                                                                            |
| `update:modelValue` emit         | Emitted after activation      | **Not emitted.** The group emits once. Native `@change` and `@click` listeners still fire.                                                                     |
| Exposed `element`/`focus`/`blur` | Unchanged                     | Unchanged.                                                                                                                                                     |

Because `value` is not a declared prop, the group's `TValue` cannot be checked
against each member's `value` at compile time. Vue does not infer generics
across parent and slot children. This is the main type cost of CG1. The
rejected `GhostCheckboxGroupItem` part (required `value: string`) would have
removed the implicit membership rule but added a second checkbox component and
its themed twin.

### v-model contracts

| Role      | Prop         | Emit                | Uncontrolled initial          |
| --------- | ------------ | ------------------- | ----------------------------- |
| Selection | `modelValue` | `update:modelValue` | Copy of `defaultValue` (`[]`) |

- **Uncontrolled:** `modelValue` is omitted. Internal state starts as a shallow
  copy of `defaultValue`. Activation replaces internal state with a new array
  **and** emits it (the same `useControllableState` timing as every other
  GhostVue v-model).
- **Controlled:** `modelValue` is an array. Activation emits the next array
  synchronously inside the member's native `change` handler. Internal state is
  not written. If the parent ignores the emit, the member restores
  `input.checked` from the unchanged prop after `nextTick`. This is the same
  restore path `useGhostCheckbox` already uses.
- **One emit per user activation.** The group emits nothing on mount, when
  options register, unregister, or reorder, when `disabled` changes, when
  `modelValue` changes from the parent, or for duplicates or unknown values
  present in the model.
- **New array every time.** The emitted array is never the `modelValue` or
  `defaultValue` instance, and the group never calls a mutating method on
  either. `Object.isFrozen(modelValue)` arrays work.
- **Next-value rule** (CG2, stable consumer order in the model; `FormData`
  stays in DOM order):
  - Check `v` when absent: `next = [...current, v]`.
  - Uncheck `v`: `next = current.filter((x) => x !== v)` (removes every
    occurrence).
  - Every other entry keeps its position and any duplicates it already had.
- Switching controlled ↔ uncontrolled after setup is unsupported
  ([GHOST001](../warnings.md#ghost001)).
- **Form reset:** see [Reset](#reset).

### Events, callbacks, slots, and exposed methods

- `update:modelValue: [value: TValue[]]`, emitted as defined above.
- Default slot: member checkboxes, labels, legend, descriptions, and any
  non-member content. No slot props in this version
  ([CG4](#resolved-decisions)).
- No other component events. Native `change` events from member inputs bubble
  to the root as usual, so `<form @change>` keeps working, as it does in today's
  example.
- Exposed template ref (`GhostCheckboxGroupExposed`):
  - `element: HTMLElement | null`: the root after mount.
  - `focus(options?)`: focuses the first enabled checked member in DOM order,
    else the first enabled member, else does nothing.
  - `blur()`: blurs the active member if it is inside the group.

## State model

The model is one array of values. Each member derives its state from that array.

| Member condition               | `input.checked` | `data-state` on member                 | Submitted                |
| ------------------------------ | --------------- | -------------------------------------- | ------------------------ |
| `value` in model, enabled      | `true`          | `checked`                              | Yes, once per input      |
| `value` not in model, enabled  | `false`         | omitted                                | No                       |
| `value` in model, disabled     | `true`          | `checked`                              | **No** (native disabled) |
| `value` not in model, disabled | `false`         | omitted                                | No                       |
| Member `indeterminate` true    | as above        | `indeterminate` (mixed wins, as today) | Follows `checked`        |

Root `data-state`: `invalid` when `invalid`; else `disabled` when `disabled`;
else omitted. This matches the `GhostRadioGroup` root.

### Exact transitions and `FormData.getAll(name)`

Fixture: one group with `name="notifications"` and three enabled members in DOM
order `mentions`, `assignments`, `digest`, inside a `<form>`. "Emit" is the
`update:modelValue` payload. `getAll` is
`new FormData(form).getAll('notifications')` after the parent applies the emit.

| #   | Before (`modelValue`)             | Action                                                 | Emit                                                                      | After (`modelValue`)                    | `getAll`                                                         |
| --- | --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| 1   | `[]`                              | Mount                                                  | none                                                                      | `[]`                                    | `[]`                                                             |
| 2   | `['mentions', 'assignments']`     | Check `digest`                                         | `['mentions', 'assignments', 'digest']`                                   | same                                    | `['mentions', 'assignments', 'digest']`                          |
| 3   | `['mentions', 'assignments']`     | Uncheck `mentions`                                     | `['assignments']`                                                         | `['assignments']`                       | `['assignments']`                                                |
| 4   | `['assignments']`                 | Check `digest`, then check `mentions`                  | `['assignments', 'digest']`, then `['assignments', 'digest', 'mentions']` | `['assignments', 'digest', 'mentions']` | `['mentions', 'assignments', 'digest']` (DOM order)              |
| 5   | `['digest', 'digest']` (consumer) | Mount                                                  | none                                                                      | unchanged                               | `['digest']`                                                     |
| 6   | `['digest', 'digest']`            | Uncheck `digest`                                       | `[]`                                                                      | `[]`                                    | `[]`                                                             |
| 7   | `['digest', 'digest']`            | Check `mentions`                                       | `['digest', 'digest', 'mentions']`                                        | same                                    | `['mentions', 'digest']`                                         |
| 8   | `['mentions', 'legacy-sms']`      | Mount (no `legacy-sms` option)                         | none                                                                      | unchanged                               | `['mentions']`                                                   |
| 9   | `['mentions', 'legacy-sms']`      | Check `digest`                                         | `['mentions', 'legacy-sms', 'digest']`                                    | same                                    | `['mentions', 'digest']`                                         |
| 10  | `['mentions', 'digest']`          | Remove the `digest` option (`v-if` / filtered list)    | none                                                                      | unchanged                               | `['mentions']`                                                   |
| 11  | `['mentions', 'digest']`          | Re-insert `digest`                                     | none                                                                      | unchanged                               | `['mentions', 'digest']`                                         |
| 12  | `['mentions']`                    | Insert new option `product-news` before `digest`       | none                                                                      | unchanged                               | `['mentions']`                                                   |
| 13  | `['mentions', 'digest']`          | Reorder options to `digest`, `assignments`, `mentions` | none                                                                      | unchanged                               | `['digest', 'mentions']`                                         |
| 14  | `['mentions']`, parent ignores    | Check `digest` (controlled, emit discarded)            | `['mentions', 'digest']`                                                  | `['mentions']`                          | `['mentions']` (`digest` restored to unchecked after `nextTick`) |
| 15  | `['mentions']`                    | Parent assigns `['digest']`                            | none                                                                      | `['digest']`                            | `['digest']`                                                     |
| 16  | any                               | Group `disabled` set to `true`                         | none                                                                      | unchanged                               | `[]`                                                             |

Duplicate **option** values (two members with `value="digest"`) are
unsupported. In development they produce a warning. Both inputs reflect the
same membership, toggling either emits as above, and `getAll` lists `digest`
once per checked input (`['digest', 'digest']`). Empty-string values are legal
opaque values (`''` is a member like any other). A member with no `value`
attribute is not a member at all.

Uniqueness of values is not enforced in the model. The group never adds
duplicates itself, never removes duplicates it did not toggle (row 7), and
removes every copy of a value it unchecks (row 6). Vue's native array
`v-model` removes only the first copy. GhostVue removes all copies so that
unchecking always leaves `value` out of the model.

### Locked options

A locked option is a member with `disabled`. Locked describes **user**
interaction only:

- The user cannot toggle it (native disabled). It is skipped by `Tab`.
- The parent can still add or remove its value. The model is the consumer's.
- It renders checked when its value is in the model.
- **It is not submitted** (native: disabled controls are excluded from form
  data). Fixture: account group `name="notifications"`, members
  `security` (disabled) and `billing`, model `['security']`.
  `getAll('notifications')` is `[]`. After checking `billing` the emit is
  `['security', 'billing']` and `getAll` is `['billing']`. This matches the
  current page, which posts `mentions` and `assignments` but not `security`.
- The group does not render a hidden input for locked values. A server that
  needs them either enforces the policy itself or the consumer renders
  `<input type="hidden" name="notifications" value="security">`. Native
  `readonly` does not stop a checkbox from toggling, so it is not an option.
- Select-all never adds or removes a locked value (see below).

### Select-all derivation

Approved ([CG4](#resolved-decisions)): a documented recipe, not a
group API. The mixed parent is a plain `GhostCheckbox` without a `value`, so it
keeps its boolean contract and `indeterminate` prop.

Let `E` be the consumer's **enabled** option values for the group and
`S` the current model:

```ts
const on = E.filter((v) => S.includes(v)).length
const checked = E.length > 0 && on === E.length
const indeterminate = on > 0 && !checked
const disabled = E.length === 0

function setAll(next: boolean): TValue[] {
  return next
    ? [...S, ...E.filter((v) => !S.includes(v))]
    : S.filter((v) => !E.includes(v))
}
```

**Disabled selections do not count.** If locked options counted, a locked
unchecked option would keep the parent mixed forever, and clicking it could
never reach "all". A locked checked option would make "none" unreachable. In
both cases the control would look actionable but do nothing. Counting enabled
options only means every click on the parent visibly changes it. Locked
values, unknown values, and duplicates in `S` are preserved by `setAll`.

Fixture: options `a`, `b`, `c` (disabled), `d` (disabled), in that DOM order.

| `S` before                 | Parent state | Click parent → emit | Parent after |
| -------------------------- | ------------ | ------------------- | ------------ |
| `['c']`                    | unchecked    | `['c', 'a', 'b']`   | checked      |
| `['c', 'a', 'b']`          | checked      | `['c']`             | unchecked    |
| `['a', 'c']`               | mixed        | `['a', 'c', 'b']`   | checked      |
| `['x', 'b']` (`x` unknown) | mixed        | `['x', 'b', 'a']`   | checked      |

Native activation from mixed follows the `GhostCheckbox` rule. The parent's
`modelValue` is `false` while mixed, so a click emits `true` and selects all.
Text such as "2 of 3 on" may count locked options. That is copy, not control
state, and the consumer chooses it.

### Reset

- **Native form reset** (a reset button or `form.reset()`): after the full
  `reset` dispatch (`useNativeFormReset` / `afterNativeFormReset`, macrotask),
  the group requests a fresh copy of the captured `defaultValue` baseline. It
  emits that copy in both modes and writes internal state when uncontrolled.
  It skips the emit when the current model already equals the baseline
  element by element. A reset whose event was `preventDefault()`ed does
  nothing. Each member reconciles `input.checked` (and `indeterminate`) as
  `GhostCheckbox` already does.
- The reset listener is the group root's ancestor form (`closest('form')`).
  A `form` attribute on the root or on a member is consumed and never rendered
  (see [Props](#props-and-configuration)), so every member's native form owner
  is that same ancestor form and submission and reset always agree. A group outside any form has no native reset.
- Fixture: uncontrolled, `defaultValue: ['mentions', 'assignments']`. The user
  checks `digest` (state `['mentions', 'assignments', 'digest']`), then the form
  resets. One emit: `['mentions', 'assignments']` (a new array, not the
  `defaultValue` instance). `getAll` is `['mentions', 'assignments']`.
- Controlled without `defaultValue`: reset emits `[]`. This matches native
  reset of unchecked-by-default boxes and `GhostCheckbox`'s `false` seed.
- **Application "Restore defaults"** is the consumer assigning a copy of its own
  defaults (`project.value = [...projectDefaults]`). The group needs no reset
  method.

### Loading, empty, disabled, read-only, and error states

- **Empty:** `[]`. A group with zero members renders its root and slot content
  only. Model values are retained (CG3).
- **Disabled:** group `disabled` disables every member natively. On a
  `fieldset` root the native `disabled` attribute also disables any other form
  control inside the fieldset except those in its first `<legend>`. That
  includes a select-all checkbox placed inside it, which is the intended
  outcome. On a non-fieldset root only members are disabled. A select-all
  checkbox placed there must be disabled by the consumer. Disabled never
  changes the model.
- **Read-only:** not supported. Native `readonly` does not apply to checkboxes.
  Use `disabled` (locked) instead.
- **Error:** `invalid` (CG6, amended). `aria-invalid="true"` and
  `data-state="invalid"` on the root, with error text linked through root
  `aria-describedby`. This holds with zero members and with every member
  disabled.
- **Loading / async:** none. The group performs no asynchronous work. When
  options arrive asynchronously, they register as they mount (rows 10–12) and
  nothing is emitted.

### Async behavior

There are no async paths. Ordering hazards come from controlled parents whose
updated `modelValue` has not rendered yet. Every emit is computed from the
model the group can see at activation time: the rendered `modelValue` prop when
controlled, the internal state when uncontrolled. The group keeps no optimistic
pending value.

- **Controlled: the contract requires a prop update between activations.** The
  cumulative next-value rule holds only when the parent's updated `modelValue`
  has rendered before the next activation. Real user input meets this. Each
  click, tap, or `Space` press is a separate task, and Vue flushes the parent
  update in a microtask before the next task runs.
- **Two activations before Vue renders the updated model** (controlled, for
  example two `input.click()` calls in one synchronous block). Both handlers
  read the same stale prop, so each emit is computed from it alone. Fixture:
  controlled `[]`, `a` then `b` activated in the same tick. Emits are `['a']`,
  then `['b']`. A normal `v-model` parent applies both, last write wins, and
  ends with `['b']`. After `nextTick`, `a` reconciles to unchecked from the
  prop (the row 14 restore path) and `b` is checked. Nothing is lost silently:
  the DOM always matches the final model. Code that toggles several values at
  once should assign the model array instead, as the select-all recipe does.
- **Same fixture with a render in between** (`await nextTick()` between the two
  activations): emits `['a']`, then `['a', 'b']`; the final model is
  `['a', 'b']`.
- **Uncontrolled:** internal state is written synchronously on each activation,
  so same-tick activations accumulate: emits `['a']`, then `['a', 'b']`.
- **Rejected:** an optimistic pending value that accumulates unrendered
  activations. It would make the emitted array depend on state the parent may
  have rejected (row 14), and no approved behavior needs it. This matches
  `GhostCheckbox` and `useControllableState`, which also read the current
  prop.

## Consumer data

- The model is `TValue[]` where `TValue extends string`. The group reads it with
  `includes`, `filter`, and spread only. It never sorts, deduplicates, prunes,
  or mutates it, and never stores the consumer instance as internal state.
- `defaultValue` is shallow-copied at setup so later mutation of the
  consumer's seed array cannot change the reset baseline.
- **Unknown values** (in the model with no mounted member) are retained
  (CG3). They are not submitted (there is no input) and select-all
  ignores them. Hiding, filtering, or lazy-loading options never erases saved
  preferences, and nothing is emitted. This deliberately differs from
  `GhostRadioGroup`, which clears its selection when the selected item
  unmounts. A single-choice control showing no checked radio is simpler than a
  multi-choice control silently dropping data.
- Option identity is the string `value`. Labels and descriptions are slot
  content, so the group never reads option objects or labels.
- Values are compared with `===` after the member's `value` attribute is read
  as a string. `FormData` returns strings, so the submitted shape equals the
  model shape for values that are mounted and enabled.

## Accessibility contract

### Semantics and relationships

- **Root:** native `<fieldset>` by default, which already exposes
  `role="group"`. A non-fieldset `as` gets `role="group"` explicitly.
- **Group name:** a `<legend>` as the fieldset's first child (native), or
  `aria-labelledby` / `aria-label` on the root. `GhostFieldLabel` renders
  `<label for>`, and a `fieldset` is not a labelable element. A `GhostField`
  label pointing at the group root therefore does **not** name the group
  (CG6). Group naming stays compatible with plain `fieldset`/`legend`, which is
  also the starting point for `GhostFieldset` (#464).
- **Group description and error:** `aria-describedby` on the root, either
  native fallthrough or from `GhostFieldControl` slot props.
- **Options:** each member is the existing native `<input type="checkbox">`
  with its own accessible name (wrapping `<label>`, `for`/`id`, or a
  per-option `GhostField`) and its own optional description. The group never
  names options.
- **Invalid:** `aria-invalid="true"` on the group root only (CG6, amended).
  `aria-invalid` is a global state, and this matches `GhostRadioGroup`. The
  group-level error is exposed even with no enabled members. Members carry
  `aria-invalid` only when the consumer marks a per-option error.
- **Mixed parent:** a non-member `GhostCheckbox` with `indeterminate`, exposed
  as mixed through the DOM property. It is never `aria-checked="mixed"`.
- No `aria-multiselectable`, no `listbox`, and no live region.

### Keyboard interaction

Native only. The group adds no key listeners.

| Key         | Behavior                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| `Tab`       | Moves to the next enabled checkbox (members and non-members alike) in DOM order, then out. |
| `Shift+Tab` | Moves to the previous enabled checkbox, then out.                                          |
| `Space`     | Toggles the focused checkbox. On a member it emits the next array once.                    |
| `Enter`     | Does not toggle. Inside a form it triggers implicit submission (user-agent behavior).      |
| Arrow keys  | No group behavior. Pages scroll as usual.                                                  |

Disabled members are skipped by `Tab`. A group with N enabled members plus a
select-all has N + 1 tab stops. This is the APG checkbox pattern, not a
composite widget, so there is **no roving tabindex** and no single tab stop.

### Focus behavior

- Focus is native. The group never traps focus or moves it on mount, on
  model changes, or on `disabled`.
- Visible focus is the member's own `:focus-visible` styling (themed
  `GhostCheckbox` already paints it).
- **Focused option disappears** (CG5). When the member that holds
  `document.activeElement` unmounts while the group stays mounted, the group
  focuses, after flush, the next enabled member in DOM order. If there is
  none, it focuses the previous enabled member. If no enabled member remains,
  it does nothing and focus falls to `document.body`. It acts only when focus
  is still on `body` after the flush, so it never steals focus the consumer
  already moved. When the whole group unmounts it does nothing.
  - Observable: given members `mentions`, `assignments`, `digest` with focus
    on `assignments`, removing `assignments` leaves `digest` focused
    (`toBeFocused()`). Removing `digest` while it is focused and last leaves
    `assignments` focused.
  - Rejected alternative: leaving native behavior, where in Chromium,
    Firefox, and WebKit `document.activeElement` becomes `document.body` and
    the consumer restores focus through the exposed `focus()`.
- A member becoming `disabled` while focused keeps native behavior (the
  element blurs in most engines). The group does not intervene.

### Assistive technology expectations

Screen readers announce the group name on entry ("Project activity, group"),
then each checkbox's own name, state, and description ("Weekly digest,
checkbox, not checked, A Monday summary…"). The mixed parent announces as
mixed or partially checked. Toggling announces only the new checkbox state.
Selection counts are visible text the consumer may place in the group
description. They are not a live region. The AT review plan follows
[assistive-technology-review.md](../standards/assistive-technology-review.md):
NVDA + Firefox and VoiceOver + Safari on the themed preferences example,
covering group entry, mixed parent, locked option, and invalid with error text.

## Rendering and customization

- Unstyled root: the `as` element with class `ghost-checkbox-group`,
  `data-part="root"`, and `data-state` (`invalid` | `disabled` | omitted).
  Single root. Attributes fall through and `class`/`style` merge.
- Members keep `ghost-checkbox`, `data-part="root"`, and `data-state` from
  `GhostCheckbox`. The group adds no wrapper around members and no internal
  DOM. The slot content is the layout.
- Themed `GhostCheckboxGroup`: `.ghost-themed-scope` plus a recipe on
  `.ghost-checkbox-group` for the fieldset reset (border, padding, and
  `min-inline-size: 0` so long labels wrap on phones) and a vertical gap from
  `--ghost-space-stack-sm`. Legend typography uses existing type tokens. The
  recipe targets only the group's own root and its direct `legend` child, never
  nested parts. No new tokens.
- Custom root: out of scope for v1. The context that links members is
  installed only by `GhostCheckboxGroup`, and no injection key is public.
  Change the root host with `as`. A public provider for custom roots could be
  added later as an additive export.

## Environment behavior

### SSR and hydration

- Server markup is a pure function of props. Each member renders `checked`
  from `modelValue ?? defaultValue`, `name` from the group, and `disabled` from
  the effective value. There is no generated id or name, so there is nothing
  to mismatch.
- Membership is resolved during each member's setup from the injected context
  (`includes(value)`). It does not wait for a mounted registry, so SSR output
  already shows the correct checked boxes.
- `indeterminate` on the mixed parent is applied after mount, exactly as in
  `GhostCheckbox`. `data-state="indeterminate"` is in the server HTML.
- No browser globals are read during setup or render. The document `reset`
  listener and focus restoration run only after mount.
- Pre-hydration clicks: a box toggled before hydration is reconciled to the
  model after hydration (the model wins, so the click is lost). This is the
  same outcome as standalone `GhostCheckbox`, and the browser tests record it.

### Mobile and touch

Native touch activation. Wrapping labels or `GhostFieldLabel` enlarge targets.
Themed members already use the `--ghost-control-size-*-min` hit-target floor.
The themed group lets labels wrap at 320 CSS px without horizontal scroll
(`min-inline-size: 0` on the fieldset).

## Performance

Expected scale is 2–50 visible options. Checked-state derivation is one
`includes` per member per model change (O(n·m) with small n and m). If
profiling shows otherwise, a `Set` derived once per model change can replace
it, with no API change. Registration keeps an ordered list of mounted members
(for `focus()`, focus restoration, and duplicate warnings) and nothing else.
There are no observers, timers, or global listeners besides the shared
document `reset` listener pattern. Lists long enough to need virtualization
belong in a multiple Select or Combobox.

## Composition

- `useControllableState<TValue[]>` for the array model.
- `useNativeFormReset` / `afterNativeFormReset` on the root for reset timing.
- `useGhostCheckbox` unchanged for each member's DOM reconciliation
  (`restoreCheckboxDom`). The group supplies the checked state and the change
  handler through injection instead of the member's own `modelValue`.
- `provide`/`inject` with a private group context key, the same pattern as
  `GhostRadioGroup` items. The key is not exported.
- Not used: `useRovingFocus`, `useFocusScope`, `useGhostId` (no ids or names
  are generated).

### Relationship to other proposals

- **`GhostFieldset` (#464).** It owns named sections of **unrelated** fields
  and native disabled-fieldset behavior for those sections. `GhostCheckboxGroup`
  already renders a fieldset for one multi-value control. Authors must not
  wrap a checkbox group in a `GhostFieldset` that repeats the same legend.
  Nesting a group inside a larger fieldset section (for example
  "Notifications" containing "Project activity" and "Account") is valid. If
  #464 ships a legend or description part, the group can accept it later
  without changing this contract. Drafting either spec does not require the
  other component to exist.
- **`GhostForm` (#414).** It validates the consumer's `string[]` with a Standard
  Schema (for example `z.array(z.enum([...])).min(1)`) and maps issues for the
  path `notifications` to a `GhostField name="notifications"`, which can spread
  `invalid` and `aria-describedby` onto the group. Issues for individual
  elements (`notifications.0`) are form-level concerns. The group owns no
  validation or error mapping, and this spec does not require `GhostForm` to
  exist.
- **Multiple `GhostSelect` (#415) / `GhostCombobox` `multiple`.** They share the
  `string[]` model, append order, and retention of unmounted values, so all of
  them produce the same `getAll(name)` shape. They submit through hidden mirror
  inputs. The checkbox group submits through its real checkboxes, so locked
  (disabled) values differ: a disabled checkbox is never submitted.

## Test plan

Evidence to collect at implementation (#467). Each line is an observable
outcome.

### Vue component tests (`packages/vue/src/GhostCheckboxGroup.test.ts`)

- Uncontrolled seed from `defaultValue`. Later `defaultValue` changes and
  mutation of the passed array are ignored.
- Controlled: rows 2–4, 6–7, 9, 14–15 of the transition table, asserting the
  exact emitted arrays, a single emit per activation, and that the emitted
  array is not the input instance (`not.toBe`).
- A frozen `modelValue` (`Object.freeze([...])`) never throws.
- No emit on mount, insert, remove, reorder, parent assignment, or `disabled`
  toggle (rows 1, 5, 8, 10–13, 15–16).
- Ignored emit: `input.checked` restored after `nextTick` (row 14).
- Same-tick activation race (see [Async behavior](#async-behavior)), with a
  controlled `v-model` parent starting at `[]`:
  - Two synchronous `change` dispatches on `a` then `b` without a flush: emits
    exactly `['a']` then `['b']`, the parent ends at `['b']`, and after
    `nextTick` `a` is unchecked and `b` is checked.
  - The same two activations with `await nextTick()` between them: emits
    `['a']` then `['a', 'b']`, and the parent ends at `['a', 'b']`.
  - Uncontrolled, two synchronous dispatches: emits `['a']` then `['a', 'b']`.
- Membership rules: a `GhostCheckbox` without `value` inside the group keeps
  its boolean v-model and emits `update:modelValue: [boolean]`. A member
  `modelValue`/`defaultValue` is ignored with the development warning, and a
  member never emits `update:modelValue`.
- Duplicate option values give a development warning, and both inputs are
  checked together.
- `name` precedence: the group `name` wins and a conflicting item `name` warns.
  Without a group `name`, the item `name` is kept.
- `disabled` precedence: `item || group`. On a fieldset root, a non-member
  checkbox inside is disabled too (browser test).
- Native reset: deferred until after dispatch, skipped when prevented, emits a
  copy of the baseline once, no emit when already equal, and `[]` when
  controlled without `defaultValue`.
- Root semantics: `fieldset` without `role`. `as="div"` gets `role="group"`.
  `data-state` precedence. `required` is not rendered on the root.
- Invalid mapping: with `invalid`, the root has `aria-invalid="true"` and
  `data-state="invalid"`, and no member input has `aria-invalid`. This also
  holds with zero members and with every member disabled. A fallthrough
  `aria-invalid` from Field slot props is consumed (root omits it when
  `invalid` is `false`). A per-option `aria-invalid` on one `GhostCheckbox`
  stays on that input only.
- External form owner: a `form` attribute on the root is not rendered and gives
  the development warning. A member `form="B"` is not rendered on its input
  (`input.hasAttribute('form')` is `false`, also in a production build) and
  gives the member warning. A non-member `GhostCheckbox` (no `value`) keeps its
  `form` attribute. Reset listens on the ancestor form only.
- Exposed `focus()` targets the first enabled checked member, else the first
  enabled member.
- Public entry: `@ghostvue/vue` exports `GhostCheckboxGroup`,
  `useGhostCheckboxGroup`, and the listed types only, with no group provider
  or injection key (`pnpm published-exports`). A `GhostCheckbox` with a
  `value` under a plain element that calls `useGhostCheckboxGroup` stays
  standalone (no membership).
- Themed wrapper forwards the model, emits, and the exposed ref, and keeps the
  `.ghost-themed-scope` root.

### SSR tests (`tests/integration/ghost-checkbox-group-ssr.test.ts`)

- `renderToString` with controlled and uncontrolled seeds: `checked` on
  exactly the selected members, `name` on every member, `disabled` on locked
  members, no generated ids, and `data-state="indeterminate"` on the mixed
  parent without an `indeterminate` attribute.
- Hydration produces no mismatch warning. After hydration, `input.checked`
  equals the model and `indeterminate` is applied.

### Browser tests (`tests/e2e/checkbox-group.spec.ts`, `--trace off` locally)

- `Tab` order visits the select-all and each enabled member, skips locked
  members, and asserts `toBeFocused()` at each stop. `Shift+Tab` reverses.
- `Space` toggles the focused member, and the displayed model text updates.
  `Enter` does not toggle.
- `FormData.getAll('notifications')` after each transition table row that a
  browser can drive (2–4, 8–13, 16), including DOM order after reorder (row 13) and locked exclusion.
- Select-all: the four-row fixture above. Mixed via `indeterminate` DOM
  property and accessible state.
- Removing the focused member: focus moves to the next enabled member, or to
  the previous enabled one when it was last, asserted with `toBeFocused()`
  (CG5). Focus stays on `document.body` when no enabled member remains, and the
  group does not move focus the consumer already moved.
- Native reset button: model, `checked` boxes, and `getAll` return to the
  baseline. A `preventDefault()` reset changes nothing.
- Form ownership: with the group inside the form, both submission
  (`getAll('notifications')`) and reset use that form. With the group outside
  a form and `form="prefs"` on the root (the unsupported case), the root
  renders no `form` attribute, `new FormData(prefs)` contains no member
  values, and resetting `prefs` does not change the model, so submission and
  reset never disagree.
- Two-form fixture: forms `A` and `B` on one page. The group
  (`name="notifications"`, uncontrolled, `defaultValue: ['mentions']`) sits
  inside `A`, and its `digest` member is given `form="B"`. Assertions:
  - The `digest` input has no `form` attribute, and `input.form` is `A`.
  - After checking `digest`, `new FormData(A).getAll('notifications')` is
    `['mentions', 'digest']` and `new FormData(B).getAll('notifications')` is
    `[]`.
  - `B.reset()` leaves the model at `['mentions', 'digest']` and `digest`
    checked.
  - `A.reset()` restores the model to `['mentions']` with `digest` unchecked,
    and `getAll` on `A` is `['mentions']`.
- Two sequential user clicks (`page.click` on `a`, then `b`) on a controlled
  group accumulate to `['a', 'b']` in the model readout and in `getAll`.
- Pre-hydration click is reconciled to the model (Nuxt fixture).
- axe on the docs example and the playground, with the group enabled,
  disabled, and invalid (root `aria-invalid`, including an invalid group whose
  members are all disabled). The group name comes from the legend and from
  `aria-labelledby`.
- `@cross-browser` (Chromium, Firefox, WebKit) for Tab order, Space, and focus
  after removal. WebKit `Tab` reaches checkboxes only with full keyboard access
  enabled, so use the existing cross-browser setup.

### Compile-time tests (`packages/vue/type-tests/GhostCheckboxGroupConsumer.vue`)

- `v-model` with `Ref<('a' | 'b')[]>` infers `TValue = 'a' | 'b'`, and
  `update:modelValue` receives `('a' | 'b')[]`.
- A `readonly ('a' | 'b')[]` is accepted for `modelValue` and `defaultValue`.
- `@ts-expect-error` on `modelValue: number[]` and on a `defaultValue` value
  outside `TValue`.
- Standalone `GhostCheckbox` still rejects an array `modelValue`
  (`@ts-expect-error`) and still emits `boolean`.

### Regression fixtures

- The existing `GhostCheckbox` test suite, `checkbox/*` examples, and visual
  baselines pass unchanged. A standalone checkbox outside any group shows no
  behavior change.
- `GhostDataTable` selection checkboxes are unaffected because they do not
  render inside a group.

## Documentation plan

Themed first, following the component-guide publishing standard:

- New guide `docs/components/checkbox-group.md`. It leads with
  the executable example `checkbox-group/notification-preferences`: the themed
  preferences panel above, built with `GhostField` per option, a derived
  select-all, a locked option, **Restore defaults**, and a visible readout of
  the model array and of `FormData.getAll('notifications')` on save.
- Further examples: `checkbox-group/basic` (themed, legend, three options),
  `checkbox-group/form` (native submit and reset with `getAll`),
  `checkbox-group/field` (error text with `invalid` and `aria-describedby`),
  and an "Advanced: headless composition" section with `checkbox-group/headless`
  (the unstyled `GhostCheckboxGroup` and `GhostCheckbox` from `@ghostvue/vue`;
  no custom root).
- Sections on the array model and ordering (with the transition table
  condensed), unknown and removed values, locked options and submission, the
  select-all recipe and why disabled options do not count, labeling with
  legend versus `aria-labelledby`, keyboard, focus after removal, and SSR.
- `docs/components/checkbox.md`: replace the "groups deferred" wording with a
  link, and keep `checkbox/notification-preferences` or point it to the group
  example (a docs decision at implementation, keeping old anchors).
- Generated API tables from the new manifests (`pnpm docs:api:write`), and
  registry and playground entries with copy that does not repeat the docs.

## Compatibility and release impact

- **Additive.** New `GhostCheckboxGroup` (both packages), `useGhostCheckboxGroup`,
  and types. Minor Changesets for `@ghostvue/vue` and `@ghostvue/themes` at
  implementation. This docs-only PR needs no Changeset.
- **Standalone `GhostCheckbox` is unchanged:** same props, emits, types,
  boolean v-model, form reset, and markup. The only new code path runs when a
  group context is injected **and** the checkbox has a `value`. No published
  release has a group, so no existing consumer can reach it.
- `GhostCheckboxProps` does not gain a declared `value` prop under CG1. The
  native `value` attribute keeps its current `InputHTMLAttributes` type, so no
  standalone consumer's types narrow.
- Future changes that need compatibility review: changing ordering (CG2),
  pruning unknown values (CG3), adding slot props (CG4, additive), changing
  focus restoration (CG5), and adding `required`, `min`, or `max`.
- Implementation gate: `.github/release-scope.json` maps implementation #467 to
  this spec (`checkbox-group`). The design approval recorded here is not
  release inclusion: #467 stays blocked until this approved spec is merged into
  `master` and the #467 implementation criteria are reconciled with it.
  Inclusion in `0.2.0` remains a separate decision.

## Resolved decisions

Zac signed off on the recommended choice for each of CG1–CG7 at commit
`28ae0b6` (`28ae0b6efc75f3ad698c84f07fdb3b1180939aa4`). The repo admin
`zprue743` recorded the sign-off on his behalf on 2026-11-28 in
[PR #504](https://github.com/zprue743/ghostvue/pull/504#issuecomment-7240055885).
This is design sign-off only. It is not merge approval or release inclusion.
Implementation (#467) stays blocked until this approved spec is merged into
`master` and the #467 implementation criteria are reconciled with it.

1. **CG1: member part.** Reuse `GhostCheckbox`. A checkbox is a member when it
   has a group ancestor and a `value`. Without a `value` it stays standalone
   (the select-all case). Themed CSS, refs, and Field wiring are reused as is.
   **Accepted cost:** `value` is not compile-time linked to `TValue`.
   **Rejected:** a new `GhostCheckboxGroupItem` (plus a themed twin) with a
   required `value: string`, which would add a second checkbox component and a
   duplicated themed recipe. _Approved by Zac, 2026-11-28._
2. **CG2: order.** The model keeps stable consumer order: check appends, uncheck
   filters, and untouched entries keep their position. This follows Vue's
   native array `v-model`, `GhostCombobox` `multiple`, and `GhostDataTable` row
   selection, and also matches `useGhostToggleGroup`'s append-on-toggle
   behavior. `FormData.getAll(name)` is always DOM order, because it comes from
   the real checkboxes. The model and `getAll` can therefore differ in order
   (transition rows 4, 7, and 13). **Rejected:** re-sorting the emitted array
   into mounted DOM order, which would make the model depend on mount state.
   _Approved by Zac, 2026-11-28._
3. **CG3: unknown and unmounted values.** Retain them and never emit on
   unregister (as in `GhostCombobox`). **Rejected:** pruning on unregister like
   `GhostRadioGroup`, which risks erasing saved preferences when options are
   filtered or load late. _Approved by Zac, 2026-11-28._
4. **CG4: select-all.** A documented consumer recipe only. The group adds no
   slot props, so the first release has the smallest surface and the consumer
   keeps owning the enabled option list. **Deferred:** default-slot props
   `{ allSelected, someSelected, setAll(checked) }` are additive and can follow
   later. _Approved by Zac, 2026-11-28._
5. **CG5: focus after a focused option unmounts.** Move focus to the next
   enabled member in DOM order, else the previous enabled member. This happens
   only while the group stays mounted and focus is still on `body` after the
   flush (see [Focus behavior](#focus-behavior)). **Rejected:** native behavior
   (focus falls to `body`) plus a documented `focus()` recipe. _Approved by
   Zac, 2026-11-28._
6. **CG6: naming, invalid, and required mapping.** Name the group with a
   `legend` or `aria-labelledby`, not a `GhostFieldLabel` `for`. `invalid` sets
   root `data-state="invalid"` and root `aria-invalid="true"` (amended after
   approval; originally on member inputs, see
   [Post-approval amendments](#post-approval-amendments)).
   There is no group `required`. Descriptions and errors use root
   `aria-describedby`. **Rejected here:** teaching `GhostField` to emit
   `aria-labelledby` for group controls. That belongs to the Field and Fieldset
   specs (shared with `GhostRadioGroup` and #464). _Approved by Zac,
   2026-11-28._
7. **CG7: package surface.** Ship headless `GhostCheckboxGroup` and
   `useGhostCheckboxGroup` in `@ghostvue/vue`, and a thin themed
   `GhostCheckboxGroup` in `@ghostvue/themes` (stack gap and fieldset reset
   only). **Rejected:** headless-only, with themed layout left to consumer CSS.
   _Approved by Zac, 2026-11-28._

### Post-approval amendments

After the CG1–CG7 sign-off, the maintainer `zprue743` asked for later review
findings to be applied in PR #504
([first request](https://github.com/zprue743/ghostvue/pull/504#discussion_r4727911224),
with follow-ups in the comments linked below).
They were applied at those requests. They narrow or correct the contract and do
not change any other approved decision. They are not a new approval.

- **Group invalid state** (`504-group-invalid-state`). `aria-invalid="true"`
  moves from every enabled member to the group root, as in `GhostRadioGroup`.
  A group constraint is exposed even when the group has no enabled members.
  This supersedes the member mapping originally recorded in CG6.
- **External form owner** (`504-external-form-owner`). Dropped from the
  contract: the group must be inside its form. A `form` attribute on the root
  or on a member is consumed, never rendered, and warns in development, so a
  member always submits and resets with the group's form (see
  [Props](#props-and-configuration); member case from
  [4728111966](https://github.com/zprue743/ghostvue/pull/504#discussion_r4728111966)).
- **Controlled activation race** (`504-controlled-activation-race`). The
  controlled contract requires the updated `modelValue` to render between
  activations. Two activations before that render each build on the stale
  prop (last write wins); see [Async behavior](#async-behavior).
- **Headless provider gap** (review comment
  [4728198254](https://github.com/zprue743/ghostvue/pull/504#discussion_r4728198254)).
  The custom-root recipe (`useGhostCheckboxGroup` plus `provide`) is removed.
  A custom root is out of scope for v1 because a public provider or key would
  widen the approved CG7 export surface. It can be added later as an
  additive export with maintainer approval.
