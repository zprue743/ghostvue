import {
  computed,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from 'vue'

export interface UseControllableStateOptions<Value> {
  /**
   * Getter for the controlled value. `undefined` means the component owns
   * state (uncontrolled). `null` is a defined controlled value. A getter
   * avoids MaybeRefOrGetter inferring a function value as `Value`.
   */
  prop: () => Value | undefined
  /**
   * Initial value used only while uncontrolled. Later changes are ignored,
   * matching `useState(defaultValue)` / a Vue prop `default`.
   */
  defaultValue?: MaybeRefOrGetter<Value>
  /**
   * Called synchronously from the setter with the requested next value. The
   * component should `emit('update:modelValue' | 'update:open', value)` here.
   * Not called when the assigned value is `Object.is` the current value.
   */
  onChange?: (value: Value) => void
}

/**
 * Vue-idiomatic controlled/uncontrolled state, returned as a writable computed
 * so assignment matches `defineModel`.
 *
 * `defineModel` / `useModel` bind one prop on the current component and treat
 * "parent passed v-model" as the control signal. Headless components need a
 * separately named `default*` prop, a primitive `useSlCollapsible` can call,
 * and a warning when control mode flips. This composable is that primitive:
 * the value is controlled iff `prop` is not `undefined`.
 *
 * Update timing matches `defineModel`: the setter writes uncontrolled local
 * state and calls `onChange` synchronously, before the triggering handler
 * returns. Watchers and DOM that depend on a parent prop update after flush.
 * Switching controlled ↔ uncontrolled logs a developer warning.
 */
export function useControllableState<Value>(
  options: UseControllableStateOptions<Value>,
): WritableComputedRef<Value> {
  const readProp = (): Value | undefined => options.prop()
  const isControlled = computed(() => readProp() !== undefined)

  // Seed from the current prop when already controlled so a later switch to
  // uncontrolled keeps the last rendered value instead of jumping to default.
  // Vue's shallowRef overload uses IfAny, which types an unconstrained
  // generic as any. The annotation keeps consumer Value identity.
  const internal: ShallowRef<Value> = shallowRef(readSeed(readProp(), options))

  const currentValue = (): Value => {
    const prop = readProp()
    if (prop !== undefined) {
      return prop
    }
    return internal.value
  }

  watch(
    () => readProp(),
    (value) => {
      if (value !== undefined) {
        internal.value = value
      }
    },
  )

  watch(isControlled, (controlled, wasControlled) => {
    const from = wasControlled ? 'controlled' : 'uncontrolled'
    const to = controlled ? 'controlled' : 'uncontrolled'
    console.warn(
      `[slop-ui] A component switched from ${from} to ${to}. ` +
        'Pass the value prop for the lifetime of the instance, or omit it and use default*.',
    )
  })

  return computed({
    get: currentValue,
    set(next: Value) {
      if (Object.is(currentValue(), next)) {
        return
      }

      // Uncontrolled writes land before onChange so the component is consistent
      // even when no parent listens. Controlled writes wait for the parent.
      if (!isControlled.value) {
        internal.value = next
      }
      options.onChange?.(next)
    },
  })
}

function readSeed<Value>(
  prop: Value | undefined,
  options: UseControllableStateOptions<Value>,
): Value {
  if (prop !== undefined) {
    return prop
  }

  // `??` would treat a controlled `null` as missing. `undefined` is the only
  // uncontrolled sentinel, so defaultValue is read only in that branch.
  if (options.defaultValue === undefined) {
    // Caller types Value as the resolved state. An omitted defaultValue is
    // undefined at runtime; that is only correct for `Value | undefined`.
    return undefined as Value
  }

  return toValue(options.defaultValue)
}
