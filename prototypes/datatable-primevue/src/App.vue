<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav class="nav">
    <RouterLink to="/ghost">Ghost fixture</RouterLink>
    <RouterLink to="/prime">Prime fixture</RouterLink>
    <RouterLink to="/perf/ghost?rows=1000">Perf Ghost 1k</RouterLink>
    <RouterLink to="/perf/prime?rows=1000">Perf Prime 1k</RouterLink>
  </nav>
  <RouterView />
</template>

<style>
.nav {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ddd;
  font-family: system-ui, sans-serif;
}
.nav a.router-link-active {
  font-weight: 700;
}
</style>