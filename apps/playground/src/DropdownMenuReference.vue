<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('a')
</script>

<template>
  <section
    aria-labelledby="dropdown-menu-heading"
    class="dropdown-menu-section"
  >
    <h2 id="dropdown-menu-heading">GhostDropdownMenu</h2>

    <div class="dropdown-menu-row">
      <GhostDropdownMenu>
        <GhostDropdownMenuTrigger data-testid="dropdown-basic-trigger">
          Open menu
        </GhostDropdownMenuTrigger>
        <GhostDropdownMenuContent
          data-testid="dropdown-basic-content"
          class="dropdown-demo-surface"
          :offset="8"
          placement="bottom-start"
        >
          <GhostDropdownMenuLabel>Workspace</GhostDropdownMenuLabel>
          <GhostDropdownMenuSeparator decorative />
          <GhostDropdownMenuItem data-testid="dropdown-basic-item-edit">
            Edit file
          </GhostDropdownMenuItem>
          <GhostDropdownMenuItem
            data-testid="dropdown-basic-item-disabled"
            disabled
          >
            Disabled action
          </GhostDropdownMenuItem>
          <GhostDropdownMenuSeparator decorative />
          <GhostDropdownMenuCheckboxItem
            v-model:checked="showHidden"
            data-testid="dropdown-checkbox-item"
          >
            Show hidden files
          </GhostDropdownMenuCheckboxItem>
          <GhostDropdownMenuSeparator decorative />
          <GhostDropdownMenuRadioGroup v-model="sort">
            <GhostDropdownMenuRadioItem
              value="a"
              data-testid="dropdown-radio-a"
            >
              Option A
            </GhostDropdownMenuRadioItem>
            <GhostDropdownMenuRadioItem
              value="b"
              data-testid="dropdown-radio-b"
            >
              Option B
            </GhostDropdownMenuRadioItem>
          </GhostDropdownMenuRadioGroup>
        </GhostDropdownMenuContent>
      </GhostDropdownMenu>

      <button type="button" data-testid="dropdown-outside-target">
        Outside control
      </button>
    </div>
  </section>
</template>

<style scoped>
.dropdown-menu-section {
  display: grid;
  gap: 1rem;
  margin-block: 1.5rem;
}

.dropdown-menu-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

:global(.dropdown-demo-surface) {
  background: #ffffff;
  border: 1px solid #111827;
  color: #111827;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-inline-size: 12rem;
  padding: 0.5rem;
  z-index: 1000;
}
</style>
