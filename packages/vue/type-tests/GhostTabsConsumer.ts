import type { GhostTabs, GhostTabsProps } from '../src'

const controlled = {
  modelValue: 'reports',
} satisfies GhostTabsProps

const uncontrolled = {
  defaultValue: 'settings',
} satisfies GhostTabsProps

const componentProps: InstanceType<typeof GhostTabs>['$props'] = controlled

void componentProps
void uncontrolled

// @ts-expect-error modelValue must be a string tab id
const rejectedModelType = { modelValue: 1 } satisfies GhostTabsProps

// @ts-expect-error activationMode is a closed union
const rejectedActivation = { activationMode: 'hover' } satisfies GhostTabsProps

void rejectedModelType
void rejectedActivation
