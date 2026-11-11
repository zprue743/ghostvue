<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { SlButton as SlButtonThemed } from '@slop-ui/themes'

import ButtonStateMatrix from './ButtonStateMatrix.vue'
import DensityReference from './DensityReference.vue'
import MotionReference from './MotionReference.vue'
import VisualReference from './VisualReference.vue'
import {
  SlButton,
  SlVisuallyHidden,
  useFocusScope,
  useRovingFocus,
} from '@slop-ui/vue'

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
    <SlVisuallyHidden focusable>
      <a class="skip-link" href="#main">Skip to content</a>
    </SlVisuallyHidden>
  </header>

  <main id="main" tabindex="-1">
    <h1>slop-ui playground</h1>
    <p>
      Pre-release host for components that have passed the component gate. Focus
      primitives below are fixtures for keyboard tests, not library components.
    </p>

    <section aria-labelledby="visually-hidden-heading">
      <h2 id="visually-hidden-heading">SlVisuallyHidden</h2>

      <table>
        <caption>
          Saved reports
        </caption>
        <thead>
          <tr>
            <th scope="col">Report</th>
            <th scope="col">Owner</th>
            <!-- Real `th` for AT; sighted users infer the column from context. -->
            <SlVisuallyHidden as="th" scope="col"> Actions </SlVisuallyHidden>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.name">
            <td>{{ report.name }}</td>
            <td>{{ report.owner }}</td>
            <td>
              <SlButton @click="remove(report.name)">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" />
                </svg>
                <SlVisuallyHidden>Delete {{ report.name }}</SlVisuallyHidden>
              </SlButton>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="reports.length === 0">Every report was deleted.</p>

      <!-- Live region must exist before its text changes. -->
      <SlVisuallyHidden role="status" aria-live="polite">
        {{ status }}
      </SlVisuallyHidden>
    </section>

    <VisualReference />
    <MotionReference />
    <DensityReference />
    <ButtonStateMatrix />

    <section aria-labelledby="button-heading">
      <h2 id="button-heading">SlButton</h2>
      <p>Activations: {{ activations }}</p>
      <div class="comparison">
        <fieldset>
          <legend>Headless</legend>
          <p>No theme styles are applied to these buttons.</p>
          <div class="examples">
            <SlButton @click="activations += 1"> Run action </SlButton>
            <SlButton disabled @click="activations += 1">
              Disabled action
            </SlButton>
          </div>
          <form class="form-example" @submit.prevent="submissions += 1">
            <span>Form submissions: {{ submissions }}</span>
            <div class="examples">
              <SlButton>Default form action</SlButton>
              <SlButton type="submit">Submit form</SlButton>
            </div>
          </form>
        </fieldset>

        <fieldset class="slop-theme">
          <legend>System mode</legend>
          <p>
            Unset data-sl-mode follows prefers-color-scheme from CSS, with no
            script required.
          </p>
          <div class="examples">
            <div class="example">
              <span>System action</span>
              <SlButtonThemed>System action</SlButtonThemed>
            </div>
          </div>
        </fieldset>

        <fieldset class="slop-theme" data-sl-mode="light">
          <legend>Default theme</legend>
          <p>The same actions with the themed wrapper enabled.</p>
          <div class="examples">
            <div class="example">
              <span>Icon with text</span>
              <SlButtonThemed @click="activations += 1">
                <span data-part="icon">
                  <svg aria-hidden="true" viewBox="0 0 16 16">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" />
                  </svg>
                </span>
                Add item
              </SlButtonThemed>
            </div>
            <div class="example">
              <span>Neutral soft</span>
              <SlButtonThemed
                variant="soft"
                tone="neutral"
                size="sm"
                @click="activations += 1"
              >
                Neutral action
              </SlButtonThemed>
            </div>
            <div class="example">
              <span>Outline</span>
              <SlButtonThemed variant="outline" @click="activations += 1">
                Outline action
              </SlButtonThemed>
            </div>
            <div class="example">
              <span>Danger solid</span>
              <SlButtonThemed tone="danger" size="lg" @click="activations += 1">
                Delete item
              </SlButtonThemed>
            </div>
            <div class="example">
              <span>Loading (activations: {{ pendingActivations }})</span>
              <div class="examples">
                <SlButtonThemed :loading="isPending" @click="startPending">
                  Save changes
                </SlButtonThemed>
                <SlButtonThemed
                  variant="ghost"
                  tone="neutral"
                  @click="isPending = false"
                >
                  Reset
                </SlButtonThemed>
              </div>
            </div>
            <div class="example">
              <span>Custom loading indicator</span>
              <SlButtonThemed loading>
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
              </SlButtonThemed>
            </div>
            <div class="example">
              <span>Icon only</span>
              <SlButtonThemed
                icon-only
                aria-label="Close playground"
                @click="activations += 1"
              >
                <svg data-part="icon" aria-hidden="true" viewBox="0 0 16 16">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" />
                </svg>
              </SlButtonThemed>
            </div>
            <div class="example block-example">
              <span>Consumer override</span>
              <SlButtonThemed
                class="product-button"
                block
                @click="activations += 1"
              >
                Product action
              </SlButtonThemed>
            </div>
          </div>
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
</style>
