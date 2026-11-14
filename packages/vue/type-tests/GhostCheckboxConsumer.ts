import type { GhostCheckbox, GhostCheckboxProps } from '../src'

const nativeProps = {
  'aria-describedby': 'tos-help',
  'aria-label': 'Accept terms',
  autofocus: true,
  defaultValue: true,
  disabled: false,
  form: 'signup-form',
  id: 'tos',
  name: 'tos',
  onChange: (event: Event) => {
    event.preventDefault()
  },
  required: true,
  value: 'accepted',
} satisfies GhostCheckboxProps

const controlled = {
  modelValue: true,
} satisfies GhostCheckboxProps

const uncontrolled = {
  defaultValue: false,
} satisfies GhostCheckboxProps

const componentProps: InstanceType<typeof GhostCheckbox>['$props'] = nativeProps

void componentProps
void controlled
void uncontrolled

// @ts-expect-error modelValue must be boolean
const rejectedModelType = { modelValue: 'yes' } satisfies GhostCheckboxProps

void rejectedModelType

// @ts-expect-error checked is owned by the model, not a fallthrough attribute
const rejectedChecked = { checked: true } satisfies GhostCheckboxProps

// @ts-expect-error type is always checkbox and is not a public prop
const rejectedType = { type: 'text' } satisfies GhostCheckboxProps

void rejectedChecked
void rejectedType
