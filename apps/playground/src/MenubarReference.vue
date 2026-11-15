<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostMenubar,
  GhostMenubarCheckboxItem,
  GhostMenubarContent,
  GhostMenubarItem,
  GhostMenubarLabel,
  GhostMenubarMenu,
  GhostMenubarRadioGroup,
  GhostMenubarRadioItem,
  GhostMenubarSeparator,
  GhostMenubarTrigger,
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('a')
</script>

<template>
  <section aria-labelledby="menubar-heading" class="menubar-section">
    <h2 id="menubar-heading">GhostMenubar</h2>

    <GhostMenubar>
      <GhostMenubarMenu>
        <GhostMenubarTrigger data-testid="menubar-file-trigger">
          File
        </GhostMenubarTrigger>
        <GhostMenubarContent
          data-testid="menubar-file-content"
          class="menubar-demo-surface"
          :offset="8"
        >
          <GhostMenubarLabel>File</GhostMenubarLabel>
          <GhostMenubarSeparator decorative />
          <GhostMenubarItem data-testid="menubar-file-item-new">
            New
          </GhostMenubarItem>
          <GhostMenubarItem data-testid="menubar-file-item-disabled" disabled>
            Disabled action
          </GhostMenubarItem>
        </GhostMenubarContent>
      </GhostMenubarMenu>
      <GhostMenubarMenu>
        <GhostMenubarTrigger data-testid="menubar-edit-trigger">
          Edit
        </GhostMenubarTrigger>
        <GhostMenubarContent
          data-testid="menubar-edit-content"
          class="menubar-demo-surface"
          :offset="8"
        >
          <GhostMenubarCheckboxItem
            v-model:checked="showHidden"
            data-testid="menubar-checkbox-item"
          >
            Show hidden files
          </GhostMenubarCheckboxItem>
          <GhostMenubarSeparator decorative />
          <GhostMenubarRadioGroup v-model="sort">
            <GhostMenubarRadioItem value="a" data-testid="menubar-radio-a">
              Option A
            </GhostMenubarRadioItem>
            <GhostMenubarRadioItem value="b" data-testid="menubar-radio-b">
              Option B
            </GhostMenubarRadioItem>
          </GhostMenubarRadioGroup>
        </GhostMenubarContent>
      </GhostMenubarMenu>
    </GhostMenubar>

    <button type="button" data-testid="menubar-outside-target">Outside</button>
  </section>
</template>

<style scoped>
.menubar-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.menubar-demo-surface {
  min-inline-size: 12rem;
}
</style>
