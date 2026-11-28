---
layout: page
title: Examples
description: Browse a live Billing & Invoices application built with GhostVue.
---

<script setup>
import { GhostToastProvider, GhostToastViewport } from '@ghostvue/themes'
import BillingWorkspace from '../../apps/docs/showcases/billing-ops/BillingWorkspace.vue'
</script>

<main class="billing-gallery">
  <header class="billing-gallery__header">
    <h1>Billing &amp; Invoices</h1>
    <p>Explore how GhostVue’s tables, filters, and overlays work together in a billing workspace. Actions use sample data.</p>
  </header>
  <GhostToastProvider>
    <BillingWorkspace />
    <GhostToastViewport />
  </GhostToastProvider>

  <details class="billing-gallery__source vp-doc">
    <summary>View source</summary>

::: code-group

<<< @/../apps/docs/showcases/billing-ops/BillingWorkspace.vue [BillingWorkspace.vue]

<<< @/../apps/docs/showcases/billing-ops/InvoiceInspector.vue [InvoiceInspector.vue]

<<< @/../apps/docs/showcases/billing-ops/invoices.ts [invoices.ts]

<<< @/../apps/docs/showcases/billing-ops/billing-ops.css [billing-ops.css]

:::

  </details>
</main>
