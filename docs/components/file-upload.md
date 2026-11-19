# GhostFileUpload

`GhostFileUpload` lets people choose files for you to upload and shows a
removable list of what they chose. It keeps a `File[]` you can control, appends
new files in input order, reports each rejected file with a typed reason, and
announces outcomes through a polite live region. Keyboard and screen-reader
users operate one native button; pointer users also get a drop target.

Import it from `@ghostvue/vue`. It is headless: the parts render plain elements
with `data-part` and `data-state` hooks and no styles.

::: warning Consumers own uploads
The component never sends a request. `accept`, `maxFileSize`, `maxFiles`, and
`validate` are client-side UX. They are not a security control, a guarantee
about a file's real content type, or a substitute for server validation.
`file.type` comes from the operating system and the file name; the component
never reads file contents.
:::

## Basic use

<GhostExample id="file-upload/basic" />

Compose the parts inside `GhostFileUpload` and render one
`GhostFileUploadItem` per entry from the root slot. Use `entry.id` as the
`v-for` key.

| Part                        | Element  | Role                                                                                 |
| --------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `GhostFileUpload`           | `div`    | State owner. Renders the hidden picker, the optional form mirror, and the announcer. |
| `GhostFileUploadDropzone`   | `div`    | Drop target. Not a tab stop. A click on plain content opens the picker.              |
| `GhostFileUploadTrigger`    | `button` | The keyboard and screen-reader control that opens the picker.                        |
| `GhostFileUploadList`       | `ul`     | Rendered only while files exist. Give it `aria-label` or `aria-labelledby`.          |
| `GhostFileUploadItem`       | `li`     | One entry. Takes `file`.                                                             |
| `GhostFileUploadItemRemove` | `button` | Removes its item's file. Named `Remove {name}` by default.                           |

## Button only

<GhostExample id="file-upload/button-only" />

The dropzone is optional. With `:max-files="1"` the picker allows one file, and
a second file is rejected with `too-many-files` until the first is removed. The
trigger stays enabled at capacity; use the slot's `remaining` to disable or hide
it, as this example does.

## Validation

<GhostExample id="file-upload/validation" />

Browse and drop share one intake path. Each file is checked in input order, and
the first failing step decides its reason:

1. `accept` → `file-type`
2. `maxFileSize` (bytes; a file equal to the limit is accepted) → `file-too-large`
3. `validate(file, { files })` (a returned string rejects) → `custom`
4. Remaining capacity (`maxFiles` minus the current list) → `too-many-files`

Only otherwise-valid files use capacity. Accepted files are appended, and
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
and does not meet WCAG 3.3.1 on its own.

### Duplicates

<GhostExample id="file-upload/duplicates" />

There is no built-in deduplication. File identity is the `File` object, and
choosing the same file twice gives two entries. `validate` receives the current
list plus the batch's earlier accepted files, so you can compare `name`, `size`,
and `lastModified`.

### Dropped folders

Directory upload is not supported. Some browsers surface a dropped folder as an
empty file. Reject those in `validate`, for example when
`file.size === 0 && file.type === ''`.

## GhostField

<GhostExample id="file-upload/field" />

Spread `GhostFieldControl` slot props onto `GhostFileUpload`. `id` and
`aria-describedby` go to the trigger, so the label's `for` points at the trigger
and the description and error are linked to it. `aria-invalid` from the Field is
ignored in favor of `invalid`.

Inside a Field, the trigger's accessible name is composed from the Field label
and its own text, for example "Attachments, Choose files". Set `aria-label` or
`aria-labelledby` on the trigger to replace it. A custom `id` on
`GhostFieldLabel` is not tracked by the Field, so the composed name falls back
to the trigger's text.

## Controlled use

<GhostExample id="file-upload/controlled" />

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

<GhostExample id="file-upload/form" />

With `name`, the root renders a visually hidden `input[type="file"]` that holds
exactly the committed list. Native `multipart/form-data` submission and
`new FormData(form)` carry the files. Without `name`, nothing is submitted.

- `required` sets native `required` on that input when `name` is set. A submit
  with an empty list is blocked, the trigger is focused, and the root and trigger
  become invalid until a file is added or the form is reset.
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

## API

See the [generated component references](/reference/) for full tables.

### `GhostFileUpload`

| Prop                  | Type                               | Default   | Description                                                 |
| --------------------- | ---------------------------------- | --------- | ----------------------------------------------------------- |
| `modelValue`          | `File[]`                           | omitted   | Controlled list.                                            |
| `defaultValue`        | `File[]`                           | `[]`      | Uncontrolled seed and reset baseline, captured once.        |
| `accept`              | `string`                           | omitted   | Native `accept` grammar; enforced on intake.                |
| `maxFiles`            | `number`                           | unlimited | Total capacity. `1` turns `multiple` off.                   |
| `maxFileSize`         | `number`                           | omitted   | Per-file limit in bytes.                                    |
| `validate`            | `GhostFileUploadValidate`          | omitted   | Synchronous check; return a string to reject.               |
| `disabled`            | `boolean`                          | `false`   | Disables intake, buttons, and submit.                       |
| `invalid`             | `boolean`                          | `false`   | Consumer validity; combines with native `required` failure. |
| `required`            | `boolean`                          | `false`   | Native `required` on the form mirror. Needs `name`.         |
| `name`                | `string`                           | omitted   | Form field name. Enables the form mirror.                   |
| `form`                | `string`                           | omitted   | External form id.                                           |
| `id`                  | `string`                           | generated | Id of the trigger, not the root.                            |
| `messages`            | `Partial<GhostFileUploadMessages>` | English   | Announcement and label text.                                |
| `preventDocumentDrop` | `boolean`                          | `true`    | Cancel stray file drops outside dropzones.                  |

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
- **Required:** not conveyed by the control; say it in the label or description.
- The dropzone has no role and is not a tab stop. Its click is a pointer
  convenience; the trigger offers every action.

## Styling hooks

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

## Specification

See [GhostFileUpload specification](/specs/file-upload) and
[GhostField](./field.md).
