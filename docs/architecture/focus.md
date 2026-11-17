# Focus scope and roving focus

Overlays and composite widgets share two primitives from `@ghostvue/vue`:
`useFocusScope` and `useRovingFocus`. They are named ESM exports.
`@ghostvue/vue` must not import `@ghostvue/themes`.

Component composables stay `useGhost*` (`useGhostDialog`) per ADR 0003. These two
are not a component contract, so they do not take that prefix — the same
rule as `useControllableState` in [component-state.md](./component-state.md).

Do not add `focus-trap`, `tabbable`, or similar runtime dependencies. A small
internal `getTabbableElements(root)` helper is the tab-sequence query.

`GhostPopover` uses `useFocusScope` with `trapped: false` for non-modal entry
and restoration. Dialog, DropdownMenu, Select, ToggleGroup, and Tabs are still
deferred until those components exist.

SSR setup must not touch the document. Both composables register listeners in
`onMounted` (and in the handlers those listeners call) and remove them on
unmount or when the container becomes `null`.

### Tabbable query (`getTabbableElements`)

`getTabbableElements(root)` models platform Tab stops without external runtime
dependencies:

- **Native radio groups:** Named `<input type="radio">` elements are grouped by
  `(radio.form ?? radio.getRootNode(), radio.name)`. Each group contributes at
  most one Tab stop: the checked tabbable radio if one exists (including a
  non-inert checked radio in the same form/root outside `root`), or the first
  tabbable radio when none is checked. Disabled, hidden, and `tabindex="-1"`
  checked radios do not suppress enabled siblings. Unnamed radios remain
  independent Tab stops, and `useFocusScope` treats same-group radios as a
  single edge for `Tab` / `Shift+Tab` wrapping.
- **Visibility memoization:** Within a single query, ancestor `[hidden]`,
  `[inert]`, `[aria-hidden="true"]`, and computed `display: none` / `visibility`
  checks are memoized per element to avoid repeated `getComputedStyle` walks.
- **Open-shadow-root boundary:** `getTabbableElements(root)` queries light-DOM
  candidates under `root` via `querySelectorAll` (or the direct tree of `root`
  when `root` itself is a `ShadowRoot`). It does not traverse into nested open
  shadow roots on light-DOM descendants, and closed shadow roots are never
  supported. Extending traversal into nested open shadow roots is gated on a
  concrete failing supported use case and must not add a runtime dependency.

## `useFocusScope(container, options?)`

Activates when `container` resolves to an element. Deactivates when it becomes
`null` or the owner unmounts.

| Option         | Default | Behavior                                                                                                             |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `trapped`      | `false` | Tab/Shift+Tab cannot leave the container, and a `focusin` guard pulls focus back inside if it moves out another way. |
| `loop`         | `true`  | When trapped, wrap last → first and first → last. `false` keeps focus on the edge item.                              |
| `autoFocus`    | `true`  | Focus `[data-autofocus]` if it is focusable, else the first tabbable, else the container.                            |
| `restoreFocus` | `true`  | Focus the previously focused node on deactivate if it is still connected.                                            |

Each option is a `MaybeRefOrGetter`. `container` is too.

Nested trapped scopes stack. Only the **innermost currently trapped** scope
handles `Tab` and `focusin` recovery. If focus leaves the container via a
pointer click, script `.focus()`, or screen-reader navigation, `focusin` returns
focus to the last focused focusable element inside the container (or falls back
to initial focus if that element is gone or disabled). An untrapped inner scope
does not steal trap ownership from an ancestor, so a non-modal popover inside a
dialog does not disable the dialog trap.

When a dismissable layer from `useDismissableLayer` (such as a portaled
`GhostPopover`) is stacked **above** the trapped scope's own layer and focus sits
inside that upper layer (and outside the trapped scope's container), the trapped
scope ignores both `Tab` and `focusin` recovery so focus can move freely inside
the popover instead of being pulled back to the dialog. Inline layers contained
inside the scope (`portal=false`) and dismissable layers stacked below the scope
do not bypass the trap.

### Why `trappedStack` is module-level

`trappedStack` is intentionally a module-level stack (per loaded copy of
`@ghostvue/vue`) rather than an isolated per-app `provide`/`inject` context:

- **Document-global focus:** A browser document has one `document.activeElement`.
  If separate Vue apps on the same page held independent stacks, concurrent
  trapped scopes would both treat themselves as topmost and fight over focus.
- **Zero-provider contract:** Standalone `useFocusScope` calls and components
  coordinate automatically without requiring `app.use(GhostVue)` or a root
  provider component, matching `layerStack` in [ADR 0011](../adr/0011-overlay-primitives.md)
  and scroll-lock / inert ref-counting in [ADR 0012](../adr/0012-modal-overlays.md).

To prevent common global-stack failure modes:

- **Nesting order across portals:** `useFocusScope` pairs DOM `contains()` checks
  with Vue `provide`/`inject` ancestor IDs so child trapped scopes stay above
  parents even when both teleport into `document.body` during the same mount.
- **Out-of-order deactivation:** Cleanup removes each scope entry by object
  identity rather than popping from the top, preserving whichever active scope
  remains innermost.
- **Stale disconnected roots (HMR / DOM removal):** Before dispatching `Tab` or
  `focusin`, connected scopes whose root element left the document without Vue
  cleanup are pruned from the top of the stack so an orphaned node cannot wedge
  lower traps, and `document` listeners detach completely once the stack empties.

```ts
const content = useTemplateRef<HTMLElement>('content')

useFocusScope(content, {
  trapped: () => props.modal,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})
```

## `useRovingFocus(container, options?)`

APG roving tabindex for one-dimensional composites (tabs, toggle groups,
menus). Descendants that can receive focus become items. The current item has
`tabindex="0"`; the others have `tabindex="-1"`. That DOM mutation is the
widget contract, not a consumer-data leak.

| Option        | Default        | Behavior                                                                                  |
| ------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `orientation` | `'horizontal'` | `horizontal` uses Left/Right, `vertical` uses Up/Down, `both` uses all four.              |
| `loop`        | `true`         | Wrap at the ends. `false` stays on the edge item.                                         |
| `dir`         | inferred       | `ltr` / `rtl`. When omitted, read `[dir]` on the container or `document.documentElement`. |

Home and End move to the first and last **enabled** item. Disabled and
`aria-disabled="true"` items are skipped. Horizontal arrows flip in RTL.
Arrow keys inside an input, textarea, select, or contenteditable host are
left to that field.

Arrow, Home, and End keys pressed with Alt, Ctrl, or Meta (Command) are not
handled: focus, tab stops, and `defaultPrevented` stay unchanged so browser,
operating-system, assistive-technology, and application shortcuts (for example
Alt+Left history back or Cmd+Left) keep working. Keys that belong to an IME
composition (`isComposing`, or `keyCode` 229) are ignored the same way. Shift is
not a bail-out: Shift+Arrow, Shift+Home, and Shift+End move like the unmodified
key.

Tab is not handled: the browser already stops once on the `tabindex="0"` item.

```ts
const list = useTemplateRef<HTMLElement>('list')

useRovingFocus(list, {
  orientation: 'vertical',
  loop: true,
  dir: () => props.dir,
})
```
