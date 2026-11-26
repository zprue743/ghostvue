<script setup>
// No imports: GhostButton and useGhostId come from @ghostvue/nuxt auto-imports.
const id = useGhostId('smoke')
</script>

<template>
  <main>
    <GhostButton :data-smoke-id="id">Auto-imported</GhostButton>
  </main>
</template>
