<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostLink, type GhostLinkExposed } from '../src'

const link = useTemplateRef<GhostLinkExposed>('link')

function handleClick(event: MouseEvent) {
  event.preventDefault()
}

void link
void handleClick
</script>

<template>
  <GhostLink
    id="docs-link"
    ref="link"
    class="inline"
    href="/components/link"
    rel="help"
    target="_blank"
    :external="true"
    @click="handleClick"
  >
    Read the link guide
  </GhostLink>
</template>
