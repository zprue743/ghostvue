---
schemaVersion: 1.0.0
component: GhostForm
components:
  - GhostForm
packages:
  - '@ghostvue/vue'
specStatus: approved
approval:
  evidence: 'Zac signed off on the GhostForm proposal (F1-F5 as proposed) at eda553c2c6b6a0a098db1c5aafff8a9893848719, recorded by zprue743 on PR #487 (2026-11-28), with follow-up spec revisions for submit-lock preservation and native-reset suppression.'
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

# Component specification: `GhostForm`

> [!IMPORTANT]
> **Status:** Approved design ([#414](https://github.com/zprue743/ghostvue/issues/414)).
> Zac signed off on F1–F5 as proposed at `eda553c2c6b6a0a098db1c5aafff8a9893848719`
> (recorded by `zprue743` on PR #487, 2026-11-28). This is a docs-only
> specification PR; implementation
> ([#420](https://github.com/zprue743/ghostvue/issues/420)) remains **blocked
> until this revised specification PR merges** into `master`.

## Purpose and user problems

[`GhostField`](/specs/field) wires accessible label, description, and error
relationships (`for`/`id`, `aria-describedby`, `aria-invalid`, `required`) for a
single control, while leaving validation scheduling, schema execution, error
mapping, and focus recovery to each screen. In practice, every form screen ends
up hand-rolling the same fragile plumbing seen in `examples/field/profile-settings.vue`:

- computing per-field validity flags and matching error copy by hand;
- intercepting native `<form novalidate>` `submit` events and manually querying
  `[aria-invalid="true"]` to move focus when validation fails;
- parsing raw control strings into domain types (trimmed strings, coerced
  numbers, normalized emails, structured nested records) outside a typed
  submission boundary;
- guarding asynchronous schema checks and async submit mutations against
  duplicate clicks, out-of-order responses, and mid-flight form resets; and
- separating field-scoped errors from form-level cross-field or server failures.

`GhostForm` and `useGhostForm` provide a headless, schema-library-agnostic form
contract built on the
[Standard Schema v1](https://standardschema.dev/) (`~standard`) interface:

- Consumers keep full ownership of reactive control state (`v-model` on
  `GhostInput`, `GhostTextarea`, `GhostSelect`, `GhostCheckbox`,
  `GhostRadioGroup`, `GhostNumberInput`, `GhostDatePicker`, and future
  multi-value primitives).
- Any Standard Schema v1 validator (Zod 3.24+/4, Valibot 1.0+, ArkType 2.0+,
  Yup 1.7+, or a plain inline `~standard` object) validates consumer input and
  delivers **typed transformed output** (`StandardSchemaV1.InferOutput<TSchema>`)
  to the submit handler only when validation succeeds.
- Field-path issues automatically associate with matching `<GhostField name="…">`
  instances so `invalid`, `aria-invalid="true"`, `GhostFieldError` visibility,
  and `aria-describedby` stay synchronized without per-field boilerplate, while
  root/form-level issues surface cleanly for [`GhostInlineAlert`](/specs/inline-alert)
  or custom summaries.
- Standalone `GhostField` instances outside `GhostForm`—or inside `GhostForm`
  without a `name` prop—keep their exact `0.1.0` prop-driven behavior.

## Non-goals

- **Schema authoring or bundled validation rules.** GhostVue does not ship a
  schema DSL, built-in regex validators, or localized error catalogs. Validation
  logic and issue messages come from the consumer's Standard Schema v1 object or
  programmatic `setFieldErrors` / `setFormErrors` calls.
- **Auto-generated form markup from a schema.** `GhostForm` never inspects
  schema internals to synthesize inputs, labels, or layouts. Consumers compose
  explicit `GhostField` and control components in templates.
- **Form-owned value cloning or silent input coercion.** `GhostForm` never clones
  or mutates the consumer's `values` object and never writes transformed schema
  output back into `values`.
- **Field-array state managers (`append`, `remove`, `move`, `swap`).** Consumers
  mutate their own reactive arrays directly with standard JavaScript/Vue array
  methods; `GhostForm` maps nested array paths (`webhooks.0.url`) onto the
  current array state.
- **Multi-control group selection or fieldset markup.** Multi-checkbox array
  models belong to `GhostCheckboxGroup` ([#463](https://github.com/zprue743/ghostvue/issues/463))
  and named `<fieldset>`/`<legend>` sections belong to `GhostFieldset`
  ([#464](https://github.com/zprue743/ghostvue/issues/464)); `GhostForm`
  composes with both without owning their selection or group semantics.
- **Persistence, autosave, multi-step wizard routing, or unsaved-navigation
  prompts.** Those remain application-level concerns built on top of `values`,
  `isDirty`, and `@submit`.
- **Visual chrome in headless `@ghostvue/vue`.** Spacing, card framing, and
  action-bar layout stay in consumer markup or `@ghostvue/themes` primitives.

## Public API

### Package boundary and exports

All exports live in `@ghostvue/vue` (see [F5](#open-architectural-questions),
resolved as `@ghostvue/vue`-only in `0.2.0`):

- Component: `GhostForm`
- Composable: `useGhostForm`
- Context key (for `GhostField` integration): `ghostFormContextKey`
- Types:
  - `StandardSchemaV1` (and namespace members `Props`, `Result`,
    `SuccessResult`, `FailureResult`, `Issue`, `PathSegment`, `Options`,
    `Types`, `InferInput`, `InferOutput`)
  - `GhostFormValidateTrigger`
  - `GhostFormFieldPath`
  - `GhostFormProps`, `GhostFormEmits`, `GhostFormSlotProps`, `GhostFormExposed`
  - `GhostFormSubmitPayload`, `GhostFormInvalidPayload`, `GhostFormSubmitResult`
  - `UseGhostFormOptions`, `UseGhostFormReturn`, `GhostFormFieldBindings`
- Additive prop and slot extensions on existing `GhostField` family:
  - `GhostFieldProps`: optional `name?: string | undefined`
  - `GhostField` default slot: optional scoped slot props
    `GhostFieldSlotProps` (`{ invalid, error, errors, touched, dirty }`)
  - `GhostFieldError` default slot: optional scoped slot props
    `GhostFieldErrorSlotProps` (`{ message, errors }`)

No code is added to `@ghostvue/core`: form context handoff, reactive path
tracking, `afterNativeFormReset` coordination, and post-flush focus management
are Vue lifecycle responsibilities ([architecture rules](../agents/ARCHITECTURE_RULES.md)).

### Standard Schema v1 contract and dependency evaluation

`GhostForm` consumes the upstream
[Standard Schema v1](https://standardschema.dev/) structural protocol:

```ts
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
      options?: Options | undefined,
    ) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult

  export interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  export interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  export interface PathSegment {
    readonly key: PropertyKey
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input
    readonly output: Output
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}
```

Note on TypeScript variance: both `Input` and `Output` appear only in covariant
`readonly` positions (`types?: { readonly input: Input; readonly output: Output }`),
while `validate` accepts `unknown`. Every concrete `StandardSchemaV1<I, O>`
instance is therefore assignable to `StandardSchemaV1` (`StandardSchemaV1<unknown, unknown>`)
under `strict: true` and `exactOptionalPropertyTypes: true` with zero `any`
constraints.

#### Dependency policy evaluation

Evaluated against the [repository dependency policy](../standards/dependencies.md):

| Criterion                                                            | Option A (Recommended): Local `StandardSchemaV1` type declaration in `@ghostvue/vue` + dev-only `@standard-schema/spec`                                           | Option B: `@standard-schema/spec` (`^1.1.0`) in `@ghostvue/vue` production `dependencies` | Option C (Rejected): `@standard-schema/spec` as optional `peerDependency`       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime JS / gzip bundle impact                                      | `0 B` (`pnpm size` unchanged for uninvolved components)                                                                                                           | `0 B` runtime JS (types-only package), but adds a published package manifest edge         | `0 B`                                                                           |
| Consumer `node_modules` footprint                                    | Zero additional production packages                                                                                                                               | Installed for every `@ghostvue/vue` consumer even when `GhostForm` is unused              | None unless installed                                                           |
| `attw --pack` / `skipLibCheck: false`                                | Self-contained in `dist/index.d.ts`; resolves in Node10, Node16, and Bundler modes with nothing external                                                          | Resolves because `dependencies` installs `@standard-schema/spec`                          | **Fails** when consumer omits optional peer and `dist/index.d.ts` re-exports it |
| Drift protection ([TypeScript standard](../standards/typescript.md)) | Exact dev pin `@standard-schema/spec` (`1.1.0`, MIT, 0 transitive deps, no install scripts) checked for bidirectional type equality in `packages/vue/type-tests/` | Imported directly from `@standard-schema/spec`                                            | Imported from peer                                                              |
| License, audit, `allowBuilds`                                        | MIT (dev only); `pnpm audit --prod` unchanged; `allowBuilds` unchanged                                                                                            | MIT; zero transitive dependencies; `allowBuilds` unchanged                                | N/A                                                                             |

**Decision ([F1](#open-architectural-questions)):** Adopt **Option A**.
Standard Schema v1 was explicitly designed around structural `~standard`
compatibility so UI libraries do not force an extra production dependency edge,
mirroring `@ghostvue/vue/resolver` matching `unplugin-vue-components`
structurally ([package boundaries](../architecture/package-boundaries.md)).
Pinning `@standard-schema/spec` as an exact `devDependency` in a compile-time
type test guarantees the exported `StandardSchemaV1` declaration never drifts
from upstream.

### Typed consumer example (Standard Schema v1, transformed output, nested paths, form-level issues, and `GhostField` handoff)

The example below upgrades the `examples/field/profile-settings.vue` workflow to
`GhostForm`. It works identically with Zod (`z.object(...)`), Valibot
(`v.object(...)`), ArkType (`type(...)`), or an inline `StandardSchemaV1`
validator, and demonstrates:

1. **Input vs transformed output:** `values.seatLimit` is edited as a `string`
   (`'25'`) in `GhostInput`, while `@submit` receives `output.seatLimit` as a
   `number` (`25`) and normalized `displayName` / `supportEmail` strings, leaving
   `values` untouched.
2. **Nested object and array paths:** `billing.postalCode` and `webhooks.0.url`
   map directly to `<GhostField name="billing.postalCode">` and
   `<GhostField :name="`webhooks.${index}.url`">`.
3. **Form-level issues:** cross-field root issues (`path: undefined` or `[]`)
   surface on `formErrors` and render in `GhostInlineAlert`.
4. **`GhostField` handoff and standalone opt-out:** named `GhostField` instances
   derive `invalid` and `<GhostFieldError />` copy automatically, while the
   disabled `Organization ID` `GhostField` omits `name` and stays purely
   prop-driven.

```vue
<script setup lang="ts">
import { reactive, ref } from 'vue'

import {
  GhostForm,
  type GhostFormSubmitPayload,
  type StandardSchemaV1,
} from '@ghostvue/vue'
import {
  GhostButton,
  GhostCard,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInlineAlert,
  GhostInput,
} from '@ghostvue/themes'

interface ProfileInput {
  displayName: string
  supportEmail: string
  seatLimit: string
  billing: {
    postalCode: string
  }
  webhooks: { url: string }[]
}

interface ProfileOutput {
  displayName: string
  supportEmail: string
  seatLimit: number
  billing: {
    postalCode: string
  }
  webhooks: { url: URL }[]
}

/*
 * Any Standard Schema v1 validator (Zod, Valibot, ArkType) satisfies this
 * interface. Shown inline to make the ~standard input -> output contract explicit.
 */
const profileSchema: StandardSchemaV1<ProfileInput, ProfileOutput> = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(raw) {
      const data = raw as ProfileInput
      const issues: StandardSchemaV1.Issue[] = []

      const displayName = data.displayName.trim()
      if (displayName.length === 0) {
        issues.push({
          message: 'Enter a display name.',
          path: ['displayName'],
        })
      }

      const supportEmail = data.supportEmail.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
        issues.push({
          message: 'Enter an address like team@company.com.',
          path: [{ key: 'supportEmail' }],
        })
      }

      const parsedSeats = Number(data.seatLimit.trim())
      if (!Number.isInteger(parsedSeats) || parsedSeats < 1) {
        issues.push({
          message: 'Seat limit must be a whole number of at least 1.',
          path: ['seatLimit'],
        })
      }

      const postalCode = data.billing.postalCode.trim()
      if (postalCode.length < 3) {
        issues.push({
          message: 'Enter a valid billing postal code.',
          path: ['billing', 'postalCode'],
        })
      }

      const webhooks: { url: URL }[] = []
      data.webhooks.forEach((entry, index) => {
        try {
          webhooks.push({ url: new URL(entry.url.trim()) })
        } catch {
          issues.push({
            message: 'Enter a full https:// webhook URL.',
            path: ['webhooks', index, 'url'],
          })
        }
      })

      if (parsedSeats > 100 && webhooks.length === 0) {
        // Root issue (no path): surfaced in `formErrors`, not attached to a field.
        issues.push({
          message: 'Plans above 100 seats require at least one audit webhook.',
        })
      }

      if (issues.length > 0) {
        return { issues }
      }

      return {
        value: {
          displayName,
          supportEmail,
          seatLimit: parsedSeats,
          billing: { postalCode },
          webhooks,
        },
      }
    },
  },
}

const initialValues = (): ProfileInput => ({
  displayName: 'Ada Lovelace',
  supportEmail: 'ada@analytical-engines',
  seatLimit: '25',
  billing: { postalCode: 'EC1A 1BB' },
  webhooks: [{ url: 'https://hooks.analytical.engine/audit' }],
})

const values = reactive<ProfileInput>(initialValues())
const billingId = 'org_01J9XK2M8P'
const lastSavedSeats = ref<number | null>(null)

function handleSave({
  output,
  setFieldErrors,
  waitUntil,
}: GhostFormSubmitPayload<ProfileOutput, ProfileInput>): void {
  // `output.seatLimit` is inferred as `number`; `output.webhooks[0]?.url` is `URL`.
  waitUntil(
    Promise.resolve().then(() => {
      if (output.supportEmail.endsWith('@blocked.example')) {
        setFieldErrors('supportEmail', [
          'Use a verified workspace domain for support alerts.',
        ])
        return
      }
      lastSavedSeats.value = output.seatLimit
    }),
  )
}

function handleReset(): void {
  Object.assign(values, initialValues())
  lastSavedSeats.value = null
}
</script>

<template>
  <GhostForm
    v-slot="{ formErrors, isSubmitting }"
    :schema="profileSchema"
    :values="values"
    @submit="handleSave"
    @reset="handleReset"
  >
    <GhostCard as="section" aria-labelledby="profile-title">
      <template #header>
        <h2 id="profile-title">Workspace profile</h2>
      </template>

      <GhostInlineAlert
        v-if="formErrors.length > 0"
        announce="alert"
        tone="danger"
      >
        <template #title>Unable to save profile</template>
        <template #message>
          <ul>
            <li v-for="(err, idx) in formErrors" :key="idx">{{ err }}</li>
          </ul>
        </template>
      </GhostInlineAlert>

      <GhostField name="displayName" required>
        <GhostFieldLabel>Display name</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="values.displayName"
            name="displayName"
            autocomplete="name"
            block
          />
        </GhostFieldControl>
        <GhostFieldError />
      </GhostField>

      <GhostField name="supportEmail" required>
        <GhostFieldLabel>Support email</GhostFieldLabel>
        <GhostFieldDescription>
          Alerts and billing receipts are sent to this address.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="values.supportEmail"
            type="email"
            name="supportEmail"
            autocomplete="email"
            block
          />
        </GhostFieldControl>
        <GhostFieldError />
      </GhostField>

      <GhostField name="seatLimit" required>
        <GhostFieldLabel>Seat limit</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="values.seatLimit"
            inputmode="numeric"
            name="seatLimit"
            block
          />
        </GhostFieldControl>
        <GhostFieldError />
      </GhostField>

      <GhostField name="billing.postalCode" required>
        <GhostFieldLabel>Billing postal code</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="values.billing.postalCode"
            name="billing.postalCode"
            autocomplete="postal-code"
            block
          />
        </GhostFieldControl>
        <GhostFieldError />
      </GhostField>

      <GhostField
        v-for="(hook, index) in values.webhooks"
        :key="index"
        :name="`webhooks.${index}.url`"
        required
      >
        <GhostFieldLabel>Webhook URL {{ index + 1 }}</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="hook.url"
            type="url"
            :name="`webhooks.${index}.url`"
            block
          />
        </GhostFieldControl>
        <GhostFieldError />
      </GhostField>

      <!-- No `name` prop: opts out of GhostForm validation and stays prop-driven. -->
      <GhostField disabled>
        <GhostFieldLabel>Organization ID</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput v-bind="field" :model-value="billingId" block />
        </GhostFieldControl>
      </GhostField>

      <template #footer>
        <p role="status">
          {{ lastSavedSeats !== null ? `Saved ${lastSavedSeats} seats.` : '' }}
        </p>
        <GhostButton type="reset" variant="ghost" tone="neutral">
          Reset
        </GhostButton>
        <GhostButton type="submit" :loading="isSubmitting">
          Save profile
        </GhostButton>
      </template>
    </GhostCard>
  </GhostForm>
</template>
```

### Props and configuration

#### `GhostForm` (`<script setup lang="ts" generic="TSchema extends StandardSchemaV1 = StandardSchemaV1, TValues = StandardSchemaV1.InferInput<TSchema>">`)

| Prop                   | Type                                             | Default     | Contract                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema`               | `TSchema`                                        | required    | Standard Schema v1 validator (`schema['~standard'].version === 1`).                                                                                                                                                                                    |
| `values`               | `TValues`                                        | required    | Consumer-owned input state passed to `schema['~standard'].validate(values, schemaOptions)`. Read without cloning or mutation. Defaults to `StandardSchemaV1.InferInput<TSchema>`; pass explicit `TValues` when draft UI values start wider than input. |
| `validateOn`           | `GhostFormValidateTrigger`                       | `'submit'`  | Trigger that first reveals issues on an untouched field before the form has been submitted (`'submit' \| 'blur' \| 'change'`).                                                                                                                         |
| `revalidateOn`         | `GhostFormValidateTrigger`                       | `'change'`  | Trigger that re-validates a field once it already has visible issues or after the first failed submit attempt (`'submit' \| 'blur' \| 'change'`).                                                                                                      |
| `novalidate`           | `boolean`                                        | `true`      | Sets HTML `novalidate` on `<form>` so Standard Schema v1 owns submit validation while child `required` / `type` attributes keep assistive-technology and virtual-keyboard semantics. Pass `:novalidate="false"` to run native constraint checks first. |
| `focusInvalidOnSubmit` | `boolean`                                        | `true`      | When a submit attempt fails validation, moves focus after DOM flush to the first focusable invalid control in rendered DOM order.                                                                                                                      |
| `initialIssues`        | `readonly StandardSchemaV1.Issue[] \| undefined` | `undefined` | Optional seed issues (for example from an SSR form action) partitioned into `fieldErrors` and `formErrors` at setup without running `validate()`. Captured once at setup; cleared on the next validation or `reset()`.                                 |
| `schemaOptions`        | `StandardSchemaV1.Options \| undefined`          | `undefined` | Optional vendor options forwarded verbatim as the second argument to `schema['~standard'].validate(values, schemaOptions)`.                                                                                                                            |

Native `<form>` attributes (`id`, `action`, `method`, `enctype`, `autocomplete`,
`aria-*`, `data-*`, `class`, `style`) fall through to the single `<form>` root
element. `GhostForm` owns `novalidate`, `aria-busy` (set to `'true'` while
`isSubmitting` is `true`, unless overridden via explicit `aria-busy` attr),
`data-part="root"`, `data-ghost-form=""`, and `data-state`.

#### `useGhostForm(options)`

```ts
type GhostFormValidateTrigger = 'submit' | 'blur' | 'change'

interface UseGhostFormOptions<
  TSchema extends StandardSchemaV1 = StandardSchemaV1,
  TValues = StandardSchemaV1.InferInput<TSchema>,
> {
  schema: MaybeRefOrGetter<TSchema>
  values: MaybeRefOrGetter<TValues>
  validateOn?: MaybeRefOrGetter<GhostFormValidateTrigger | undefined>
  revalidateOn?: MaybeRefOrGetter<GhostFormValidateTrigger | undefined>
  novalidate?: MaybeRefOrGetter<boolean | undefined>
  focusInvalidOnSubmit?: MaybeRefOrGetter<boolean | undefined>
  initialIssues?: readonly StandardSchemaV1.Issue[] | undefined
  schemaOptions?: MaybeRefOrGetter<StandardSchemaV1.Options | undefined>
  /**
   * Provides `ghostFormContextKey` to descendant `GhostField` components when
   * called inside `setup()`. Disable when hosting multiple `useGhostForm`
   * instances in a single component setup scope without `<GhostForm>` wrappers.
   * @default true
   */
  provideContext?: boolean
  onSubmit?: (
    payload: GhostFormSubmitPayload<
      StandardSchemaV1.InferOutput<TSchema>,
      TValues
    >,
  ) => unknown | Promise<unknown>
  onInvalid?: (payload: GhostFormInvalidPayload<TValues>) => void
  onReset?: (event: Event | null) => void
}
```

#### `GhostField` handoff extensions

`GhostField` gains one optional prop and two optional scoped-slot surfaces:

| Surface                         | Addition                                                                                                        | Contract                                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GhostField` `name` prop        | `name?: string \| undefined` (default `undefined`)                                                              | Canonical dot-path key (for example `'supportEmail'`, `'billing.postalCode'`, `'webhooks.0.url'`). Associates the field with an ancestor `GhostForm` / `useGhostForm` context when non-empty.            |
| `GhostField` `invalid` prop     | `invalid?: boolean \| undefined` (default `undefined`)                                                          | Explicit boolean (`true` or `false`) **always wins** over form state. When omitted (`undefined`) on a named field inside `GhostForm`, `invalid` resolves from `form.isFieldInvalid(name)`; else `false`. |
| `GhostField` default slot props | `{ invalid: boolean; error: string \| undefined; errors: readonly string[]; touched: boolean; dirty: boolean }` | Optional scoped bindings for custom error layouts. Outside `GhostForm` (or without `name`), `error` is `undefined`, `errors` is `[]`, and `touched` / `dirty` are `false`.                               |
| `GhostFieldError` fallback copy | Renders `fieldContext.errorMessage` when default slot has no renderable content                                 | Consumer default-slot content always takes precedence over schema message text. Scoped slot receives `{ message: string \| undefined; errors: readonly string[] }`.                                      |

`GhostFieldControl` slot props (`id`, `disabled`, `invalid`, `required`,
`aria-describedby`, `aria-invalid`) do **not** inject `name` into the spread
object, because composite triggers such as [`GhostSelectTrigger`](/specs/select)
render `<button type="button" role="combobox">` while the `name` prop for native
`FormData` belongs on `GhostSelect` root. Controls that participate in native
`FormData` pass their own `name` attribute as today.

### v-model contracts

`GhostForm` declares **no `v-model`**. Consumers own `values` as a `reactive`
object, `ref`, or getter (`:values="values"`), and individual controls keep
their own `v-model` contracts (`GhostInput`, `GhostCheckbox`, `GhostSelect`,
`GhostRadioGroup`, etc.) via `useControllableState`. Avoiding a second form-wide
`v-model:values` channel eliminates double-emit loops, deep-clone overhead, and
confusion between raw `TValues` input and transformed `TOutput`.

### Events, callbacks, slots, and exposed methods

#### Payloads and return types

```ts
interface GhostFormSubmitPayload<TOutput, TValues> {
  /** Validated and transformed schema output (`StandardSchemaV1.InferOutput<TSchema>`). */
  readonly output: TOutput
  /** Snapshot reference to the consumer `values` passed into validation. */
  readonly values: TValues
  /** Originating native `SubmitEvent` when triggered from `<form>`, or `null` for `submit()`. */
  readonly event: SubmitEvent | null
  /**
   * Registers an asynchronous post-validation mutation (for example an API save)
   * on `<GhostForm>` `@submit` listeners so `isSubmitting`, `isPending`,
   * `aria-busy`, and duplicate-submit protection stay active until `promise`
   * settles (or `reset()` cancels the submit epoch). In `useGhostForm`,
   * returning a Promise from `options.onSubmit` tracks it automatically.
   */
  waitUntil(promise: PromiseLike<unknown>): void
  /** Imperative server-error helpers scoped to the active form. */
  setFieldErrors(
    path: GhostFormFieldPath<TValues> | (string & {}),
    messages: readonly string[],
  ): void
  setFormErrors(messages: readonly string[]): void
  reset(): void
}

interface GhostFormInvalidPayload<TValues> {
  /** All issues returned by the schema for this validation pass, in vendor order. */
  readonly issues: readonly StandardSchemaV1.Issue[]
  /** Visible field-scoped error messages keyed by canonical dot-path. */
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>
  /** Visible form-level error messages (empty/missing or symbol path). */
  readonly formErrors: readonly string[]
  readonly values: TValues
  readonly event: SubmitEvent | null
}

type GhostFormSubmitResult<TOutput> =
  | { readonly status: 'submitted'; readonly output: TOutput }
  | {
      readonly status: 'invalid'
      readonly issues: readonly StandardSchemaV1.Issue[]
    }
  | { readonly status: 'aborted' }
  | { readonly status: 'ignored' }
```

#### `GhostForm` events

| Event     | Payload                                                                  | When emitted                                                                                                                             |
| --------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `submit`  | `GhostFormSubmitPayload<StandardSchemaV1.InferOutput<TSchema>, TValues>` | Schema validation for an accepted submit attempt succeeded with `{ value }` (and was not superseded by `reset()` while awaiting).        |
| `invalid` | `GhostFormInvalidPayload<TValues>`                                       | Submit attempt failed schema validation (`issues` non-empty) and was not superseded by a newer validation or `reset()`.                  |
| `reset`   | `event: Event \| null`                                                   | Form reset completed (after `afterNativeFormReset` for a non-cancelled DOM `reset` event, or synchronously during imperative `reset()`). |

#### `GhostForm` default scoped slot (`GhostFormSlotProps<TSchema, TValues>`) and `UseGhostFormReturn<TSchema, TValues>`

| Member                       | Type                                                                                        | Contract                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldErrors`                | `Readonly<Record<string, readonly string[]>>` (`ComputedRef` in composable)                 | Currently visible error messages keyed by canonical dot-path.                                                                                 |
| `formErrors`                 | `readonly string[]` (`ComputedRef` in composable)                                           | Currently visible root/form-level error messages.                                                                                             |
| `issues`                     | `readonly StandardSchemaV1.Issue[]` (`ComputedRef` in composable)                           | All currently visible `StandardSchemaV1.Issue` entries in vendor order.                                                                       |
| `isValid`                    | `boolean` (`ComputedRef` in composable)                                                     | `true` when `issues.length === 0` (no visible field or form errors).                                                                          |
| `isInvalid`                  | `boolean` (`ComputedRef` in composable)                                                     | `true` when at least one visible field or form error exists.                                                                                  |
| `isValidating`               | `boolean` (`ComputedRef` in composable)                                                     | `true` while an asynchronous `schema['~standard'].validate()` promise for the current validation epoch is pending.                            |
| `isSubmitting`               | `boolean` (`ComputedRef` in composable)                                                     | `true` from the start of `submit()` through async validation and any tracked async submit handler (`onSubmit` return Promise or `waitUntil`). |
| `isPending`                  | `boolean` (`ComputedRef` in composable)                                                     | `isValidating \|\| isSubmitting`.                                                                                                             |
| `isDirty`                    | `boolean` (`ComputedRef` in composable)                                                     | `true` when at least one tracked field path has changed since setup or the last `reset()`.                                                    |
| `hasSubmitted`               | `boolean` (`ComputedRef` in composable)                                                     | `true` after at least one submit attempt since setup or the last `reset()`.                                                                   |
| `submitCount`                | `number` (`ComputedRef` in composable)                                                      | Count of non-ignored submit attempts since setup or the last `reset()`.                                                                       |
| `getFieldError(path)`        | `(path: GhostFormFieldPath<TValues>) => string \| undefined`                                | First visible error message for `path`, or `undefined`.                                                                                       |
| `getFieldErrors(path)`       | `(path: GhostFormFieldPath<TValues>) => readonly string[]`                                  | All visible error messages for `path` (`[]` when valid or unrevealed).                                                                        |
| `getFieldIssues(path)`       | `(path: GhostFormFieldPath<TValues>) => readonly StandardSchemaV1.Issue[]`                  | Visible `StandardSchemaV1.Issue` objects mapped to `path`.                                                                                    |
| `isFieldInvalid(path)`       | `(path: GhostFormFieldPath<TValues>) => boolean`                                            | `getFieldErrors(path).length > 0`.                                                                                                            |
| `isFieldTouched(path)`       | `(path: GhostFormFieldPath<TValues>) => boolean`                                            | `true` once `path` has blurred or been marked via `touchField(path)`.                                                                         |
| `isFieldDirty(path)`         | `(path: GhostFormFieldPath<TValues>) => boolean`                                            | `true` once the value at `path` changed after setup or `reset()`.                                                                             |
| `fieldProps(path)`           | `(path: GhostFormFieldPath<TValues>) => GhostFormFieldBindings`                             | Escape hatch for `<GhostField v-bind="form.fieldProps('email')">` or custom wrappers without context injection (`{ name, invalid }`).         |
| `validate()`                 | `() => Promise<{ valid: boolean; output?: Output; issues: readonly Issue[] }>`              | Runs full-form validation immediately, reveals all paths and form errors, and resolves with the outcome (without running `onSubmit`).         |
| `validateField(path)`        | `(path: GhostFormFieldPath<TValues>) => Promise<readonly StandardSchemaV1.Issue[]>`         | Marks `path` revealed, runs schema validation, updates only revealed paths, and resolves with `path`'s resulting issues.                      |
| `submit(event?)`             | `(event?: SubmitEvent \| null) => Promise<GhostFormSubmitResult<Output>>`                   | Runs full-form validation and, when valid, invokes `onSubmit` / emits `submit`.                                                               |
| `reset()`                    | `() => void`                                                                                | Synchronously aborts in-flight epochs, clears errors/touched/dirty/`hasSubmitted`/`submitCount`, and emits `reset` / invokes `onReset(null)`. |
| `clearErrors(path?)`         | `(path?: GhostFormFieldPath<TValues>) => void`                                              | Clears visible errors for `path`, or all field and form errors (and bumps `validationEpoch` when clearing all).                               |
| `setFieldErrors(path, msgs)` | `(path: GhostFormFieldPath<TValues> \| (string & {}), messages: readonly string[]) => void` | Sets explicit field error messages (for example from a 422 API response) and marks `path` revealed. Empty `messages` clears `path`.           |
| `setFormErrors(messages)`    | `(messages: readonly string[]) => void`                                                     | Sets explicit form-level error messages (for example from a 409/500 API response). Empty array clears `formErrors`.                           |
| `touchField(path)`           | `(path: GhostFormFieldPath<TValues>) => void`                                               | Marks `path` touched without running validation.                                                                                              |
| `blurField(path)`            | `(path: GhostFormFieldPath<TValues>) => void`                                               | Marks `path` touched and schedules validation when `validateOn === 'blur'` or (`revalidateOn === 'blur'` and `path` is revealed/submitted).   |

`UseGhostFormReturn` additionally exposes:

- `formRef`: `(el: Element | ComponentPublicInstance | null) => void` (bound
  automatically via `formProps.ref` when spread on `<form v-bind="form.formProps">`)
- `formProps`: `ComputedRef<GhostFormRootAttributes>` containing `ref`,
  `novalidate`, `aria-busy`, `data-part="root"`, `data-ghost-form=""`,
  `data-state`, `onSubmit`, and `onReset` for standalone `<form>` elements.

#### `GhostForm` exposed template ref (`GhostFormExposed<TSchema, TValues>`)

- `element: HTMLFormElement | null` (`null` before mount and after unmount)
- `submit`, `validate`, `validateField`, `reset`, `clearErrors`,
  `setFieldErrors`, `setFormErrors` (same signatures as above)

## State model

### Validation triggers and progressive issue visibility

Standard Schema v1 exposes a single root `validate(value)` function rather than
per-field sub-schemas, because real forms frequently enforce cross-field
refinements (`confirmPassword === password`, `endDate >= startDate`). Every
validation pass therefore calls `schema['~standard'].validate(toValue(values), toValue(schemaOptions))`
once and filters which issues become **visible** using two tracking sets:

- `hasSubmitted: boolean` — starts `false`; becomes `true` as soon as a
  non-ignored `submit()` or `validate()` runs; resets to `false` on `reset()`.
- `revealedPaths: Set<string>` — paths unlocked for error display before the
  first submit attempt (`validateField(path)`, `setFieldErrors(path, ...)`, or a
  field trigger matching `validateOn`).

| Trigger event on field `P` | Before first submit (`hasSubmitted === false`)                                                                                                                           | After first submit (`hasSubmitted === true`)                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Value at `P` changes       | Marks `P` dirty. Runs validation if `validateOn === 'change'` (adds `P` to `revealedPaths`) **or** if `P` is already in `revealedPaths` and `revalidateOn === 'change'`. | Marks `P` dirty. Runs validation if `revalidateOn === 'change'`, updating all field errors and `formErrors` together. |
| Field `P` blurs            | Marks `P` touched. Runs validation if `validateOn === 'blur'` (adds `P` to `revealedPaths`) **or** if `P` is already in `revealedPaths` and `revalidateOn === 'blur'`.   | Marks `P` touched. Runs validation if `revalidateOn === 'blur'`, updating all field errors and `formErrors` together. |
| Form `submit`              | Sets `hasSubmitted = true`, increments `submitCount`, runs validation, and reveals **every** field issue and **every** `formErrors` entry.                               | Increments `submitCount`, runs validation, and updates every field issue and `formErrors` entry.                      |

With the defaults (`validateOn: 'submit'`, `revalidateOn: 'change'`):

1. Typing or tabbing through a fresh form shows **no premature errors** ("punish
   late").
2. Submitting an invalid form reveals all field and form-level issues at once
   and focuses the first invalid control.
3. Fixing an invalid field clears its error on the very next edit ("reward
   early") without requiring another submit click, and cross-field refinements
   recompute across sibling fields simultaneously.

#### Blur detection across composite and portaled controls

Inside `<GhostField name="P">`, `GhostField` listens for `focusout` on its root
`div.ghost-field`:

- If `event.relatedTarget` is a `Node` still contained inside `fieldRoot` (for
  example arrowing between radios inside [`GhostRadioGroup`](/specs/radio-group)
  or moving between parts of [`GhostDatePicker`](/specs/date-picker)), focus has
  **not** left the field; `blurField(P)` does not fire.
- If `event.relatedTarget` is inside a portaled overlay controlled by an element
  inside `fieldRoot`—detected by matching any `[aria-controls]` id inside
  `fieldRoot` to an ancestor of `relatedTarget` (such as opening
  [`GhostSelectContent`](/specs/select) or `GhostComboboxContent` teleported to
  `document.body`)—focus has moved into the field's own popup rather than
  leaving the field; `blurField(P)` is deferred until focus leaves both the
  popup and `fieldRoot` without returning to the trigger.
- When focus genuinely leaves the field and its controlled popup, `blurField(P)`
  runs.

### Loading, empty, disabled, read-only, and error states

`GhostForm` sets a single `data-state` hook on `<form class="ghost-form" data-part="root">`
with deterministic precedence:

1. `submitting` — `isSubmitting` is `true`
2. `validating` — `isValidating` is `true` and `isSubmitting` is `false`
3. `invalid` — `isInvalid` is `true` and neither pending flag is active
4. omitted — idle with no visible errors

- **Never auto-disable controls while pending.** `GhostForm` does **not**
  propagate `disabled="true"` to `GhostField` or form controls during
  `isValidating` or `isSubmitting`. Setting native `disabled` on a focused
  `<input>` or `<button>` causes browsers to drop `document.activeElement` to
  `<body>`, destroying keyboard position during async blur/change checks and
  preventing screen readers from reading the active control. Consumers bind
  `:loading="isSubmitting"` on their submit [`GhostButton`](/specs/button) or
  explicitly disable sections when their UX intentionally locks editing (and
  manage focus accordingly).
- **Disabled and read-only fields.** Standard Schema v1 validates the `values`
  object, not DOM `FormData`. A disabled or read-only `GhostField` without a
  `name` prop (such as `Organization ID` in `profile-settings.vue`) never
  displays schema errors. If a named `GhostField` has `disabled: true`, it still
  reflects schema state unless explicit `:invalid="false"` overrides it, but
  focus-on-invalid-submit skips disabled controls because they are not tabbable.

### Async behavior

#### Synchronous fast-path

Standard Schema v1 allows `validate()` to return either `Result<Output>` or
`Promise<Result<Output>>`. `GhostForm` inspects the return value with a thenable
check (`result !== null && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function'`):

- **Synchronous `Result`:** processed immediately in the same synchronous turn.
  `isValidating` never flips to `true`, avoiding a one-microtask flash of
  `data-state="validating"` on synchronous Zod, Valibot, or ArkType schemas.
- **Promise / thenable `Result`:** sets `isValidating = true` until that
  validation epoch settles, is superseded by a newer validation epoch, or is
  cancelled by `reset()` / unmount.

#### Duplicate submit protection

- Native `<form>` `submit` events call `event.preventDefault()` synchronously on
  every press when `novalidate` is active (and whenever `GhostForm` handles the
  event) so a double-press of `Enter` or double-click on `<GhostButton type="submit">`
  never triggers a browser page reload.
- **While `isSubmitting === true`:** any subsequent `submit()` call or native
  `submit` event is **ignored** (`submitCount` does not increment, neither
  `schema['~standard'].validate()` nor `onSubmit` runs a second time, and
  `submit()` resolves to `{ status: 'ignored' }`).
- **While `isValidating === true` and `isSubmitting === false`** (a background
  `blur` or `change` validation is in flight): `submit()` **supersedes** the
  background validation! It advances `validationEpoch` (invalidating the
  in-flight background Promise), sets `isSubmitting = true`, and runs a fresh
  authoritative full-form validation on the latest `values`. A slow background
  `blur` check therefore never blocks or drops a real user submit.

#### Out-of-order asynchronous results (monotonic epochs)

`useGhostForm` maintains two internal monotonic integers: `validationEpoch` and
`submitEpoch`.

1. Starting any validation (`validate`, `validateField`, background trigger, or
   `submit`) increments `validationEpoch` (`const runId = ++validationEpoch`).
   Only `submit()` acquires `submitEpoch` (`const currentSubmitId = ++submitEpoch`)
   and sets `isSubmitting = true`; background `change`/`blur` triggers and
   imperative `validate()`/`validateField()` calls never own `submitEpoch`.
2. When an async `validate()` Promise settles:
   - If `runId !== validationEpoch`, the outcome is **stale and discarded
     immediately**: it must not write `fieldErrors`, `formErrors`, or `issues`,
     must not change `isValidating` (which now belongs to the newer `validationEpoch`),
     must not focus an element, and must not emit `submit` or `invalid`. A
     superseded `submit()` call resolves to `{ status: 'aborted' }` (and clears
     `isSubmitting` only if `currentSubmitId === submitEpoch`).
   - Only when `runId === validationEpoch` does the outcome commit errors or
     proceed to `onSubmit`, and clear `isValidating = false`.
3. Accepted `submit()` calls keep `currentSubmitId === submitEpoch` active while
   `onSubmit` / `waitUntil` awaits an async mutation:
   - Background `change`/`blur` validations (or `validate()`/`validateField()`)
     may advance `validationEpoch` without clearing `isSubmitting`.
   - `isSubmitting` clears to `false` only when `currentSubmitId === submitEpoch`
     finishes (its validation fails/aborts/throws, or its `onSubmit` / `waitUntil`
     settles—resolves or rejects) or when `reset()` / unmount advances `submitEpoch`.
4. **Unexpected validator exceptions:** compliant Standard Schema v1 validators
   return `{ issues }` rather than throwing.
   - If `validate()` throws synchronously or rejects for the **active
     validation epoch** (`runId === validationEpoch`):
     - `isValidating` resets to `false` so validation never wedges.
     - `isSubmitting` resets to `false` **only when that validation belongs to
       the active pending submit** (`currentSubmitId === submitEpoch`). Failures
       from background `change`/`blur` validations (or `validate()` /
       `validateField()`) **must preserve `isSubmitting`** so an active async
       `onSubmit` / `waitUntil` mutation retains its `submitEpoch` duplicate-submit
       lock until that save settles or `reset()` / unmount advances `submitEpoch`.
     - When a submit validation throws/rejects, `onSubmit` is not called and
       imperative `submit()` rejects with the thrown error (for native DOM
       `@submit` dispatch, forwarded to Vue's `handleError` / `onErrorCaptured`
       chain after resetting pending flags). Active background/imperative
       validation failures likewise reject `validate()` / `validateField()` or
       forward DOM-triggered errors to Vue's `handleError` / `onErrorCaptured`
       chain without disturbing `isSubmitting`.
   - Stale validation epoch rejections (`runId !== validationEpoch`) are
     swallowed silently so a cancelled check cannot surface an unhandled
     rejection (if a superseded `submit()`'s own `validate()` rejects after
     `validationEpoch` moved, it resolves to `{ status: 'aborted' }` and clears
     `isSubmitting` only if `currentSubmitId === submitEpoch`).

#### Reset during validation and native form events

`GhostForm` coordinates imperative resets and native `<form>` `reset` events
with [`packages/vue/src/form-reset.ts`](../architecture/component-state.md)
using a shared active-hold suppression set (`activeResetHolds: Set<symbol>`,
where `isResetting` is `activeResetHolds.size > 0`):

1. **Shared suppression holds (`acquireResetSuppression` / `releaseResetSuppression`):**
   - Each reset acquires its own unique hold token (`const hold = Symbol()`,
     added to `activeResetHolds`) and deletes only its own token when that
     reset's flush/settlement completes.
   - Because holds are tracked additively rather than by overwriting a single
     `resetSuppressionEpoch`, an imperative `form.reset()` called during or
     after a native reset batch never invalidates or short-circuits the native
     reset's hold: `isResetting` stays `true` until **every** active hold
     releases.
2. **Imperative `form.reset()`:**
   - Synchronously increments `validationEpoch` and `submitEpoch` (immediately
     invalidating any in-flight `validate()` or `onSubmit` / `waitUntil`
     Promise), sets `isValidating = false` and `isSubmitting = false`, and
     clears `fieldErrors`, `formErrors`, `issues`, `touchedPaths`, `dirtyPaths`,
     `revealedPaths`, `hasSubmitted` (`false`), and `submitCount` (`0`).
   - Acquires an imperative hold (`const imperativeHold = acquireResetSuppression()`),
     invokes `onReset?.(null)` / emits `reset(null)`, and schedules
     `nextTick(() => releaseResetSuppression(imperativeHold))` so consumer
     baseline writes inside `onReset` / `@reset` do not trigger
     `validateOn: 'change'` or mark fields dirty—without disturbing any still-pending
     native-reset hold in `activeResetHolds`.
3. **Native `<form>` `reset` event** (clicking `<GhostButton type="reset">` or
   calling `formElement.reset()`):
   - `GhostForm` does **not** call `event.preventDefault()`, preserving native
     reset delivery to uncontrolled child controls (`GhostInput`,
     `GhostCheckbox`, `GhostSelect`, `GhostRadioGroup`) that listen with
     `useNativeFormReset`.
   - Because `GhostForm` listens directly on `<form>` (target phase) while
     child controls listen on `document` (bubble phase) via `useNativeFormReset`,
     `GhostForm`'s `afterNativeFormReset` macrotask runs **before** child
     controls' `afterNativeFormReset` macrotasks. Holding `isResetting` across a
     single `nextTick()` inside `GhostForm`'s macrotask would therefore expire
     before later child macrotasks execute and emit `update:modelValue` to
     restore seeds on controlled controls whose current value differs from their
     reset seed.
   - To prevent premature expiry, `packages/vue/src/form-reset.ts` maintains a
     `WeakMap<Event, ...>` batch tracker across all `afterNativeFormReset`
     callbacks scheduled for the same `reset` `Event` (decrementing in a
     `finally` block as each macrotask callback completes—or when cancelled on
     unmount—and notifying settlement hooks once the pending count for `event`
     reaches `0`, or immediately when none remain) via
     `afterNativeFormResetSettled(event, onSettled)` /
     `whenNativeFormResetSettled(event)`.
   - `GhostForm` schedules its reset reconciliation with `afterNativeFormReset(event, apply)`:
     - If any listener on the form, `document`, or `window` calls
       `event.preventDefault()` during dispatch, `afterNativeFormReset` skips
       `apply`: errors, pending state, and `submitCount` remain intact and no
       hold is acquired.
     - Otherwise, `apply` synchronously acquires a native hold
       (`const nativeHold = acquireResetSuppression()`), registers settlement
       release via `afterNativeFormResetSettled(event, () => void nextTick(() => releaseResetSuppression(nativeHold)))`,
       bumps `validationEpoch` and `submitEpoch`, clears pending flags, errors,
       and tracking sets, and invokes `onReset?.(event)` / emits `reset(event)`.
     - If a consumer calls imperative `form.reset()` from inside `onReset(event)`
       / `@reset` (or before `event` settles), `imperativeHold` releases at the
       microtask `nextTick()` of `GhostForm`'s macrotask while `nativeHold`
       remains in `activeResetHolds` until **both** every child
       `afterNativeFormReset` macrotask registered for `event` has finished (or
       been cancelled on unmount) **and** the subsequent `nextTick()` reactive
       flush completes. Reactive path watchers triggered by consumer `@reset`
       writes and child `update:modelValue` seed restorations thus flush
       entirely while `isResetting` is `true` without marking fields dirty or
       triggering `validateOn: 'change'`.
   - Pending `afterNativeFormReset` timers and settlement listeners are
     cancelled, `activeResetHolds.clear()` runs so `isResetting` clears
     immediately, and an `isUnmounted` / `unmountEpoch` guard prevents late
     callbacks from mutating state in `onBeforeUnmount`.

## Consumer data

### Ownership and immutability

- `values` is consumer-owned (`reactive(...)`, `ref(...)`, or a getter).
  `GhostForm` passes `toValue(values)` directly to `schema['~standard'].validate`
  without cloning, freezing, or mutating any property or nested array.
- Transformed `TOutput` (`result.value`) is forwarded exclusively to
  `submit` / `onSubmit` and the resolved `submit()` / `validate()` result.
  Consumer-owned `values` retains its input representation so bound controls
  never lose formatting (for example trailing decimals or whitespace while
  editing) or receive incompatible types (`number` or `URL` pushed into a
  `string` `GhostInput`).
- Issue arrays from `result.issues` are copied into immutable surface records
  without mutating vendor `Issue` objects.

### Nested path normalization and issue partitioning

Each `StandardSchemaV1.Issue` has `path?: ReadonlyArray<PropertyKey | PathSegment> | undefined`,
where `PathSegment` is `{ readonly key: PropertyKey }`:

1. **Empty or missing path (`issue.path === undefined || issue.path.length === 0`):**
   classified as a **form-level issue** (`formIssues` / `formErrors`). Never
   assigned to `fieldErrors['']`.
2. **Segment unwrapping:** each entry `segment` in `issue.path` unwraps to
   `key = typeof segment === 'object' && segment !== null && 'key' in segment ? segment.key : segment`.
3. **Symbol segments:** if any unwrapped `key` has `typeof key === 'symbol'`,
   the path cannot match a string template `name` prop. Rather than throwing
   `TypeError` on `String(symbol)` or synthesizing `'Symbol(...)'`, the issue is
   classified into `formIssues` / `formErrors` with its original `issue.path`
   preserved on `issues`.
4. **Canonical dot-path string (`string | number` segments):** remaining keys
   convert via `String(key)` and join with `.`:
   - `['supportEmail']` or `[{ key: 'supportEmail' }]` → `'supportEmail'`
   - `['billing', 'postalCode']` → `'billing.postalCode'`
   - `['webhooks', 0, 'url']` or `[{ key: 'webhooks' }, { key: 0 }, { key: 'url' }]` → `'webhooks.0.url'`
5. **Multiple issues on the same path:** preserved in vendor emission order in
   `fieldErrors[path]` (`readonly string[]`). `getFieldError(path)` and default
   `<GhostFieldError />` render `fieldErrors[path][0]`; consumers who display
   every rule violation iterate `getFieldErrors(path)` or `<GhostFieldError v-slot="{ errors }">`.
6. **Unmatched dot-paths (conditional or unmounted fields, or object-group paths):**
   an issue with a non-empty string/number path such as `'billing'` or an
   unmounted step field `'shipping.city'` stays in `fieldErrors['billing']` /
   `fieldErrors['shipping.city']` (when revealed) so programmatic readers, error
   summaries iterating `issues`, and future `GhostFieldset` error wiring can
   read it by path without polluting `formErrors` whenever a conditional field
   toggles `v-if`.
7. **Literal dots in object keys:** `0.2.0` treats `.` as the path separator and
   does not define an escape syntax for property names containing literal `.`
   characters (documented limitation; see [F4](#open-architectural-questions)).

### Compile-time path helper (`GhostFormFieldPath<TValues>`)

`GhostFormFieldPath<TValues>` computes valid dot-paths up to a bounded recursion
depth of 4 levels so autocomplete and typo detection work on nested objects and
arrays without triggering TypeScript recursion limits ([TypeScript standard](../standards/typescript.md)):

- Plain object keys `K extends string`: `'K'` and, for nested objects/arrays,
  `` `${K}.${GhostFormFieldPath<TValues[K]>}` ``.
- Array / `ReadonlyArray<E>` properties: `` `${K}` | `${K}.${number}` `` and,
  when `E` is an object, `` `${K}.${number}.${GhostFormFieldPath<E>}` ``.
- Terminal leaf types (`Date`, `URL`, `RegExp`, `File`, `Blob`, functions,
  primitives, `Map`, `Set`) do not recurse into prototype methods.
- When `TValues` is `unknown` or an index-signature record
  (`Record<string, unknown>`), `GhostFormFieldPath<TValues>` widens to `string`.

## Accessibility contract

### Semantics and relationships

- **Root:** `GhostForm` renders a native `<form>` element. Native `<form>`
  exposes the `form` landmark role only when given an accessible name
  (`aria-label` or `aria-labelledby` fallthrough), matching HTML ARIA rules;
  `GhostForm` never invents a `role` attribute.
- **Field naming, descriptions, and errors:** delegated to [`GhostField`](/specs/field):
  - `GhostFieldLabel` names the control via `for`/`id` (or implicit wrapping).
  - `GhostFieldDescription` attaches persistent hint copy via `aria-describedby`.
  - When `GhostForm` marks `<GhostField name="P">` invalid, `GhostField` sets
    `data-state="invalid"`, `GhostFieldControl` passes `invalid: true` and
    `aria-invalid="true"` to the control, and `<GhostFieldError />` unhides with
    `role="alert"` and registers its `errorId` into `aria-describedby` **after**
    `descriptionId` (`aria-describedby="desc-id error-id"`) so hints are never
    overwritten when an error appears.
  - When `P`'s error clears, `aria-invalid` is omitted (never
    `aria-invalid="false"`), `<GhostFieldError />` returns to `hidden` without
    `role="alert"`, and `errorId` is removed from `aria-describedby` while
    keeping `descriptionId` intact.
- **Form-level issues (`formErrors`):** `GhostForm` stays markup-less inside its
  default slot so consumers control placement. Consumers present `formErrors`
  with `<GhostInlineAlert v-if="formErrors.length > 0" announce="alert" tone="danger">`
  above the fields or near the submit bar.
- **Pending submission:** while `isSubmitting` is `true`, `<form>` sets
  `aria-busy="true"` (omitted when `false`). Background `blur`/`change`
  validations (`isValidating && !isSubmitting`) do **not** set `aria-busy` on
  `<form>` so screen readers do not suppress or chatter across unrelated fields
  during typing.

### Keyboard interaction

`GhostForm` intercepts **no keyboard events** directly; all keyboard behavior
flows through native HTML form rules and child controls:

| Key / Interaction   | Where                                                                     | Behavior                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Form controls and actions                                                 | Native sequential focus order across enabled controls; `focusout` on leaving a `GhostField` triggers blur validation when `validateOn` / `revalidateOn` is `'blur'`. |
| `Enter`             | Native text-like `<input>` (`GhostInput`, `GhostNumberInput`)             | Triggers native form `submit` per HTML implicit-submission rules, intercepted by `GhostForm` (`preventDefault()`) to run Standard Schema v1 validation.              |
| `Enter`             | `<textarea>` (`GhostTextarea`)                                            | Inserts a newline; does **not** submit the form.                                                                                                                     |
| `Enter` / `Space`   | Open composite popups (`GhostSelect`, `GhostCombobox`, `GhostDatePicker`) | Handled by the open widget (`preventDefault()` selects option/date and closes popup); must **not** submit the ancestor `GhostForm`.                                  |
| `Enter` / `Space`   | `<GhostButton type="submit">`                                             | Activates native submit button, firing `<form>` `submit` → `GhostForm` validation.                                                                                   |
| `Enter` / `Space`   | `<GhostButton type="reset">`                                              | Activates native reset button, firing `<form>` `reset` → child `useNativeFormReset` + `GhostForm` `afterNativeFormReset` reconciliation.                             |

### Focus behavior

When `focusInvalidOnSubmit` is `true` (default) and a **submit** validation
fails (`issues` non-empty on an active epoch):

1. Wait one `nextTick` so Vue flushes `aria-invalid="true"` and visible
   `<GhostFieldError />` nodes into the DOM before moving focus.
2. Bail out without moving focus if:
   - the form element unmounted or is disconnected;
   - `validationEpoch` or `submitEpoch` advanced in the meantime (superseded or
     reset); or
   - `document.activeElement` currently sits inside an active modal focus trap
     (`useFocusScope` with `trapped: true`) **outside** the `<form>` element (for
     example a modal dialog opened while an async submit check was in flight),
     so `GhostForm` never yanks focus against an upper modal trap.
3. Resolve the first focusable invalid control in **rendered DOM order** inside
   the `<form>` element (never registration order, so conditional `v-if` insertions
   or responsive/keyed field reorders focus the visually first invalid control):
   - Walk elements matching `[aria-invalid="true"]` inside `<form>` in document
     order.
   - If a candidate element is itself tabbable/focusable and enabled (`GhostInput`,
     `GhostTextarea`, `GhostCheckbox`, `GhostSelectTrigger`, `GhostComboboxInput`,
     `GhostNumberInput`, `GhostDatePickerInput`), call `.focus()` on it and stop.
   - If the candidate is a non-focusable group host carrying `aria-invalid="true"`
     (for example [`GhostRadioGroup`](/specs/radio-group)'s `<fieldset aria-invalid="true">`),
     query `getTabbableElements(candidate)[0]` (which selects the checked
     enabled radio if any, else the first enabled radio per
     [`focus.md`](../architecture/focus.md)) and focus that item.
4. If validation failed solely due to `formErrors` (zero invalid field controls),
   focus remains on the submit trigger so keyboard context is preserved while the
   form-level `role="alert"` region announces the error.
5. Background `blur` and `change` validations **never** move focus.

### Assistive technology expectations

- On invalid submit, moving focus to the first invalid control after `nextTick`
  causes NVDA, JAWS, and VoiceOver to announce the control's label, role,
  `"invalid entry"` (`aria-invalid="true"`), description, and the newly linked
  error copy (`aria-describedby`) on the focused control instead of reading every
  field error simultaneously.
- Remaining invalid fields expose `aria-invalid="true"` and their own
  `aria-describedby` error message as the user tabs forward to repair each field.
- Standalone `GhostField` outside `GhostForm` keeps its exact existing AT
  announcements (`GhostFieldError` `role="alert"` when consumer slot content is
  present, hidden when empty).

## Rendering and customization

`GhostForm` is a single-element headless primitive (`<form>`). It introduces no
wrapper `<div>`s, no internal error-summary markup, and no action-bar chrome:

1. **Simple configuration:** `<GhostForm :schema="schema" :values="values" @submit="save">`
   with `<GhostField name="...">` and `<GhostFieldError />` children.
2. **Custom error copy / multiple messages per field:** scoped slots on
   `GhostFieldError` (`v-slot="{ message, errors }"`) or `GhostField`
   (`v-slot="{ invalid, errors, touched, dirty }"`), or explicit `:invalid` on
   `GhostField` to override schema state.
3. **Form-level banners and pending controls:** default scoped slot on
   `GhostForm` (`v-slot="{ formErrors, isSubmitting, isValid, isDirty }"`),
   composed with `GhostInlineAlert` and `GhostButton`.
4. **Lower-level composable:** `useGhostForm` + `<form v-bind="form.formProps">`
   for custom form hosts or non-`GhostField` controls using `form.getFieldError`
   and `form.isFieldInvalid`.

Stable styling hooks ([ADR 0004](../adr/0004-headless-styled-layering.md)):

- Root `<form>`: class `ghost-form`, `data-part="root"`, `data-ghost-form=""`,
  `data-state="submitting" | "validating" | "invalid"` (omitted when idle and
  valid).
- Consumer `class` and `style` merge onto `<form>` and are never overwritten.

## Environment behavior

### SSR and hydration

- **Deterministic initial markup:** neither `GhostForm` nor `useGhostForm` runs
  `schema['~standard'].validate()` during `setup()` or `renderToString`. Server
  HTML renders `<form class="ghost-form" data-part="root" data-ghost-form="" novalidate>`
  with `isValidating === false`, `isSubmitting === false`, and no `aria-busy` or
  `data-state` unless `initialIssues` is provided.
- **No browser globals in setup:** `document`, `window`, `HTMLElement`, and
  `focus()` are never read during `setup()` or SSR render. `GhostFormExposed.element`
  is `null` until mount.
- **Hydrating server-seeded `initialIssues`:** when `initialIssues` is passed
  (for example from a Nuxt server route or progressive-enhancement POST), setup
  partitions those issues synchronously and marks all seeded paths revealed plus
  `hasSubmitted = true`:
  - `GhostField` renders `data-state="invalid"` and `GhostFieldControl` renders
    `aria-invalid="true"` in both SSR HTML and the initial client hydration pass.
  - `<GhostFieldError />` renders the seeded error text with `role="alert"` and
    without `hidden` in both SSR HTML and the initial client render.
  - Matching `GhostField`'s established hydration contract verified in
    `tests/integration/ghost-field-error-ssr.test.ts`, `aria-describedby` omits
    `errorId` during SSR and the first client hydration render (regardless of
    whether `<GhostFieldError />` sits before or after `<GhostFieldControl>`),
    then `useGhostFieldPartContent` attaches `errorId` to `aria-describedby` in
    `onMounted` → `nextTick` with zero hydration mismatch warnings and identical
    `useGhostId` element ids.

### Mobile and touch

- Setting `novalidate` on `<form>` suppresses inconsistent mobile browser
  validation bubbles while preserving native `type="email"`, `type="url"`,
  `type="tel"`, `inputmode`, and `autocomplete` virtual-keyboard hints on child
  inputs.
- Focusing the first invalid control on submit scrolls that control into the
  mobile viewport via native `.focus()` behavior. Touch target sizing stays with
  the child controls (`GhostInput`, `GhostSelect`, `GhostButton`).

## Performance

- **No deep cloning or full-tree `JSON.stringify`:** `values` is passed by
  reference to `schema['~standard'].validate`.
- **Targeted path tracking:** dirty/change detection evaluates one lightweight
  path getter (`readPathValue(toValue(values), segments)`) per registered field
  `name` (`O(registered fields × path depth)`), rather than a `{ deep: true }`
  watcher over arbitrary nested objects or large arrays outside form fields.
  Forms with `validateOn === 'submit'` and `revalidateOn === 'submit'` still
  track dirty state per registered path in `O(registered fields)` per mutated
  field and run `validate()` only on submit.
- **Zero global listeners:** `GhostForm` binds `submit` and `reset` directly on
  its own `<form>` element (`formProps.onSubmit` / `formProps.onReset`) rather
  than adding `document`-level listeners. Pending `afterNativeFormReset`
  macrotasks and epoch state clean up deterministically in `onBeforeUnmount`.
- **Bundle tree-shaking:** when Option A ([F1](#open-architectural-questions))
  is used, `StandardSchemaV1` compiles away completely (`0 B` runtime overhead
  when `GhostForm` is not imported, and a compact state/epoch composable when it
  is).

## Composition

Reused `@ghostvue/vue` primitives and conventions:

- `GhostField`, `GhostFieldLabel`, `GhostFieldDescription`, `GhostFieldError`,
  `GhostFieldControl`, `ghostFieldContextKey`, and `useGhostFieldPartContent` —
  existing label, hint, `role="alert"`, and `aria-describedby` machinery,
  extended with optional `ghostFormContextKey` injection when `name` is set.
- `afterNativeFormReset` and per-`Event` batch settlement (`packages/vue/src/form-reset.ts`) —
  macrotask reset reconciliation after full `reset` event dispatch so
  `event.defaultPrevented` is honored identically to `GhostInput`, `GhostCheckbox`,
  `GhostSelect`, and `GhostRadioGroup`, and `GhostForm`'s shared `activeResetHolds`
  keeps `isResetting` active across overlapping imperative/native resets until
  all descendant `useNativeFormReset` macrotasks for the same `Event` and their
  reactive flushes complete.
- `getTabbableElements` (`packages/vue/src/get-tabbable-elements.ts`) — resolves
  the first enabled tabbable target inside composite/group controls such as
  `GhostRadioGroup` when focusing the first invalid field on submit.
- `GhostInlineAlert` and `GhostButton` — composed by consumers in slots for
  form-level alerts and `:loading="isSubmitting"` submit buttons without coupling
  `GhostForm` to `@ghostvue/themes`.

### Behavior of `GhostField` outside `GhostForm`

`GhostField` reads `inject(ghostFormContextKey, null)`:

1. When used **outside** `GhostForm` (for example in DataTable filter toolbars,
   dialogs without `GhostForm`, or standalone `examples/field/profile-settings.vue`):
   - No warning or error is emitted.
   - `GhostField` performs no registration, attaches no `focusout` listener, and
     creates no path watchers.
   - `invalid`, `disabled`, and `required` default to `false` and follow the
     component's props exclusively.
   - `<GhostFieldError />` renders only consumer-supplied slot content and stays
     `hidden` without `role="alert"` when empty.
2. When used **inside** `GhostForm` **without** a `name` prop (or with `name=""`):
   - Identical to standalone `GhostField`: opts out of schema error lookup,
     blur/dirty tracking, and registration.
3. When used **inside** `GhostForm` **with** `name="supportEmail"` **and** an
   explicit `:invalid="customBoolean"` prop:
   - Explicit `:invalid="true"` or `:invalid="false"` overrides `GhostForm`'s
     computed `isFieldInvalid('supportEmail')`, preserving local escape hatches.

## Test plan

### Framework-neutral / unit tests (`packages/vue/src/use-ghost-form.test.ts`)

- **Input vs transformed output:** schema trims `'  Ada  '` → `'Ada'` and
  transforms `seatLimit: '25'` → `25`; valid `submit()` resolves to
  `{ status: 'submitted', output: { displayName: 'Ada', seatLimit: 25 } }`,
  invokes `onSubmit` once with the transformed `output`, and leaves
  `values.seatLimit === '25'` and `values.displayName === '  Ada  '` unmutated.
- **Invalid submission & issue partitioning:** schema returning
  `{ issues: [{ message: 'Required', path: ['displayName'] }, { message: 'Bad ZIP', path: [{ key: 'billing' }, { key: 'postalCode' }] }, { message: 'Bad URL', path: ['webhooks', 0, 'url'] }, { message: 'Root conflict' }, { message: 'Empty path', path: [] }, { message: 'Symbol key', path: [Symbol('internal')] }] }`
  maps dot-paths `'displayName'`, `'billing.postalCode'`, and `'webhooks.0.url'`
  into `fieldErrors`, routes missing/`[]`/`symbol` paths into `formErrors` in
  order, sets `isInvalid === true`, does **not** invoke `onSubmit`, and invokes
  `onInvalid` once.
- **Multiple issues on one path:** preserves all messages in `getFieldErrors(path)`
  and returns `messages[0]` from `getFieldError(path)`.
- **Validation triggers (`validateOn` / `revalidateOn`):**
  - Default (`submit` / `change`): editing and blurring before submit keep
    `fieldErrors` empty; failed `submit()` reveals all errors; editing one
    invalid field immediately clears its error while keeping sibling errors;
    editing a field involved in a cross-field refinement after submit updates
    both fields and `formErrors`.
  - `validateOn: 'blur'`: blurring `'supportEmail'` reveals only
    `'supportEmail'`'s issue while untouched invalid `'displayName'` remains
    hidden until blurred or submitted.
  - `validateOn: 'change'`: editing `'supportEmail'` reveals only
    `'supportEmail'`'s issue without revealing untouched fields.
- **Synchronous fast-path:** synchronous `validate()` never sets
  `isValidating === true` across microtasks.
- **Duplicate submit:** while `isSubmitting` is `true` (either inside async
  `validate()` or inside async `onSubmit` / `waitUntil`), a second `submit()`
  resolves to `{ status: 'ignored' }`, does not increment `submitCount`, and
  calls `validate()` and `onSubmit` only once total. Conversely, while only a
  background `blur` validation is pending (`isValidating === true`,
  `isSubmitting === false`), `submit()` supersedes the background run and
  completes submission.
- **Concrete async race 1 — out-of-order validations:** trigger validation A
  (deferred Promise `d1`) with invalid input, then trigger validation B
  (deferred Promise `d2`) with valid input; resolve `d2` first (assert
  `isValidating === false`, `fieldErrors` empty), then resolve `d1` with
  `{ issues: [{ message: 'Stale error', path: ['email'] }] }`; assert `d1`'s
  stale result does **not** write `'Stale error'`, flip `isValidating`, or emit
  `invalid`. Also verify the reverse race (two overlapping `submit()` / `validate()`
  calls where `d1` would have succeeded with stale `output` after a newer invalid
  state).
- **Concrete async race 2 — reset during pending validation and pending submit:**
  start async `submit()` (pending `d1`), call `form.reset()` while `isValidating`
  is `true` (assert `isValidating === false`, `isSubmitting === false`,
  `hasSubmitted === false`, `submitCount === 0` synchronously), then resolve
  `d1` with `{ issues }` (and in a second case with `{ value }`); assert
  `fieldErrors` stays `{}`, `formErrors` stays `[]`, `isValidating` stays
  `false`, and `onSubmit` is never called. Repeat with `reset()` called after
  validation succeeded while async `onSubmit` (`d2`) is in flight.
- **Validator rejection recovery & submit-lock preservation:**
  - When an active async `submit()` validation rejects with
    `new Error('RPC timeout')`, `isValidating` and `isSubmitting` return to
    `false` and `onSubmit` does not run.
  - **Regression — deferred save + rejecting background validation + second submit:**
    start an async `submit()` whose validation passes and whose `onSubmit` /
    `waitUntil` awaits a deferred save Promise `dSave` (`isSubmitting === true`);
    while `dSave` is pending, trigger a background `change` (or `blur`)
    validation whose `validate()` rejects with `new Error('Background check failed')`;
    assert `isValidating` resets to `false`, `isSubmitting` stays `true`, a
    second `submit()` attempt resolves to `{ status: 'ignored' }` without
    incrementing `submitCount` or starting a second `onSubmit` call, and
    `isSubmitting` clears to `false` only when `dSave` settles (or `reset()` runs).

### Vue component and SSR tests (`packages/vue/src/GhostForm.test.ts`, `tests/integration/ghost-form-ssr.test.ts`)

- **`GhostField` handoff & cleanup:** `<GhostField name="supportEmail">` inside
  `<GhostForm>` receives `data-state="invalid"`, sets `aria-invalid="true"` on
  `GhostInput`, unhides `<GhostFieldError />` with the schema message and
  `role="alert"`, and links `errorId` in `aria-describedby` alongside
  `GhostFieldDescription`'s `descriptionId`; fixing the value removes
  `aria-invalid`, hides `<GhostFieldError />`, and keeps `descriptionId` in
  `aria-describedby`.
- **Standalone & opt-out `GhostField`:** `<GhostField>` rendered outside
  `<GhostForm>`, `<GhostField>` without `name` inside `<GhostForm>`, and
  `<GhostField name="supportEmail" :invalid="false">` inside `<GhostForm>`
  preserve prop-driven validity without errors or console warnings.
- **Native `<form>` `reset` cooperation (uncontrolled & controlled):**
  - Clicking `<button type="reset">` restores uncontrolled `GhostInput`
    `defaultValue` and, after `await waitForFormResetDeferral()`, clears
    `GhostForm` errors without re-triggering `validateOn: 'change'`; a listener
    calling `event.preventDefault()` on `reset` cancels both control and
    `GhostForm` reset.
  - **Regression — controlled `GhostInput` whose value differs from reset seed:**
    mount `<GhostForm validate-on="change">` with a controlled
    `<GhostInput v-model="values.displayName" default-value="Ada" />`, change
    `values.displayName` to `'Bob'` (differing from the `'Ada'` seed, marking
    `'displayName'` dirty), trigger a native `<form>` `reset` (via
    `<button type="reset">` or `formElement.reset()`), and
    `await waitForFormResetDeferral()` + `await nextTick()`; assert
    `values.displayName` restores to `'Ada'`, `isDirty === false`,
    `isFieldDirty('displayName') === false`, `fieldErrors` stays empty, and
    `validateOn: 'change'` does not run for the child's `update:modelValue`
    restoration.
  - **Regression — native `<form>` `reset` callback invoking imperative `form.reset()` with controlled `GhostInput`:**
    mount `<GhostForm validate-on="change">` with a controlled
    `<GhostInput v-model="values.displayName" default-value="Ada" />` and an
    `@reset` / `onReset` callback that invokes imperative `form.reset()` when
    `event !== null` (without writing `values.displayName` itself), change
    `values.displayName` to `'Bob'` (marking `'displayName'` dirty), trigger a
    native `<form>` `reset`, and `await waitForFormResetDeferral()` +
    `await nextTick()` so both the imperative `nextTick()` and the child
    `afterNativeFormReset` macrotask + reactive flush settle; assert
    `values.displayName` restores to `'Ada'`, `isDirty === false`,
    `isFieldDirty('displayName') === false`, `fieldErrors` stays empty, and
    `schema['~standard'].validate` does not run for the controlled child's
    `update:modelValue` restoration.
- **Popup blur exclusion:** moving `focusout` from `GhostSelectTrigger` to the
  portaled `GhostSelectContent` referenced by `aria-controls` does not trigger
  premature `validateOn: 'blur'` validation while selecting an option.
- **SSR and hydration (`expectSsrHydration`):**
  1. Idle `<GhostForm>` with named `<GhostField>`s and empty `<GhostFieldError />`
     renders matching SSR and hydrated DOM with hidden error nodes, no
     `aria-invalid`, `novalidate`, and zero Vue hydration warnings.
  2. `<GhostForm :initial-issues="serverIssues">` renders `data-state="invalid"`,
     `aria-invalid="true"`, and visible `<GhostFieldError role="alert">` copy on
     the server, hydrates cleanly without `aria-describedby` mismatch across
     both `[Label, Control, Error]` and `[Label, Error, Control]` child orders,
     and attaches `aria-describedby` after mount.

### Browser keyboard and accessible-error tests (`tests/e2e/form.spec.ts`)

- **Keyboard invalid submit → focus & ARIA relationship (`@cross-browser`):**
  focus the first `GhostInput`, type invalid values, press `Enter` to submit via
  native implicit form submission; assert page does not reload, real focus
  (`await expect(firstInvalidInput).toBeFocused()`) moves to the first invalid
  control in DOM order (including when the first invalid field is a
  `GhostRadioGroup` whose `<fieldset>` carries `aria-invalid="true"` and focus
  lands on its first enabled `<input type="radio">`), `aria-invalid="true"` is
  present, `aria-describedby` resolves to both the visible `GhostFieldDescription`
  and visible `GhostFieldError` (`role="alert"`), and form-level issues render in
  `GhostInlineAlert` (`role="alert"`).
- **Composite popup `Enter` isolation:** open a `GhostSelect` inside `GhostForm`
  with the keyboard, arrow to an option, and press `Enter`; assert the option is
  selected and the listbox closes **without** submitting `GhostForm`.
- **Keyboard repair & valid submit:** `Tab` through invalid fields, correct each
  value (asserting `aria-invalid` clears on edit), press `Enter` on the submit
  `GhostButton`, and assert the typed transformed payload renders in the status
  output and `axeScan` reports zero violations in both idle and invalid states
  (`light` and `dark` modes).

### Compile-time / type inference tests (`packages/vue/type-tests/GhostFormConsumer.ts`, `GhostFormConsumer.vue`)

- **Upstream Standard Schema v1 compatibility:** bidirectional assignability
  between `@ghostvue/vue`'s `StandardSchemaV1` and `@standard-schema/spec`'s
  `StandardSchemaV1`, plus a concrete transformed schema (`Input = { count: string; nested: { tags: { label: string }[] } }`,
  `Output = { count: number; nested: { tags: { label: string }[] } }`).
- **Positive inference:** `<GhostForm :schema="schema" :values="values" @submit="({ output }) => output.count.toFixed(0)">`
  and `useGhostForm({ schema, values })` infer `output.count` as `number`,
  `values.count` as `string`, and accept valid dot-paths `'count'`,
  `'nested.tags'`, `'nested.tags.0'`, and `'nested.tags.0.label'` in
  `getFieldError` / `validateField`.
- **Negative assertions (`// @ts-expect-error` and `<!-- @vue-expect-error -->`):**
  - Passing `{ count: 123 }` as `values` when `InferInput<typeof schema>['count']`
    is `string` fails typecheck.
  - Calling `output.count.trim()` (treating transformed `number` output as raw
    `string` input) fails typecheck.
  - Calling `form.getFieldError('nonExistentPath')` or
    `form.validateField('nested.wrong')` fails typecheck against
    `GhostFormFieldPath<TValues>`.
  - Passing an object with `'~standard': { version: 2, ... }` fails the
    `StandardSchemaV1` constraint.

## Documentation plan

When `#420` implements the approved contract:

- Publish `docs/components/form.md` with generated `<!-- @generated docs-api:vue/ghost-form begin -->`
  API reference tables, Standard Schema v1 library recipes (Zod, Valibot,
  ArkType, and zero-dependency custom schemas), input-vs-output transformation
  explanation, nested object/array dot-paths, form-level `GhostInlineAlert`
  composition, async race/server-error handling (`setFieldErrors`, `waitUntil`),
  SSR `initialIssues`, and accessibility guidance.
- Cross-link from `docs/components/field.md` showing standalone `GhostField` vs
  `<GhostField name="...">` inside `GhostForm`.
- Add executable examples under `examples/form/` (for example
  `examples/form/profile-schema.vue`, `examples/form/async-validation.vue`, and
  `examples/form/nested-webhooks.vue`), register them in
  `packages/vue/registry/form.registry.json` and `ghost-form.manifest.json` via
  `pnpm manifests:write` and `pnpm registries:write`, and add playground
  coverage plus Linux Docker visual baselines (`pnpm test:visual:docker`).

## Compatibility and release impact

- **Additive `0.2.0` surface:** `GhostForm`, `useGhostForm`, `StandardSchemaV1`,
  and related types are new named exports in `@ghostvue/vue`.
- **Backwards-compatible `GhostField` extension:** `name?: string | undefined`
  and scoped default-slot props on `GhostField` and `GhostFieldError` are purely
  additive. Changing `GhostField`'s internal prop default for `invalid` from
  `false` to `undefined` while computing `Boolean(props.invalid ?? formInvalid ?? false)`
  preserves identical `false` defaults for all existing callers and identical
  `packages/vue/manifests/ghost-field.manifest.json` consumer behavior.
- **Changeset impact:** None on this docs-only specification PR. Implementation
  in `#420` requires a `minor` Changeset for `@ghostvue/vue` (F5 resolved
  against a `@ghostvue/themes` re-export in `0.2.0`).

## Open architectural questions

None blocking. Zac approved F1–F5 as proposed at
`eda553c2c6b6a0a098db1c5aafff8a9893848719` (recorded by `zprue743` on PR #487,
2026-11-28); implementation ([#420](https://github.com/zprue743/ghostvue/issues/420))
remains held until this revised specification PR merges into `master`. Recorded
decisions for `#420`:

1. **Standard Schema v1 type source (F1, approved: Option A).**
   - **Adopted:** Export a local, spec-exact `StandardSchemaV1` TypeScript
     interface/namespace from `@ghostvue/vue` (`0` production dependencies) and
     pin `@standard-schema/spec` as a `devDependency` in compile-time type tests
     to enforce bidirectional type equality.
   - **Alternative (rejected):** Add `@standard-schema/spec` (`^1.1.0`, MIT, types-only) to
     `@ghostvue/vue` `dependencies` and re-export its `StandardSchemaV1` type
     directly.
2. **Async submit handler tracking on `<GhostForm>` (F2, approved: Option A).**
   - **Adopted:** Keep `submit`, `invalid`, and `reset` in `defineEmits` so
     they appear as standard events in `ghost-form.manifest.json` and generated
     API docs, and provide `payload.waitUntil(promise)` on
     `GhostFormSubmitPayload` for async `<GhostForm @submit>` handlers (while
     `useGhostForm({ onSubmit })` awaits a returned `Promise` directly).
   - **Alternative (rejected):** Declare `onSubmit?: (payload: ...) => unknown | Promise<unknown>`
     in `defineProps` instead of `defineEmits` so `<GhostForm @submit="asyncSave">`
     returns its `Promise` directly without `waitUntil(...)`, accepting that
     `vue-component-meta` records `onSubmit` in `props` rather than `events`.
3. **Default trigger pair and duplicate-submit policy (F3, approved: Option A).**
   - **Adopted:** Default `validateOn: 'submit'` and `revalidateOn: 'change'`,
     ignore duplicate submits while `isSubmitting === true` (`{ status: 'ignored' }`),
     and let `submit()` supersede background `blur`/`change` validations when
     `isSubmitting === false`.
   - **Alternative (rejected):** Default `validateOn: 'blur'`, or queue/abort-and-restart
     in-flight submissions on a second submit click.
4. **Canonical nested path encoding and unmatched paths (F4, approved: Option A).**
   - **Adopted:** Join `string | number` path segments with `.`
     (`billing.postalCode`, `webhooks.0.url`), keep non-empty unmatched paths in
     `fieldErrors[path]` without duplicating them into `formErrors`, and route
     only empty/missing or `symbol`-containing paths into `formErrors`.
   - **Alternative (rejected):** Support JSON-Pointer/bracket syntax (`webhooks[0].url`) or
     also mirror unmatched field paths (no mounted `<GhostField name="...">`)
     into `formErrors`.
5. **Package surface in `@ghostvue/themes` (F5, approved: `@ghostvue/vue`-only).**
   - **Adopted:** Export `GhostForm` and `useGhostForm` from `@ghostvue/vue`
     only in `0.2.0`, because `GhostForm` owns no visual tokens or layout chrome
     (consumers compose `GhostCard`, `GhostField`, `GhostFieldset`, or CSS grid).
   - **Alternative (rejected):** Re-export `GhostForm` from `@ghostvue/themes` (either as a
     pass-through or with an optional default vertical field-stack gap) so
     themed consumers can import `GhostForm` from `@ghostvue/themes` alongside
     `GhostField` and `GhostInput`.
