<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'

import {
  GhostAvatar,
  GhostButton,
  GhostCard,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInput,
  GhostTextarea,
} from '@ghostvue/themes'

interface Profile {
  name: string
  title: string
  email: string
  bio: string
}

/*
 * Deterministic seed data. The saved profile only changes on a valid Save;
 * the dialog edits a draft copy so Cancel, Escape, and a backdrop click all
 * leave the card exactly as it was.
 */
const profile = reactive<Profile>({
  name: 'Ada Lovelace',
  title: 'Research engineer',
  email: 'ada@analytical-engines.example',
  bio: 'Writes the notes that turn the Analytical Engine from a calculator into a general-purpose machine. Currently documenting loops and conditional branching for the next release.',
})
const draft = reactive<Profile>({ ...profile })
const bioLimit = 280

const open = ref(false)
const status = ref('')
const submitted = ref(false)

const nameInvalid = computed(() => draft.name.trim() === '')
// A deliberately small check: the browser still runs native email validation.
const emailInvalid = computed(
  () => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()),
)
// Errors appear after the first Save attempt, then update as the user types.
const showNameError = computed(() => submitted.value && nameInvalid.value)
const showEmailError = computed(() => submitted.value && emailInvalid.value)
const dirty = computed(() =>
  (Object.keys(profile) as (keyof Profile)[]).some(
    (key) => profile[key] !== draft[key].trim(),
  ),
)

function setOpen(next: boolean): void {
  if (next) {
    // Every session starts from the saved profile, never a stale draft.
    Object.assign(draft, profile)
    submitted.value = false
    status.value = ''
  } else if (dirty.value) {
    status.value = 'Edits discarded.'
  }
  open.value = next
}

async function save(event: SubmitEvent): Promise<void> {
  submitted.value = true
  if (nameInvalid.value || emailInvalid.value) {
    // Keep the dialog open and move focus to the first field that needs work,
    // once the errors have rendered and set aria-invalid.
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) return
    await nextTick()
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  const changed = dirty.value
  Object.assign(profile, {
    name: draft.name.trim(),
    title: draft.title.trim(),
    email: draft.email.trim(),
    bio: draft.bio.trim(),
  })
  status.value = changed ? 'Profile saved.' : 'No changes to save.'
  // Closing through state returns focus to the Edit profile trigger.
  open.value = false
}
</script>

<template>
  <GhostCard class="profile">
    <template #header>
      <div class="profile__header">
        <GhostAvatar :name="profile.name" size="lg" />
        <div class="profile__identity">
          <h2 class="profile__name">{{ profile.name }}</h2>
          <p class="profile__meta">{{ profile.title }}</p>
        </div>
      </div>
    </template>

    <dl class="profile__details">
      <div class="profile__detail">
        <dt>Work email</dt>
        <dd>{{ profile.email }}</dd>
      </div>
      <div class="profile__detail">
        <dt>Bio</dt>
        <dd>{{ profile.bio }}</dd>
      </div>
    </dl>

    <template #footer>
      <div class="profile__actions">
        <p class="profile__status" role="status">{{ status }}</p>
        <GhostDialog :open="open" @update:open="setOpen">
          <GhostDialogTrigger :as="GhostButton" variant="outline">
            Edit profile
          </GhostDialogTrigger>
          <GhostDialogOverlay />
          <GhostDialogContent>
            <div class="profile-dialog__header">
              <GhostDialogTitle>Edit profile</GhostDialogTitle>
              <GhostDialogDescription>
                Your name, title, and bio appear on shared reports and workspace
                invitations.
              </GhostDialogDescription>
            </div>

            <form
              class="profile-dialog__form"
              novalidate
              @submit.prevent="save"
            >
              <div class="profile-dialog__row">
                <GhostField required :invalid="showNameError">
                  <GhostFieldLabel required>Full name</GhostFieldLabel>
                  <GhostFieldControl v-slot="field">
                    <GhostInput
                      v-bind="field"
                      v-model="draft.name"
                      name="name"
                      autocomplete="name"
                      block
                    />
                  </GhostFieldControl>
                  <GhostFieldError v-if="showNameError">
                    Enter your name.
                  </GhostFieldError>
                </GhostField>

                <GhostField>
                  <GhostFieldLabel>Job title</GhostFieldLabel>
                  <GhostFieldControl v-slot="field">
                    <GhostInput
                      v-bind="field"
                      v-model="draft.title"
                      name="title"
                      autocomplete="organization-title"
                      block
                    />
                  </GhostFieldControl>
                </GhostField>
              </div>

              <GhostField required :invalid="showEmailError">
                <GhostFieldLabel required>Work email</GhostFieldLabel>
                <GhostFieldDescription>
                  Sign-in links and report digests go here.
                </GhostFieldDescription>
                <GhostFieldControl v-slot="field">
                  <GhostInput
                    v-bind="field"
                    v-model="draft.email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    block
                  />
                </GhostFieldControl>
                <GhostFieldError v-if="showEmailError">
                  Enter an address like name@company.com.
                </GhostFieldError>
              </GhostField>

              <GhostField>
                <GhostFieldLabel>Bio</GhostFieldLabel>
                <GhostFieldDescription>
                  {{ draft.bio.length }} of {{ bioLimit }} characters.
                </GhostFieldDescription>
                <GhostFieldControl v-slot="field">
                  <GhostTextarea
                    v-bind="field"
                    v-model="draft.bio"
                    name="bio"
                    :maxlength="bioLimit"
                    :rows="3"
                    :max-rows="6"
                    auto-resize
                  />
                </GhostFieldControl>
              </GhostField>

              <div class="profile-dialog__actions">
                <GhostDialogClose
                  :as="GhostButton"
                  variant="soft"
                  tone="neutral"
                >
                  Cancel
                </GhostDialogClose>
                <GhostButton type="submit">Save changes</GhostButton>
              </div>
            </form>
          </GhostDialogContent>
        </GhostDialog>
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
/*
 * The card owns its width: 32rem keeps the details at a readable measure and
 * lets the card shrink with the preview on phones.
 */
.profile {
  max-inline-size: 32rem;
}

.profile__header {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-md);
  min-inline-size: 0;
  padding-block-end: var(--ghost-space-stack-sm);
}

.profile__identity {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

/* Native text picks up docs prose styles, so each element resets its own. */
.profile__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  overflow-wrap: anywhere;
}

.profile__meta,
.profile__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.profile__details {
  display: grid;
  gap: var(--ghost-space-stack-md);
  margin: 0;
}

.profile__detail {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.profile__detail dt {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.profile__detail dd {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
  margin: 0;
  overflow-wrap: anywhere;
}

.profile__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm) var(--ghost-space-gap-md);
  justify-content: flex-end;
}

.profile__status {
  flex: 1 1 auto;
}

.profile-dialog__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.profile-dialog__form {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  margin: 0;
}

/* Two names share a row when each can keep about 11rem; otherwise they stack. */
.profile-dialog__row {
  display: grid;
  gap: var(--ghost-space-stack-lg) var(--ghost-space-gap-md);
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
}

.profile-dialog__form :deep([data-part='description']),
.profile-dialog__form :deep([data-part='error']) {
  overflow-wrap: anywhere;
}

.profile-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
}
</style>
