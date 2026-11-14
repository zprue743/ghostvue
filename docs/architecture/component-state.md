# IDs and controllable state

Headless components share two primitives from `@ghostvue/vue`: `useGhostId` and
`useControllableState`. They are named ESM exports. `@ghostvue/vue` must not
import `@ghostvue/themes`.

Component composables stay `useGhost*` (`useGhostButton`) per ADR 0003. These two
are not a component contract, so they do not take that prefix:

- `useGhostId` keeps `Ghost` because the generated token enters the DOM in the
  library namespace.
- `useControllableState` is a generic Vue state helper, so the descriptive
  name is the public name.

`GhostCheckbox` uses `useControllableState` for `modelValue`. `useGhostId` is
unused there: Field (GHO-71) will own label/control ids, and until then
Checkbox passes `id` through as a native attribute. Using the helpers from
Collapsible is still deferred.

## `useGhostId(prefix?, id?)`

Wraps Vue 3.5 `useId()`. Generated ids are unique per app and stable across
SSR and hydration. `useId()` always runs, even when `id` is set, so Vue's
per-instance counter cannot drift between server and client trees.

- Default prefix is `ghost` (id namespace, not Shoelace `sl-`).
- A non-empty `id` wins. `undefined` and `''` fall back to a generated id.
- Do not call `useId()` inside `computed`; `useGhostId` calls it at setup.

```ts
const id = useGhostId('ghost-checkbox', () => props.id)
```

## `useControllableState`

Returns a writable computed. Assignment is the write path, matching
`defineModel`.

`defineModel` / `useModel` bind one prop on the current component and detect
control from whether the parent passed v-model. Headless components need a
separately named `default*` prop and a helper other composables can call.
Control here is: **`prop()` is defined**. `undefined` is uncontrolled. `null`
is a real controlled value (for example a selected key). `prop` is a getter
(`() => props.open`), not a `MaybeRef`, so a function value cannot be
inferred as `Value`.

### Prop and emit names

| Role            | Prop         | Emit                | Uncontrolled initial |
| --------------- | ------------ | ------------------- | -------------------- |
| Value           | `modelValue` | `update:modelValue` | `defaultValue`       |
| Open / expanded | `open`       | `update:open`       | `defaultOpen`        |
| Pressed         | `pressed`    | `update:pressed`    | `defaultPressed`     |

Boolean props omit `is`/`has`. Do not invent a second write channel for the
same state.

```ts
const open = useControllableState({
  prop: () => props.open,
  defaultValue: () => props.defaultOpen ?? false,
  onChange: (value) => {
    emit('update:open', value)
  },
})

open.value = true
```

### Update timing

The setter is **synchronous**, like `defineModel`:

1. Skip when `Object.is(current, next)` — no double-emit.
2. Uncontrolled: write local state immediately.
3. Call `onChange` (the component's `emit`) before the setter returns.

Parent prop updates, and watchers/`nextTick` work that depends on them, run
after flush. Controlled mode does not write local state; if the parent
ignores the emit, the getter still returns the prop.

`defaultValue` is the initial uncontrolled value only. Later changes are
ignored.

Switching controlled ↔ uncontrolled after setup is unsupported. In
development the composable reports [GHOST001](../warnings.md#ghost001) and keeps
the last rendered value so the UI does not snap to `default*`.
