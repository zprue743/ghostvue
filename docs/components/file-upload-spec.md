# GhostFileUpload specification

**Status:** Approved design for [GHO-106](https://linear.app/ghost-vue/issue/GHO-106/component-fileupload) (approved by Zac on November 17, 2026; recorded in [GHO-210](https://linear.app/ghost-vue/issue/GHO-210/fileupload-record-the-approved-design-as-the-canonical-component)). Implementation, docs, examples, manifests, and Changesets follow in GHO-211 and GHO-212.

## Purpose and user problems

`GhostFileUpload` is a headless, compound file-selection primitive with a drag-and-drop zone, click-to-browse picker, `accept`/size/count/custom validation, file list with item removal, native form participation, and accessible status announcements.

Consumers own upload transport and server requests. Client-side `accept`, `maxFileSize`, and `maxFiles` checks provide immediate UX feedback only and are not a server validation or file-security guarantee. The component composes with `GhostField` (`GhostFieldControl`, `GhostFieldLabel`, `GhostFieldDescription`, `GhostFieldError`).

## Non-goals

- Upload transport, progress tracking, retry, or request cancellation.
- Image or file previews.
- Directory upload (dropped folders can surface as empty entries; `validate` is the documented guard).
- Clipboard paste intake.
- The HTML `capture` attribute.
- `readonly` state.
- `replace`-on-select in single-file mode (deferred; single-file mode rejects a second file as `too-many-files` until the first is removed).
- Async validation.
- File chunking.
- Built-in deduplication.
- Any security or content-type guarantee, or any server contract.
- Drag enter/leave announcements in v1.
- Visual styles in `@ghostvue/vue` (themed wrappers and CSS live in `@ghostvue/themes`).
- New packages or runtime dependencies (nothing in `@ghostvue/core`).

## Public API

### Parts and exports

Headless `@ghostvue/vue`:

| Part                        | Element  | Responsibility                                                                                                                                   |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GhostFileUpload`           | `div`    | State owner and context provider. Renders the transient picker input, the form mirror (when `name` is set), and the polite live region.          |
| `GhostFileUploadDropzone`   | `div`    | Drop target only. Not a tab stop and has no ARIA role. A click on a non-interactive area opens the picker as pointer convenience.                |
| `GhostFileUploadTrigger`    | `button` | Native `type="button"` control for keyboard and assistive technology to open the picker. Works with or without a dropzone.                       |
| `GhostFileUploadList`       | `ul`     | Rendered only while accepted files exist (`files.length > 0`). Consumer supplies `aria-label` or `aria-labelledby`.                              |
| `GhostFileUploadItem`       | `li`     | Takes `file: File` and provides item context.                                                                                                    |
| `GhostFileUploadItemRemove` | `button` | Native `type="button"` that removes its item's file. Default accessible name comes from `messages.removeLabel(file)`. Moves focus after removal. |

Also exported from `@ghostvue/vue`: `useGhostFileUpload` and related TypeScript types (`GhostFileUploadRejectionReason`, `GhostFileUploadRejection`, `GhostFileUploadMessages`, `GhostFileUploadEntry`, etc.).

Themed `@ghostvue/themes` provides themed wrappers and CSS only where a recipe or visual prop is needed.

### Props and configuration

#### `GhostFileUpload` (root)

| Prop                  | Type                                                              | Default          | Contract                                                                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`          | `File[]`                                                          | omitted          | Controlled file list. `undefined` is uncontrolled; `[]` is a real empty value.                                                                                                                  |
| `defaultValue`        | `File[]`                                                          | `[]`             | Uncontrolled seed and form-reset baseline. Captured once at setup; later changes are ignored.                                                                                                   |
| `accept`              | `string`                                                          | omitted          | Native `accept` grammar. Forwarded to the picker input as a hint and enforced by an internal matcher.                                                                                           |
| `maxFiles`            | `number`                                                          | unlimited        | Integer `>= 1`. Non-finite values or values `< 1` are treated as unset (unlimited). `maxFiles === 1` turns native `multiple` off on the picker; otherwise `multiple` is enabled.                |
| `maxFileSize`         | `number`                                                          | unlimited        | Per-file limit in bytes. Non-finite values or values `< 0` are treated as unset. Min-size and empty-file rules go through `validate`.                                                           |
| `validate`            | `(file: File, ctx: { files: readonly File[] }) => string \| null` | omitted          | Synchronous and pure. Returning a non-empty string code rejects the file with `reason: 'custom'`; returning `null` accepts it. `ctx.files` includes earlier accepted files from the same batch. |
| `disabled`            | `boolean`                                                         | `false`          | Disables the trigger, drops, and remove buttons. Mirror input is disabled and omitted from form submit. Existing items remain visible.                                                          |
| `invalid`             | `boolean`                                                         | `false`          | Consumer validity. Sets `aria-invalid="true"` on the trigger and `data-state="invalid"` on the root.                                                                                            |
| `required`            | `boolean`                                                         | `false`          | Native `required` on the hidden mirror input when `name` is set.                                                                                                                                |
| `name`                | `string`                                                          | omitted          | Form field name. When omitted, no form mirror input is rendered.                                                                                                                                |
| `form`                | `string`                                                          | omitted          | Associates the hidden mirror input with a `<form>` by id.                                                                                                                                       |
| `messages`            | `Partial<GhostFileUploadMessages>`                                | English defaults | Typed reactive overrides aligned with the GHO-43 direction. Callbacks own count and plural formatting.                                                                                          |
| `preventDocumentDrop` | `boolean`                                                         | `true`           | While an enabled dropzone is mounted, file drops on `document` outside any dropzone call `preventDefault()` so the browser does not navigate away.                                              |

#### `GhostFileUploadItem`

| Prop   | Type   | Default  | Contract                                                                               |
| ------ | ------ | -------- | -------------------------------------------------------------------------------------- |
| `file` | `File` | required | The `File` instance represented by this item; provided to `GhostFileUploadItemRemove`. |

#### `accept` matcher edge cases

- `accept` is split on `,`, trimmed of whitespace, and empty tokens are ignored. If `accept` is omitted, empty, or contains only whitespace/commas, all files match.
- Matching is **case-insensitive** for MIME types, wildcards, and extensions.
- **Extension tokens** (starting with `.`, e.g. `.pdf`, `.tar.gz`): match when `file.name.toLowerCase().endsWith(token.toLowerCase())`. This works even when `file.type` is `""`.
- **Wildcard MIME tokens** (`*/*` or `type/*`):
  - `*/*` matches any file, including when `file.type` is `""`.
  - `type/*` matches when `file.type` (lowercased, with `;parameters` stripped) starts with `type/`.
- **Exact MIME tokens** (`type/subtype`, e.g. `image/png`, `application/pdf`): strip `;parameters` from both the token and `file.type`, lowercase both, and compare for exact equality.
- **Empty `File.type` (`""`)**: MIME tokens (`type/*` and `type/subtype`) do **not** match when `file.type === ""`; only `*/*` or matching `.ext` extension tokens match. Consumers targeting files that operating systems leave untyped should include extension tokens alongside MIME types.

### v-model contracts

`v-model` binds `modelValue` as `File[]` and emits `update:modelValue` with a new `File[]` array. `modelValue` defined means controlled; omitting it means uncontrolled (`[]` is a real empty controlled value).

Writes flow through `useControllableState`:

1. Uncontrolled writes update local state immediately and emit `update:modelValue(next)`.
2. Controlled writes emit `update:modelValue(next)` synchronously without mutating local state. If the parent ignores or vetoes the proposal, display and mirror reconcile back to the `modelValue` prop on `nextTick` (matching `GhostInput`).
3. `reject` fires even if the parent ignores the list update.
4. The "added" live-region announcement is composed after `nextTick` from the files actually present in state, so a parent-vetoed add is not announced.
5. `clear()` commits `[]` and clears `rejections`.
6. Form reset restores `defaultValue` through the same write path (matching `useGhostInput`'s `applyFormReset`), clears `rejections`, resyncs the mirror after the native reset macrotask (`useNativeFormReset`), and respects a canceled (`defaultPrevented`) reset.

### Events, callbacks, slots, and exposed methods

#### Events

- `update:modelValue(files: File[])`: Emitted whenever accepted files change. Always passes a new array; never mutates consumer-owned arrays.
- `reject(rejections: GhostFileUploadRejection[])`: Emitted once per intake batch, only when at least one file in the batch was rejected, and always after `update:modelValue`.

```ts
export type GhostFileUploadRejectionReason =
  'file-type' | 'file-too-large' | 'too-many-files' | 'custom'

export interface GhostFileUploadRejection {
  file: File
  reason: GhostFileUploadRejectionReason
  /** Consumer code returned by `validate` when `reason === 'custom'`. */
  code?: string
  /** Resolved message string (English default or `messages` override). */
  message: string
}
```

#### Slots

`GhostFileUpload` default slot props:

- `entries: GhostFileUploadEntry[]` (`{ id: string; file: File }[]` with stable ids from an internal `WeakMap` plus an occurrence suffix)
- `rejections: GhostFileUploadRejection[]` (rejections from the last intake batch only)
- `remaining: number` (`Infinity` when `maxFiles` is unset, otherwise `Math.max(0, maxFiles - files.length)`)
- `openPicker: () => void`
- `remove: (file: File) => void`
- `clear: () => void`
- `clearRejections: () => void`

`GhostFileUploadDropzone`, `GhostFileUploadTrigger`, `GhostFileUploadList`, `GhostFileUploadItem`, and `GhostFileUploadItemRemove` render their default slots. When `GhostFileUploadItemRemove`'s default slot is empty, its accessible name comes from `aria-label` via `messages.removeLabel(file)`.

#### Exposed methods

Template ref on `GhostFileUpload` exposes:

- `element: HTMLDivElement | null`
- `focus(options?: FocusOptions): void` — focuses `GhostFileUploadTrigger`
- `blur(): void` — blurs the active element if inside the root / blurs the trigger
- `openPicker(): void` — opens the native file picker when enabled
- `clear(): void` — commits `[]` and clears `rejections`

## State model

### Intake pipeline

Browse and drop share one intake pipeline:

1. Read picked or dropped files in input order. For the picker, copy `Array.from(input.files)` and immediately set `input.value = ''` so choosing the same file again after removal still fires `change`.
2. Validate each file in fixed order: `accept`, then `maxFileSize`, then `validate(file, { files: acceptedSoFar })`. The first failure becomes that file's rejection reason (`'file-type'`, `'file-too-large'`, or `'custom'`). Failed files are rejected individually without blocking valid siblings in the same batch.
3. Remaining valid files fill remaining capacity (`maxFiles - currentFiles.length`) in input order. Excess valid files are rejected individually as `'too-many-files'`. Only otherwise-valid files consume capacity.
4. Compute the entire batch purely before mutating state. If `validate` throws, the exception propagates to Vue's error handler and component state remains untouched.
5. Commit once: emit `update:modelValue(next)` (when accepted files were added), then emit `reject(rejections)` (when non-empty), and update `rejections`.

### Limit changes and single-file mode

- **Limit and constraint changes never evict.** Changing `maxFiles`, `accept`, or `maxFileSize` affects only future intake. A controlled `modelValue` is trusted and not re-validated.
- **Single-file mode (`maxFiles: 1`)** preserves the same intake semantics: when a file is already present, a second selected or dropped file is rejected as `'too-many-files'` until the existing file is removed.

### Loading, empty, disabled, read-only, and error states

- Empty (`files.length === 0`): `GhostFileUploadList` is not rendered.
- `disabled`: disables `GhostFileUploadTrigger`, dropzone drop handling, and `GhostFileUploadItemRemove` buttons; disables the hidden form mirror so it is omitted from submit; keeps existing items visible.
- `invalid`: sets `aria-invalid="true"` on `GhostFileUploadTrigger` and `data-state="invalid"` on the root. Native constraint validation (`invalid` event on the mirror) also marks the component invalid, prevents the browser's unstyled validation bubble, and focuses the trigger.
- `data-state` precedence on root/trigger: `'invalid'` wins over `'disabled'`; idle omits `data-state`.
- No `loading` or `readonly` states in v1.

### Form participation

When `name` is set, `GhostFileUpload` renders a visually hidden `<input type="file">` mirror using the inline `visuallyHiddenStyle` pattern (GHO-160), with `tabindex="-1"`, `aria-hidden="true"`, `name`, `form`, `disabled`, and `required`.

After each accepted file list change, a post-flush watcher constructs a `DataTransfer`, appends each `File`, and assigns `mirror.files = dt.files` (guarded by `typeof DataTransfer === 'function'` on the client). This gives `<form enctype="multipart/form-data">` and `new FormData(form)` the accepted files and gives `required` native `valueMissing` validity.

On the mirror's `invalid` event (matching `GhostSelect`): mark constraint-invalid state, call `event.preventDefault()`, and focus `GhostFileUploadTrigger`.

The picker is a separate transient `<input type="file">` with the `hidden` attribute (no consumer CSS needed), no `name`, never validated by the form, and cleared after each read.

### Drag and drop

- `GhostFileUploadDropzone` acts only when `event.dataTransfer?.types` includes `'Files'`.
- `dragover` calls `event.preventDefault()` and sets `dropEffect = disabled ? 'none' : 'copy'`.
- `drop` always calls `event.preventDefault()`.
- Drag-over state is tracked with an enter/leave depth counter (increment on `dragenter`, decrement on `dragleave`, reset to `0` on `drop` and `dragend`) and exposed as `data-state="dragging"` on the dropzone when enabled.
- File names and types are not reliably readable during drag, so validation runs on drop only.
- **Document drop guard**: while `preventDocumentDrop` is `true` (default) and at least one enabled dropzone is mounted, `dragover` and `drop` on `document` outside any dropzone call `preventDefault()` so a stray drop does not navigate away and lose form state.

#### Dropzone click rule

Clicking inside `GhostFileUploadDropzone` opens the picker **only** when:

1. The component is not `disabled`.
2. The click is a primary button click (`event.button === 0`) and `!event.defaultPrevented`.
3. The click target is not `GhostFileUploadTrigger` (which handles its own click) and is not inside an interactive descendant (`button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])`).

## Consumer data

- **No in-place mutation**: `File[]` passed via `modelValue` or `defaultValue` is never mutated; `update:modelValue` always emits a new array.
- **File identity**: Identity is `File` object identity (`===`). `remove(file)` removes the first matching entry.
- **No built-in deduplication**: Choosing the same file twice produces two entries. Consumers wanting deduplication use `validate(file, { files })` (documented in examples).
- **Slot entry keys**: `entries` pairs each `File` with a stable `id` derived from an internal `WeakMap<File, string>` plus an occurrence suffix when the same `File` instance appears more than once.

## Accessibility contract

### Semantics and relationships

- `GhostFileUploadTrigger` is a native `<button type="button">` and the single interaction control for keyboard and assistive technology.
- `GhostFileUploadDropzone` has no ARIA role and no `tabindex`.
- `GhostFileUploadList` is a `<ul>`; consumers supply `aria-label` or `aria-labelledby`.
- `GhostFileUploadItemRemove` is a native `<button type="button">` with a default `aria-label` from `messages.removeLabel(file)`.
- **`GhostField` integration**: Spread `GhostFieldControl` slot props onto `GhostFileUpload`. The root forwards `id` and `aria-describedby` to `GhostFileUploadTrigger` and composes the trigger's accessible name via `aria-labelledby` (combining the `GhostFieldLabel` id and the trigger's own id).

### Keyboard interaction

- `Tab` / `Shift+Tab`: Reaches `GhostFileUploadTrigger`, then each `GhostFileUploadItemRemove` as ordinary Tab stops. **No roving focus.**
- `Enter` or `Space` on `GhostFileUploadTrigger`: opens the native file picker.
- `Enter` or `Space` on `GhostFileUploadItemRemove`: removes the item's file.
- Disabled controls are excluded from the tab order via native `disabled`.
- **RTL**: There are no directional arrow keys; RTL needs no special handling.

### Focus behavior

- Trigger and each Remove button are ordinary Tab stops (no roving tabindex).
- **Focus after removal**: Evaluated on `nextTick`. Focus moves to the next item's Remove button if present, else the previous item's Remove button, else `GhostFileUploadTrigger`. If a controlled parent vetoed the removal, focus stays on the current Remove button.
- **Constraint invalidation**: Native `invalid` on the hidden mirror focuses `GhostFileUploadTrigger`.

### Assistive technology expectations

- **Live region**: One always-mounted `role="status"` (`aria-live="polite"`) region in `GhostFileUpload`, visually hidden via `visuallyHiddenStyle` and empty on the server. Each announcement replaces a keyed child node so identical consecutive messages are still announced without timers.
- **Outcomes only**: No drag enter/leave announcements in v1.
- **Visible errors**: A live region alone does not satisfy WCAG 3.3.1, so `rejections` is exposed in the root slot and via `@reject` for consumers to render visible errors (paired with `GhostFieldError` and `invalid` in docs).

### `messages` contract

```ts
export interface GhostFileUploadMessages {
  removeLabel: (file: File) => string
  fileTypeRejected: (file: File) => string
  fileTooLargeRejected: (file: File, maxFileSize: number) => string
  tooManyFilesRejected: (file: File, maxFiles: number) => string
  customRejected: (file: File, code: string) => string
  filesAdded: (count: number) => string
  fileRemoved: (file: File) => string
  filesCleared: string
  filesRejected: (count: number) => string
  requiredValidation: string
}
```

Default English values:

- `removeLabel`: `(file) => \`Remove ${file.name}\``
- `fileTypeRejected`: `(file) => \`${file.name} has an unsupported file type.\``
- `fileTooLargeRejected`: `(file) => \`${file.name} exceeds the maximum file size.\``
- `tooManyFilesRejected`: `(file, maxFiles) => \`${file.name} cannot be added. Maximum of ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} allowed.\``
- `customRejected`: `(file) => \`${file.name} was rejected.\``
- `filesAdded`: `(count) => \`${count} ${count === 1 ? 'file' : 'files'} added.\``
- `fileRemoved`: `(file) => \`${file.name} removed.\``
- `filesCleared`: `'All files removed.'`
- `filesRejected`: `(count) => \`${count} ${count === 1 ? 'file' : 'files'} rejected.\``
- `requiredValidation`: `'Select a file.'`

## Rendering and customization

Styling hooks (`data-part` and `data-state`; absent `data-state` means idle):

- Root (`GhostFileUpload`): `class="ghost-file-upload"`, `data-part="root"`, `data-state`: `'invalid' | 'disabled' | undefined`
- Dropzone (`GhostFileUploadDropzone`): `class="ghost-file-upload-dropzone"`, `data-part="dropzone"`, `data-state`: `'disabled' | 'dragging' | undefined`
- Trigger (`GhostFileUploadTrigger`): `class="ghost-file-upload-trigger"`, `data-part="trigger"`, `data-state`: `'invalid' | 'disabled' | undefined`
- List (`GhostFileUploadList`): `class="ghost-file-upload-list"`, `data-part="list"`
- Item (`GhostFileUploadItem`): `class="ghost-file-upload-item"`, `data-part="item"`, `data-state`: `'disabled' | undefined`
- ItemRemove (`GhostFileUploadItemRemove`): `class="ghost-file-upload-item-remove"`, `data-part="item-remove"`, `data-state`: `'disabled' | undefined`

Every part merges consumer `class` and `style`.

## Environment behavior

### SSR and hydration

- Markup is deterministic on server and client: root, hidden picker (`hidden`), optional form mirror (`visuallyHiddenStyle`, `tabindex="-1"`, `aria-hidden="true"`), and an empty `role="status"` live region.
- `DataTransfer` mirror sync and `document` drop guard listeners run only on the client in `onMounted` / post-flush watchers, guarded with `typeof DataTransfer === 'function'` and `typeof document !== 'undefined'`.
- Drag-over depth starts at `0`, so `data-state="dragging"` never mismatches during hydration.
- `useGhostId` provides deterministic hydration-safe IDs.

### Mobile and touch

- No drag-and-drop on touch; `GhostFileUploadTrigger` is the primary interaction path.
- Themed controls meet 44px touch target sizing, reduced motion, and forced-colors media queries.
- `capture` is a non-goal.

## Performance

- Designed for small file lists with no virtualization (`O(files)` per intake batch).
- No global listeners except the document drop guard while an enabled dropzone is mounted.

## Composition

- Reuses `useControllableState`, `useGhostId`, `useNativeFormReset`, `visuallyHiddenStyle`, and `ghostFieldContextKey` from `@ghostvue/vue`.
- Internal modules in `@ghostvue/vue`: `ghost-file-upload.ts`, `use-ghost-file-upload.ts`, `ghost-file-upload-accept.ts`, `ghost-file-upload-messages.ts`, and `GhostFileUpload*.vue` part components.

## Test plan

- **Unit / Vue Test Utils (Vitest; stub `DataTransfer` in jsdom):**
  - `accept` grammar (exact MIME, `type/*`, `*/*`, extensions, case-insensitivity, empty `File.type`)
  - Validation order (`accept` -> `maxFileSize` -> `validate`) and capacity in input order
  - Mixed accept/reject batches, rejection payload fields, and atomic commit when `validate` throws
  - Consumer `File[]` array never mutated
  - Controlled, uncontrolled, and parent veto with `nextTick` reconciliation
  - Limit changes never evict; no built-in deduplication; single-file mode rejects second file as `too-many-files`
  - Remove, clear, and form reset (uncontrolled, controlled, canceled `defaultPrevented`)
  - Picker input cleared after read so re-selecting the same file fires `change`
  - Disabled and invalid states (`data-state`, `aria-invalid`)
  - Dropzone click rule (non-interactive click opens picker; Trigger/Remove/interactive clicks do not double-open)
  - Live-region announcement text, keyed replacement, and veto suppression
  - SSR markup determinism and document drop guard cleanup on unmount
- **Browser tests (Playwright):**
  - `filechooser` via Trigger click, `Enter`, and `Space` with `toBeFocused()` and ARIA state
  - Ordinary Tab order across Trigger and Remove buttons (no roving focus)
  - Remove and focus movement (next Remove -> previous Remove -> Trigger)
  - Synthetic drop via constructed `DataTransfer` and drag-over `data-state="dragging"`
  - Real `FormData` submission from the mirror, native `required` validation block and Trigger focus, and form reset
  - Document drop guard `preventDefault` behavior
  - `axe` checks on every registered example (light and dark) and `GhostField` label composition
  - **Cross-browser note:** Playwright e2e is Chromium-only until GHO-54 lands; manual Firefox and WebKit verification is required before stable.
- **Type tests:** Props, emits, slots, `messages`, and exposed ref contracts; `modelValue` rejects non-`File[]`.
- **Visual tests:** Themed example baselines generated only via `pnpm test:visual:docker`.

## Documentation plan

- `docs/components/file-upload.md` with API reference, `GhostField` composition, validation, duplicate handling, controlled usage, form participation, accessibility guidance, and styling hooks.
- Executable examples under `examples/file-upload/`: `basic`, `button-only`, `field`, `validation`, `duplicates`, `controlled`, `form`, and `themed`.
- Registry (`packages/vue/registry/file-upload.registry.json`), `primitives.registry.json`, manifest (`packages/vue/manifests/file-upload.manifest.json`), and `docs/roadmap.md` row update in GHO-211 / GHO-212.

## Compatibility and release impact

- Specification only in GHO-210; no runtime or publishable package impact.
- Implementation in GHO-211 and GHO-212 will require minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None. All design decisions and review points were approved in GHO-106 on November 17, 2026.
