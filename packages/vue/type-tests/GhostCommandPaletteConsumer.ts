import { shallowRef } from 'vue'

import {
  useGhostCommandPalette,
  useGhostCommandPaletteAsyncSearch,
  type GhostCommandPalette,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteContentElement,
  type GhostCommandPaletteContentExposed,
  type GhostCommandPaletteContentProps,
  type GhostCommandPaletteContext,
  type GhostCommandPaletteDialogContext,
  type GhostCommandPaletteEmptyElement,
  type GhostCommandPaletteEmptyExposed,
  type GhostCommandPaletteEmptyProps,
  type GhostCommandPaletteExposed,
  type GhostCommandPaletteGroupElement,
  type GhostCommandPaletteGroupExposed,
  type GhostCommandPaletteGroupProps,
  type GhostCommandPaletteInputElement,
  type GhostCommandPaletteInputExposed,
  type GhostCommandPaletteInputProps,
  type GhostCommandPaletteItem,
  type GhostCommandPaletteItemElement,
  type GhostCommandPaletteItemExposed,
  type GhostCommandPaletteItemProps,
  type GhostCommandPaletteLabelElement,
  type GhostCommandPaletteLabelExposed,
  type GhostCommandPaletteLabelProps,
  type GhostCommandPaletteListElement,
  type GhostCommandPaletteListExposed,
  type GhostCommandPaletteListProps,
  type GhostCommandPaletteOverlayElement,
  type GhostCommandPaletteOverlayExposed,
  type GhostCommandPaletteOverlayProps,
  type GhostCommandPalettePartExposed,
  type GhostCommandPaletteProps,
  type GhostCommandPaletteSearchPayload,
  type GhostCommandPaletteSeparatorElement,
  type GhostCommandPaletteSeparatorExposed,
  type GhostCommandPaletteSeparatorProps,
  type GhostCommandPaletteSlotProps,
  type GhostCommandPaletteTitleElement,
  type GhostCommandPaletteTitleExposed,
  type GhostCommandPaletteTitleProps,
  type GhostCommandPaletteTriggerElement,
  type GhostCommandPaletteTriggerExposed,
  type GhostCommandPaletteTriggerProps,
  type UseGhostCommandPaletteAsyncSearchReturn,
  type UseGhostCommandPaletteOptions,
  type UseGhostCommandPaletteReturn,
} from '../src'

const rootProps = {
  open: undefined,
  defaultSearch: '',
  closeOnSelect: false,
  messages: { results: (count: number) => `${String(count)} commands` },
} satisfies GhostCommandPaletteProps

// @ts-expect-error there is no selection model; commands are events
const withModel = { modelValue: 'open-file' } satisfies GhostCommandPaletteProps

// @ts-expect-error virtualization is consumer-owned (C9)
const withVirtualized = { virtualized: true } satisfies GhostCommandPaletteProps

const componentProps: InstanceType<typeof GhostCommandPalette>['$props'] = {
  onCommand: (payload: GhostCommandPaletteCommandPayload) => {
    const id: string = payload.id
    void id
  },
  onSearch: (payload: GhostCommandPaletteSearchPayload) => {
    const requestId: number = payload.requestId
    void requestId
  },
  'onUpdate:open': (open: boolean) => {
    void open
  },
  'onUpdate:search': (search: string) => {
    void search
  },
}

// C10: the payload carries the id only.
const payload: GhostCommandPaletteCommandPayload = { id: 'open-file' }
const payloadWithText: GhostCommandPaletteCommandPayload = {
  id: 'a',
  // @ts-expect-error textValue is not part of the command payload
  textValue: 'A',
}

const itemProps: InstanceType<typeof GhostCommandPaletteItem>['$props'] = {
  id: 'open-file',
  textValue: 'Open file',
}
const itemPropsShape = {
  id: 'x',
  disabled: true,
} satisfies GhostCommandPaletteItemProps
// @ts-expect-error every item needs a stable id
const itemWithoutId = {} satisfies GhostCommandPaletteItemProps

const slotProps: GhostCommandPaletteSlotProps = {
  open: true,
  search: '',
  loading: false,
  close: () => undefined,
  focusInput: () => undefined,
}

const exposed = shallowRef<GhostCommandPaletteExposed | null>(null)
exposed.value?.open()
exposed.value?.focusInput()
const partExposed: GhostCommandPalettePartExposed | null =
  exposed.value satisfies GhostCommandPalettePartExposed | null

const options: UseGhostCommandPaletteOptions = {
  open: shallowRef(false),
  loading: () => true,
  onCommand: ({ id }) => {
    void id
  },
}
const api: UseGhostCommandPaletteReturn = useGhostCommandPalette(options)
const context: GhostCommandPaletteContext = api
const dialog: GhostCommandPaletteDialogContext = api.dialog
const asyncSearch: UseGhostCommandPaletteAsyncSearchReturn =
  useGhostCommandPaletteAsyncSearch()
asyncSearch.begin(1)
const latest: boolean = asyncSearch.isLatest(1)

type PartTypes = [
  GhostCommandPaletteContentElement,
  GhostCommandPaletteContentExposed,
  GhostCommandPaletteContentProps,
  GhostCommandPaletteEmptyElement,
  GhostCommandPaletteEmptyExposed,
  GhostCommandPaletteEmptyProps,
  GhostCommandPaletteGroupElement,
  GhostCommandPaletteGroupExposed,
  GhostCommandPaletteGroupProps,
  GhostCommandPaletteInputElement,
  GhostCommandPaletteInputExposed,
  GhostCommandPaletteInputProps,
  GhostCommandPaletteItemElement,
  GhostCommandPaletteItemExposed,
  GhostCommandPaletteLabelElement,
  GhostCommandPaletteLabelExposed,
  GhostCommandPaletteLabelProps,
  GhostCommandPaletteListElement,
  GhostCommandPaletteListExposed,
  GhostCommandPaletteListProps,
  GhostCommandPaletteOverlayElement,
  GhostCommandPaletteOverlayExposed,
  GhostCommandPaletteOverlayProps,
  GhostCommandPaletteSeparatorElement,
  GhostCommandPaletteSeparatorExposed,
  GhostCommandPaletteSeparatorProps,
  GhostCommandPaletteTitleElement,
  GhostCommandPaletteTitleExposed,
  GhostCommandPaletteTitleProps,
  GhostCommandPaletteTriggerElement,
  GhostCommandPaletteTriggerExposed,
  GhostCommandPaletteTriggerProps,
]
const contentProps = {
  closeOnEscape: false,
  initialFocus: () => null,
} satisfies GhostCommandPaletteContentProps
function acceptPartTypes(parts: PartTypes): PartTypes {
  return parts
}

void rootProps
void withModel
void withVirtualized
void componentProps
void payload
void payloadWithText
void itemProps
void itemPropsShape
void itemWithoutId
void slotProps
void partExposed
void context
void dialog
void latest
void contentProps
void acceptPartTypes
