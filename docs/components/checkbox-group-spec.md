---
schemaVersion: 1.0.0
component: GhostCheckboxGroup
components:
  - GhostCheckboxGroup
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: draft
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
unresolvedQuestions:
  - question: 'Issue #463 (0.2.0 GhostCheckboxGroup): maintainer decision CG1 — group members are existing GhostCheckbox instances with a string value vs a new GhostCheckboxGroupItem part — before #467 implementation.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG2 — emitted array order (stable consumer order with appends, matching Vue native and GhostCombobox multiple) vs canonical option (DOM) order — before #467.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG3 — values without a mounted option are retained and never pruned (matching GhostCombobox) vs pruned on unregister (closer to GhostRadioGroup) — before #467.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG4 — select-all derivation stays a documented consumer recipe vs group slot props (allSelected, someSelected, setAll) — before #467.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG5 — focus moves to the nearest enabled option when the focused option unmounts vs native behavior (focus falls to body) — before #467.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG6 — invalid/required/Field mapping (aria-invalid on member inputs, no group required prop, legend or aria-labelledby for the group name) — before #467.'
    blocking: false
    reviewer: Zac
  - question: 'Issue #463: maintainer decision CG7 — package surface (headless group plus useGhostCheckboxGroup in @ghostvue/vue and a thin themed GhostCheckboxGroup in @ghostvue/themes) vs headless-only — before #467.'
    blocking: false
    reviewer: Zac
---

# Component specification: `GhostCheckboxGroup`

> [!IMPORTANT]
> **Status:** Draft ([#463](https://github.com/zprue743/ghostvue/issues/463)).
> This is a docs-only specification. No runtime code, manifest, or export exists
> yet. Implementation ([#467](https://github.com/zprue743/ghostvue/issues/467))
> waits until a maintainer resolves
> [open architectural questions](#open-architectural-questions) CG1–CG7 and
> records `specStatus: approved` with `approval.evidence`. Release inclusion is a
> separate decision.

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

Recommended surface ([CG7](#open-architectural-questions)):

`@ghostvue/vue`:

- `GhostCheckboxGroup`: root component (`generic="TValue extends string"`).
- `useGhostCheckboxGroup`: composable that owns selection state, membership,
  and reset for advanced composition, mirroring `useGhostRadioGroup`.
- Types: `GhostCheckboxGroupProps<TValue>`, `GhostCheckboxGroupEmits<TValue>`,
  `GhostCheckboxGroupExposed`, `UseGhostCheckboxGroupOptions<TValue>`,
  `GhostCheckboxGroupContext`.
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

| Prop           | Type                             | Default      | Contract                                                                                                                                                                              |
| -------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `readonly TValue[] \| undefined` | `undefined`  | Controlled selection. `undefined` is uncontrolled. `[]` is a defined empty selection. Accepts readonly and frozen arrays; never mutated.                                              |
| `defaultValue` | `readonly TValue[]`              | `[]`         | Uncontrolled seed and form-reset baseline. Shallow-copied once at setup; later prop changes and later mutation of the passed array are ignored.                                       |
| `name`         | `string \| undefined`            | `undefined`  | Native `name` applied to every member input. No generated name: checkboxes need no shared name to behave as a group, and an unnamed group submits nothing (native parity).            |
| `disabled`     | `boolean`                        | `false`      | Disables every member input natively. On a `fieldset` root it also sets the native `disabled` attribute (see [Disabled](#loading-empty-disabled-read-only-and-error-states)).         |
| `invalid`      | `boolean`                        | `false`      | Error presentation hook for Field or form integration. Sets `data-state="invalid"` on the root and `aria-invalid="true"` on each member input ([CG6](#open-architectural-questions)). |
| `as`           | `string \| Component`            | `'fieldset'` | Root host. A `fieldset` needs no role. Any other host gets `role="group"`.                                                                                                            |

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
(`id`, `aria-labelledby`, `aria-describedby`, `class`, `style`, `form` on a
fieldset). The keys `invalid`, `required`, and `aria-invalid` from
`GhostFieldControl` slot props are consumed and not rendered on the root. A
`fieldset` does not support `required`. `aria-invalid` is not a supported state
on `group`, so it moves to member inputs as described above.

#### Member checkboxes: which `GhostCheckbox` props stay authoritative

Recommended ([CG1](#open-architectural-questions)): a `GhostCheckbox` becomes a
member when it has a group ancestor **and** a string `value` attribute. Without
a `value` it stays a standalone boolean checkbox, even inside the group. That is
how the select-all lives inside the same `fieldset`.

| `GhostCheckbox` input             | Standalone (today, unchanged) | Member of a group                                                                                                                                           |
| --------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value` (native attribute)        | Native `value` only           | Membership key **and** native `value`. Compared as a string.                                                                                                |
| `modelValue` / `v-model`          | Boolean checked state         | Ignored. Checked state is `group.includes(value)`. Development warning (new `GHOST0xx` code, registered in `docs/warnings.md` at implementation).           |
| `defaultValue`                    | Seed and reset baseline       | Ignored, with the same development warning. The group's `defaultValue` is the baseline.                                                                     |
| `indeterminate`                   | Mixed display                 | Still authoritative and display-only. It never adds or removes the value.                                                                                   |
| `disabled`                        | Native disabled               | Authoritative. Effective disabled is `item.disabled \|\| group.disabled`.                                                                                   |
| `name` (native attribute)         | Native `name`                 | When the group has a `name`, the group's `name` wins. A different item `name` gives a development warning. Without a group `name`, the item `name` is kept. |
| `id`, `aria-*`, `form`, listeners | Fall through                  | Fall through unchanged. `GhostFieldControl` slot props per option keep working.                                                                             |
| `required` (native attribute)     | Native required               | Falls through unchanged (for example a consent box). It never means "at least one".                                                                         |
| `update:modelValue` emit          | Emitted after activation      | **Not emitted.** The group emits once. Native `@change` and `@click` listeners still fire.                                                                  |
| Exposed `element`/`focus`/`blur`  | Unchanged                     | Unchanged.                                                                                                                                                  |

Because `value` is not a declared prop, the group's `TValue` cannot be checked
against each member's `value` at compile time. Vue does not infer generics
across parent and slot children. This is the main type cost of CG1. The
alternative `GhostCheckboxGroupItem` part (required `value: string`) removes the
implicit membership rule but adds a second checkbox component and its themed
twin.

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
- **Next-value rule** (CG2 recommended, stable consumer order):
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
  non-member content. Recommended: no slot props in `0.2.0`
  ([CG4](#open-architectural-questions)).
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

Recommended ([CG4](#open-architectural-questions)): a documented recipe, not a
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
- The reset listener is the group root's owning form (`HTMLFieldSetElement.form`
  or `closest('form')`). Members with a different `form` attribute are
  unsupported for reset.
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
- **Error:** `invalid` (CG6). Error text is linked through `aria-describedby`.
- **Loading / async:** none. The group performs no asynchronous work. When
  options arrive asynchronously, they register as they mount (rows 10–12) and
  nothing is emitted.

### Async behavior

There are no async paths. Ordering hazards come from controlled parents that
apply emits late. Every emit is computed from the **current** `modelValue` at
activation time, never from a cached copy. Two activations before the parent
flushes therefore each build on the latest prop. A parent that applies only the
last emit sees the last activation win. This matches `GhostCheckbox` and
`useControllableState`.

## Consumer data

- The model is `TValue[]` where `TValue extends string`. The group reads it with
  `includes`, `filter`, and spread only. It never sorts, deduplicates, prunes,
  or mutates it, and never stores the consumer instance as internal state.
- `defaultValue` is shallow-copied at setup so later mutation of the
  consumer's seed array cannot change the reset baseline.
- **Unknown values** (in the model with no mounted member) are retained (CG3
  recommended). They are not submitted (there is no input) and select-all
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
- **Invalid:** `aria-invalid="true"` on each enabled member input, because
  `checkbox` supports `aria-invalid` and `group` does not (CG6).
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
- **Focused option disappears** (CG5 recommended). When the member that holds
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
  - Native alternative (CG5 alt): the library does nothing, and in Chromium,
    Firefox, and WebKit `document.activeElement` becomes `document.body`. The
    consumer restores focus through the exposed `focus()`.
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
- Escape hatch: `useGhostCheckboxGroup` plus `provide` lets a consumer build
  a custom root (for example a table of checkboxes) without the component.

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
- `provide`/`inject` with a group context, the same pattern as
  `GhostRadioGroup` items.
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
  `data-state` precedence. The `invalid`/`required`/`aria-invalid` keys are not
  rendered on the root, and `aria-invalid="true"` is on enabled members.
- Exposed `focus()` targets the first enabled checked member, else the first
  enabled member.
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
- Removing the focused member: focus moves to the next member, or to the
  previous one when it was last, asserted with `toBeFocused()` (CG5), or
  `document.body` under the native alternative.
- Native reset button: model, `checked` boxes, and `getAll` return to the
  baseline. A `preventDefault()` reset changes nothing.
- Pre-hydration click is reconciled to the model (Nuxt fixture).
- axe on the docs example and the playground, with the group enabled,
  disabled, and invalid. The group name comes from the legend and from
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
  and the composable.
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
  this spec (`checkbox-group`). Implementation and inclusion in `0.2.0` are
  separate decisions from this draft.

## Open architectural questions

None of these block this docs-only draft. All of them block implementation
(#467) until a maintainer resolves them and records approval evidence.

1. **CG1: member part (reviewer: Zac).**
   - **Recommended:** reuse `GhostCheckbox`. A checkbox is a member when it has
     a group ancestor and a `value`. Without a `value` it stays standalone (the
     select-all case). Themed CSS, refs, and Field wiring are reused as is. The
     cost is that `value` is not compile-time linked to `TValue`.
   - **Alternative:** a new `GhostCheckboxGroupItem` (plus a themed twin) with a
     required `value: string`. Membership is explicit, at the cost of a second
     checkbox component and duplicated themed recipe.
2. **CG2: emitted order (reviewer: Zac).**
   - **Recommended:** stable consumer order: appends on check, filter on
     uncheck, and untouched entries keep their position. This matches Vue's
     native array `v-model`, `GhostCombobox` `multiple`, and `GhostDataTable`
     row selection. `getAll` is always DOM order.
   - **Alternative:** canonical option order. The emitted array is re-sorted by
     mounted DOM order with unknown values appended. Model and `getAll` then
     agree, but order depends on mount state, and a reorder silently
     disagrees until the next click. Note that the `GhostToggleGroup` spec says
     "registration order" while `useGhostToggleGroup` appends on toggle. Either
     choice here should state which precedent it follows.
3. **CG3: unknown and unmounted values (reviewer: Zac).**
   - **Recommended:** retain them and never emit on unregister (as in
     `GhostCombobox`).
   - **Alternative:** prune on unregister like `GhostRadioGroup` (uncontrolled
     internal state only, no controlled emit). This risks erasing saved
     preferences when options are filtered or load late.
4. **CG4: select-all helper (reviewer: Zac).**
   - **Recommended:** a documented recipe only, so `0.2.0` has the smallest
     surface. The consumer already owns the enabled option list.
   - **Alternative:** default-slot props
     `{ allSelected, someSelected, setAll(checked) }`, computed from enabled
     mounted members. This is additive and could follow later.
5. **CG5: focus after a focused option unmounts (reviewer: Zac).**
   - **Recommended:** move focus to the next enabled member, else the previous
     one, only while the group is mounted and focus is on `body`.
   - **Alternative:** native behavior (focus falls to `body`) plus a documented
     `focus()` recipe.
6. **CG6: Field, invalid, and required mapping (reviewer: Zac).**
   - **Recommended:** name the group with `legend` or `aria-labelledby`, not a
     `GhostFieldLabel` `for`. `invalid` sets root `data-state` and member
     `aria-invalid`. There is no group `required`. Descriptions and errors use
     root `aria-describedby`.
   - **Alternative:** teach `GhostField` to emit `aria-labelledby` for group
     controls (shared with `GhostRadioGroup` and #464). That change belongs to
     the Field and Fieldset specs.
7. **CG7: package surface (reviewer: Zac).**
   - **Recommended:** headless `GhostCheckboxGroup` and `useGhostCheckboxGroup`
     in `@ghostvue/vue`, and a thin themed `GhostCheckboxGroup` in
     `@ghostvue/themes` (stack gap and fieldset reset only).
   - **Alternative:** headless-only, with themed layout left to consumer CSS. The
     themed-first docs example would then carry its own fieldset reset.
