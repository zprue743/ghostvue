<script setup lang="ts">
import { ref } from 'vue'
import { generateInvoices } from '../data/invoices'
import InvoicePrime from './InvoicePrime.vue'

const count = Number(new URLSearchParams(location.search).get('rows') ?? '1000')
const data = ref(generateInvoices(count))
</script>

<template>
  <InvoicePrime :data="data" data-testid="perf-prime" />
</template>