import type { GhostSwitch, GhostSwitchProps } from '../src'

const nativeProps = {
  'aria-label': 'Airplane mode',
  autofocus: true,
  class: 'setting',
  form: 'settings-form',
  id: 'airplane',
  name: 'air',
  onClick: (event: MouseEvent) => {
    event.preventDefault()
  },
  value: 'on',
} satisfies GhostSwitchProps

const controlled = {
  modelValue: true,
} satisfies GhostSwitchProps

const uncontrolled = {
  defaultValue: false,
} satisfies GhostSwitchProps

const componentProps: InstanceType<typeof GhostSwitch>['$props'] = nativeProps

void componentProps
void controlled
void uncontrolled

// @ts-expect-error modelValue must be boolean
const rejectedModelType = { modelValue: 'on' } satisfies GhostSwitchProps

void rejectedModelType
