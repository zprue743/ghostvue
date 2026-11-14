import type { GhostSpinner, GhostSpinnerProps } from '../src'

const nativeProps = {
  'aria-hidden': true,
  'aria-label': 'Refreshing reports',
  class: 'dense',
  id: 'table-pending',
  lang: 'en',
  onClick: (event: MouseEvent) => {
    event.preventDefault()
  },
  title: 'Pending',
} satisfies GhostSpinnerProps

const componentProps: InstanceType<typeof GhostSpinner>['$props'] = nativeProps

void componentProps
