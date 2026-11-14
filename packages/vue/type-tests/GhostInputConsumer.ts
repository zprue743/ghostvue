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

const componentProps: InstanceType<typeof GhostInput>['$props'] = nativeProps

void componentProps
