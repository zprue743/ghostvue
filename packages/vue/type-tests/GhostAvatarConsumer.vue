<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostAvatar, type GhostAvatarExposed } from '../src'

const avatar = useTemplateRef<GhostAvatarExposed>('avatar')

void avatar
</script>

<template>
  <GhostAvatar
    id="profile-avatar"
    ref="avatar"
    as="div"
    name="Jane Doe"
    src="https://example.com/photo.png"
    alt="Jane"
    title="Profile"
  />
</template>
