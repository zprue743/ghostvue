<script setup lang="ts">
import { ref, useId } from 'vue'
import {
  GhostAvatar,
  GhostBadge,
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostDrawerClose,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerOverlay,
  GhostDrawerTitle,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
  GhostSeparator,
  GhostTable,
  GhostTextarea,
} from '@ghostvue/themes'
import {
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
} from '@ghostvue/vue'

import { formatAmount, formatIssued, type Invoice } from './invoices'

const props = defineProps<{ invoice: Invoice }>()
const emit = defineEmits<{ refund: [invoiceId: string] }>()
const refundOpen = ref(false)
const reason = ref('')
const titleId = useId()

function setRefundOpen(open: boolean): void {
  if (open && props.invoice.status !== 'Paid') return
  if (open) reason.value = ''
  refundOpen.value = open
}

function refund(): void {
  if (props.invoice.status !== 'Paid' || !reason.value.trim()) return
  emit('refund', props.invoice.id)
  refundOpen.value = false
}
</script>

<template>
  <GhostDrawerOverlay />
  <GhostDrawerContent class="billing-inspector">
    <div class="billing-inspector__header">
      <div>
        <GhostDrawerTitle>Invoice {{ invoice.id }}</GhostDrawerTitle>
        <GhostDrawerDescription
          >Issued {{ formatIssued(invoice.issued) }}</GhostDrawerDescription
        >
      </div>
      <GhostDrawerClose :as="GhostButton" variant="ghost" size="sm"
        >Close</GhostDrawerClose
      >
    </div>

    <div class="billing-inspector__customer">
      <GhostAvatar :name="invoice.customer" aria-hidden="true" />
      <GhostHoverCard>
        <GhostHoverCardTrigger :as="GhostButton" variant="ghost" size="sm">
          {{ invoice.customer }}
        </GhostHoverCardTrigger>
        <GhostHoverCardContent :offset="6">
          {{ invoice.email }}
        </GhostHoverCardContent>
      </GhostHoverCard>
      <GhostBadge
        :tone="
          invoice.status === 'Past due'
            ? 'danger'
            : invoice.status === 'Paid'
              ? 'accent'
              : 'neutral'
        "
        variant="soft"
      >
        {{ invoice.status }}
      </GhostBadge>
    </div>

    <GhostSeparator />
    <section class="billing-inspector__lines" :aria-labelledby="titleId">
      <h3 :id="titleId">Line items</h3>
      <GhostTable aria-label="Invoice line items">
        <GhostTableHead>
          <GhostTableRow>
            <GhostTableHeaderCell scope="col">Description</GhostTableHeaderCell>
            <GhostTableHeaderCell scope="col" class="billing-amount"
              >Amount</GhostTableHeaderCell
            >
          </GhostTableRow>
        </GhostTableHead>
        <GhostTableBody>
          <GhostTableRow>
            <GhostTableCell>Monthly workspace plan</GhostTableCell>
            <GhostTableCell class="billing-amount">{{
              formatAmount(invoice.amountCents)
            }}</GhostTableCell>
          </GhostTableRow>
        </GhostTableBody>
      </GhostTable>
    </section>

    <GhostDialog :open="refundOpen" @update:open="setRefundOpen">
      <GhostDialogTrigger
        :as="GhostButton"
        tone="danger"
        variant="outline"
        :aria-disabled="invoice.status !== 'Paid'"
      >
        Issue refund
      </GhostDialogTrigger>
      <GhostDialogOverlay />
      <GhostDialogContent class="billing-refund">
        <GhostDialogTitle>Refund {{ invoice.id }}?</GhostDialogTitle>
        <GhostDialogDescription>
          Refund {{ formatAmount(invoice.amountCents) }} to
          {{ invoice.customer }} in this demo.
        </GhostDialogDescription>
        <form @submit.prevent="refund">
          <GhostField>
            <GhostFieldLabel>Refund reason</GhostFieldLabel>
            <GhostFieldControl v-slot="field">
              <GhostTextarea
                v-bind="field"
                v-model="reason"
                :rows="3"
                required
              />
            </GhostFieldControl>
          </GhostField>
          <div class="billing-refund__actions">
            <GhostDialogClose :as="GhostButton" variant="ghost"
              >Cancel</GhostDialogClose
            >
            <GhostButton type="submit" tone="danger" :disabled="!reason.trim()"
              >Confirm refund</GhostButton
            >
          </div>
        </form>
      </GhostDialogContent>
    </GhostDialog>
  </GhostDrawerContent>
</template>
