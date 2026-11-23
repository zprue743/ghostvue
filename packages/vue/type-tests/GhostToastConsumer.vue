<script setup lang="ts">
import { expectTypeOf } from 'vitest'

import {
  GhostToast,
  GhostToastAction,
  GhostToastClose,
  GhostToastDescription,
  GhostToastTitle,
  GhostToastViewport,
  useGhostToast,
  type GhostToastId,
  type GhostToastOptions,
  type GhostToastRecord,
  type GhostToastUpdateOptions,
  type UseGhostToastReturn,
} from '../src'

// Rendered under a GhostToastProvider by the consumer app.
const api = useGhostToast({ urgency: 'urgent' })
expectTypeOf(api).toEqualTypeOf<UseGhostToastReturn>()
expectTypeOf(api.toasts.value).toEqualTypeOf<readonly GhostToastRecord[]>()

const id = api.toast({
  title: 'Saved',
  description: 'Draft stored.',
  type: 'error',
  duration: null,
  action: { label: 'Undo', onClick: () => undefined },
  onDismiss: () => undefined,
})
expectTypeOf(id).toEqualTypeOf<GhostToastId>()
expectTypeOf(api.toast).parameter(0).toEqualTypeOf<GhostToastOptions>()
expectTypeOf(api.update).parameter(1).toEqualTypeOf<GhostToastUpdateOptions>()

api.update(id, { title: 'Saved again', announceUpdate: true })
api.dismiss(id)
api.dismissAll()

// @ts-expect-error title is required
api.toast({ description: 'No title' })
// @ts-expect-error only 'default' and 'error'
api.toast({ title: 'x', type: 'warning' })
// @ts-expect-error only 'default' and 'urgent'
api.toast({ title: 'x', urgency: 'assertive' })
// @ts-expect-error id cannot be changed by update
api.update(id, { id: 'other' })
// @ts-expect-error an action needs onClick
api.toast({ title: 'x', action: { label: 'Undo' } })
</script>

<template>
  <GhostToastViewport as="section" :portal="false" aria-labelledby="heading">
    <template #toast="{ toast, dismiss }">
      <GhostToast :toast="toast">
        <template #default="{ toast: record, dismiss: dismissSelf }">
          <GhostToastTitle>{{ record.title }}</GhostToastTitle>
          <GhostToastDescription v-if="record.description">
            {{ record.description }}
          </GhostToastDescription>
          <GhostToastAction v-if="record.action" @click="dismissSelf()">
            {{ record.action.label }}
          </GhostToastAction>
          <GhostToastClose @click="dismiss(toast.id)">Close</GhostToastClose>
        </template>
      </GhostToast>
    </template>
  </GhostToastViewport>
</template>
