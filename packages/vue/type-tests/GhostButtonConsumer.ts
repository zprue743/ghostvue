import type { GhostButton, GhostButtonProps } from '../src'

const nativeProps = {
  autofocus: true,
  form: 'settings-form',
  formaction: '/settings',
  formenctype: 'application/x-www-form-urlencoded',
  formmethod: 'post',
  formnovalidate: true,
  formtarget: '_self',
  name: 'intent',
  onClick: (event: MouseEvent) => {
    event.preventDefault()
  },
  type: 'submit',
  value: 'save',
} satisfies GhostButtonProps

const componentProps: InstanceType<typeof GhostButton>['$props'] = nativeProps

void componentProps
