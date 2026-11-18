# GhostFileUpload specification

**Status:** Approved design, recorded as the canonical specification for
[GHO-106](https://linear.app/ghost-vue/issue/GHO-106). Zac approved the design
plan in chat on 2026-11-17 (recorded in
[GHO-210](https://linear.app/ghost-vue/issue/GHO-210)), including its six
review points. This document transfers that contract into the repository and is
reviewed in the pull request that adds it. Production markup waits for it to
merge: the headless implementation is
[GHO-211](https://linear.app/ghost-vue/issue/GHO-211) and the themed wrappers
are [GHO-212](https://linear.app/ghost-vue/issue/GHO-212).

Decisions approved on 2026-11-17:

1. Form participation (`name`, `form`, `required`, reset) through a visually
   hidden mirror file input synchronized with `DataTransfer`.
2. A document drop guard, on by default, with a one-boolean opt-out.
3. Single-file mode rejects a second file until the first is removed. A
   `replace` option stays deferred.
4. No drag enter/leave announcements in v1.
5. A typed `messages` prop with English defaults, aligned with the
   [GHO-43](https://linear.app/ghost-vue/issue/GHO-43) direction.
6. Manual Firefox and WebKit verification before stable, until
   [GHO-54](https://linear.app/ghost-vue/issue/GHO-54) lands.

Details this spec settles that the approved plan left open: the `accept`
matcher, which dropzone clicks open the picker, `data-part` / `data-state` /
class names, the exact `messages` keys and English defaults, the batch
announcement format, the `dragging` and `invalid` slot props, the Field
integration mechanism, `remaining` for unlimited capacity, and numeric prop
normalization. Each can be challenged in review without reopening the approved
decisions.

## Purpose and user problems

`GhostFileUpload` lets a person choose files for a consumer to upload, and shows
a removable list of what was chosen. It targets forms (attachments, imports,
avatars) and import flows composed with `GhostField`.

A native `<input type="file">` replaces its selection on every choice, cannot
show a persistent list with per-file removal, offers no drop target, and cannot
be styled. A hand-built replacement usually fails keyboard and assistive
technology users, forgets that a stray drop outside the zone navigates the page
away, and silently drops invalid files.

`GhostFileUpload` keeps a `File[]` the consumer can control. It appends new files
in input order, reports each rejected file with a typed reason, and lets users
remove entries. Keyboard and assistive-technology users operate one native
button; pointer users also get a drop target. Outcomes are announced through a
polite live region and are exposed as data so consumers can render visible
errors.

**Consumers own uploads.** The component never sends a request. Type, size, and
count checks are client-side UX. They are not a security control, a content
guarantee, or a substitute for server validation.

## Non-goals

- Upload transport, progress, retry, cancel, resume, or chunking. There is no
  request lifecycle.
- File previews or thumbnails. Item content is consumer-owned.
- Directory upload (`webkitdirectory`), camera `capture`, and clipboard paste.
  `useGhostFileUpload().addFiles` is the escape hatch for a custom paste or drop
  surface.
- Replace-on-select for single-file mode. With `maxFiles: 1`, a second file is
  rejected until the first is removed. A `replace` option can be added later
  without a breaking change.
- Built-in deduplication. Consumers reject duplicates through `validate`.
- Async validation. `validate` is synchronous and pure.
- `readonly`. Use `disabled`; the list stays visible.
- Polymorphic `as` on parts in v1. `useGhostFileUpload` is the lower-level
  escape hatch; `as` can be added later without a breaking change.
- A global locale provider or bundled translations. See
  [`messages`](#messages).
- Antivirus, content sniffing, or any guarantee about a file's real type.
- Changing `GhostField`, `GhostDialog`, or any shared primitive's public API.

## Public API

### Parts and exports

Headless `@ghostvue/vue`:

| Part                        | Element  | `data-part`   | Class                           | Responsibility                                                                                                  |
| --------------------------- | -------- | ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GhostFileUpload`           | `div`    | `root`        | `ghost-file-upload`             | State owner and provider. Renders the transient picker input, the form mirror, and the polite live region.      |
| `GhostFileUploadDropzone`   | `div`    | `dropzone`    | `ghost-file-upload-dropzone`    | Drop target. Not a tab stop, no role. A click on a non-interactive area opens the picker (pointer convenience). |
| `GhostFileUploadTrigger`    | `button` | `trigger`     | `ghost-file-upload-trigger`     | The keyboard and assistive-technology control that opens the picker. Works with or without a dropzone.          |
| `GhostFileUploadList`       | `ul`     | `list`        | `ghost-file-upload-list`        | Rendered only while files exist. Consumers supply `aria-label` or `aria-labelledby`.                            |
| `GhostFileUploadItem`       | `li`     | `item`        | `ghost-file-upload-item`        | One entry. Takes `file: File` and provides item context to its remove button.                                   |
| `GhostFileUploadItemRemove` | `button` | `item-remove` | `ghost-file-upload-item-remove` | Removes its item's file. Default accessible name from `messages.removeLabel`. Native `type="button"`.           |

Also exported:

- `useGhostFileUpload` — state, intake, validation, announcements, and prop bags
- Types: `GhostFileUploadProps`, `GhostFileUploadEntry`,
  `GhostFileUploadRejection`, `GhostFileUploadRejectionReason`,
  `GhostFileUploadRejectionContext`, `GhostFileUploadValidate`,
  `GhostFileUploadValidateContext`, `GhostFileUploadMessages`,
  `GhostFileUploadSlotProps`, `GhostFileUploadDropzoneSlotProps`, per-part
  `*Exposed` interfaces, and `UseGhostFileUploadOptions`

Root internals that are **not** styling hooks: the picker input
(`data-part="picker"`), the form mirror (`data-part="form-input"`), and the live
region (`data-part="announcer"`).

Themed `@ghostvue/themes` ([GHO-212](https://linear.app/ghost-vue/issue/GHO-212))
re-exports the same part names with token-based styles. Behavior stays in
`@ghostvue/vue`. Nothing in this feature belongs in `core`.

### Props and configuration

#### `GhostFileUpload` (root)

| Prop                  | Type                               | Default     | Contract                                                                                                                                                                   |
| --------------------- | ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`          | `File[]`                           | `undefined` | Controlled list. `undefined` is uncontrolled; `[]` is a real empty value.                                                                                                  |
| `defaultValue`        | `File[]`                           | `[]`        | Uncontrolled seed and the form-reset baseline. Captured once at setup; later changes are ignored.                                                                          |
| `accept`              | `string`                           | `undefined` | Native `accept` grammar. Forwarded to the picker as a hint and enforced on intake by the matcher below.                                                                    |
| `maxFiles`            | `number`                           | `undefined` | Total list capacity. Integer, floored; a value that is not finite or is below 1 is treated as unset. `1` turns native `multiple` off on the picker. Unset means unlimited. |
| `maxFileSize`         | `number`                           | `undefined` | Per-file limit in bytes. A file larger than the limit is rejected; equal is accepted. A value that is not finite or is negative is treated as unset.                       |
| `validate`            | `GhostFileUploadValidate`          | `undefined` | Synchronous, pure consumer check run after `accept` and `maxFileSize`.                                                                                                     |
| `disabled`            | `boolean`                          | `false`     | Disables the trigger, drops, and remove buttons, and omits the mirror from submit. Items stay visible.                                                                     |
| `invalid`             | `boolean`                          | `false`     | Consumer-supplied validity. Combines with native constraint failure into the effective invalid state.                                                                      |
| `required`            | `boolean`                          | `false`     | Native `required` on the mirror when `name` is set. Has no effect without `name`.                                                                                          |
| `name`                | `string`                           | `undefined` | Mirror input `name` for native submit. When omitted, no mirror renders and the control does not submit.                                                                    |
| `form`                | `string`                           | `undefined` | `form` attribute forwarded to the mirror and the picker for external form association.                                                                                     |
| `id`                  | `string`                           | generated   | Id of the **trigger** (the labelable control) so `GhostFieldLabel` `for` resolves to it. Not applied to the root element.                                                  |
| `messages`            | `Partial<GhostFileUploadMessages>` | English     | Typed, reactive overrides for announcement and label text. See [`messages`](#messages).                                                                                    |
| `preventDocumentDrop` | `boolean`                          | `true`      | While an enabled dropzone is mounted, a file drag or drop outside every dropzone is `preventDefault`ed so the browser does not navigate away from the page.                |

`aria-describedby` set on the root (including from `GhostFieldControl` slot
props) is applied to the **trigger**, merged with ids already on the trigger,
and is not applied to the root element. `aria-invalid` on the root is ignored in
favor of `invalid`. Every other native attribute, `class`, `style`, and listener
falls through to the root element, so consumers may add `role="group"` and an
accessible name there.

`GhostFieldControl` slot props (`id`, `disabled`, `invalid`, `required`,
`aria-describedby`, `aria-invalid`) spread onto `GhostFileUpload` (the root),
matching `GhostRadioGroup`. The declared props take `disabled`, `invalid`, and
`required`; `id` and `aria-describedby` route to the trigger as described above.

#### `GhostFileUploadTrigger`

| Prop       | Type      | Default | Contract                                                                                             |
| ---------- | --------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `disabled` | `boolean` | `false` | Disables this trigger. Combines with root `disabled` (either disables). Native `disabled` attribute. |

Native `type="button"`. The trigger stays enabled when the list is full; a file
chosen at capacity is rejected with `too-many-files`. Consumers that want to hide
or disable it use the root slot's `remaining`.

#### `GhostFileUploadItem`

| Prop   | Type   | Default | Contract                                                                                   |
| ------ | ------ | ------- | ------------------------------------------------------------------------------------------ |
| `file` | `File` | —       | Required. The entry this item represents; provides context to `GhostFileUploadItemRemove`. |

`GhostFileUploadDropzone`, `GhostFileUploadList`, and `GhostFileUploadItemRemove`
declare no props. Native attributes and listeners fall through to each part's
element.

### Validation and rejections

```ts
type GhostFileUploadRejectionReason =
  'file-type' | 'file-too-large' | 'too-many-files' | 'custom'

interface GhostFileUploadValidateContext {
  /** Accepted files so far: the current list plus earlier accepted files of this batch. */
  readonly files: readonly File[]
}

/** Return `null` or `undefined` to accept, or a non-null string to reject. */
type GhostFileUploadValidate = (
  file: File,
  context: GhostFileUploadValidateContext,
) => string | null | undefined

/** Everything `messages.rejected` needs; also the basis of the public payload. */
interface GhostFileUploadRejectionContext {
  file: File
  reason: GhostFileUploadRejectionReason
  /** The string returned by `validate` when `reason` is `'custom'`. */
  code?: string
  /** Present when `reason` is `'too-many-files'`. */
  maxFiles?: number
  /** Present when `reason` is `'file-too-large'`, in bytes. */
  maxFileSize?: number
  /** Present when `reason` is `'file-type'`. */
  accept?: string
}

interface GhostFileUploadRejection extends GhostFileUploadRejectionContext {
  /** English default from `messages.rejected`; localize through `messages`. */
  message: string
}

interface GhostFileUploadEntry {
  /** Opaque, unique within a root, stable for a File instance; not for persistence. */
  id: string
  file: File
}
```

#### Validation order

Browse and drop share one intake path. Files are processed in input order (the
order of the picker `FileList` or `dataTransfer.files`).

| Step | Check         | Rejection reason | Notes                                                                          |
| ---- | ------------- | ---------------- | ------------------------------------------------------------------------------ |
| 1    | `accept`      | `file-type`      | Matcher below. Skipped when `accept` yields no valid token.                    |
| 2    | `maxFileSize` | `file-too-large` | `file.size > maxFileSize`.                                                     |
| 3    | `validate`    | `custom`         | Runs only for files that passed steps 1 and 2. A non-null return rejects.      |
| 4    | Capacity      | `too-many-files` | Valid files fill the remaining capacity in input order; the rest are rejected. |

Rules that follow from the approved direction:

- The first failing step decides a file's reason. A file that is both too large
  and the wrong type reports `file-type`.
- Only otherwise-valid files consume capacity. Capacity is
  `maxFiles - files.length`, computed once at the start of the batch.
- Each file is rejected individually. Previously accepted files are always
  preserved.
- The whole batch is computed purely and committed once. A throwing `validate`
  propagates to Vue's error handler and leaves the list, `rejections`, and the
  announcement untouched (atomic: no partial commit).
- A selection or drop that contains no files does nothing: no update, no
  `reject`, no announcement.
- Disabled blocks intake entirely: no update, no `reject`, no announcement.

#### `accept` matcher

Settled by this spec. Tokens are comma-separated, trimmed, and compared
case-insensitively. Empty tokens are ignored.

| Token form           | Matches when                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `.ext` (leading dot) | `file.name` ends with the token (so `.tar.gz` works).                                    |
| `type/*`             | `file.type` starts with `type/`.                                                         |
| `type/subtype`       | `file.type` equals the token. MIME parameters on `file.type` (`;charset=…`) are ignored. |
| anything else        | Ignored as an invalid token (matches native behavior).                                   |

- A file matches when **any** valid token matches.
- An empty `file.type` (type unknown to the operating system) matches extension
  tokens only, never MIME tokens. The matcher does not guess.
- When `accept` is omitted or has no valid token, every file passes. A typo such
  as `accept="pdf"` therefore filters nothing; documentation says so.
- `accept` is a hint to the native picker and users can switch it to "All
  files", so the matcher runs on both browse and drop.

#### Identity, duplicates, and limit changes

- Identity is object identity of `File`. The component never clones, wraps, or
  mutates `File` objects, and emitted arrays contain the same instances.
- **No built-in deduplication.** Choosing the same file twice yields two
  entries. `validate` receives `context.files` for this purpose, and the docs
  show rejecting duplicates by name, size, and `lastModified`.
- `remove(file)` removes the first entry whose `File` is identical to `file`.
- **Limit and constraint changes never evict.** Lowering `maxFiles` or changing
  `accept` or `maxFileSize` does not re-validate or drop existing files. Only
  future intake uses the new rules. A controlled `modelValue` is trusted and
  never validated.
- **Same-file reselection.** After reading the picker, the component copies
  `Array.from(input.files)` and sets `input.value = ''`. The picker is therefore
  always empty between uses, `change` fires on every choice, and a file removed
  from the list can be chosen again. The `cancel` event is ignored.

### v-model contracts

| Role | Prop         | Emit                | Uncontrolled initial |
| ---- | ------------ | ------------------- | -------------------- |
| List | `modelValue` | `update:modelValue` | `defaultValue`       |

Backed by `useControllableState`. Switching between controlled and uncontrolled
after setup is unsupported ([GHOST001](../warnings.md#ghost001)).

Writes:

1. Skip when the next array is identical to the current one.
2. Update local state when uncontrolled.
3. Emit `update:modelValue` synchronously with a **new array**. The consumer's
   array is never mutated.

When controlled and the parent ignores an update, the visible list and the
mirror reconcile to the prop on `nextTick`. The component does not synchronously
restore DOM after emitting, matching `GhostInput`.

Emission order for one intake batch: `update:modelValue`, then `reject`.

#### Clear and reset

- `clear()` commits `[]` through the same write path, clears `rejections`, and
  announces `messages.cleared()`.
- Native form reset restores the captured `defaultValue` through the same write
  path (matching `GhostInput`'s `applyFormReset`: when controlled the proposal
  is emitted and the parent may ignore it), clears `rejections` and any native
  constraint-invalid state, and resyncs the mirror after the reset macrotask
  scheduled by `useNativeFormReset`. A canceled reset (`defaultPrevented`) does
  nothing. Reset is silent: no announcement.
- `defaultValue` is the reset baseline for the instance's lifetime.

### Events, slots, and exposed methods

Events on the root:

| Event               | Payload                      | Timing                                                                                                                                                           |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `File[]`                     | Synchronously on any list change.                                                                                                                                |
| `reject`            | `GhostFileUploadRejection[]` | Once per intake batch, only when non-empty, after `update:modelValue`. Fires even if the parent ignores the list update, because it describes intake validation. |

Root default slot (`GhostFileUploadSlotProps`):

| Slot prop         | Type                                  | Description                                                                                    |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `entries`         | `readonly GhostFileUploadEntry[]`     | Current list with stable ids for `v-for` keys.                                                 |
| `rejections`      | `readonly GhostFileUploadRejection[]` | Rejections from the most recent intake only (see below).                                       |
| `remaining`       | `number \| undefined`                 | `maxFiles` minus list length, never below 0. `undefined` when `maxFiles` is unset (unlimited). |
| `invalid`         | `boolean`                             | Effective invalid state: `invalid` prop or native constraint failure.                          |
| `openPicker`      | `() => void`                          | Opens the native picker. No-op when disabled.                                                  |
| `remove`          | `(file: File) => void`                | Removes the first identical entry and applies the focus rule below.                            |
| `clear`           | `() => void`                          | Same as the exposed `clear()`.                                                                 |
| `clearRejections` | `() => void`                          | Empties `rejections` without touching the list.                                                |

`rejections` lifetime: replaced at every intake (an intake with no rejections
sets `[]`), emptied by `clear()`, `clearRejections()`, and form reset. A removal
does not clear it.

`GhostFileUploadDropzone` default slot receives `{ dragging: boolean }` so
consumers can change copy while a file is dragged over (`GhostFileUploadDropzoneSlotProps`).
`GhostFileUploadList`, `GhostFileUploadItem`, `GhostFileUploadTrigger`, and
`GhostFileUploadItemRemove` default slots carry content only.

Exposed template refs:

- `GhostFileUpload`: `element: HTMLElement | null` (the root), `focus(options?)`
  (focuses the trigger), `blur()`, `openPicker()`, `clear()`.
- Every other part: `{ element: HTMLElement | null }`, plus `focus()` and
  `blur()` on `GhostFileUploadTrigger` and `GhostFileUploadItemRemove`.

Native listeners (for example `@click`, `@drop`) attach through fallthrough on
each part's element.

### `messages`

Settled by this spec, following the [GHO-43](https://linear.app/ghost-vue/issue/GHO-43)
direction: typed, reactive overrides per component, English defaults, formatting
callbacks that own pluralization, no provider. Overrides are read when a message
is produced, so a reactive `messages` object updates later announcements.

```ts
interface GhostFileUploadMessages {
  added(count: number): string
  removed(file: File, remaining: number): string
  cleared(): string
  rejected(rejection: GhostFileUploadRejectionContext): string
  rejectedSummary(count: number): string
  removeLabel(file: File): string
}
```

| Key               | English default                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `added`           | `1 file added.` / `{count} files added.`                                                                             |
| `removed`         | `{name} removed. No files remaining.` / `{name} removed. 1 file remaining.` / `{name} removed. {n} files remaining.` |
| `cleared`         | `All files removed.`                                                                                                 |
| `rejected`        | By `reason`, below.                                                                                                  |
| `rejectedSummary` | `{count} files were not added.` Used when a batch has more than three rejections.                                    |
| `removeLabel`     | `Remove {name}`                                                                                                      |

`rejected` defaults (`{name}` is `file.name`):

| Reason           | Default                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `file-type`      | `{name} was not added: this file type is not accepted.`                                                                                         |
| `file-too-large` | `{name} was not added: it is larger than {limit}.`                                                                                              |
| `too-many-files` | `{name} was not added: the limit of 1 file has been reached.` / `…of {n} files…`                                                                |
| `custom`         | `{name} was not added: {code}`, with a final period added when `code` lacks terminal punctuation. When `code` is empty: `{name} was not added.` |

`{limit}` formats `maxFileSize` with
`Intl.NumberFormat('en', { style: 'unit', unitDisplay: 'short', maximumFractionDigits: 1 })`
using decimal steps (byte, kilobyte, megabyte, gigabyte), for example `5 MB`.

The `message` on each `GhostFileUploadRejection` comes from `messages.rejected`,
so overriding that key localizes both the payload and the announcement. A
returned empty string omits that part of an announcement.

**Batch announcement** (settled by this spec): after an intake, the polite live
region receives, joined by single spaces, `messages.added(n)` when `n > 0`
files were actually added, then either each `messages.rejected(...)` (three or
fewer rejections) or one `messages.rejectedSummary(count)` (more than three).
Removal announces `messages.removed(file, remaining)`; `clear()` announces
`messages.cleared()`.

`removeLabel` supplies the default `aria-label` of `GhostFileUploadItemRemove`.
A consumer `aria-label` or `aria-labelledby` on that button wins. When a consumer
renders visible text in the button, its accessible name should begin with that
text (WCAG 2.5.3, Label in Name); pass `aria-label` or override `removeLabel` to
match.

### `useGhostFileUpload`

Headless state and behavior; the SFCs are thin over it. Every behavior in this
spec is reachable without the SFCs.

- **Options:** `modelValue`, `defaultValue`, `accept`, `maxFiles`, `maxFileSize`,
  `validate`, `disabled`, `invalid`, `required`, `name`, `form`, `messages`,
  `preventDocumentDrop` (each `MaybeRefOrGetter`), element getters for the
  picker and mirror, `onChange(files)`, and `onReject(rejections)`.
- **Returns:** reactive `files`, `entries`, `rejections`, `remaining`,
  `isDisabled`, `isInvalid`, `isRequired`, `isDragging`, and `announcement`;
  actions `addFiles(files)`, `remove(file)`, `clear()`, `clearRejections()`,
  `openPicker()`, and `applyFormReset()`; and prop bags for the picker, mirror,
  dropzone, trigger, and live region.
- `addFiles(files: Iterable<File>)` is the single intake path used by the picker
  and by drops. It is public so consumers can build a paste or custom-drop
  surface without a new component API.

Exact member names and types are finalized in TSDoc and the manifest during
implementation; they must not change the behavior in this document.

## State model

Hooks and attributes:

| Surface     | Attribute / state                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Root        | `data-part="root"`, `data-state="invalid" \| "disabled"` (omitted otherwise)                                        |
| Dropzone    | `data-part="dropzone"`, `data-state="dragging" \| "invalid" \| "disabled"` (omitted otherwise)                      |
| Trigger     | `data-part="trigger"`, `data-state="invalid" \| "disabled"` (omitted otherwise), `aria-invalid="true"` when invalid |
| List        | `data-part="list"`                                                                                                  |
| Item        | `data-part="item"`                                                                                                  |
| Item remove | `data-part="item-remove"`                                                                                           |

Precedence (settled by this spec):

- Root and Trigger: `invalid` wins over `disabled`, matching `GhostInput`.
- Dropzone: `dragging`, then `invalid`, then `disabled`. Drag feedback is
  transient and must stay visible on an invalid zone. A disabled zone never
  reports `dragging` because it ignores drags.

The effective invalid state is the `invalid` prop **or** a native constraint
failure reported by the mirror (`required` with an empty list). A constraint
failure clears when the list becomes non-empty or on form reset.

Valid list transitions: empty ↔ non-empty through intake, `remove`, `clear`, a
controlled prop change, or reset. `dragging` is orthogonal and transient.

### Loading, empty, disabled, read-only, and error states

- **Loading:** none. There is no transport; upload progress is consumer UI.
- **Empty:** `GhostFileUploadList` renders nothing while the list is empty.
  Empty-state copy is consumer content.
- **Disabled:** the trigger is natively disabled; the dropzone ignores clicks and
  drags (it still cancels the default so a file dropped on it does not navigate
  the page); remove buttons are natively disabled; the picker and mirror are
  disabled; `openPicker()` is a no-op; `addFiles()` ignores calls (scripted
  events cannot bypass the model, as in `GhostInput`). Items remain visible.
- **Read-only:** not supported (non-goal). Use `disabled`.
- **Error:** `invalid` plus visible consumer text. `rejections` carries typed
  rejection data and the default English message. Documentation pairs it with
  `GhostFieldError`. The live region alone does not satisfy WCAG 3.3.1 (error
  identification), so a visible rendering is required in examples.

Precedence when states overlap: `disabled` blocks intake regardless of
`invalid`, and `invalid` styling still applies while disabled.

### Async behavior

- Intake is synchronous: validation, commit, emit, and `rejections` update happen
  in one pass for a batch.
- **Controlled parents must apply `update:modelValue` synchronously**, as with
  every GhostVue model. Each intake is computed against the current prop. If a
  parent defers its update across two intakes, the second is computed from stale
  state and overwrites the first. Documentation states this.
- The "added" announcement is composed after `nextTick` from the files actually
  present in the list, so a vetoed addition is not announced. Rejections are
  announced regardless, because they describe intake validation.
- Focus after removal is evaluated on `nextTick` and checks `isConnected`.
- The component starts no timers or promises, so it has nothing to cancel.
  Unmounting removes document listeners and ignores later ticks.

## Consumer data

- The model is `File[]`. Files are never cloned, wrapped, made reactive, or
  mutated, and the consumer's array is never mutated; every change emits a new
  array. The composable stores files in shallow state and compares raw
  identity.
- `GhostFileUploadEntry.id` is generated by an internal `WeakMap` keyed by
  `File`, with an occurrence suffix so a repeated identical instance still gets
  a unique key. It is for `v-for` keys only, not persistence.
- `file.name` is rendered as text by consumers (Vue escapes it). The component
  never reads file contents.
- No accessor, key, or adapter callbacks are needed: the consumer type is the
  platform `File`.

## Accessibility contract

### Semantics and relationships

- **Trigger:** native `<button type="button">`; the single interaction target for
  keyboard and assistive technology. Its name comes from its content (for
  example "Choose files"). When the root sits inside `GhostField` and the
  consumer set no `aria-label` or `aria-labelledby` on the trigger, the name is
  composed with `aria-labelledby` referencing the Field label id followed by the
  trigger id, so it reads "Label, Choose files". See
  [Open architectural questions](#open-architectural-questions).
- **Description and invalid:** `aria-describedby` (from Field and any consumer
  value) is applied to the trigger. `aria-invalid="true"` is set when the
  effective state is invalid. A native button does not support `aria-required`;
  see Assistive technology expectations.
- **Dropzone:** a plain element with no role and no tabindex. It is deliberately
  not a `role="region"`: it is not keyboard-operable or scrollable, and a named
  region per upload would add landmark noise. Its click-to-browse behavior is a
  pointer convenience; every action remains available from the trigger (the
  click handler is the usual keyboard-equivalent exception, and any lint
  suppression must cite this paragraph).
- **List and items:** `ul` / `li`. Consumers provide an accessible name for the
  list (`aria-label` or `aria-labelledby`). Remove buttons are native buttons
  named by `messages.removeLabel(file)` unless the consumer names them.
- **Picker input:** `hidden` attribute (UA `display: none`); not in the
  accessibility tree. No consumer CSS is required.
- **Mirror input:** visually hidden with an inline style (the pattern settled in
  [GHO-160](https://linear.app/ghost-vue/issue/GHO-160)), `tabindex="-1"`,
  `aria-hidden="true"`, so axe ignores it. It is not `type="hidden"`: hidden
  inputs do not participate in constraint validation.
- **Live region:** one always-mounted element in the root with `role="status"`,
  `aria-live="polite"`, and `aria-atomic="true"`, inline visually hidden. It
  renders empty on the server. See Assistive technology expectations.

Follows the intent of the [accessibility standard](../standards/accessibility.md);
there is no matching WAI-ARIA Authoring Practices composite pattern, so the
widget uses native buttons and a live region.

### Keyboard interaction

| Key                 | Where        | Behavior                                                                                   |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab` | Whole widget | Reaches the trigger, then each remove button, in DOM order. Disabled controls are skipped. |
| `Enter` / `Space`   | Trigger      | Native button activation; opens the picker.                                                |
| `Enter` / `Space`   | Item remove  | Native button activation; removes the entry and moves focus (below).                       |

No other keys are handled. There are no arrow-key interactions, no typeahead, no
`Escape` behavior, and no roving tabindex: the trigger and each remove button are
ordinary Tab stops. RTL therefore needs no special handling and has no
directional-key test. The picker is opened by calling `input.click()` inside the
activating click handler so the browser's user-activation requirement is met;
`openPicker()` called outside a user gesture may be blocked by the browser.

### Focus behavior

- **Entry and order:** DOM order; no scripted entry.
- **Visible focus:** the trigger and remove buttons show a visible focus ring
  (themed in GHO-212); the headless package adds no focus styling.
- **After the picker closes:** the browser returns focus to the activating
  trigger. The component does not move focus after an intake or a drop.
- **After removal:** if focus was inside the removed item when the removal was
  applied, focus moves to the next item's remove button, otherwise the previous
  item's, otherwise the trigger when it is focusable. If none of those can be
  focused, focus is not forced. If focus was elsewhere, it is untouched. The
  decision runs on `nextTick`, so a controlled parent that vetoed the removal
  leaves focus on the same button.
- **Disabled items:** a disabled remove button is not focusable.
- **Trapping and restoration:** none; this widget uses neither `useFocusScope`
  nor `useRovingFocus`.

### Assistive technology expectations

- A screen-reader user hears a labeled button (for example "Attachments, Choose
  files, button"), activates it, and uses the operating system's file dialog.
- After an intake the live region announces the outcome once, for example "2
  files added. report.pdf was not added: it is larger than 5 MB." Identical
  consecutive messages are still announced: each announcement replaces a keyed
  child of the region, so the text node is new without timers.
- Removal announces the file name and the remaining count.
- Visible rejection text (from `rejections`, linked through the Field error) is
  the persistent record. The live region is the transient notification.
- **Known limitation:** a native `button` cannot expose `aria-required`, and the
  Field's required marker is decorative, so "required" is not announced by the
  control itself. Documentation tells consumers to state "required" in the
  label or description. The assistive-technology review checks this.
- Drag enter/leave is not announced in v1 (approved decision 4). Screen-reader
  users reach the same outcome through the trigger. Revisit in the
  pre-stable assistive-technology review.

## Rendering and customization

Progressive escape hatches, in order: props, `validate` and `messages`
callbacks, slots and slot props (`entries`, `rejections`, `dragging`),
consumer-rendered item content, then `useGhostFileUpload`.

Stable hooks: classes and `data-part` / `data-state` values in the tables above.
Themed CSS selects the component's own parts with child combinators and uses
existing `--ghost-*` tokens only; it must not depend on nested parts or on the
internal picker, mirror, or live region. Every part merges consumer `class` and
`style` and never overwrites them. Internal wrapper nesting is not part of the
API; consumers lay out parts however they like inside the root, and may place the
trigger inside or outside the dropzone.

### Dropzone behavior

- Drag events are handled only when `dataTransfer.types` includes `"Files"`;
  text and link drags are ignored.
- `dragover` calls `preventDefault()` to permit a drop and sets
  `dropEffect = 'copy'` (`'none'` when disabled). `drop` always calls
  `preventDefault()` and reads `dataTransfer.files` synchronously (the
  `DataTransfer` is protected after the event).
- `dragging` is set on entering with files, stays set while over descendants
  (no flicker), and clears when the pointer leaves the dropzone, on drop, and
  when the drag ends elsewhere (a `dragend` or `drop` on the document, or a
  `dragleave` that leaves the window). The mechanism is an implementation detail;
  these behaviors are tested in the browser.
- File names and types are not reliably readable during drag, so validation runs
  on drop, never on enter.
- **Click rule (settled by this spec):** a `click` on the dropzone opens the picker
  unless the root is disabled, the event is `defaultPrevented`, or the event
  target is inside an interactive descendant of the dropzone. Interactive means
  `closest('a[href], button, input, select, textarea, summary, [role="button"], [tabindex]')`
  resolving to an element strictly inside the dropzone. A trigger placed inside
  the dropzone therefore does not open the picker twice. The trigger's own
  `disabled` prop affects only the trigger, not the dropzone.
- Dropped folders can surface as empty entries in some browsers. Directory upload
  is a non-goal; `validate` (for example rejecting `size === 0 && type === ''`) is
  the documented guard.

### Document drop guard

While at least one **enabled** dropzone is mounted under a root whose
`preventDocumentDrop` is true, a drag or drop of files that lands outside every
dropzone is cancelled (`preventDefault()`, `dropEffect = 'none'`). Without it a
slightly missed drop navigates the browser to the file and loses unsaved form
state. The guard is one reference-counted pair of document listeners shared by
all roots, installed on mount and removed with the last guard. It never acts on
non-file drags and never overrides an event another handler already canceled.

## Environment behavior

### SSR and hydration

- Deterministic markup from props and model: root, dropzone, trigger, list
  (items only when `defaultValue` or `modelValue` is non-empty), the hidden
  picker, an empty live region, and the mirror only when `name` is set. Ids come
  from `useGhostId`.
- `File` exists on the server (Node 22 or newer), so items for a non-empty
  `defaultValue` render identically on server and client. A `defaultValue` that
  differs between server and client is a consumer hydration mismatch.
- No `window`, `document`, or `DataTransfer` access in setup. The mirror is
  empty at SSR and synchronized on mount; document listeners attach in
  `onMounted`; `DataTransfer` is guarded with `typeof DataTransfer === 'function'`.

### Mobile and touch

- There is no drag on touch; the trigger (and a tap on the dropzone) opens the
  native chooser. `accept` reaches the picker as a hint, so mobile choosers can
  narrow the list.
- Themed targets are at least 44px (GHO-212). `capture` is a non-goal.
- The software keyboard is not involved.

### Form participation

When `name` is set the root renders a visually hidden `input[type="file"]` mirror
with `name`, `form`, `multiple` (when `maxFiles` is not 1), `required` (when the
root is `required`), and `disabled`. It holds exactly the committed list: after
each change, a post-flush watcher builds a `DataTransfer`, adds each `File`, and
assigns `mirror.files`. Native `<form enctype="multipart/form-data">` and
`new FormData(form)` therefore carry the accepted files, and `required` gives
native `valueMissing` validity with the browser's own localized message.

- The mirror's `invalid` event is handled like `GhostSelect`'s: set the native
  constraint-invalid state, focus the trigger, and `preventDefault()` when
  cancelable. The form stays invalid and submission stays blocked.
- A disabled root disables the mirror, so it is omitted from submit.
- `required` without `name` has no native effect; consumers use `invalid`.
- The **picker** is a separate transient `input[type="file"]` with the `hidden`
  attribute, no `name`, never validated, and cleared after every read. Two inputs
  keep "choose again" deterministic.
- `form` is forwarded to both the mirror and the picker. Reset follows
  [Clear and reset](#clear-and-reset): `useNativeFormReset` listens on the mirror
  when it exists, otherwise on the picker (both are form-associated), so reset
  and external `form` association work with or without `name`.
- Like native controls, `novalidate`, `form.submit()`, and direct `FormData`
  construction bypass constraint validation. `FormData` returns the committed list.

## Performance

Lists are small (tens of files, not thousands); no virtualization. Intake is
O(files) per batch and the accept matcher parses `accept` once per change. Files
are held in shallow state and never deeply observed. Entry ids use a `WeakMap`.
The only global listeners are the shared document drop guard while an enabled
dropzone is mounted. Large files are never read: only `name`, `size`, `type`, and
identity are used.

## Composition

Reused:

- `useControllableState` — the file list, including GHOST001 diagnostics
- `useGhostId` — trigger and related ids
- `useNativeFormReset` — mirror-owned reset, external form association, canceled
  resets
- the inline visually-hidden style settled in GHO-160 — mirror and live region
- `ghostFieldContextKey` — read-only, optional, internal: only to read the Field
  label id for the trigger's composed name. The component works without a Field.
- the Combobox/Calendar polite live-region approach (always-mounted region)

Not used: `useFocusScope`, `useRovingFocus`, `useDismissableLayer`,
`useFloating`, `GhostPortal`. There is no overlay and no composite navigation.

New and intentionally shared: the reference-counted document drop guard, and the
internal `accept` matcher and message defaults. Both stay private to
`@ghostvue/vue` until a second consumer proves a need.

## Test plan

Required, derived from the decisions above.

- **Vue unit tests** (`GhostFileUpload.test.ts`, `use-ghost-file-upload.test.ts`,
  `ghost-file-upload-accept.test.ts`): `accept` grammar (MIME, wildcard,
  extension, mixed case, empty `file.type`, invalid-only tokens); validation
  order (type before size before `validate` before capacity); capacity in input
  order; a mixed accepted/rejected batch; rejection payloads and default
  messages per reason; atomic commit when `validate` throws; the consumer array
  is never mutated and emitted arrays hold the same `File` instances;
  controlled vs uncontrolled; parent veto and `nextTick` reconcile of list and
  mirror; `reject` fires on a vetoed update; no eviction when limits change; no
  built-in deduplication and a `validate` duplicate example; remove and `clear`;
  same-file reselection after removal (picker value cleared); numeric prop
  normalization (`maxFiles` 0/NaN/2.5, `maxFileSize` negative); disabled blocks
  intake and `addFiles`; reset (uncontrolled, controlled, canceled, external
  `form`); announcement text, batch format, three-rejection summary threshold,
  keyed re-announcement of identical messages, vetoed-add suppression; `messages`
  overrides including reactive updates; focus-after-removal rule including a
  vetoed removal; SSR markup and hydration; document drop guard install, shared
  reference counting, and cleanup on unmount. jsdom has no `DataTransfer`;
  stub it with `vi.stubGlobal`.
- **Browser tests** (`tests/e2e/ghost-file-upload.spec.ts`): the `filechooser`
  event through trigger click, `Enter`, and `Space`, with `toBeFocused()` and
  ARIA state assertions; Tab order across trigger and remove buttons; removal
  and real focus movement; a synthetic file drop with a constructed
  `DataTransfer`; `data-state="dragging"` across child elements and on leave,
  drop, and cancel; a real `FormData` payload from the mirror; native
  `required` blocking `requestSubmit()` and focusing the trigger; form reset; the
  document drop guard (a drop outside the zone does not navigate); the disabled
  dropzone cancelling a drop; Field name composition; and axe on every registered
  example in light and dark (no overlays exist, so there are no open/closed
  variants). RTL is not applicable (no directional keys) and is stated here so its
  absence is deliberate.
- **Type tests:** props, emits, slot props, exposed handles; `modelValue` rejects
  non-`File[]`; `validate` accepts only `string | null | undefined` returns;
  `messages` accepts partial overrides.
- **Manual assistive-technology review before stable:** VoiceOver with Safari
  and NVDA with Firefox or Chrome. Confirm the composed trigger name inside
  Field, announcement timing and repetition, and that "required" is conveyed
  through consumer text. Verify the `DataTransfer` mirror and drag behavior in
  Firefox and WebKit manually until
  [GHO-54](https://linear.app/ghost-vue/issue/GHO-54) adds them to the e2e
  matrix.
- **Visual:** `examples/file-upload/*` baselines via `pnpm test:visual:docker` only.

## Documentation plan

`docs/components/file-upload.md` with the API, `messages`, Field composition,
controlled usage (including the synchronous-update requirement), form
participation, and an accessibility section covering the required-state
limitation and the "client-side checks are UX, not security" and dropped-folder
caveats. Executable examples under `examples/file-upload/`: `basic`
(dropzone, trigger, list), `button-only`, `field` (with a visible error from
`rejections`), `validation` (`accept`, `maxFileSize`, `maxFiles`), `duplicates`
(a `validate` duplicate check), `controlled`, `form` (`FormData`, reset,
`required`), and `themed`. Playground exercise of the supported patterns, manifests
for every part via `pnpm manifests:write`, and only this component's roadmap row.

## Compatibility and release impact

New components; additive. `@ghostvue/vue` and `@ghostvue/themes` each need a minor
Changeset when their implementation lands ([GHO-211](https://linear.app/ghost-vue/issue/GHO-211)
and [GHO-212](https://linear.app/ghost-vue/issue/GHO-212)). No existing public
contract changes, and no shared primitive is modified. Event timing (`update:modelValue`
before `reject`), the focus-after-removal rule, the hook names, and the `messages`
keys are public contracts: changing any of them after release is breaking. The
`messages` shape may be renamed before the first release to align with the
GHO-43 outcome; after release it is frozen. No new runtime dependency.

## Open architectural questions

None blocking. Recorded for the implementation and review:

1. **Field label composition.** The trigger's composed name reads the Field label
   id through `ghostFieldContextKey`, a read-only optional internal injection.
   Alternatives: rely on native `label[for]` alone (the computed name for a
   button varies by browser and may drop the action text), or require consumers
   to set `aria-labelledby` themselves. Recommended: the composed name, verified
   with axe and the assistive-technology review. Caveat: a custom `id` on
   `GhostFieldLabel` is not tracked by Field, so the reference would dangle and
   the name degrades to the trigger's own text. Reviewer: Zac.
2. **`aria-invalid` on a button.** axe-core 4.13.0 treats `aria-invalid` as a
   global attribute, so it passes, but ARIA 1.2 deprecates it as global and
   screen-reader support on `button` is inconsistent. The linked error text
   through `aria-describedby` is the reliable channel. If the review finds
   `aria-invalid` misleading, drop it from the trigger and keep `data-state`.
3. **Required state** is not exposed by the control (see Accessibility). Accepted
   for v1, documented.
4. **Deferred, additive later:** `replace` for single-file mode, drag enter/leave
   announcements, paste, directory upload, `capture`, `readonly`, and `as`.
5. **GHO-43 alignment** of the `messages` shape if that issue lands first.
