import type { GhostProgress, GhostProgressProps } from '../src'

const nativeProps = {
  'aria-describedby': 'upload-hint',
  'aria-labelledby': 'upload-heading',
  class: 'dense',
  id: 'invoice-upload',
  lang: 'en',
  onClick: (event: MouseEvent) => {
    event.preventDefault()
  },
  title: 'Upload progress',
  value: 40,
  max: 100,
  label: 'Uploading report',
  valueText: '40%',
} satisfies GhostProgressProps

const componentProps: InstanceType<typeof GhostProgress>['$props'] = nativeProps

void componentProps
