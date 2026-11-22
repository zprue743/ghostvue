<script setup lang="ts">
defineProps<{ colspan?: number }>()
</script>
<template>
  <td :colspan="colspan"><slot /></td>
</template>