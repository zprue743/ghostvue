# GhostTextarea specification

**Status:** Proposed for GHO-87. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostTextarea` is the multi-line text control. Authors, comments, and long
form fields need a native `<textarea>` that participates in HTML forms, keeps
controlled Vue `v-model` honest, and exposes disabled, readonly, invalid, and
required states without inventing a second form engine.

Sighted users type into a resizable (or auto-growing) field. Assistive
technology encounters an ordinary named textbox. A future `GhostField`
(GHO-71) will own label, description, and error text; this component stays a
single native control that Field can wire through `id` and `aria-*`
fallthrough.

## Non-goals

- It is not `GhostInput` (GHO-70), `GhostNumberInput` (GHO-89), or a
  contenteditable editor. Single-line text, numeric steppers, and rich text
  are other primitives.
- It is not `GhostField`. Labels, descriptions, error copy, and
  `aria-describedby` / `aria-errormessage` ownership belong to Field (or the
  consumer today). This component does not render a label or error and does
  not generate ids.
- It does not share a form-control abstraction with Input. GHO-70 is landing
  in parallel; duplicating a few prop names is cheaper than a premature
  shared base. A later Field issue can align both without a new package.
- It does not implement character counters, markdown, autocomplete
  suggestions, or mention/tag chips.
- The unstyled component ships no visual styles. Size, tone, and chrome
  belong to the consumer or the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostTextarea` / `useGhostTextarea`:

| Prop           | Type      | Default | Contract                                                                                                                                                           |
| -------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `modelValue`   | `string`  | omitted | Controlled value. `undefined` is uncontrolled; `''` is a defined empty string.                                                                                     |
| `defaultValue` | `string`  | `''`    | Initial uncontrolled value. Later changes are ignored, matching `useControllableState`.                                                                            |
| `disabled`     | `boolean` | `false` | Native `disabled`. Not focusable, not editable, omitted from form submit.                                                                                          |
| `readonly`     | `boolean` | `false` | Native `readonly`. Focusable and submitted; user edits are rejected by the UA.                                                                                     |
| `invalid`      | `boolean` | `false` | Sets `aria-invalid="true"` and participates in `data-state`. Does not invent error text.                                                                           |
| `required`     | `boolean` | `false` | Native `required`. Constraint validation stays with the form.                                                                                                      |
| `rows`         | `number`  | `2`     | Native `rows`. Matches the HTML default so SSR and the UA agree. Auto-resize uses this as the minimum height.                                                      |
| `maxRows`      | `number`  | omitted | Auto-resize ceiling, in rows. Ignored when `autoResize` is false. When set below `rows`, `rows` wins as both min and max. Consumer CSS `max-height` still applies. |
| `autoResize`   | `boolean` | `false` | Grow the field with its content after mount. Off by default so native `resize` and a fixed `rows` height remain the ordinary path.                                 |

```ts
type GhostTextareaSize = 'sm' | 'md' | 'lg' // themed wrapper only
```

Named ESM exports: `GhostTextarea`, `useGhostTextarea`, and the types above.
Headless behavior lives in the composable; the SFC is a thin unstyled
`<textarea>` that spreads `rootProps`.

Native textarea attributes and event listeners fall through to the single
root. That fallthrough, not dedicated props, is how consumers attach `id`,
`name`, `placeholder`, `maxlength`, `autocomplete`, `wrap`, `cols`, `form`,
and Field-ready ARIA (`aria-label`, `aria-labelledby`, `aria-describedby`,
`aria-errormessage`). The component owns `aria-invalid` from `invalid`; do
not redeclare `aria-*` as camelCase props. `useGhostId` is unused: Field (or
the consumer) supplies the id.

Themed `@ghostvue/themes` `GhostTextarea` wraps the unstyled component and
adds one visual prop. Same behavioral props; this exists only on the themed
wrapper:

| Prop   | Type                   | Default | Contract                                                        |
| ------ | ---------------------- | ------- | --------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control size (padding and font). The default omits `data-size`. |

Importing it loads the default stylesheet and wraps the instance in
`.ghost-themed-scope` so recipe CSS applies without forcing every
`.ghost-textarea` on the page. The wrapper sets `data-size` from `size`.
There is no `variant` / `tone`; invalid uses `--ghost-border-danger` from
the `invalid` prop, and disabled uses `--ghost-action-disabled-*`.

### v-model contracts

`v-model` is a `string` (`modelValue` / `update:modelValue`).
`useControllableState` owns the write path:

- Controlled iff `modelValue` is not `undefined`. `''` is controlled empty.
- Uncontrolled starts at `defaultValue` (default `''`). Later
  `defaultValue` changes are ignored.
- Assignment is synchronous: skip when `Object.is(current, next)`, write
  local state when uncontrolled, then emit `update:modelValue` before the
  setter returns.
- Updates happen on native `input` (every change, including IME
  composition updates the value as the UA does). There is no second
  `update:modelValue` on `change`; native `change` still falls through.

The displayed string is the model. The component never trims, parses, or
mutates the consumer's string beyond writing the next textarea value.

**Reset baseline (GhostVue policy).** `defaultValue` establishes GhostVue's
reset baseline, captured once at mount; later `defaultValue` changes are
ignored. `modelValue` controls the current value. This is not native reset
semantics: [native `form.reset()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset)
restores from the control's current default content/attributes. Pin the
baseline at mount for predictable uncontrolled instances. Reusing the same
control for another record without remounting keeps the original baseline — use
controlled state or `:key` when the baseline must follow the record.

**Form reset reconciliation** matches [GhostInput](./input-spec.md#v-model-contracts):
emit the captured baseline (skip redundant emit via `Object.is`), parent-owned
controlled values, `nextTick` DOM restore when ignored, microtask after full
`reset` dispatch (late `document` / `window` cancel is a no-op). The root
`defaultValue` attribute mirrors the captured baseline for native participation.

### Events, callbacks, slots, and exposed methods

No content slot: a native `<textarea>`'s value is the model, not children.
No component-specific events besides `update:modelValue`. Native listeners
such as `@input`, `@change`, `@focus`, and `@blur` attach to the textarea
and receive the native event. Vue merges consumer `@input` with the
composable's model writer.

A component template ref exposes:

- `element: HTMLTextAreaElement | null`
- `focus(options?: FocusOptions): void`
- `blur(): void`

The methods are no-ops before mount or after unmount. Consumers should not
depend on any markup beyond the root textarea (the themed wrapper's extra
span is not a public layout surface). There is no `select()` sugar;
`element` is enough for caret APIs.

`useGhostTextarea` also returns `resize(element?)` so a headless composable
user can measure without the SFC. When the composable receives an `element`
getter, it attaches the auto-resize lifecycle itself.

## State model

The value is either controlled or uncontrolled, never both. Disabled,
readonly, invalid, and required are independent configuration flags and may
overlap.

### Loading, empty, disabled, read-only, and error states

There is no loading state. An empty string is a valid value.

Disabled sets the native `disabled` attribute: the control leaves sequential
focus order, ignores input, and is omitted from form submit. Readonly sets
native `readonly`: the control stays focusable and is submitted, but the UA
rejects edits. When both are true, both attributes are present; native
disabled wins for focus and submit.

Invalid is consumer-owned. It sets `aria-invalid="true"` whenever the prop
is true and does not set `aria-invalid="false"` when it is not (omission
matches an ordinary valid field). Required sets native `required` and does
not duplicate `aria-required`. Constraint validation, error copy, and live
announcements belong to the form / future Field.

`data-state` is a single hook with precedence **disabled > readonly >
invalid**. Native `disabled` / `readonly` / `aria-invalid` remain the
semantic source of truth, so themed CSS can still style an invalid readonly
field from `aria-invalid`.

### Async behavior

The component performs no asynchronous work. Auto-resize measurement runs
synchronously after mount, on `input`, on value changes, and on element
resize.

## Consumer data

The model is a `string`. The component does not accept objects, adapters, or
nested paths, and it does not mutate a consumer-owned string instance beyond
replacing the model with the next string from `input`.

## Accessibility contract

### Semantics and relationships

The root is always a native `<textarea>`. There is no `role` override.
Accessible name comes from a native `<label for>`, `aria-label`, or
`aria-labelledby` supplied by the consumer (or later by Field). Description
and error relationships are fallthrough `aria-describedby` /
`aria-errormessage`. This component never generates those ids.

`invalid` exposes `aria-invalid="true"`. `required` and `disabled` /
`readonly` use native attributes. The control is not a composite widget;
there is no APG pattern beyond
[ARIA textbox](https://www.w3.org/WAI/ARIA/apg/patterns/textbox/) on a
native host.

### Keyboard interaction

Native platform behavior:

| Key                        | Behavior                                    |
| -------------------------- | ------------------------------------------- |
| Printable characters       | Insert text when enabled and not readonly.  |
| `Enter`                    | Insert a newline. Does not submit the form. |
| `Tab` / `Shift+Tab`        | Leave the field. Native tab order.          |
| `Escape`                   | No component handling.                      |
| Arrow keys, Home/End, etc. | Native caret movement.                      |

Disabled fields are not in sequential tab order. Readonly fields are.

The component adds no key listeners. Auto-resize must not `preventDefault`
on `input` or keys.

### Focus behavior

Enabled and readonly textareas participate in native tab order and use
consumer-supplied (or themed) focus styling. Disabled textareas do not
receive sequential focus. The exposed methods delegate to the native
element and do not restore or trap focus. Auto-resize must not steal focus
or move the caret.

### Assistive technology expectations

Assistive technology encounters an ordinary named multiline textbox. Invalid
is conveyed through `aria-invalid` and, when Field exists, through associated
error text. Required is conveyed through native `required`. The component
does not use a live region; announcement of validation belongs to the form.

Unlabeled playground or docs samples are invalid. Every shipped example
includes a visible `<label>` or `aria-label`.

## Rendering and customization

The unstyled component renders exactly one `<textarea>`. Attribute
fallthrough and the model are the customization API. There is no default
slot and no inner wrapper.

Stable styling hooks follow ADR 0004 and the existing `data-*` configuration
used by `GhostButton` (`data-size`, `data-state`). They are not a new
styling-hooks contract (GHO-38 remains undecided):

- class `ghost-textarea`
- `data-part="root"`
- `data-state="disabled"` \| `"readonly"` \| `"invalid"` with the precedence
  above; omitted when none apply
- `data-auto-resize=""` when `autoResize` is true (configuration, like
  `data-block` on Button)
- themed `data-size="sm"` \| `"lg"`; default `md` omits the attribute

Recipe CSS applies under `.ghost-theme` or `.ghost-themed-scope`, so a
headless `GhostTextarea` on the same page stays unstyled when the stylesheet
is loaded. Token values inherit from the nearest `.ghost-theme` /
`[data-ghost-theme]`. There is no `pt` passthrough object.

Themed visual values use existing semantic tokens only:

- `--ghost-elevation-1-bg` for the field fill
- `--ghost-surface-fg` for text
- `--ghost-text-muted` for placeholder
- `--ghost-border-default` and `--ghost-border-hairline-width` for the rest
  stroke
- `--ghost-border-danger` when `aria-invalid="true"`
- `--ghost-action-disabled-*` when disabled
- `--ghost-action-radius` for corner radius
- `--ghost-control-size-*-padding-block/inline` and
  `--ghost-control-size-*-font` for size
- `--ghost-type-family-sans`, `--ghost-type-line-normal`,
  `--ghost-type-weight-regular`
- `--ghost-focus-ring-*` for `:focus-visible`

Themed default: `inline-size: 100%`, `resize: vertical` when auto-resize is
off, `resize: none` when it is on. Used `block-size` is
`rows * 1lh + padding + border` (via `--_ghost-textarea-rows`) so Chromium
does not size from font metrics, which rounded 1px differently across
fontconfigs. Forced colors map fill to `Field` and text to `FieldText`.
There are no per-component tokens.

## Environment behavior

### SSR and hydration

Setup reads no browser globals. Server markup is a native `<textarea>` with
`rows`, native state attributes, and the current value. Auto-resize **must
not** write inline `height` during render: measuring `scrollHeight` on the
server is impossible, and writing a post-measure height before mount would
hydrate-mismatch. Measurement runs in `onMounted`, on `input`, on model
changes, and on `ResizeObserver` of the element. The first client paint may
be the `rows` height, then it grows; that flash is accepted over a
hydration mismatch.

`ResizeObserver` is attached only after mount, only while `autoResize` is
true, and is disconnected on unmount or when `autoResize` becomes false.
Turning auto-resize off clears the inline height.

`maxRows` is converted to a pixel ceiling from computed `line-height`,
block padding, and border. If `line-height` is `normal`, the implementation
falls back to `font-size * 1.5` (`--ghost-type-line-normal`). Consumer
`max-height` CSS still clamps overflow; when the content exceeds the cap,
`overflow-y` becomes `auto` so the leftover lines remain reachable.

### Mobile and touch

Native virtual keyboard, selection, and zoom are preserved. The themed
wrapper uses control padding tokens; coarse-pointer floors on
`--ghost-control-touch-min` are already satisfied by two rows. Applications
remain responsible for adequate tap targets in the surrounding layout.

## Performance

Value updates are constant-time. Auto-resize measures one element per
`input` / model change / observed resize. There is no global listener,
timer, or registry. One `ResizeObserver` per auto-resizing instance,
cleaned up on unmount.

## Composition

`useGhostTextarea` owns the model (`useControllableState`), native
disabled/readonly/required, `aria-invalid`, `data-part` / `data-state` /
`data-auto-resize`, and auto-resize measurement. `GhostTextarea` spreads
those onto a native `<textarea>`. Themed `GhostTextarea` wraps that
component. Behavior stays in `packages/vue` because its component,
attribute-fallthrough, v-model, and template-ref contracts are Vue-specific.
No framework-neutral core abstraction is needed. No shared form-control
helper is introduced for Input.

The machine-readable contracts are
`packages/vue/manifests/ghost-textarea.manifest.json` and
`packages/themes/manifests/ghost-textarea.manifest.json`.

## Test plan

- Vue tests cover defaults (`textarea`, `rows=2`, empty uncontrolled value),
  controlled and uncontrolled `v-model`, `defaultValue` ignored after mount,
  native `disabled` / `readonly` / `required`, `aria-invalid` from `invalid`,
  `data-state` precedence, `data-auto-resize`, attribute/`id`/`aria-*`
  fallthrough, form association via `name`, exposed refs, and deterministic
  SSR markup that does not include an inline height.
- Composable tests cover the same state matrix, model writes, and
  `resize()` as a no-op when `autoResize` is false or the element is null.
- Browser tests cover typing into a labeled field, form submit of the
  native value, disabled/readonly/invalid/required semantics, auto-resize
  growing with content and honoring `maxRows` (height stops; overflow
  scrolls), themed size geometry, and an axe scan of pages that use the
  component.
- Compile-time tests cover native textarea attribute types on
  `GhostTextareaProps` and the exposed ref contract.
- No framework-neutral unit tests: the component owns no core logic.
- Visual baselines: registered examples, via the existing examples visual
  suite.

## Documentation plan

Publish `docs/components/textarea.md` with an API reference, a labeled
basic `v-model` example, the composable path, disabled/readonly/invalid/
required, auto-resize with `maxRows`, a native form example, component
refs, themed use, styling hooks, Field-ready `id` / `aria-*` notes, and
SSR guidance. Mirror the same examples in the playground gallery.

## Compatibility and release impact

Additive; minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`. The
public contract comprises the behavioral props, `useGhostTextarea`,
`v-model` timing, single-root attribute fallthrough, exposed refs,
`ghost-textarea` / `data-part` / `data-state` / `data-auto-resize`, native
form semantics, auto-resize measurement rules, and the themed `size` prop
plus CSS custom properties.

Future changes require compatibility review even when prop names are
unchanged: changing `rows` default, measuring during SSR, generating ids,
adding a label slot, introducing a shared form-control base, or changing
styling hooks.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks.** This component uses the existing `data-part` /
  `data-*` configuration attributes. It does not introduce a parallel hooks
  contract.
- **Field (GHO-71).** Deferred. Standalone `id` / `aria-*` fallthrough is
  the integration surface. Do not generate ids here in anticipation.
- **Shared form-control primitive with GhostInput (GHO-70).** Rejected for
  this issue. Both components may repeat `disabled` / `readonly` /
  `invalid` / `required` / `v-model`. Align later under Field if needed.
- **CSS `field-sizing: content`.** Rejected as the only auto-resize
  mechanism: support is still uneven, and max-rows needs measurement. It
  may be added later as progressive enhancement in themed CSS without
  changing the headless contract.
