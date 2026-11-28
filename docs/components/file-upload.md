# GhostFileUpload

`GhostFileUpload` lets people choose files for you to upload and shows a
removable list of what they chose. It keeps a `File[]` you can control, appends
new files in input order, reports each rejected file with a typed reason, and
announces outcomes through a polite live region. Keyboard and screen-reader
users operate one native button; pointer users also get a drop target.

Import the parts from `@ghostvue/themes` for a styled dropzone, trigger, and
file list. The themed wrappers add styling only; intake, validation, form
submission, and announcements are the headless behavior from `@ghostvue/vue`.
Teams that bring their own design system can start from
[Advanced: headless composition](#advanced-headless-composition).

## Submit release assets {#submit-assets}

<GhostExample id="file-upload/asset-submission" />

The example imports every part from `@ghostvue/themes` and places the upload
inside a themed `GhostField` in a native form. Two assets are already attached,
and the field allows three PDF, PNG, or SVG files of up to 5 MB. Try each step:

- **Add a valid file.** **Choose files**, or drop a file on the dashed zone, and
  pick a PDF. It joins the list, the zone reports that every slot is used, and
  the live region announces "1 file added."
- **Pick a file it rejects.** A `.txt` file, a file over 5 MB, or a fourth file
  is not added. The field turns invalid and shows one sentence per file, such
  as "notes.txt was not added: this file type is not accepted." Choosing
  another `brand-mark.svg` is rejected by the example's `validate` callback:
  "brand-mark.svg was not added: a file with this name is already attached."
- **Recover.** **Remove** a file to free a slot, then choose again. Any change
  to the list clears the error, and a mixed batch shows only that batch's
  rejections. Earlier files are never dropped.
- **Submit.** **Submit packet** reads `new FormData(form)` and lists the files
  the `assets` field carries, which is exactly the visible list. Remove every
  file and submit to see the empty-form error and focus move to
  **Choose files**. Picking only rejected files next replaces that error with
  their file-specific sentences, which stay until the list changes.

The error is `GhostFieldError`, so its text is part of the trigger's
accessible description, next to "Up to 3 PDF, PNG, or SVG files, 5 MB each.",
and the trigger has `aria-invalid="true"`. The source keeps one handler per
outcome (`onFilesChange`, `onReject`, `onSubmit`). The sample stays offline:
in an app, send the same `FormData` to your server and validate there again.

::: warning Consumers own uploads
The component never sends a request. `accept`, `maxFileSize`, `maxFiles`, and
`validate` are client-side UX. They are not a security control, a guarantee
about a file's real content type, or a substitute for server validation.
`file.type` comes from the operating system and the file name; the component
never reads file contents.
:::

## Compose the parts {#basic-use}

<GhostExample id="file-upload/themed" />

Compose the parts inside `GhostFileUpload` and render one
`GhostFileUploadItem` per entry from the root slot. Use `entry.id` as the
`v-for` key. The same part names are exported from `@ghostvue/themes` and
`@ghostvue/vue`.

| Part                        | Element  | Role                                                                                 |
| --------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `GhostFileUpload`           | `div`    | State owner. Renders the hidden picker, the optional form mirror, and the announcer. |
| `GhostFileUploadDropzone`   | `div`    | Drop target. Not a tab stop. A click on plain content opens the picker.              |
| `GhostFileUploadTrigger`    | `button` | The keyboard and screen-reader control that opens the picker.                        |
| `GhostFileUploadList`       | `ul`     | Rendered only while files exist. Give it `aria-label` or `aria-labelledby`.          |
| `GhostFileUploadItem`       | `li`     | One entry. Takes `file`.                                                             |
| `GhostFileUploadItemRemove` | `button` | Removes its item's file. Named `Remove {name}` by default.                           |

### Button only

The dropzone is optional. With `:max-files="1"` the picker allows one file, and
a second file is rejected with `too-many-files` until the first is removed. The
trigger stays enabled at capacity; use the slot's `remaining` to disable or hide
it, or to say how many slots are left, as the
[first example](#submit-assets) does. The headless `file-upload/button-only`
example on the [reference page](/reference/vue/ghost-file-upload) disables its
trigger at capacity.

## Validation

Browse and drop share one intake path. Each file is checked in input order, and
the first failing step decides its reason:

1. `accept` → `file-type`
2. `maxFileSize` (bytes; a file equal to the limit is accepted) → `file-too-large`
3. `validate(file, { files })` (a returned string rejects) → `custom`
4. Remaining capacity (`maxFiles` minus the current list) → `too-many-files`

The [first example](#submit-assets) sets all four, with
`accept=".pdf,.png,.svg"`, `:max-file-size="5_000_000"`, `:max-files="3"`,
and a `validate` callback. Only otherwise-valid files use capacity. Accepted files are appended, and
earlier files are never dropped. Lowering `maxFiles` or changing `accept` or
`maxFileSize` does not evict or re-check existing files; only later intake uses
the new rules. A controlled `modelValue` is trusted as-is.

The whole batch is computed first and committed once. If `validate` throws, the
error reaches Vue's error handler and nothing from the batch is committed.
`validate` must be synchronous and pure.

`accept` uses the native grammar and is matched case-insensitively:

| Token          | Matches when                                                    |
| -------------- | --------------------------------------------------------------- |
| `.ext`         | `file.name` ends with it (so `.tar.gz` works).                  |
| `type/*`       | `file.type` starts with `type/`.                                |
| `type/subtype` | `file.type` equals it, ignoring parameters such as `;charset=`. |

Other tokens are ignored, as the browser ignores them. A typo such as
`accept="pdf"` therefore filters nothing. A file with an empty `file.type`
matches extension tokens only. `accept` is also a hint to the native picker, but
people can switch the picker to "All files", so it is checked on every intake.

`maxFiles` is floored; a value that is not finite or is below 1 means unlimited.
A `maxFileSize` that is not finite or is negative is ignored.

### Rejections

Each rejection is a `GhostFileUploadRejection`:
`{ file, reason, message, code?, maxFiles?, maxFileSize?, accept? }`. They reach
you two ways:

- the `reject` event, once per intake with at least one rejection, after
  `update:modelValue`;
- the root slot's `rejections`, which holds the latest intake's rejections. An
  intake with none sets `[]`. `clear()`, `clearRejections()`, and form reset
  empty it. Removing a file does not.

Render rejections as visible text. The live region is a transient notification
and does not meet WCAG 3.3.1 on its own. The first example keeps the `reject`
payload in its own state and renders each `message` in `GhostFieldError`. It
clears that state in its `update:modelValue` handler, which runs first, so a
removal also clears a stale "limit reached" error.

### Duplicates

There is no built-in deduplication. File identity is the `File` object, and
choosing the same file twice gives two entries. `validate` receives the current
list plus the batch's earlier accepted files. The first example rejects a second
file with the same name, because its review keys assets by name. To reject only
the same file chosen again, compare `name`, `size`, and `lastModified`:

```ts
import type { GhostFileUploadValidate } from '@ghostvue/themes'

const rejectDuplicates: GhostFileUploadValidate = (file, { files }) =>
  files.some(
    (existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified,
  )
    ? 'It is already in the list'
    : null
```

A returned string becomes the rejection's `code` and the end of its message,
for example "a.txt was not added: It is already in the list."

### Dropped folders

Directory upload is not supported. Some browsers surface a dropped folder as an
empty file. Reject those in `validate`, for example when
`file.size === 0 && file.type === ''`.

## GhostField

Spread `GhostFieldControl` slot props onto `GhostFileUpload`, as the
[first example](#submit-assets) does. `id` and `aria-describedby` go to the
trigger, so the label's `for` points at the trigger and the description and
error are linked to it. `aria-invalid` from the Field is ignored in favor of
`invalid`; pass the Field's `invalid` when you render an error.

Inside a Field, the trigger's accessible name is composed from the Field label
and its own text, for example "Attachments, Choose files". Set `aria-label` or
`aria-labelledby` on the trigger to replace it. A custom `id` on
`GhostFieldLabel` is not tracked by the Field, so the composed name falls back
to the trigger's text.

## Controlled use

The first example is controlled: it passes `:model-value` and applies each
`update:modelValue` in a handler that also clears its errors. Plain `v-model`
works the same way.

Bind `v-model` to a `File[]`. Every change emits a **new** array with the same
`File` instances; your array is never mutated. Omit `modelValue` (or pass
`undefined`) for uncontrolled use with `defaultValue`. `[]` is a real, empty
controlled value.

Apply `update:modelValue` synchronously, as `v-model` does. Each intake is
computed against the current prop. If you defer the update across two intakes,
the second is computed from stale state and overwrites the first. If you ignore
an update, the list and the form mirror return to your prop on the next tick, and
nothing is announced as added. `reject` still fires, because it describes intake
validation.

## Forms

With `name`, the root renders a visually hidden `input[type="file"]` that holds
exactly the committed list. Native `multipart/form-data` submission and
`new FormData(form)` carry the files. Without `name`, nothing is submitted. The
first example sets `name="assets"` and reads `getAll('assets')` on submit, so
its status line shows what the form would send. An empty file input still
contributes one nameless, empty `File` to `FormData`, as native file inputs do,
so the example skips entries without a name.

- `required` sets native `required` on that input when `name` is set. A submit
  with an empty list is blocked, the trigger is focused, and the root and trigger
  become invalid until a file is added or the form is reset. The first example
  checks for an empty list in its submit handler instead, so it can show its own
  error text in the Field.
- `disabled` omits the files from submit.
- `form` associates the control with a form elsewhere in the document.
- Native form reset restores `defaultValue` (captured once at setup), clears
  `rejections` and the invalid state, and is silent. A controlled parent receives
  the proposal and may ignore it. A canceled reset does nothing.
- `novalidate`, `form.submit()`, and building `FormData` directly skip
  constraint validation, as with native controls.

A native button cannot expose "required", and the Field's required marker is
decorative, so state "required" in the label or description text.

## Messages

`messages` takes typed, reactive overrides. Each key is a function, so
translations own pluralization. Overrides are read when a message is produced.
Returning an empty string leaves that part out of an announcement.

| Key               | English default                                                                      |
| ----------------- | ------------------------------------------------------------------------------------ |
| `added`           | `1 file added.` / `{count} files added.`                                             |
| `removed`         | `{name} removed. {n} files remaining.` (zero/one forms)                              |
| `cleared`         | `All files removed.`                                                                 |
| `rejected`        | One sentence per reason, for example `{name} was not added: it is larger than 5 MB.` |
| `rejectedSummary` | `{count} files were not added.`                                                      |
| `removeLabel`     | `Remove {name}`                                                                      |

`rejected` also produces each rejection's `message`, so overriding it localizes
both the event payload and the announcement.

After an intake the live region announces the files actually added, then up to
three rejection sentences, or one summary when there are more than three. A
removal announces the file name and the remaining count, and `clear()`
announces `cleared`. Removal and clear announcements are made only when the
change is applied. Identical messages are announced again.

## Dropzone

- Only file drags are handled; text and link drags pass through.
- `data-state="dragging"` stays set while the pointer moves over descendants and
  clears on leave, drop, or when the drag ends elsewhere. The slot receives
  `{ dragging }`.
- A click opens the picker unless the root is disabled, the event was
  `preventDefault`ed, or it landed on an interactive descendant (a link,
  button, input, or anything with `tabindex`). A trigger inside the dropzone
  therefore opens the picker once.
- A disabled dropzone ignores drags and clicks but still cancels a file drop so
  the page does not navigate.

### Document drop guard

While an enabled dropzone is mounted, a file dragged or dropped outside every
dropzone is cancelled, so a near miss does not navigate the browser to the file
and lose form state. One shared pair of document listeners serves every
instance. The guard never touches non-file drags or events another handler has
already cancelled. Set `:prevent-document-drop="false"` to opt out.

## Disabled

`disabled` disables the trigger, drops, the remove buttons, and the form mirror.
`openPicker()`, `addFiles()`, `remove()`, and `clear()` do nothing. Items stay
visible. There is no read-only mode.

## Themed styling {#themed-use}

`GhostFileUpload`, `GhostFileUploadDropzone`, `GhostFileUploadTrigger`,
`GhostFileUploadList`, and `GhostFileUploadItemRemove` from `@ghostvue/themes`
load `ghost-file-upload.css`. They are thin wrappers: they add `data-themed`,
keep your `class` and `style`, forward the `element` ref and methods, and leave
behavior to the headless parts. `GhostFileUploadItem` and `useGhostFileUpload`
are re-exported unchanged; the list styles its items as direct children. There
are no extra visual props.

- The dropzone has a dashed border on a subtle surface. While a file is dragged
  over it, the border turns solid and uses `--ghost-border-primary`.
- `invalid` gives the dropzone and trigger a thicker `--ghost-border-danger`
  border, so the state does not depend on color alone. `disabled` uses the
  disabled action tokens.
- The trigger and remove buttons are at least `--ghost-control-touch-min`
  (44px) in both directions and show the focus ring on `:focus-visible`.
- Color transitions run only without `prefers-reduced-motion`. In forced-colors
  mode the parts use system colors and the drag border uses `Highlight`.

Rules key on `data-themed`, not on a `.ghost-theme` ancestor, so headless parts
on a themed page stay unstyled.

## Accessibility

- **Keyboard:** `Tab` reaches the trigger, then each remove button. `Enter` and
  `Space` activate them. There are no other keys and no roving focus.
- **Focus:** the browser returns focus to the trigger when the picker closes.
  After a removal, if focus was in the removed item, it moves to the next item's
  remove button, then the previous one, then the trigger. If you veto the
  removal, focus stays.
- **Names:** name the list. The remove button's default name begins with
  "Remove"; if you render other visible text, pass a matching `aria-label` or
  override `removeLabel` (WCAG 2.5.3, Label in Name).
- **Status:** one always-mounted `role="status"` region announces outcomes.
  Drag enter and leave are not announced.
- **Errors:** render rejections as visible text. Inside `GhostField`, a
  `GhostFieldError` is announced as an alert and joins the trigger's
  accessible description, and the Field's `invalid` sets `aria-invalid` on the
  trigger. Outside a Field, give the trigger `aria-describedby` that points at
  your error element and pass `invalid` to the root.
- **Required:** not conveyed by the control; say it in the label or description.
- The dropzone has no role and is not a tab stop. Its click is a pointer
  convenience; the trigger offers every action.

## Advanced: headless composition {#advanced-headless-composition}

This section is for teams that bring their own design system and style the
parts themselves. Import the same names from `@ghostvue/vue`: the parts render
plain elements with `data-part` and `data-state` hooks and no styles.

### Headless parts

<GhostExample id="file-upload/basic" />

The headless example composes a dropzone, trigger, and removable list with no
theme. The [GhostFileUpload reference page](/reference/vue/ghost-file-upload)
also renders the other headless examples, which keep their IDs:
`file-upload/button-only`, `file-upload/validation`, `file-upload/duplicates`,
`file-upload/field`, `file-upload/controlled`, and `file-upload/form`.

### `useGhostFileUpload(options?)`

The state engine behind the components. It takes the root props as refs or
getters (`validate` as a function or a ref), element refs for the `picker`,
`mirror`, and `trigger`, and `onChange` / `onReject` callbacks. It returns the
reactive state (`files`, `entries`, `rejections`, `remaining`, `isDisabled`,
`isInvalid`, `isRequired`, `isDragging`, `announcement`), the actions
(`addFiles`, `remove`, `clear`, `clearRejections`, `openPicker`,
`applyFormReset`), registration helpers for dropzones and items, and prop bags
for the picker, mirror, dropzone, trigger, and live region.

`addFiles(files)` is the single intake path. Use it to build a paste target or a
custom drop surface.

### Styling hooks

| Part        | Class                           | `data-part`   | `data-state`                      |
| ----------- | ------------------------------- | ------------- | --------------------------------- |
| Root        | `ghost-file-upload`             | `root`        | `invalid`, `disabled`             |
| Dropzone    | `ghost-file-upload-dropzone`    | `dropzone`    | `dragging`, `invalid`, `disabled` |
| Trigger     | `ghost-file-upload-trigger`     | `trigger`     | `invalid`, `disabled`             |
| List        | `ghost-file-upload-list`        | `list`        | none                              |
| Item        | `ghost-file-upload-item`        | `item`        | none                              |
| Item remove | `ghost-file-upload-item-remove` | `item-remove` | none                              |

`invalid` wins over `disabled`. On the dropzone, `dragging` wins over both. The
internal picker (`data-part="picker"`), form mirror (`form-input`), and live
region (`announcer`) are not styling hooks.

## API

See the [generated component references](/reference/) for full tables.

### `GhostFileUpload`

<!-- @generated docs-api:vue/ghost-file-upload begin -->

<!-- Source: packages/vue/manifests/ghost-file-upload.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop                  | Type                               | Default | Description                                                                                 |
| --------------------- | ---------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `accept`              | `string`                           | —       | Native `accept` grammar: a picker hint that is also enforced on intake.                     |
| `defaultValue`        | `File[]`                           | `"[]"`  | Uncontrolled seed and form-reset baseline, captured once at setup.                          |
| `disabled`            | `boolean`                          | `false` | Disables the trigger, drops, and remove buttons, and omits the mirror from submit.          |
| `form`                | `string`                           | —       | `form` attribute for the mirror and the picker.                                             |
| `id`                  | `string`                           | —       | Id of the trigger (the labelable control), not of the root element.                         |
| `invalid`             | `boolean`                          | `false` | Consumer validity, combined with native constraint failure.                                 |
| `maxFiles`            | `number`                           | —       | Total list capacity. Floored; not finite or below 1 is unlimited. `1` turns `multiple` off. |
| `maxFileSize`         | `number`                           | —       | Per-file limit in bytes; equal is accepted. Not finite or negative is unset.                |
| `messages`            | `Partial<GhostFileUploadMessages>` | —       | Typed, reactive overrides of announcement and label text.                                   |
| `modelValue`          | `File[]`                           | —       | Controlled list. `undefined` is uncontrolled; `[]` is a real empty value.                   |
| `name`                | `string`                           | —       | Form mirror `name`. Without it no mirror renders and nothing is submitted.                  |
| `preventDocumentDrop` | `boolean`                          | `true`  | Cancel file drags and drops outside every dropzone while an enabled dropzone is mounted.    |
| `required`            | `boolean`                          | `false` | Native `required` on the form mirror when `name` is set.                                    |
| `validate`            | `GhostFileUploadValidate`          | —       | Synchronous, pure check after `accept` and `maxFileSize`; return a string to reject.        |

| Event    | Payload                      | Description                                                                                                                              |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `reject` | `GhostFileUploadRejection[]` | Once per intake batch with at least one rejection, after update:modelValue. Fires even when a controlled parent ignores the list update. |

| Slot      | Slot props                                                                                                                                                                                                                                                        | Description                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | `clear: () => void`, `clearRejections: () => void`, `entries: readonly GhostFileUploadEntry[]`, `invalid: boolean`, `openPicker: () => void`, `rejections: readonly GhostFileUploadRejection[]`, `remaining: number \| undefined`, `remove: (file: File) => void` | Consumer layout of the parts, with the list entries, rejections from the latest intake, remaining capacity, effective invalid state, and actions. |

<!-- @generated docs-api:vue/ghost-file-upload end -->

<!-- @generated docs-api:themes/ghost-file-upload begin -->

<!-- Source: packages/themes/manifests/ghost-file-upload.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostFileUpload` API, which it forwards.

<!-- @generated docs-api:themes/ghost-file-upload end -->

Emits `update:modelValue` (`File[]`) and `reject` (`GhostFileUploadRejection[]`).
Other attributes, `class`, `style`, and listeners fall through to the root, so
you can add `role="group"` and a name there.

The default slot receives `{ entries, rejections, remaining, invalid, openPicker, remove, clear, clearRejections }`.
`remaining` is `undefined` when `maxFiles` is unset.

The ref exposes `element`, `focus()` and `blur()` (the trigger), `openPicker()`,
and `clear()`. Browsers may block `openPicker()` outside a user gesture.

### Parts

- `GhostFileUploadTrigger`: prop `disabled` (combines with the root).
- `GhostFileUploadItem`: prop `file` (required).
- `GhostFileUploadDropzone`, `GhostFileUploadList`, and
  `GhostFileUploadItemRemove` take no props.

Every part merges your `class` and `style` and exposes `element`. The trigger
and remove button also expose `focus()` and `blur()`.

## Specification

See [GhostFileUpload specification](/specs/file-upload) and
[GhostField](./field.md).
