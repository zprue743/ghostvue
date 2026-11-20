<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostProgress,
} from '@ghostvue/themes'

const bundlePercent = ref(65)

function advanceBundle(): void {
  bundlePercent.value = Math.min(100, bundlePercent.value + 15)
}

function resetQueue(): void {
  bundlePercent.value = 65
}
</script>

<template>
  <div class="upload-queue">
    <GhostCard>
      <template #header>
        <div class="upload-queue__header">
          <div class="upload-queue__title-group">
            <span class="upload-queue__title">Artifact uploads</span>
            <span class="upload-queue__subtitle">
              2 transfers in progress, 1 verifying checksum
            </span>
          </div>
          <div class="upload-queue__actions">
            <GhostButton
              size="sm"
              variant="outline"
              tone="neutral"
              :disabled="bundlePercent >= 100"
              @click="advanceBundle"
            >
              Advance +15%
            </GhostButton>
            <GhostButton
              size="sm"
              variant="ghost"
              tone="neutral"
              :disabled="bundlePercent === 65"
              @click="resetQueue"
            >
              Reset
            </GhostButton>
          </div>
        </div>
      </template>

      <div class="upload-queue__items">
        <div class="upload-queue__item">
          <div class="upload-queue__row">
            <span class="upload-queue__file">tokens-bundle.tar.gz</span>
            <span class="upload-queue__value">{{ bundlePercent }}%</span>
          </div>
          <GhostProgress
            label="Uploading tokens-bundle.tar.gz"
            :value="bundlePercent"
          />
        </div>

        <div class="upload-queue__item">
          <div class="upload-queue__row">
            <span class="upload-queue__file">visual-baselines.zip</span>
            <GhostBadge tone="neutral" variant="soft" size="sm">
              7 of 10 shards
            </GhostBadge>
          </div>
          <GhostProgress
            label="Uploading visual-baselines.zip"
            size="sm"
            tone="neutral"
            :value="70"
            value-text="7 of 10 shards"
          />
        </div>

        <div class="upload-queue__item">
          <div class="upload-queue__row">
            <span class="upload-queue__file">manifest-signatures.json</span>
            <span class="upload-queue__value">Verifying…</span>
          </div>
          <GhostProgress
            label="Verifying manifest-signatures.json"
            size="sm"
            tone="accent"
          />
        </div>
      </div>
    </GhostCard>
  </div>
</template>

<style scoped>
.upload-queue {
  display: grid;
}

.upload-queue__header {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.upload-queue__title-group {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.upload-queue__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.upload-queue__subtitle {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

.upload-queue__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.upload-queue__items {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.upload-queue__item {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.upload-queue__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.upload-queue__file {
  color: var(--ghost-text-default);
  font-family: var(--ghost-type-family-mono);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.upload-queue__value {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
}

@container ghost-demo (min-width: 28rem) {
  .upload-queue__header {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
