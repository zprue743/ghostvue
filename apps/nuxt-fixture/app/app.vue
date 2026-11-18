<script setup lang="ts">
// No imports on purpose: every Ghost* component and useGhost* composable here
// comes from @ghostvue/nuxt auto-imports. That makes this page the consumer
// that demonstrates (and tests) the integration.
import { ref } from 'vue'

const variant = useAppConfig().fixtureVariant
const count = ref(0)
const tab = ref('profile')
const name = ref('')
const notesId = useGhostId()
</script>

<template>
  <main
    :data-fixture-variant="variant"
    :data-ghost-theme="variant === 'themed' ? 'calm' : undefined"
  >
    <h1>GhostVue Nuxt fixture</h1>

    <GhostButton data-testid="counter" @click="count += 1">
      Clicked {{ count }} times
    </GhostButton>

    <div>
      <label for="airplane">Airplane mode</label>
      <GhostSwitch id="airplane" data-testid="switch" />
    </div>

    <GhostField>
      <GhostFieldLabel>Display name</GhostFieldLabel>
      <GhostFieldDescription>Visible to teammates.</GhostFieldDescription>
      <GhostFieldControl v-slot="field">
        <GhostInput v-bind="field" v-model="name" name="display-name" />
      </GhostFieldControl>
    </GhostField>

    <GhostTabs v-model="tab">
      <GhostTabsList aria-label="Account">
        <GhostTabsTrigger value="profile">Profile</GhostTabsTrigger>
        <GhostTabsTrigger value="billing">Billing</GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="profile">Profile settings</GhostTabsContent>
      <GhostTabsContent value="billing">Billing settings</GhostTabsContent>
    </GhostTabs>

    <p :id="notesId" data-testid="composable-id">
      <GhostVisuallyHidden>Generated id:</GhostVisuallyHidden>
      {{ notesId }}
    </p>
  </main>
</template>
