import type { GhostBadge, GhostBadgeProps } from '../src'

const nativeProps = {
  class: 'meta',
  id: 'row-status',
  lang: 'en',
  title: 'Open',
  'aria-label': '12 unread',
  onClick: (event: MouseEvent) => {
    event.preventDefault()
  },
} satisfies GhostBadgeProps

const componentProps: InstanceType<typeof GhostBadge>['$props'] = nativeProps

void componentProps
