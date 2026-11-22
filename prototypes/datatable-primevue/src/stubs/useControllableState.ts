import { computed, shallowRef, watch, type WritableComputedRef } from 'vue'

export function useControllableState<Value>(options: {
  prop: () => Value | undefined
  defaultValue?: Value
  onChange?: (value: Value) => void
}): WritableComputedRef<Value> {
  const internal = shallowRef(options.defaultValue as Value)
  watch(
    () => options.prop(),
    (value) => {
      if (value !== undefined) internal.value = value
    },
  )
  return computed({
    get() {
      const prop = options.prop()
      return prop !== undefined ? prop : internal.value
    },
    set(value: Value) {
      internal.value = value
      options.onChange?.(value)
    },
  })
}