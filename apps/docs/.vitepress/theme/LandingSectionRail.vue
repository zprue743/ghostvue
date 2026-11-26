<script setup lang="ts">
import {
  GhostScrollSpy,
  GhostScrollSpyItem,
  GhostScrollSpyLink,
  GhostScrollSpyList,
} from '@ghostvue/vue'

import { landingSections } from './landing-motion'

function markerNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}
</script>

<template>
  <!--
    `vp-raw` opts these links out of VitePress's router, whose capture-phase
    click listener would otherwise jump to the fragment instantly and cancel
    smooth scrolling from `GhostScrollSpyLink`.
  -->
  <GhostScrollSpy class="ghost-landing-rail vp-raw" label="Page sections">
    <template #default="{ activeId }">
      <span class="ghost-landing-rail__thread" aria-hidden="true">
        <span class="ghost-landing-rail__fill"></span>
        <span class="ghost-landing-rail__traveller">
          <span class="ghost-landing-rail__lean">
            <span :key="activeId" class="ghost-landing-rail__arrival">
              <svg
                class="ghost-landing-rail__ghost"
                viewBox="0 0 64 64"
                width="22"
                height="22"
                focusable="false"
              >
                <path
                  class="ghost-landing-rail__ghost-body"
                  d="M32 8C19.85 8 10 17.85 10 30V54L17.33 47.5L24.67 54L32 47.5L39.33 54L46.67 47.5L54 54V30C54 17.85 44.15 8 32 8Z"
                />
                <g class="ghost-landing-rail__ghost-eyes">
                  <circle cx="24.5" cy="27" r="3.4" />
                  <circle cx="39.5" cy="27" r="3.4" />
                </g>
              </svg>
            </span>
          </span>
        </span>
      </span>
      <GhostScrollSpyList class="ghost-landing-rail__list">
        <GhostScrollSpyItem
          v-for="(section, index) in landingSections"
          :key="section.id"
          class="ghost-landing-rail__item"
        >
          <GhostScrollSpyLink
            :target="section.id"
            class="ghost-landing-rail__link"
            :data-testid="`landing-rail-${section.id}`"
          >
            <span class="ghost-landing-rail__label">
              <span class="ghost-landing-rail__number" aria-hidden="true">{{
                markerNumber(index)
              }}</span>
              {{ section.label }}
            </span>
            <span class="ghost-landing-rail__marker" aria-hidden="true"></span>
          </GhostScrollSpyLink>
        </GhostScrollSpyItem>
      </GhostScrollSpyList>
    </template>
  </GhostScrollSpy>
</template>

<style src="./landing-rail.css"></style>
