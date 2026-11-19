<script setup lang="ts">
import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'
</script>

<template>
  <div class="states">
    <!-- GhostField forwards disabled, invalid, and required to the input. -->
    <GhostField disabled>
      <GhostFieldLabel>Billing contact</GhostFieldLabel>
      <GhostFieldDescription>
        Disabled: not focusable and not submitted.
      </GhostFieldDescription>
      <GhostFieldControl v-slot="field">
        <GhostInput
          v-bind="field"
          name="billing"
          default-value="finance@analytical-engines.example"
          block
        />
      </GhostFieldControl>
    </GhostField>

    <GhostField>
      <GhostFieldLabel>Account ID</GhostFieldLabel>
      <GhostFieldDescription>
        Readonly: focusable and submitted, not editable.
      </GhostFieldDescription>
      <GhostFieldControl v-slot="field">
        <GhostInput
          v-bind="field"
          name="account-id"
          default-value="acct_8F2K19QZ"
          readonly
          block
        />
      </GhostFieldControl>
    </GhostField>

    <GhostField invalid>
      <GhostFieldLabel>Username</GhostFieldLabel>
      <GhostFieldControl v-slot="field">
        <GhostInput
          v-bind="field"
          name="username"
          default-value="ada lovelace"
          block
        />
      </GhostFieldControl>
      <GhostFieldError>Use letters, numbers, and hyphens only.</GhostFieldError>
    </GhostField>

    <GhostField required>
      <GhostFieldLabel required>Company</GhostFieldLabel>
      <GhostFieldDescription
        >Required before you can invite people.</GhostFieldDescription
      >
      <GhostFieldControl v-slot="field">
        <GhostInput
          v-bind="field"
          name="company"
          placeholder="Analytical Engines Ltd"
          block
        />
      </GhostFieldControl>
    </GhostField>
  </div>
</template>

<style scoped>
/*
 * One column at a readable measure. Hints and errors differ in length, so a
 * multi-column grid would misalign the fields.
 */
.states {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  max-inline-size: 28rem;
}

/* Long values end with an ellipsis at rest instead of a clipped glyph. */
.states :deep(.ghost-input) {
  text-overflow: ellipsis;
}

.states :deep([data-part='description']),
.states :deep([data-part='error']) {
  overflow-wrap: anywhere;
}
</style>
