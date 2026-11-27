import { defineComponent, h, type SetupContext } from 'vue'

import {
  GhostDataTableTable as UnstyledDataTableTable,
  type DataTableColumnDef,
  type DataTableTableColumnRef,
  type GhostDataTableTableProps,
  type GhostDataTableTableSlots,
} from '@ghostvue/vue'

const DataTableTable = Object.assign(
  defineComponent(
    <
      TColumns extends readonly DataTableTableColumnRef[] =
        readonly DataTableColumnDef<unknown>[],
    >(
      props: GhostDataTableTableProps<TColumns>,
      { attrs, slots }: SetupContext,
    ) =>
      () =>
        h(
          'div',
          {
            class: 'ghost-data-table-table ghost-themed-scope',
            'data-themed': '',
          },
          [h(UnstyledDataTableTable, { ...attrs, ...props }, slots)],
        ),
    { name: 'GhostDataTableTable', inheritAttrs: false },
  ),
  { props: { columns: Array } },
)

/** Themed native table mapper with the same typed column slots as the headless mapper. */
// The generic setup overload omits slot inference. Every slot is passed unchanged.
export const GhostDataTableTable = DataTableTable as (new <
  TColumns extends readonly DataTableTableColumnRef[] =
    readonly DataTableColumnDef<unknown>[],
>(
  ...args: ConstructorParameters<typeof DataTableTable<TColumns>>
) => InstanceType<typeof DataTableTable<TColumns>> & {
  $slots: GhostDataTableTableSlots<TColumns>
}) &
  Pick<typeof DataTableTable, 'props'>
