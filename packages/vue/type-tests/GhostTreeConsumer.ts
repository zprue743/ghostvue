import {
  useGhostTree,
  type GhostTree,
  type GhostTreeGroupProps,
  type GhostTreeItemProps,
  type GhostTreeProps,
  type GhostTreeTriggerProps,
  type UseGhostTreeReturn,
} from '../src'

const single = {
  modelValue: 'docs',
  defaultExpanded: ['docs'],
  allowDeselect: true,
} satisfies GhostTreeProps

const multiple = {
  selectionMode: 'multiple',
  modelValue: ['docs', 'src'],
  expanded: [],
  dir: 'rtl',
} satisfies GhostTreeProps

const componentProps: InstanceType<typeof GhostTree>['$props'] = multiple

const item = { value: 'docs', textValue: 'Docs' } satisfies GhostTreeItemProps
const trigger = { action: 'toggle' } satisfies GhostTreeTriggerProps
const group = { disableAnimation: true } satisfies GhostTreeGroupProps

const engine: UseGhostTreeReturn = useGhostTree({
  selectionMode: 'multiple',
  onSelect: ({ value, selected }) => {
    const key: string = value
    const next: boolean = selected
    void key
    void next
  },
})

void single
void componentProps
void item
void trigger
void group
void engine

// @ts-expect-error GhostTreeItem requires a string value
const missingValue = { disabled: true } satisfies GhostTreeItemProps

// @ts-expect-error value is a string key, not a number
const numericValue = { value: 1 } satisfies GhostTreeItemProps

// @ts-expect-error selectionMode is a closed union
const rejectedMode = { selectionMode: 'range' } satisfies GhostTreeProps

// @ts-expect-error trigger action is a closed union
const rejectedAction = { action: 'open' } satisfies GhostTreeTriggerProps

// @ts-expect-error expanded holds string keys
const rejectedExpanded = { expanded: [1] } satisfies GhostTreeProps

void missingValue
void numericValue
void rejectedMode
void rejectedAction
void rejectedExpanded
