<script setup lang="ts">
import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <!-- With expandOnClick off, the label only selects and the chevron only toggles. -->
  <GhostTree
    aria-label="Workspace"
    :expand-on-click="false"
    :default-expanded="['team']"
  >
    <GhostTreeItem value="team">
      <template #default="{ expanded }">
        <GhostTreeTrigger action="toggle" data-testid="team-chevron">
          <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
        </GhostTreeTrigger>
        <GhostTreeTrigger action="select">Team</GhostTreeTrigger>
        <GhostTreeGroup>
          <GhostTreeItem value="roadmap">
            <GhostTreeTrigger action="select">Roadmap</GhostTreeTrigger>
          </GhostTreeItem>
          <GhostTreeItem value="retro">
            <GhostTreeTrigger action="select">Retro notes</GhostTreeTrigger>
          </GhostTreeItem>
        </GhostTreeGroup>
      </template>
    </GhostTreeItem>
    <GhostTreeItem value="personal">
      <template #default="{ expanded }">
        <GhostTreeTrigger action="toggle" data-testid="personal-chevron">
          <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
        </GhostTreeTrigger>
        <GhostTreeTrigger action="select">Personal</GhostTreeTrigger>
        <GhostTreeGroup>
          <GhostTreeItem value="drafts">
            <GhostTreeTrigger action="select">Drafts</GhostTreeTrigger>
          </GhostTreeItem>
        </GhostTreeGroup>
      </template>
    </GhostTreeItem>
  </GhostTree>
</template>
