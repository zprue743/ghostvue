import type { GhostEmptyState, GhostEmptyStateProps } from '../src'

const props = {
  as: 'section',
  headingLevel: 2,
} satisfies GhostEmptyStateProps

const componentProps: InstanceType<typeof GhostEmptyState>['$props'] = props

void componentProps
