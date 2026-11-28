---
schemaVersion: 1.0.0
component: GhostFieldset
components:
  - GhostFieldset
packages:
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'On 2026-11-28 the requester for issue #464 gave advance design approval in the task handoff: “I give my approval in advance on your design recommendations”. This covers the native fieldset recipe recommended here.'
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

# Fieldset for related form fields

## Purpose and user problems

Use a native `<fieldset>` with one visible `<legend>` as its first child.
“Billing address” tells someone why the next two inputs belong together.
“Street address” and “City” still identify the individual values when a user
navigates directly to either input. [WAI guidance on grouping controls](https://www.w3.org/WAI/tutorials/forms/grouping/)

## Non-goals

Selection belongs to the choice control. Field registration, validation timing,
error announcements on submit and focus on the first invalid control belong to
the consuming form. An ordinary HTML form can use this recipe today,
independently of the [GhostForm design](https://github.com/zprue743/ghostvue/issues/414).

## Public API

**Recommend a themed documentation recipe using native markup.** For two
labelled inputs the group costs one fieldset and one legend. HTML already
supplies the group name, disabled inheritance and submission rules. A public
`GhostFieldset` could generate IDs and assemble optional message references,
but it would still need both semantic elements and the same two field labels.
The recipe needs one instance ID only when referencing other content. This
delivers the example with zero new exports, props, slots or theme selectors.

`GhostFieldset` in the spec index identifies the design. The recipe uses the
existing `@ghostvue/themes` field parts and input. A headless consumer can use
the same markup with `@ghostvue/vue` or native inputs. All attributes on the
fieldset, legend and messages are ordinary HTML attributes under caller control.

## State model

Bind `disabled` to the fieldset when the section is unavailable. Enabling
it restores participation for descendants that are otherwise enabled; a
control with its own `disabled` stays disabled. Preserve values while toggling.
For a read-only text value that should still submit, use `readonly` on its
input. There is no native read-only fieldset.

A group error explains a problem with the combination of values. The author
controls when the message exists and changes its reference in the same render.
A field-specific error goes on the affected `GhostField` using `invalid` and
`GhostFieldError`. Disabling the group leaves visible instructions and errors
available in reading order. The group has no model, async work or reset handler.

## Consumer data

The form owns values and submission names. A fieldset groups controls visually
and semantically. Its own `id` or `name` adds no entry to `FormData`, and it
does not prefix descendant names. Give sibling address sections distinct input
names if the receiver needs to distinguish billing from shipping.

## Accessibility contract

The fieldset exposes a group named by its first legend. The default needs no
ARIA name. If a caller supplies a valid `aria-labelledby`, it takes precedence
over a nonempty `aria-label`, which takes precedence over the legend. Keep
the visible legend in the accessible name when overriding it. Each field label
names only its own control. [HTML accessibility mappings](https://www.w3.org/TR/html-aam/#fieldset-element-accessible-name-computation)

For a group hint and a group error, render visible text with separate IDs.
On the fieldset, build **one** `aria-describedby` list in reading order:
caller-supplied IDs first, then the present hint and error. Drop duplicates,
empty tokens and references to removed messages; omit the attribute when
empty. Bind `aria-invalid="true"` on the fieldset while the group error
applies. The field controls keep their own hint/error references and validity.
A changing description alone does not guarantee a live announcement.

Tab and Shift+Tab follow document order. The group, plain legend and messages
add no focus stops or key handlers. Native disabled-fieldset rules apply to
descendant form controls **except those inside its first legend**. An otherwise
enabled control inside that legend remains focusable and, if successful,
submits. An ordinary link elsewhere in the fieldset also retains its native
behavior. Use a plain legend for the billing recipe. [HTML fieldset and legend rules](https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element)

## Rendering and customization

The following SFC uses the application's existing theme host. Its optional
props represent inputs to the **example**. Supplying an ID sets the exact
fieldset ID and the base for its message IDs.

```vue
<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'

const props = defineProps<{
  id?: string
  disabled?: boolean
  error?: string
}>()
const generatedId = useId()
const base = computed(() => props.id ?? generatedId)
const describedBy = computed(() =>
  [`${base.value}-hint`, ...(props.error ? [`${base.value}-error`] : [])].join(
    ' ',
  ),
)
</script>

<template>
  <form>
    <fieldset
      :id="base"
      class="billing"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="error ? true : undefined"
    >
      <legend>Billing address</legend>
      <p :id="`${base}-hint`">Use the address on your invoice.</p>
      <p v-if="error" :id="`${base}-error`">{{ error }}</p>
      <div class="billing-fields">
        <GhostField>
          <GhostFieldLabel>Street address</GhostFieldLabel>
          <GhostFieldDescription
            >Include your apartment number.</GhostFieldDescription
          >
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              name="street"
              autocomplete="billing address-line1"
              default-value="14 Oak St"
            />
          </GhostFieldControl>
        </GhostField>
        <GhostField>
          <GhostFieldLabel>City</GhostFieldLabel>
          <GhostFieldDescription
            >Use the postal city name.</GhostFieldDescription
          >
          <GhostFieldControl v-slot="field">
            <GhostInput
              v-bind="field"
              name="city"
              autocomplete="billing address-level2"
              default-value="Madison"
            />
          </GhostFieldControl>
        </GhostField>
      </div>
    </fieldset>
    <button type="submit">Save address</button>
  </form>
</template>

<style scoped>
.billing {
  min-inline-size: 0;
  margin: 0;
  padding: var(--ghost-space-stack-sm);
  overflow-wrap: anywhere;
}
.billing-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ghost-space-gap-sm);
}
</style>
```

At phone width both controls stay in a single column. Keep the native legend
in reading order and let long translations and error text wrap. The two
classes belong to this example; consumers may style their own elements.

## Environment behavior

Allocate the group base once per Vue instance with `useId()`, even when a
caller overrides it. An explicit nonempty ID must be unique in the document,
including its derived suffixes. Caller-supplied message IDs, if used, go on
the message and in the fieldset's ID list together. Each `GhostField` manages
its separate control ID; pass a control ID to `GhostField` for an override.
Use distinct Vue application ID prefixes for multiple SSR roots on one page.

Server and client render the same initial hint, error and disabled state. The
group relationships exist in server HTML before JavaScript runs. Hydration
preserves them. Native labels, disabled rules, form submission and mobile
keyboard behavior work without a group lifecycle hook.

## Performance

The recipe constructs IDs from the section's own messages. Grouping needs no
descendant traversal, listener, field registry or per-input subscription.

## Composition

Keep one `GhostField` around each input. For a _single radio question_, use
the radio group's own fieldset and put its legend first in the default slot:

```vue
<GhostRadioGroup as="fieldset" name="cadence" default-value="annual">
  <legend>Billing cadence</legend>
  <label><GhostRadioGroupItem value="monthly" /> Monthly</label>
  <label><GhostRadioGroupItem value="annual" /> Annual</label>
</GhostRadioGroup>
```

This uses one named group for the choice shown in the deployment-tier example.
Keep the checked value and radio keyboard behavior with `GhostRadioGroup`.
Nest a separately named radio question inside a larger section only when both
names convey distinct information. For related independent preferences, give
the section a legend and each checkbox its own label; keep select-all logic
with the preferences form.

## Test plan

Use the displayed defaults in the billing form. Compare the computed names
and descriptions separately from any extra context a screen reader speaks.
In each row the textbox names are **Street address** and **City**, with the
individual descriptions **Include your apartment number.** and **Use the
postal city name.**

| Billing state            | Group name and description                                                             | Tab stops in order                   | Entries in `new FormData(form)`    |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------- |
| Enabled                  | Billing address / Use the address on your invoice.                                     | Street address → City → Save address | `street=14 Oak St`, `city=Madison` |
| Enabled with group error | Billing address / Use the address on your invoice. Check the street and city together. | Street address → City → Save address | Same two entries                   |
| Disabled                 | Billing address / Use the address on your invoice.                                     | Save address                         | Empty                              |

Collect this evidence with the executable recipe in the implementation issue:

- **Browser and keyboard.** Assert names and descriptions by role, actual focus
  in both directions, and form entries in DOM order after editing, disabling
  and re-enabling. In a separate fixture add an otherwise enabled, labelled,
  checked checkbox named `include` with value `yes` inside the first legend.
  With the group disabled, Tab visits that checkbox, then Save address. The
  sole entry is `include=yes`. Unchecking it yields an empty entry list.
- **Ownership and errors.** Toggle the group error, a city-only error and both
  together. Check the two description lists, invalid states and absence of
  stale or duplicate IDs. Check caller-provided name, message and control IDs,
  including an external description. Run axe with and without errors and
  while disabled. For the radio example assert one group named Billing cadence,
  one radio Tab stop, arrow-key selection and the selected `cadence` entry.
- **SSR and hydration.** Server-render sibling billing and shipping fieldsets,
  one generated base and one explicit base, with different message states.
  Assert each label and group reference resolves in its section. Hydrate the
  same tree and compare IDs and relationships, check for hydration warnings,
  then change one group's error and confirm its sibling is unaffected.
- **Layout and types.** Typecheck the themed SFC against public imports. At
  320 CSS pixels and with long translated text, check wrapping, visible focus,
  label activation and absence of horizontal scrolling. There is no new
  framework-neutral logic or exported type requiring a unit/type fixture.
- **Assistive technology.** On NVDA with Firefox and VoiceOver with Safari,
  navigate into, through and out of the section using Tab and reading commands.
  Record whether the legend provides context, each field is distinguishable,
  hints and errors can be found, and the disabled section and legend exception
  behave as above. Check the phone layout with touch exploration. Record tester,
  revision, OS, AT/browser versions, observations and defects per pairing.
  Legend repetition and exact speech vary by reader and navigation mode.
  [Assistive-technology review process](../standards/assistive-technology-review.md)

## Documentation plan

Lead the Field guide with a runnable themed billing-address section and use
the same example in the playground. Show the disabled variant, the separate
group and field errors, and the submitted entries beside the form. Follow
with the single-legend radio example and a headless/native adaptation.

## Compatibility and release impact

[Issue #464](https://github.com/zprue743/ghostvue/issues/464) schedules design
for 0.2.0. This docs-only change needs no Changeset or migration. The
[implementation issue](https://github.com/zprue743/ghostvue/issues/468) owns
the executable example, its registration against existing components and
the evidence above. Release inclusion is a separate decision.

## Open architectural questions

The native recipe resolves the package and accessibility decisions for this
scope. Reconsider a public primitive if independent consumers repeatedly need
the same message-association logic and an export would remove that duplication.
