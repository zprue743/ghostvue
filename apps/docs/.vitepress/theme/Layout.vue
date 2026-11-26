<script setup lang="ts">
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { nextTick, onMounted, watch } from 'vue'

import { enhanceMarkdownCodeFences } from './enhance-code-fences'
import ThemeSwitcher from './ThemeSwitcher.vue'

const { Layout } = DefaultTheme
const route = useRoute()

onMounted(() => {
  enhanceMarkdownCodeFences()
})

watch(
  () => route.path,
  () => {
    void nextTick(enhanceMarkdownCodeFences)
  },
)
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <ThemeSwitcher />
    </template>
    <template #nav-screen-content-after>
      <ThemeSwitcher />
    </template>
  </Layout>
</template>
