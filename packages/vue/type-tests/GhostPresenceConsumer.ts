import { ref, type ComputedRef } from 'vue'

import {
  useGhostPresence,
  type GhostPresence,
  type GhostPresenceDataState,
  type GhostPresencePhase,
  type GhostPresenceProps,
  type GhostPresenceSlotProps,
  type UseGhostPresenceOptions,
  type UseGhostPresenceReturn,
} from '../src'

const required = { present: true } satisfies GhostPresenceProps
const withDisabled = {
  present: false,
  disabled: true,
} satisfies GhostPresenceProps

const componentProps: InstanceType<typeof GhostPresence>['$props'] =
  withDisabled

void required
void componentProps

// @ts-expect-error present is required
const missingPresent = { disabled: true } satisfies GhostPresenceProps

// @ts-expect-error present is a boolean, not a phase string
const wrongPresent = { present: 'open' } satisfies GhostPresenceProps

void missingPresent
void wrongPresent

const open = ref(false)
const element = ref<HTMLElement | null>(null)
const options = {
  present: open,
  element,
  disabled: () => false,
  onExitComplete: () => undefined,
} satisfies UseGhostPresenceOptions

const presence: UseGhostPresenceReturn = useGhostPresence(options)
const isPresent: ComputedRef<boolean> = presence.isPresent
const phase: GhostPresencePhase = presence.phase.value
const state: GhostPresenceDataState = presence.dataState.value

// @ts-expect-error phase is read-only
presence.phase.value = 'closed'

// @ts-expect-error data-state never reports the exiting phase
const exitingState: GhostPresenceDataState = 'exiting'

// @ts-expect-error present accepts a boolean source only
useGhostPresence({ present: ref('open') })

const slotProps: GhostPresenceSlotProps = {
  present: true,
  phase: 'exiting',
  state: 'closed',
  exiting: true,
  setElement: presence.setElement,
}

void isPresent
void phase
void state
void exitingState
void slotProps
