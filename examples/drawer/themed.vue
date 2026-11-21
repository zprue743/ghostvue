<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostDrawer,
  GhostDrawerClose,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerOverlay,
  GhostDrawerTitle,
  GhostDrawerTrigger,
} from '@ghostvue/themes'

const refunded = ref(false)
const statusText = ref('Order #4182 shipped to Lisbon · €148.00')

function issueRefund(): void {
  refunded.value = true
  statusText.value = 'Refund issued for Order #4182 (€148.00).'
}
</script>

<template>
  <GhostCard class="order-card">
    <template #header>
      <div class="order-card__header">
        <div class="order-card__heading">
          <span class="order-card__title">Order #4182</span>
          <GhostBadge :tone="refunded ? 'neutral' : 'accent'" variant="soft">
            {{ refunded ? 'Refunded' : 'Shipped' }}
          </GhostBadge>
        </div>
        <GhostDrawer>
          <GhostDrawerTrigger :as="GhostButton" variant="outline" size="sm">
            Inspect order
          </GhostDrawerTrigger>
          <GhostDrawerOverlay />
          <GhostDrawerContent>
            <GhostDrawerTitle>Order #4182</GhostDrawerTitle>
            <GhostDrawerDescription>
              Shipped to Lisbon on November 12. Two items, paid by card.
            </GhostDrawerDescription>

            <dl class="order-details">
              <div class="order-details__row">
                <dt>Destination</dt>
                <dd>Lisbon, PT</dd>
              </div>
              <div class="order-details__row">
                <dt>Carrier</dt>
                <dd>EuroParcel Express</dd>
              </div>
              <div class="order-details__row">
                <dt>Total</dt>
                <dd>€148.00</dd>
              </div>
              <div class="order-details__row">
                <dt>Status</dt>
                <dd>{{ refunded ? 'Refunded' : 'Shipped' }}</dd>
              </div>
            </dl>

            <div class="drawer-actions">
              <GhostDrawerClose
                :as="GhostButton"
                variant="soft"
                tone="neutral"
                size="sm"
              >
                Close
              </GhostDrawerClose>
              <GhostDrawerClose
                :as="GhostButton"
                size="sm"
                :disabled="refunded"
                @click="issueRefund"
              >
                {{ refunded ? 'Refunded' : 'Issue refund' }}
              </GhostDrawerClose>
            </div>
          </GhostDrawerContent>
        </GhostDrawer>
      </div>
    </template>

    <div class="order-card__status" role="status" aria-live="polite">
      {{ statusText }}
    </div>
  </GhostCard>
</template>

<style scoped>
.order-card {
  inline-size: 100%;
  max-inline-size: 32rem;
}

.order-card__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.order-card__heading {
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.order-card__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.order-card__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
}

.order-details {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  margin: var(--ghost-space-gap-md) 0;
}

.order-details__row {
  border-block-end: var(--ghost-border-hairline-width) solid
    var(--ghost-border-subtle);
  display: flex;
  gap: var(--ghost-space-gap-md);
  justify-content: space-between;
  padding-block: var(--ghost-space-inset-xs);
}

.order-details__row dt {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  margin: 0;
}

.order-details__row dd {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  margin: 0;
}

.drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
  margin-block-start: var(--ghost-space-gap-md);
}
</style>
