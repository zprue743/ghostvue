import {
  computed,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from 'vue'

import { logGhostCode } from './dev-codes'

export interface UseControllableStateOptions<Value> {
  /** Controlled value. `undefined` is uncontrolled; `null` is a defined value. */
  prop: () => Value | undefined
  /** Initial uncontrolled value. Later changes are ignored. */
  defaultValue?: MaybeRefOrGetter<Value>
  /** Synchronous write. Emit `update:modelValue` / `update:open` here. */
  onChange?: (value: Value) => void
}

/**
 * Controlled/uncontrolled state as a writable computed, matching `defineModel`
 * assignment and timing. Controlled iff `prop()` is not `undefined`.
 */
export function useControllableState<Value>(
  options: UseControllableStateOptions<Value>,
): WritableComputedRef<Value> {
  const readProp = (): Value | undefined => options.prop()
  const isControlled = computed(() => readProp() !== undefined)

  // Seed from the current prop when controlled so a later switch does not snap to default.
  // Vue's shallowRef overload uses IfAny on unconstrained generics.
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

  // process.env.NODE_ENV stays replaceable in the library build; import.meta.env.DEV would be baked.
  if (process.env.NODE_ENV !== 'production') {
    watch(isControlled, (controlled, wasControlled) => {
      const from = wasControlled ? 'controlled' : 'uncontrolled'
      const to = controlled ? 'controlled' : 'uncontrolled'
      logGhostCode('GHOST001', { from, to })
    })
  }

  return computed({
    get: currentValue,
    set(next: Value) {
      if (Object.is(currentValue(), next)) {
        return
      }

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

  if (options.defaultValue === undefined) {
    return undefined as Value
  }

  return toValue(options.defaultValue)
}
