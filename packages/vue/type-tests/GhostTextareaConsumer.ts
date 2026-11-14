import type { GhostTextarea, GhostTextareaProps } from '../src'

const nativeProps = {
  autocomplete: 'off',
  autofocus: true,
  cols: 40,
  disabled: false,
  form: 'profile-form',
  maxlength: 400,
  name: 'bio',
  onInput: (event: Event) => {
    event.preventDefault()
  },
  placeholder: 'About you',
  readonly: false,
  required: true,
  rows: 4,
  wrap: 'soft',
} satisfies GhostTextareaProps

const controlled = {
  modelValue: 'Draft notes',
} satisfies GhostTextareaProps

const uncontrolled = {
  defaultValue: 'Seed copy',
} satisfies GhostTextareaProps

const componentProps: InstanceType<typeof GhostTextarea>['$props'] = nativeProps

void componentProps
void controlled
void uncontrolled

// @ts-expect-error modelValue must be string
const rejectedModelType = { modelValue: 12 } satisfies GhostTextareaProps

void rejectedModelType
