<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import {
  GhostAvatar,
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostDropdownMenu,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
  GhostEmptyState,
  GhostInput,
  GhostSkeleton,
  GhostTable,
  type GhostInputExposed,
} from '@ghostvue/themes'
import {
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  GhostVisuallyHidden,
} from '@ghostvue/vue'

type MemberStatus = 'active' | 'invited' | 'suspended'

interface Member {
  id: string
  name: string
  email: string
  role: string
  status: MemberStatus
}

// Deterministic local data: no clock, network, or random ids.
const members = ref<Member[]>([
  {
    id: 'm-01',
    name: 'Ada Lovelace',
    email: 'ada@orbit.example',
    role: 'Owner',
    status: 'active',
  },
  {
    id: 'm-02',
    name: 'Grace Hopper',
    email: 'grace@orbit.example',
    role: 'Admin',
    status: 'active',
  },
  {
    id: 'm-03',
    name: 'Alan Turing',
    email: 'alan@orbit.example',
    role: 'Engineer',
    status: 'active',
  },
  {
    id: 'm-04',
    name: 'Katherine Johnson',
    email: 'katherine@orbit.example',
    role: 'Analyst',
    status: 'invited',
  },
  {
    id: 'm-05',
    name: 'Edsger Dijkstra',
    email: 'edsger@orbit.example',
    role: 'Engineer',
    status: 'suspended',
  },
])

const statusLabel: Record<MemberStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
}

// Badge tone is a color intent, not a status vocabulary: map it here.
const statusTone: Record<MemberStatus, 'accent' | 'neutral' | 'danger'> = {
  active: 'accent',
  invited: 'neutral',
  suspended: 'danger',
}

const query = ref('')
const loading = ref(false)
const announcement = ref('')
const searchInput = ref<GhostInputExposed | null>(null)

const visibleMembers = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (needle === '') return members.value
  return members.value.filter((member) =>
    [member.name, member.email, member.role].some((value) =>
      value.toLowerCase().includes(needle),
    ),
  )
})

const summary = computed(() => {
  const invited = members.value.filter((m) => m.status === 'invited').length
  const total = String(members.value.length)
  const invites = invited === 1 ? 'invite' : 'invites'
  return `${total} members · ${String(invited)} pending ${invites}`
})

/*
 * One polite live region: an action result while it is fresh, otherwise the
 * match count, so filtering announces how many members remain.
 */
const statusText = computed(() => {
  if (announcement.value !== '') return announcement.value
  const shown = String(visibleMembers.value.length)
  return `Showing ${shown} of ${String(members.value.length)} members`
})

let refreshTimer: ReturnType<typeof setTimeout> | undefined

/*
 * Simulated fetch. The rows are replaced by skeletons and the table is
 * marked aria-busy; the polite status announces the result once, so screen
 * readers are not flooded with every row change.
 */
function refresh(): void {
  if (loading.value) return
  loading.value = true
  announcement.value = 'Refreshing team directory…'
  refreshTimer = setTimeout(() => {
    loading.value = false
    const total = String(members.value.length)
    announcement.value = `Directory up to date. ${total} members.`
  }, 900)
}

onBeforeUnmount(() => {
  clearTimeout(refreshTimer)
})

function clearSearch(): void {
  query.value = ''
  searchInput.value?.element?.focus()
}

function toggleAccess(member: Member): void {
  member.status = member.status === 'suspended' ? 'active' : 'suspended'
  announcement.value =
    member.status === 'suspended'
      ? `${member.name} can no longer sign in.`
      : `${member.name} can sign in again.`
}

function resendInvite(member: Member): void {
  announcement.value = `Invite sent again to ${member.email}.`
}
</script>

<template>
  <!--
    The heading carries no id: the card and table are named with aria-label
    so a demo heading never becomes a page anchor in a host's outline.
  -->
  <GhostCard as="section" class="directory" aria-label="Team directory">
    <template #header>
      <div class="directory__header">
        <div class="directory__heading">
          <h2 class="directory__title">Team directory</h2>
          <p class="directory__lead">{{ summary }}</p>
        </div>
        <div class="directory__toolbar">
          <GhostInput
            ref="searchInput"
            v-model="query"
            class="directory__search"
            type="search"
            size="sm"
            block
            aria-label="Search members"
            placeholder="Name, email, or role"
            @update:model-value="announcement = ''"
          />
          <GhostButton
            size="sm"
            variant="outline"
            tone="neutral"
            :loading="loading"
            @click="refresh"
          >
            Refresh
          </GhostButton>
        </div>
      </div>
    </template>

    <!--
      The wide class only applies while there are rows to show: it sets a
      minimum width so columns stay aligned and the named region scrolls on
      phones. The empty state then fits the card instead of the scroll width.
    -->
    <GhostTable
      contain-horizontal
      scroll-label="Team members"
      aria-label="Team members"
      :aria-busy="loading ? 'true' : undefined"
      :class="{ directory__table: loading || visibleMembers.length > 0 }"
    >
      <GhostTableHead>
        <GhostTableRow>
          <GhostTableHeaderCell scope="col">Member</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Role</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col">Status</GhostTableHeaderCell>
          <GhostTableHeaderCell scope="col" class="directory__end">
            <GhostVisuallyHidden>Actions</GhostVisuallyHidden>
          </GhostTableHeaderCell>
        </GhostTableRow>
      </GhostTableHead>

      <GhostTableBody v-if="loading">
        <GhostTableRow v-for="row in 4" :key="row">
          <GhostTableCell>
            <span class="directory__member">
              <GhostSkeleton
                shape="circle"
                class="directory__avatar-skeleton"
              />
              <!-- Same text boxes as a loaded row, so rows keep their height. -->
              <span class="directory__lines">
                <span class="directory__name">
                  <GhostSkeleton class="directory__skeleton-name" />
                </span>
                <span class="directory__email">
                  <GhostSkeleton class="directory__skeleton-email" />
                </span>
              </span>
            </span>
          </GhostTableCell>
          <GhostTableCell>
            <GhostSkeleton class="directory__skeleton-short" />
          </GhostTableCell>
          <GhostTableCell>
            <GhostSkeleton class="directory__skeleton-short" />
          </GhostTableCell>
          <GhostTableCell />
        </GhostTableRow>
      </GhostTableBody>

      <GhostTableBody v-else-if="visibleMembers.length > 0">
        <GhostTableRow v-for="member in visibleMembers" :key="member.id">
          <GhostTableHeaderCell scope="row">
            <span class="directory__member">
              <GhostAvatar :name="member.name" size="sm" />
              <span class="directory__lines">
                <span class="directory__name">{{ member.name }}</span>
                <span class="directory__email">{{ member.email }}</span>
              </span>
            </span>
          </GhostTableHeaderCell>
          <GhostTableCell>{{ member.role }}</GhostTableCell>
          <GhostTableCell>
            <GhostBadge :tone="statusTone[member.status]">
              {{ statusLabel[member.status] }}
            </GhostBadge>
          </GhostTableCell>
          <GhostTableCell class="directory__end">
            <GhostDropdownMenu>
              <GhostDropdownMenuTrigger
                :as="GhostButton"
                variant="ghost"
                tone="neutral"
                size="sm"
                icon-only
                :aria-label="`Actions for ${member.name}`"
              >
                <svg
                  data-part="icon"
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="13" cy="8" r="1.5" fill="currentColor" />
                </svg>
              </GhostDropdownMenuTrigger>
              <GhostDropdownMenuContent :offset="4" placement="bottom-end">
                <GhostDropdownMenuItem
                  :disabled="member.status !== 'invited'"
                  @select="resendInvite(member)"
                >
                  Resend invite
                </GhostDropdownMenuItem>
                <GhostDropdownMenuSeparator decorative />
                <GhostDropdownMenuItem
                  :disabled="member.role === 'Owner'"
                  @select="toggleAccess(member)"
                >
                  {{
                    member.status === 'suspended'
                      ? 'Restore access'
                      : 'Suspend access'
                  }}
                </GhostDropdownMenuItem>
              </GhostDropdownMenuContent>
            </GhostDropdownMenu>
          </GhostTableCell>
        </GhostTableRow>
      </GhostTableBody>

      <GhostTableBody v-else>
        <GhostTableRow>
          <GhostTableCell colspan="4">
            <GhostEmptyState :heading-level="3">
              <template #title>No members match “{{ query }}”</template>
              <template #description>
                Check the spelling or search by email or role.
              </template>
              <template #actions>
                <GhostButton size="sm" variant="outline" @click="clearSearch">
                  Clear search
                </GhostButton>
              </template>
            </GhostEmptyState>
          </GhostTableCell>
        </GhostTableRow>
      </GhostTableBody>
    </GhostTable>

    <template #footer>
      <p class="directory__status" role="status">{{ statusText }}</p>
    </template>
  </GhostCard>
</template>

<style scoped>
.directory__header {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-stack-sm) var(--ghost-space-gap-lg);
  justify-content: space-between;
  padding-block-end: var(--ghost-space-stack-sm);
}

.directory__heading {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.directory__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.directory__lead,
.directory__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

/* Search grows to fill the toolbar and wraps above Refresh on phones. */
.directory__toolbar {
  align-items: center;
  display: flex;
  flex: 1 1 16rem;
  min-inline-size: 0;
  gap: var(--ghost-space-gap-sm);
  justify-content: flex-end;
  max-inline-size: 26rem;
}

.directory__search {
  flex: 1 1 auto;
  min-inline-size: 0;
}

/*
 * Columns keep their measure below this width; the GhostTable scroll
 * region (named "Team members") pans instead of squeezing the cells.
 * `:deep()` because the class lands on the native table inside GhostTable.
 */
.directory :deep(.directory__table) {
  min-inline-size: 30rem;
}

.directory__end {
  text-align: end;
}

.directory__member {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.directory__lines {
  display: grid;
  min-inline-size: 0;
}

.directory__name {
  color: var(--ghost-text-default);
  font-weight: var(--ghost-type-weight-medium);
}

.directory__email {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-regular);
}

.directory__avatar-skeleton {
  flex: none;
  inline-size: var(--ghost-control-size-sm-min);
  block-size: var(--ghost-control-size-sm-min);
}

/* Bars sit inside the same text boxes as the loaded name and email. */
.directory__skeleton-name,
.directory__skeleton-email {
  block-size: 0.8em;
}

.directory__skeleton-name {
  inline-size: 8rem;
}

.directory__skeleton-email {
  inline-size: 10rem;
}

.directory__skeleton-short {
  inline-size: 4.5rem;
}
</style>
