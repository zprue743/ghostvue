<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import {
  GhostBadge as GhostBadgeThemed,
  GhostButton as GhostButtonThemed,
  GhostSeparator as GhostSeparatorThemed,
} from '@ghostvue/themes'

import AmbientReference from './AmbientReference.vue'
import ButtonStateMatrix from './ButtonStateMatrix.vue'
import DensityReference from './DensityReference.vue'
import DialogReference from './DialogReference.vue'
import ModalPrimitivesReference from './ModalPrimitivesReference.vue'
import MotionReference from './MotionReference.vue'
import OverlayReference from './OverlayReference.vue'
import PopoverReference from './PopoverReference.vue'
import VisualReference from './VisualReference.vue'
import {
  GhostBadge,
  GhostButton,
  GhostSeparator,
  GhostVisuallyHidden,
  useFocusScope,
  useRovingFocus,
} from '@ghostvue/vue'

const flagships = ['calm', 'vibrant', 'mono'] as const
const flagshipDensities = ['comfortable'] as const

interface Report {
  name: string
  owner: string
}

const reports = ref<Report[]>([
  { name: 'Q3 revenue', owner: 'Priya' },
  { name: 'Q4 forecast', owner: 'Sam' },
])

const status = ref('')
const activations = ref(0)
const submissions = ref(0)
const pendingActivations = ref(0)
const isPending = ref(false)

function remove(name: string) {
  reports.value = reports.value.filter((report) => report.name !== name)
  status.value = `Deleted ${name}`
}

function startPending() {
  pendingActivations.value += 1
  isPending.value = true
}

const trapOpen = ref(false)
const trap = useTemplateRef<HTMLElement>('trap')
useFocusScope(trap, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})

const nestedOpen = ref(false)
const nestedInnerOpen = ref(false)
const nestedOuter = useTemplateRef<HTMLElement>('nested-outer')
const nestedInner = useTemplateRef<HTMLElement>('nested-inner')
useFocusScope(nestedOuter, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})
useFocusScope(nestedInner, {
  trapped: true,
  loop: true,
  autoFocus: true,
  restoreFocus: true,
})

const horizontal = useTemplateRef<HTMLElement>('roving-horizontal')
useRovingFocus(horizontal, { orientation: 'horizontal', loop: true })

const vertical = useTemplateRef<HTMLElement>('roving-vertical')
useRovingFocus(vertical, { orientation: 'vertical', loop: true })

const rtl = useTemplateRef<HTMLElement>('roving-rtl')
useRovingFocus(rtl, { orientation: 'horizontal', dir: 'rtl', loop: true })

function closeNested(): void {
  nestedInnerOpen.value = false
  nestedOpen.value = false
}
</script>

<template>
  <header>
    <!-- Skip link must reveal on focus; without `focusable` it stays invisible. -->
    <GhostVisuallyHidden focusable>
      <a class="skip-link" href="#main">Skip to content</a>
    </GhostVisuallyHidden>
  </header>

  <main id="main" tabindex="-1">
    <h1>GhostVue playground</h1>
    <p>
      Pre-release host for components that have passed the component gate. Focus
      primitives below are fixtures for keyboard tests, not library components.
    </p>

    <section aria-labelledby="visually-hidden-heading">
      <h2 id="visually-hidden-heading">GhostVisuallyHidden</h2>

      <table>
        <caption>
          Saved reports
        </caption>
        <thead>
          <tr>
            <th scope="col">Report</th>
            <th scope="col">Owner</th>
            <!-- Real `th` for AT; sighted users infer the column from context. -->
            <GhostVisuallyHidden as="th" scope="col">
              Actions
            </GhostVisuallyHidden>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.name">
            <td>{{ report.name }}</td>
            <td>{{ report.owner }}</td>
            <td>
              <GhostButton @click="remove(report.name)">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" />
                </svg>
                <GhostVisuallyHidden>
                  Delete {{ report.name }}
                </GhostVisuallyHidden>
              </GhostButton>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="reports.length === 0">Every report was deleted.</p>

      <!-- Live region must exist before its text changes. -->
      <GhostVisuallyHidden role="status" aria-live="polite">
        {{ status }}
      </GhostVisuallyHidden>
    </section>

    <VisualReference />
    <MotionReference />
    <DensityReference />
    <ButtonStateMatrix />
    <ButtonStateMatrix
      v-for="flagship in flagships"
      :key="flagship"
      :theme="flagship"
      :density-filter="flagshipDensities"
    />
    <AmbientReference />
    <OverlayReference />
    <PopoverReference />
    <DialogReference />
    <ModalPrimitivesReference />

    <section aria-labelledby="button-heading">
      <h2 id="button-heading">GhostButton</h2>
      <p>Activations: {{ activations }}</p>
      <div class="comparison">
        <fieldset>
          <legend>Headless</legend>
          <p>No theme styles are applied to these buttons.</p>
          <div class="examples">
            <GhostButton @click="activations += 1"> Run action </GhostButton>
            <GhostButton disabled @click="activations += 1">
              Disabled action
            </GhostButton>
          </div>
          <form class="form-example" @submit.prevent="submissions += 1">
            <span>Form submissions: {{ submissions }}</span>
            <div class="examples">
              <GhostButton>Default form action</GhostButton>
              <GhostButton type="submit">Submit form</GhostButton>
            </div>
          </form>
        </fieldset>

        <fieldset class="ghost-theme">
          <legend>System mode</legend>
          <p>
            Unset data-ghost-mode follows prefers-color-scheme from CSS, with no
            script required.
          </p>
          <div class="examples">
            <div class="example">
              <span>System action</span>
              <GhostButtonThemed>System action</GhostButtonThemed>
            </div>
          </div>
        </fieldset>

        <fieldset class="ghost-theme" data-ghost-mode="light">
          <legend>Default theme</legend>
          <p>The same actions with the themed wrapper enabled.</p>
          <div class="examples">
            <div class="example">
              <span>Icon with text</span>
              <GhostButtonThemed @click="activations += 1">
                <span data-part="icon">
                  <svg aria-hidden="true" viewBox="0 0 16 16">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" />
                  </svg>
                </span>
                Add item
              </GhostButtonThemed>
            </div>
            <div class="example">
              <span>Neutral soft</span>
              <GhostButtonThemed
                variant="soft"
                tone="neutral"
                size="sm"
                @click="activations += 1"
              >
                Neutral action
              </GhostButtonThemed>
            </div>
            <div class="example">
              <span>Outline</span>
              <GhostButtonThemed variant="outline" @click="activations += 1">
                Outline action
              </GhostButtonThemed>
            </div>
            <div class="example">
              <span>Danger solid</span>
              <GhostButtonThemed
                tone="danger"
                size="lg"
                @click="activations += 1"
              >
                Delete item
              </GhostButtonThemed>
            </div>
            <div class="example">
              <span>Loading (activations: {{ pendingActivations }})</span>
              <div class="examples">
                <GhostButtonThemed :loading="isPending" @click="startPending">
                  Save changes
                </GhostButtonThemed>
                <GhostButtonThemed
                  variant="ghost"
                  tone="neutral"
                  @click="isPending = false"
                >
                  Reset
                </GhostButtonThemed>
              </div>
            </div>
            <div class="example">
              <span>Custom loading indicator</span>
              <GhostButtonThemed loading>
                <svg
                  data-part="loading-indicator"
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
                Publishing
              </GhostButtonThemed>
            </div>
            <div class="example">
              <span>Icon only</span>
              <GhostButtonThemed
                icon-only
                aria-label="Close playground"
                @click="activations += 1"
              >
                <svg data-part="icon" aria-hidden="true" viewBox="0 0 16 16">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" />
                </svg>
              </GhostButtonThemed>
            </div>
            <div class="example block-example">
              <span>Consumer override</span>
              <GhostButtonThemed
                class="product-button"
                block
                @click="activations += 1"
              >
                Product action
              </GhostButtonThemed>
            </div>
          </div>
        </fieldset>
      </div>
    </section>

    <section aria-labelledby="badge-heading">
      <h2 id="badge-heading">GhostBadge</h2>
      <div class="comparison">
        <fieldset>
          <legend>Headless</legend>
          <p>No theme styles are applied to these badges.</p>
          <div class="examples">
            <GhostBadge>Active</GhostBadge>
            <GhostBadge>12</GhostBadge>
            <GhostBadge>Status: Open</GhostBadge>
          </div>
        </fieldset>

        <fieldset class="ghost-theme" data-ghost-mode="light">
          <legend>Themed badges</legend>
          <p>The same metadata with the themed wrapper enabled.</p>
          <div class="examples">
            <div class="example">
              <span>Soft neutral default</span>
              <GhostBadgeThemed data-testid="themed-badge">
                Active
              </GhostBadgeThemed>
            </div>
            <div class="example">
              <span>Accent with icon</span>
              <GhostBadgeThemed tone="accent">
                <svg data-part="icon" aria-hidden="true" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="5" fill="currentColor" />
                </svg>
                Live
              </GhostBadgeThemed>
            </div>
            <div class="example">
              <span>Danger outline</span>
              <GhostBadgeThemed variant="outline" tone="danger">
                Overdue
              </GhostBadgeThemed>
            </div>
            <div class="example">
              <span>Solid md count</span>
              <GhostBadgeThemed variant="solid" size="md">24</GhostBadgeThemed>
            </div>
            <div class="example">
              <span>Icon with hidden name</span>
              <GhostBadgeThemed>
                <svg data-part="icon" aria-hidden="true" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="3" fill="currentColor" />
                </svg>
                <GhostVisuallyHidden>New</GhostVisuallyHidden>
              </GhostBadgeThemed>
            </div>
          </div>
          <table>
            <caption>
              Cell statuses
            </caption>
            <thead>
              <tr>
                <th scope="col">Report</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Q3 revenue</td>
                <td><GhostBadgeThemed>Draft</GhostBadgeThemed></td>
              </tr>
            </tbody>
          </table>
        </fieldset>
      </div>
    </section>

    <section aria-labelledby="trap-heading">
      <h2 id="trap-heading">Focus scope</h2>
      <button type="button" data-testid="open-trap" @click="trapOpen = true">
        Open trap
      </button>
      <div
        v-if="trapOpen"
        ref="trap"
        tabindex="-1"
        role="dialog"
        aria-labelledby="trap-title"
        data-testid="trap"
      >
        <h3 id="trap-title">Trapped dialog</h3>
        <button type="button" data-testid="trap-first">Trap first</button>
        <button type="button" data-testid="trap-last">Trap last</button>
        <button
          type="button"
          data-testid="close-trap"
          @click="trapOpen = false"
        >
          Close trap
        </button>
      </div>

      <button
        type="button"
        data-testid="open-nested"
        @click="nestedOpen = true"
      >
        Open nested outer
      </button>
      <div
        v-if="nestedOpen"
        ref="nested-outer"
        tabindex="-1"
        role="dialog"
        aria-labelledby="nested-outer-title"
        data-testid="nested-outer"
      >
        <h3 id="nested-outer-title">Outer trap</h3>
        <button type="button" data-testid="nested-outer-first">
          Outer first
        </button>
        <button
          type="button"
          data-testid="open-nested-inner"
          @click="nestedInnerOpen = true"
        >
          Open nested inner
        </button>
        <div
          v-if="nestedInnerOpen"
          ref="nested-inner"
          tabindex="-1"
          role="dialog"
          aria-labelledby="nested-inner-title"
          data-testid="nested-inner"
        >
          <h3 id="nested-inner-title">Inner trap</h3>
          <button type="button" data-testid="nested-inner-first">
            Inner first
          </button>
          <button type="button" data-testid="nested-inner-last">
            Inner last
          </button>
          <button
            type="button"
            data-testid="close-nested-inner"
            @click="nestedInnerOpen = false"
          >
            Close nested inner
          </button>
        </div>
        <button type="button" data-testid="nested-outer-last">
          Outer last
        </button>
        <button type="button" data-testid="close-nested" @click="closeNested">
          Close nested outer
        </button>
      </div>
    </section>

    <section aria-labelledby="separator-heading">
      <h2 id="separator-heading">GhostSeparator</h2>
      <div data-testid="separator-stack">
        <p>Above the rule</p>
        <GhostSeparator data-testid="separator-horizontal" />
        <p>Below the rule</p>
      </div>
      <GhostSeparator decorative data-testid="separator-decorative" />
      <div
        class="separator-toolbar ghost-theme"
        data-testid="separator-toolbar"
      >
        <GhostButtonThemed size="sm">Cut</GhostButtonThemed>
        <GhostSeparatorThemed
          orientation="vertical"
          data-testid="separator-vertical"
        />
        <GhostButtonThemed size="sm">Copy</GhostButtonThemed>
      </div>
    </section>

    <section aria-labelledby="roving-heading">
      <h2 id="roving-heading">Roving focus</h2>
      <button type="button" data-testid="before-roving">Before roving</button>
      <div
        ref="roving-horizontal"
        role="toolbar"
        aria-label="Horizontal roving demo"
        data-testid="roving-horizontal"
      >
        <button type="button">One</button>
        <button type="button" disabled>Two</button>
        <button type="button">Three</button>
        <button type="button">Four</button>
      </div>
      <div
        ref="roving-vertical"
        role="toolbar"
        aria-label="Vertical roving demo"
        aria-orientation="vertical"
        data-testid="roving-vertical"
      >
        <button type="button">Alpha</button>
        <button type="button">Beta</button>
        <button type="button">Gamma</button>
      </div>
      <div
        ref="roving-rtl"
        role="toolbar"
        aria-label="RTL roving demo"
        dir="rtl"
        data-testid="roving-rtl"
      >
        <button type="button">Rightmost</button>
        <button type="button">Middle</button>
        <button type="button">Leftmost</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  margin: 2rem;
}

/* Ghost* / --ghost-* identifiers are long unbreakable tokens.
 * Wrap them at the 320px overflow check instead of widening the page. */
main :is(h1, h2, h3, code) {
  overflow-wrap: anywhere;
}

/* Skip-link target; not an interactive control. */
main:focus {
  outline: none;
}

table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #767676;
  padding: 0.5rem 0.75rem;
  text-align: start;
}

/* Headless buttons get a playground-owned target; themed instances size themselves. */
button {
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
}

/* The library ships no styling, so the playground owns visible focus. */
:focus-visible {
  outline: 0.2rem solid Highlight;
  outline-offset: 0.15rem;
}

.skip-link {
  display: inline-block;
  margin: 0.5rem;
}

.comparison {
  display: grid;
  gap: 1rem;
  /* One shrinking column at 320px; side-by-side only when 18rem tracks fit. */
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 44rem) {
  .comparison {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

fieldset {
  min-inline-size: 0;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.form-example {
  display: grid;
  gap: 0.5rem;
  margin-block-start: 1rem;
}

.example {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.block-example {
  flex: 1 1 100%;
}

.separator-toolbar {
  align-items: stretch;
  display: flex;
  gap: 0.75rem;
  margin-block-start: 1rem;
}
</style>
