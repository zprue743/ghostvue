import type { GhostKbd, GhostKbdProps } from '../src'

const nativeProps = {
  'aria-label': 'Save shortcut',
  class: 'docs-kbd',
  id: 'save-shortcut',
  keys: ['mod', 's'],
  lang: 'en',
  platform: 'pc',
  title: 'Save',
} satisfies GhostKbdProps

const componentProps: InstanceType<typeof GhostKbd>['$props'] = nativeProps

void componentProps
