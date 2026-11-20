<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostDatePickerContextKey,
  type GhostDatePickerInputExposed,
  type GhostDatePickerPart,
} from './ghost-date-picker'
import { invokeAttrHandler } from './invoke-attr-handler'
import { isImeComposing } from './is-ime-composing'
import { useGhostId } from './use-ghost-id'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Which value this input edits; range pickers need `start` and `end`. */
    part?: GhostDatePickerPart
    /** Combines with the root `disabled` (for example from `GhostFieldControl`). */
    disabled?: boolean
    /** Combines with root errors (for example from `GhostFieldControl`). */
    invalid?: boolean
    /** Combines with the root `required` (for example from `GhostFieldControl`). */
    required?: boolean
  }>(),
  { part: 'single', disabled: false, invalid: false, required: false },
)

const injected = inject(ghostDatePickerContextKey)
if (!injected) {
  throw new Error('GhostDatePickerInput must be used inside GhostDatePicker')
}
const context = injected

const attrs = useAttrs()
const element = useTemplateRef<HTMLInputElement>('element')
const generatedId = useGhostId('ghost-date-picker-input')

const inputId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : generatedId.value
})

const pairParts = computed<readonly GhostDatePickerPart[]>(() =>
  props.part === 'single' ? ['single'] : ['start', 'end'],
)

const partErrors = computed(() => context.errorsFor(props.part))
const isDisabled = computed(() => context.isDisabled.value || props.disabled)
const isInvalid = computed(() => props.invalid || partErrors.value.length > 0)

const describedBy = computed(() => {
  const ids: string[] = []
  const consumer = attrs['aria-describedby']
  if (typeof consumer === 'string' && consumer.trim().length > 0) {
    ids.push(consumer.trim())
  }
  ids.push(context.hintId.value)
  if (partErrors.value.length > 0) {
    ids.push(context.errorId(props.part))
  }
  return ids.join(' ')
})

const state = computed(() => {
  if (isDisabled.value) return 'disabled'
  if (isInvalid.value) return 'invalid'
  if (context.isReadonly.value) return 'readonly'
  return undefined
})

function onInput(event: Event): void {
  invokeAttrHandler(attrs['onInput'], event)
  const target = event.target
  if (target instanceof HTMLInputElement) {
    // Exact text is preserved: no model update and no caret-moving reformat.
    context.setDraft(props.part, target.value)
  }
}

function hasDirtyPair(): boolean {
  return pairParts.value.some((part) => context.isDirty(part))
}

function onKeydown(event: KeyboardEvent): void {
  invokeAttrHandler(attrs['onKeydown'], event)
  if (event.defaultPrevented || isImeComposing(event)) {
    // IME keystrokes (including the Enter that confirms a candidate) belong
    // to the input method and never commit.
    return
  }
  if (event.key === 'Enter' && hasDirtyPair()) {
    // Commit instead of letting this keystroke submit the form implicitly.
    event.preventDefault()
    context.commitText()
    return
  }
  if (event.key === 'Escape' && !context.isOpen.value && hasDirtyPair()) {
    // Consumed so an enclosing dialog does not also close on this Escape.
    event.preventDefault()
    context.revertText()
  }
}

function onBlur(event: FocusEvent): void {
  invokeAttrHandler(attrs['onBlur'], event)
  const next = event.relatedTarget
  // Moving between the two range inputs keeps both drafts; pair-level
  // validation waits until focus leaves the pair.
  if (
    props.part !== 'single' &&
    next instanceof HTMLInputElement &&
    (next === context.inputElement('start') ||
      next === context.inputElement('end'))
  ) {
    return
  }
  context.commitText()
}

function onInvalid(event: Event): void {
  invokeAttrHandler(attrs['onInvalid'], event)
  context.onInputInvalid(event)
}

const inputBindings = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    // `name` / `form` belong to the root's hidden inputs; listeners we wrap
    // are invoked explicitly so ordering stays deterministic.
    if (
      key === 'class' ||
      key === 'name' ||
      key === 'form' ||
      key === 'id' ||
      key === 'type' ||
      key === 'value' ||
      key === 'aria-describedby' ||
      key === 'onInput' ||
      key === 'onKeydown' ||
      key === 'onBlur' ||
      key === 'onInvalid'
    ) {
      continue
    }
    rest[key] = value
  }
  return {
    autocomplete: 'off',
    ...rest,
    id: inputId.value,
    type: 'text',
    value: context.displayText(props.part),
    form: context.form.value,
    disabled: isDisabled.value || undefined,
    readonly: context.isReadonly.value || undefined,
    required: context.isRequired.value || props.required || undefined,
    'aria-invalid': isInvalid.value || undefined,
    'aria-describedby': describedBy.value,
    'data-part': 'input',
    'data-input-part': props.part,
    'data-state': state.value,
    'data-ghost-date-picker': '',
  }
})

onMounted(() => {
  context.registerInput(props.part, element.value)
  // Native validity mirrors the picker so a dirty draft blocks submission
  // before any visual error is shown. Client-only: no DOM work during SSR.
  watch(
    [element, () => context.validityMessage(props.part)],
    ([input, message]) => {
      input?.setCustomValidity(message)
    },
    { immediate: true, flush: 'post' },
  )
})

onBeforeUnmount(() => {
  context.registerInput(props.part, null)
})

// A native reset rewrites `.value` to the empty default attribute; Vue only
// re-patches when the bound text changes, so resync after reconciliation.
watch(context.resetVersion, () => {
  void nextTick(() => {
    const input = element.value
    const text = context.displayText(props.part)
    if (input && input.value !== text) {
      input.value = text
    }
  })
})

defineExpose<GhostDatePickerInputExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <input
    ref="element"
    :class="['ghost-date-picker-input', attrs['class']]"
    v-bind="inputBindings"
    @input="onInput"
    @keydown="onKeydown"
    @blur="onBlur"
    @invalid="onInvalid"
  />
</template>
