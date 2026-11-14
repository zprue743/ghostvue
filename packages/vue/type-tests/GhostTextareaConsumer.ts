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

const componentProps: InstanceType<typeof GhostTextarea>['$props'] = nativeProps

void componentProps
