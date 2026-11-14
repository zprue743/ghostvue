import type { GhostNumberInput, GhostNumberInputProps } from '../src'

const nativeProps = {
  'aria-describedby': 'amount-help',
  'aria-label': 'Line items',
  autocomplete: 'off',
  name: 'amount',
  onBlur: (event: FocusEvent) => {
    event.preventDefault()
  },
  placeholder: '0',
  inputmode: 'decimal',
} satisfies GhostNumberInputProps

const componentProps: InstanceType<typeof GhostNumberInput>['$props'] =
  nativeProps

void componentProps
