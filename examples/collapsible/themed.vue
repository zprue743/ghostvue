<script setup lang="ts">
import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <!--
    GhostCollapsible renders no element, so this plain block keeps the trigger
    and panel stacked at one width. It is not a theme host: tokens and mode
    come from the page, like every other themed demo.
  -->
  <div>
    <GhostCollapsible>
      <GhostCollapsibleTrigger data-themed>
        Reveal inventory adjustments
      </GhostCollapsibleTrigger>
      <GhostCollapsibleContent data-themed>
        <p>
          Themed disclosure surfaces use semantic elevation and motion tokens.
        </p>
      </GhostCollapsibleContent>
    </GhostCollapsible>
  </div>
</template>
