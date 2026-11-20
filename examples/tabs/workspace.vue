<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  GhostAvatar,
  GhostBadge,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/themes'

type Locale = 'en' | 'de' | 'ar'
type Role = 'owner' | 'admin' | 'editor' | 'viewer'

interface Copy {
  dir: 'ltr' | 'rtl'
  title: string
  lead: string
  language: string
  tabs: {
    label: string
    overview: string
    members: string
    activity: string
    billing: string
  }
  overview: {
    intro: string
    stats: readonly { label: string; value: string }[]
  }
  members: { intro: string; roles: Record<Role, string> }
  activity: { intro: string; events: readonly string[] }
  billing: string
}

/*
 * Deterministic local copy. German labels are deliberately long so the strip
 * wraps; Arabic switches the whole example to right-to-left, where ArrowLeft
 * moves to the next tab. Names, emails, and dates stay fixed so screenshots
 * and tests never depend on the clock or the network.
 */
const copy: Record<Locale, Copy> = {
  en: {
    dir: 'ltr',
    title: 'Northwind design workspace',
    lead: 'Plan, people, and recent changes for the design systems team.',
    language: 'Interface language',
    tabs: {
      label: 'Workspace sections',
      overview: 'Overview',
      members: 'Members',
      activity: 'Activity',
      billing: 'Billing',
    },
    overview: {
      intro: 'Team plan, renewed every November.',
      stats: [
        { label: 'Members', value: '4 of 10 seats' },
        { label: 'Projects', value: '14 active' },
        { label: 'Storage', value: '18.4 GB of 50 GB' },
      ],
    },
    members: {
      intro: 'People who can open this workspace.',
      roles: {
        owner: 'Owner',
        admin: 'Admin',
        editor: 'Editor',
        viewer: 'Viewer',
      },
    },
    activity: {
      intro: 'The latest changes, newest first.',
      events: [
        'Ada Lovelace published Tokens v4.2',
        'Grace Hopper invited Alan Turing',
        'Katherine Johnson archived Legacy icons',
      ],
    },
    billing: 'Only workspace owners can see billing.',
  },
  de: {
    dir: 'ltr',
    title: 'Northwind-Design-Arbeitsbereich',
    lead: 'Tarif, Personen und letzte Änderungen des Design-System-Teams.',
    language: 'Sprache der Oberfläche',
    tabs: {
      label: 'Bereiche des Arbeitsbereichs',
      overview: 'Übersicht',
      members: 'Mitglieder und Berechtigungen',
      activity: 'Aktivitätsprotokoll',
      billing: 'Abrechnung und Rechnungen',
    },
    overview: {
      intro: 'Team-Tarif, jährliche Verlängerung im November.',
      stats: [
        { label: 'Mitglieder', value: '4 von 10 Plätzen' },
        { label: 'Projekte', value: '14 aktiv' },
        { label: 'Speicher', value: '18,4 GB von 50 GB' },
      ],
    },
    members: {
      intro: 'Personen, die diesen Arbeitsbereich öffnen können.',
      roles: {
        owner: 'Inhaberin',
        admin: 'Administration',
        editor: 'Bearbeitung',
        viewer: 'Nur Lesen',
      },
    },
    activity: {
      intro: 'Die letzten Änderungen, neueste zuerst.',
      events: [
        'Ada Lovelace hat Tokens v4.2 veröffentlicht',
        'Grace Hopper hat Alan Turing eingeladen',
        'Katherine Johnson hat Legacy-Symbole archiviert',
      ],
    },
    billing: 'Nur Inhaber des Arbeitsbereichs sehen die Abrechnung.',
  },
  ar: {
    dir: 'rtl',
    title: 'مساحة عمل تصميم نورثويند',
    lead: 'الخطة والأشخاص وآخر التغييرات لفريق أنظمة التصميم.',
    language: 'لغة الواجهة',
    tabs: {
      label: 'أقسام مساحة العمل',
      overview: 'نظرة عامة',
      members: 'الأعضاء',
      activity: 'سجل النشاط',
      billing: 'الفوترة',
    },
    overview: {
      intro: 'خطة الفريق، تتجدد كل نوفمبر.',
      stats: [
        { label: 'الأعضاء', value: '4 من 10 مقاعد' },
        { label: 'المشاريع', value: '14 نشطًا' },
        { label: 'التخزين', value: '18.4 غيغابايت من 50' },
      ],
    },
    members: {
      intro: 'الأشخاص الذين يمكنهم فتح مساحة العمل هذه.',
      roles: {
        owner: 'المالك',
        admin: 'مسؤول',
        editor: 'محرر',
        viewer: 'مشاهد',
      },
    },
    activity: {
      intro: 'آخر التغييرات، الأحدث أولًا.',
      events: [
        'نشرت Ada Lovelace الرموز v4.2',
        'دعت Grace Hopper المستخدم Alan Turing',
        'أرشفت Katherine Johnson الأيقونات القديمة',
      ],
    },
    billing: 'يمكن لمالكي مساحة العمل فقط رؤية الفوترة.',
  },
}

const members: readonly { name: string; email: string; role: Role }[] = [
  { name: 'Ada Lovelace', email: 'ada@northwind.example', role: 'owner' },
  { name: 'Grace Hopper', email: 'grace@northwind.example', role: 'admin' },
  {
    name: 'Katherine Johnson',
    email: 'katherine.johnson@northwind.example',
    role: 'editor',
  },
  { name: 'Alan Turing', email: 'alan@northwind.example', role: 'viewer' },
]

// ISO dates pair with each translated event by index.
const eventDates = ['2026-11-18', '2026-11-17', '2026-11-14'] as const

const locale = ref<Locale>('en')
const section = ref('overview')
const text = computed(() => copy[locale.value])

function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'de' || value === 'ar'
}

function setLocale(value: string | undefined): void {
  if (isLocale(value)) locale.value = value
}
</script>

<template>
  <!--
    `lang` and `dir` sit on the example root so the strip, the panels, and the
    tab list's roving focus all follow the chosen language.
  -->
  <section
    class="workspace"
    :lang="locale"
    :dir="text.dir"
    aria-labelledby="workspace-title"
  >
    <header class="workspace__header">
      <div class="workspace__heading">
        <h2 id="workspace-title" class="workspace__title">{{ text.title }}</h2>
        <p class="workspace__lead">{{ text.lead }}</p>
      </div>
      <GhostSegmentedControl
        :model-value="locale"
        :aria-label="text.language"
        class="workspace__language"
        @update:model-value="setLocale"
      >
        <GhostSegmentedControlItem value="en" lang="en">
          English
        </GhostSegmentedControlItem>
        <GhostSegmentedControlItem value="de" lang="de">
          Deutsch
        </GhostSegmentedControlItem>
        <GhostSegmentedControlItem value="ar" lang="ar">
          العربية
        </GhostSegmentedControlItem>
      </GhostSegmentedControl>
    </header>

    <GhostTabs v-model="section">
      <!--
        GhostTabs renders no element. This grid is the explicit stack: the
        strip always sits above the panel, and the themed panel's own top
        margin is the only gap between them.
      -->
      <div class="workspace__tabs">
        <GhostTabsList :aria-label="text.tabs.label" class="workspace__strip">
          <GhostTabsTrigger value="overview" class="workspace__tab">
            {{ text.tabs.overview }}
          </GhostTabsTrigger>
          <GhostTabsTrigger value="members" class="workspace__tab">
            {{ text.tabs.members }}
            <span class="workspace__count">{{ members.length }}</span>
          </GhostTabsTrigger>
          <GhostTabsTrigger value="activity" class="workspace__tab">
            {{ text.tabs.activity }}
          </GhostTabsTrigger>
          <!-- Disabled tabs stay visible but are skipped by arrow keys. -->
          <GhostTabsTrigger value="billing" class="workspace__tab" disabled>
            {{ text.tabs.billing }}
          </GhostTabsTrigger>
        </GhostTabsList>

        <GhostTabsContent value="overview" class="workspace__panel">
          <p class="workspace__intro">{{ text.overview.intro }}</p>
          <dl class="workspace__stats">
            <div
              v-for="stat in text.overview.stats"
              :key="stat.label"
              class="workspace__stat"
            >
              <dt class="workspace__stat-label">{{ stat.label }}</dt>
              <dd class="workspace__stat-value">{{ stat.value }}</dd>
            </div>
          </dl>
        </GhostTabsContent>

        <GhostTabsContent value="members" class="workspace__panel">
          <p class="workspace__intro">{{ text.members.intro }}</p>
          <ul class="workspace__list">
            <li
              v-for="member in members"
              :key="member.email"
              class="workspace__member"
            >
              <GhostAvatar :name="member.name" size="sm" />
              <span class="workspace__person">
                <span class="workspace__name">{{ member.name }}</span>
                <!-- Emails are left-to-right text even inside an Arabic layout. -->
                <span class="workspace__meta" dir="ltr">{{
                  member.email
                }}</span>
              </span>
              <GhostBadge
                :tone="member.role === 'owner' ? 'accent' : 'neutral'"
                :variant="member.role === 'owner' ? 'soft' : 'outline'"
                class="workspace__role"
              >
                {{ text.members.roles[member.role] }}
              </GhostBadge>
            </li>
          </ul>
        </GhostTabsContent>

        <GhostTabsContent value="activity" class="workspace__panel">
          <p class="workspace__intro">{{ text.activity.intro }}</p>
          <ol class="workspace__list">
            <li
              v-for="(event, index) in text.activity.events"
              :key="eventDates[index]"
              class="workspace__event"
            >
              <span class="workspace__name">{{ event }}</span>
              <time class="workspace__meta" :datetime="eventDates[index]">
                {{ eventDates[index] }}
              </time>
            </li>
          </ol>
        </GhostTabsContent>

        <GhostTabsContent value="billing" class="workspace__panel">
          <p class="workspace__intro">{{ text.billing }}</p>
        </GhostTabsContent>
      </div>
    </GhostTabs>
  </section>
</template>

<style scoped>
/*
 * The example owns its measure (40rem) and shrinks with the preview. Native
 * text inside picks up docs prose styles, so every element below resets the
 * margins, padding, and list styles it relies on.
 */
.workspace {
  display: grid;
  gap: var(--ghost-space-stack-md);
  grid-template-columns: minmax(0, 1fr);
  max-inline-size: 40rem;
}

/* Title and language switch stack on phones and share a row from 34rem. */
.workspace__header {
  display: grid;
  gap: var(--ghost-space-stack-sm);
  grid-template-columns: minmax(0, 1fr);
}

@container ghost-demo (min-width: 34rem) {
  .workspace__header {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

.workspace__heading {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.workspace__title {
  border: 0;
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
  padding: 0;
}

.workspace__lead,
.workspace__intro {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

/* A smaller label keeps all three languages on one row at 320px. */
.workspace__language {
  font-size: var(--ghost-type-size-sm);
  justify-self: start;
  max-inline-size: 100%;
}

/* Explicit stack: strip first, panel below, both at full width. */
.workspace__tabs {
  display: grid;
  min-inline-size: 0;
}

/*
 * Long translated labels wrap inside their tab instead of widening the
 * strip; the themed list already wraps whole tabs onto a new row.
 */
.workspace__tab {
  align-items: center;
  display: inline-flex;
  gap: var(--ghost-space-gap-xs);
  max-inline-size: 100%;
  overflow-wrap: anywhere;
  text-align: start;
}

.workspace__count {
  background-color: var(--ghost-surface-muted-bg);
  border-radius: var(--ghost-radius-pill);
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
  line-height: var(--ghost-type-line-tight);
  padding: 0 var(--ghost-space-inset-xs);
}

.workspace__panel {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

/* The native `hidden` attribute must still win over the grid display. */
.workspace__panel[hidden] {
  display: none;
}

.workspace__stats {
  display: grid;
  gap: var(--ghost-space-stack-sm) var(--ghost-space-gap-md);
  grid-template-columns: repeat(auto-fit, minmax(min(9rem, 100%), 1fr));
  margin: 0;
}

.workspace__stat {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.workspace__stat-label {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
}

.workspace__stat-value {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.workspace__list {
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
 * Avatar, person, and role share a row; below about 24rem the role badge
 * moves under the name so long emails keep their width.
 */
.workspace__member {
  align-items: center;
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  column-gap: var(--ghost-space-gap-md);
  display: grid;
  grid-template-areas:
    'avatar person'
    'avatar role';
  grid-template-columns: auto minmax(0, 1fr);
  margin: 0;
  padding-block: var(--ghost-space-stack-sm);
  row-gap: var(--ghost-space-gap-xs);
}

.workspace__member > :first-child {
  grid-area: avatar;
}

.workspace__person {
  display: grid;
  grid-area: person;
  justify-items: start;
  min-inline-size: 0;
}

.workspace__role {
  grid-area: role;
  justify-self: start;
}

@container ghost-demo (min-width: 24rem) {
  .workspace__member {
    grid-template-areas: 'avatar person role';
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
}

.workspace__event {
  border-block-start: var(--ghost-border-hairline-width) solid
    var(--ghost-border-default);
  display: grid;
  gap: var(--ghost-space-gap-xs);
  justify-items: start;
  margin: 0;
  padding-block: var(--ghost-space-stack-sm);
}

.workspace__member:first-child,
.workspace__event:first-child {
  border-block-start: 0;
}

.workspace__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
  overflow-wrap: anywhere;
}

.workspace__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-snug);
  max-inline-size: 100%;
  overflow-wrap: anywhere;
}
</style>
