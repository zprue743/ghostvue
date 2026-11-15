<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/themes'

const pageSize = ref('25')
const multiTags = ref<string[]>(['10'])
</script>

<template>
  <section
    aria-labelledby="combobox-heading"
    data-testid="combobox-demo-section"
    class="combobox-section"
  >
    <h2 id="combobox-heading">GhostCombobox</h2>
    <GhostCombobox v-model="pageSize">
      <GhostComboboxInput
        data-testid="combobox-demo-input"
        aria-label="Rows per page"
        placeholder="Rows per page"
      />
      <GhostComboboxContent data-testid="combobox-demo-content" :offset="6">
        <GhostComboboxOption value="10" text-value="10 rows">
          10 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="25" text-value="25 rows">
          25 rows
        </GhostComboboxOption>
        <GhostComboboxOption value="50" text-value="50 rows">
          50 rows
        </GhostComboboxOption>
        <GhostComboboxOption
          value="100"
          text-value="100 rows"
          disabled
          data-testid="combobox-demo-disabled-option"
        >
          100 rows (disabled)
        </GhostComboboxOption>
      </GhostComboboxContent>
    </GhostCombobox>

    <h3 id="combobox-multi-heading">Multi-select</h3>
    <GhostCombobox
      v-model="multiTags"
      multiple
      data-testid="combobox-multi-root"
    >
      <GhostComboboxInput
        data-testid="combobox-multi-input"
        aria-labelledby="combobox-multi-heading"
        placeholder="Pick page sizes"
      />
      <GhostComboboxContent data-testid="combobox-multi-content" :offset="6">
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
  </section>
</template>