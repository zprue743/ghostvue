<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/themes'

const pageSize = ref('25')
</script>

<template>
  <div class="ghost-themed-scope">
    <GhostCombobox v-model="pageSize">
      <GhostComboboxInput
        aria-label="Rows per page"
        placeholder="Rows per page"
      />
      <GhostComboboxContent :offset="6">
        <GhostComboboxOption value="10" text-value="10 rows">
          10 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="25" text-value="25 rows">
          25 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="50" text-value="50 rows">
          50 rows
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>
  </div>
</template>