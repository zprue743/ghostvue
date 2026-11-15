import type { GhostCard, GhostCardProps } from '../src'

const props = {
  as: 'article',
  effects: ['spotlight'],
} satisfies GhostCardProps

const componentProps: InstanceType<typeof GhostCard>['$props'] = props

void componentProps
