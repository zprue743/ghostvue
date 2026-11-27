import { defineComponent, h, type SetupContext } from 'vue'

import {
  GhostDataTablePreset as UnstyledDataTablePreset,
  type DataTableColumnDef,
  type DataTableTableColumnRef,
  type GhostDataTablePresetLayoutSlotName,
  type GhostDataTablePresetProps,
  type GhostDataTablePresetSlots,
} from '@ghostvue/vue'

const DataTablePreset = Object.assign(
  defineComponent(
    <
      TColumns extends readonly DataTableTableColumnRef[] =
        readonly DataTableColumnDef<unknown>[],
      TLayout extends GhostDataTablePresetLayoutSlotName = never,
    >(
      props: GhostDataTablePresetProps<TColumns, TLayout>,
      { attrs, slots }: SetupContext,
    ) =>
      () =>
        h(
          'div',
          {
            class: 'ghost-data-table-preset ghost-themed-scope',
            'data-themed': '',
          },
          [h(UnstyledDataTablePreset, { ...attrs, ...props }, slots)],
        ),
    {
      name: 'GhostDataTablePreset',
      inheritAttrs: false,
    },
  ),
  { props: { columns: Array, layoutSlots: Array } },
)

/** Themed preset that retains the headless preset's typed cell and layout slots. */
// Layout ownership and all slot invocation stay in the headless preset.
export const GhostDataTablePreset = DataTablePreset as (new <
  TColumns extends readonly DataTableTableColumnRef[] =
    readonly DataTableColumnDef<unknown>[],
  TLayout extends GhostDataTablePresetLayoutSlotName = never,
>(
  ...args: ConstructorParameters<typeof DataTablePreset<TColumns, TLayout>>
) => InstanceType<typeof DataTablePreset<TColumns, TLayout>> & {
  $slots: GhostDataTablePresetSlots<TColumns, NoInfer<TLayout>>
}) &
  Pick<typeof DataTablePreset, 'props'>
