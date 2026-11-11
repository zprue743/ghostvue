<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import {
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

function remove(name: string) {
  reports.value = reports.value.filter((report) => report.name !== name)
  status.value = `Deleted ${name}`
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
    <!--
      The skip link is the first focusable element in the document, so it must
      reveal itself on focus. Without `focusable` it would be reachable by
      keyboard while staying invisible.
    -->
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
            <!--
              The actions column header is obvious to a sighted reader and
              missing entirely for a screen reader, so it renders as a real
              `th` that only assistive technology encounters.
            -->
            <SlVisuallyHidden as="th" scope="col"> Actions </SlVisuallyHidden>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.name">
            <td>{{ report.name }}</td>
            <td>{{ report.owner }}</td>
            <td>
              <button type="button" @click="remove(report.name)">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" />
                </svg>
                <SlVisuallyHidden>Delete {{ report.name }}</SlVisuallyHidden>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="reports.length === 0">Every report was deleted.</p>

      <!--
        A visually hidden live region announces an outcome that is otherwise
        conveyed only by a row disappearing. The element is present from first
        render so the region exists before its text changes.
      -->
      <SlVisuallyHidden role="status" aria-live="polite">
        {{ status }}
      </SlVisuallyHidden>
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

/*
 * The skip link moves focus here, so `main` needs `tabindex="-1"` to be a valid
 * target. It is not an interactive control, and the `:focus-visible` rule below
 * still covers every control a keyboard user actually operates.
 */
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
</style>
