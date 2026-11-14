import type { GhostInput, GhostInputProps } from '../src'

const nativeProps = {
  'aria-describedby': 'search-help',
  'aria-label': 'Search reports',
  autocomplete: 'off',
  autofocus: true,
  form: 'filters-form',
  inputmode: 'search',
  maxlength: 80,
  name: 'q',
  onInput: (event: Event) => {
    event.preventDefault()
  },
  pattern: '[a-z]+',
  placeholder: 'Search',
  spellcheck: false,
  type: 'search',
} satisfies GhostInputProps

const controlled = {
  modelValue: 'forecast',
} satisfies GhostInputProps

const uncontrolled = {
  defaultValue: 'archive',
} satisfies GhostInputProps

const componentProps: InstanceType<typeof GhostInput>['$props'] = nativeProps

void componentProps
void controlled
void uncontrolled

// @ts-expect-error modelValue must be string for text-like inputs
const rejectedModelType = { modelValue: false } satisfies GhostInputProps

void rejectedModelType
