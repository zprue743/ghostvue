<script setup lang="ts">
import { ref } from 'vue'
import { generateInvoices } from '../data/invoices'
import InvoiceGhost from './InvoiceGhost.vue'

const count = Number(new URLSearchParams(location.search).get('rows') ?? '1000')
const data = ref(generateInvoices(count))
</script>

<template>
  <InvoiceGhost :data="data" data-testid="perf-ghost" />
</template>