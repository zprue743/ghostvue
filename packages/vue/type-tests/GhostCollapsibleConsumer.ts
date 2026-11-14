import type { GhostCollapsible, GhostCollapsibleProps } from '../src'

const controlled = {
  open: true,
} satisfies GhostCollapsibleProps

const uncontrolled = {
  defaultOpen: false,
} satisfies GhostCollapsibleProps

const componentProps: InstanceType<typeof GhostCollapsible>['$props'] =
  controlled

void componentProps
void uncontrolled

// @ts-expect-error open must be boolean when controlled
const rejectedOpenType = { open: 'yes' } satisfies GhostCollapsibleProps

void rejectedOpenType
