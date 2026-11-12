# Focus scope and roving focus

Overlays and composite widgets share two primitives from `@ghostvue/vue`:
`useFocusScope` and `useRovingFocus`. They are named ESM exports.
`@ghostvue/vue` must not import `@ghostvue/themes`.

Component composables stay `useGhost*` (`useGhostDialog`) per ADR 0003. These two
are not a component contract, so they do not take that prefix — the same
rule as `useControllableState` in [component-state.md](./component-state.md).

Do not add `focus-trap`, `tabbable`, or similar runtime dependencies. A small
internal `getTabbableElements(root)` helper is the tab-sequence query.

Using them from Dialog, DropdownMenu, Select, ToggleGroup, Tabs, and Popover
is deferred until those components exist.

SSR setup must not touch the document. Both composables register listeners in
`onMounted` (and in the handlers those listeners call) and remove them on
unmount or when the container becomes `null`.

## `useFocusScope(container, options?)`

Activates when `container` resolves to an element. Deactivates when it becomes
`null` or the owner unmounts.

| Option         | Default | Behavior                                                                                  |
| -------------- | ------- | ----------------------------------------------------------------------------------------- |
| `trapped`      | `false` | Tab/Shift+Tab cannot leave the container.                                                 |
| `loop`         | `true`  | When trapped, wrap last → first and first → last. `false` keeps focus on the edge item.   |
| `autoFocus`    | `true`  | Focus `[data-autofocus]` if it is focusable, else the first tabbable, else the container. |
| `restoreFocus` | `true`  | Focus the previously focused node on deactivate if it is still connected.                 |

Each option is a `MaybeRefOrGetter`. `container` is too.

Nested trapped scopes stack. Only the **innermost currently trapped** scope
handles Tab. An untrapped inner scope does not steal trap ownership from an
ancestor, so a non-modal popover inside a dialog does not disable the dialog
trap.

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

Tab is not handled: the browser already stops once on the `tabindex="0"` item.

```ts
const list = useTemplateRef<HTMLElement>('list')

useRovingFocus(list, {
  orientation: 'vertical',
  loop: true,
  dir: () => props.dir,
})
```
