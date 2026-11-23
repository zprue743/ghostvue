<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCommandPalette,
  GhostCommandPaletteContent,
  GhostCommandPaletteEmpty,
  GhostCommandPaletteInput,
  GhostCommandPaletteItem,
  GhostCommandPaletteList,
  GhostCommandPaletteOverlay,
  GhostCommandPaletteTitle,
  GhostCommandPaletteTrigger,
  useGhostCommandPaletteAsyncSearch,
  type GhostCommandPaletteCommandPayload,
  type GhostCommandPaletteSearchPayload,
} from '@ghostvue/vue'

interface Page {
  id: string
  title: string
}

const catalog: Page[] = [
  { id: 'page-roadmap', title: 'Roadmap' },
  { id: 'page-release-notes', title: 'Release notes' },
  { id: 'page-retro', title: 'Sprint retro' },
  { id: 'page-onboarding', title: 'Onboarding checklist' },
  { id: 'page-oncall', title: 'On-call runbook' },
  { id: 'page-pricing', title: 'Pricing experiments' },
]

const results = ref<Page[]>(catalog)
const loading = ref(false)
const opened = ref('Nothing yet')

const { begin, isLatest } = useGhostCommandPaletteAsyncSearch()

/*
 * Deterministic fake server: shorter queries answer more slowly, so typing
 * "r" then "re" quickly resolves out of order. `isLatest` drops the slow,
 * stale "r" response so it never replaces the newer results or clears
 * `loading` early.
 */
function fetchPages(query: string): Promise<Page[]> {
  const delay = Math.max(80, 400 - query.length * 120)
  const lowered = query.trim().toLowerCase()
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        catalog.filter((page) => page.title.toLowerCase().includes(lowered)),
      )
    }, delay)
  })
}

async function onSearch({
  query,
  requestId,
}: GhostCommandPaletteSearchPayload): Promise<void> {
  begin(requestId)
  loading.value = true
  const pages = await fetchPages(query)
  if (!isLatest(requestId)) {
    return
  }
  results.value = pages
  loading.value = false
}

function onCommand({ id }: GhostCommandPaletteCommandPayload): void {
  opened.value = catalog.find((page) => page.id === id)?.title ?? id
}
</script>

<template>
  <div>
    <GhostCommandPalette
      :loading="loading"
      @search="onSearch"
      @command="onCommand"
    >
      <GhostCommandPaletteTrigger>Search pages</GhostCommandPaletteTrigger>
      <GhostCommandPaletteOverlay />
      <GhostCommandPaletteContent>
        <GhostCommandPaletteTitle>Search pages</GhostCommandPaletteTitle>
        <GhostCommandPaletteInput placeholder="Page title" />
        <GhostCommandPaletteList>
          <GhostCommandPaletteItem
            v-for="page in results"
            :id="page.id"
            :key="page.id"
          >
            {{ page.title }}
          </GhostCommandPaletteItem>
          <GhostCommandPaletteEmpty>No pages match.</GhostCommandPaletteEmpty>
        </GhostCommandPaletteList>
      </GhostCommandPaletteContent>
    </GhostCommandPalette>
    <p>
      Opened: <output>{{ opened }}</output>
    </p>
  </div>
</template>
