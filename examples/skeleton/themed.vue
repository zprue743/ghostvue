<script setup lang="ts">
import { GhostSkeleton } from '@ghostvue/themes'
</script>

<template>
  <GhostSkeleton style="inline-size: 12rem" />
  <GhostSkeleton shape="rect" style="inline-size: 12rem" />
  <GhostSkeleton shape="circle" />
</template>
