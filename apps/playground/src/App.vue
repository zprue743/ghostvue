<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue'

import {
  GhostBadge as GhostBadgeThemed,
  GhostButton as GhostButtonThemed,
  GhostCheckbox as GhostCheckboxThemed,
  GhostField as GhostFieldThemed,
  GhostInput as GhostInputThemed,
  GhostKbd as GhostKbdThemed,
  GhostProgress as GhostProgressThemed,
  GhostSeparator as GhostSeparatorThemed,
  GhostSkeleton as GhostSkeletonThemed,
  GhostSwitch as GhostSwitchThemed,
  GhostTextarea as GhostTextareaThemed,
} from '@ghostvue/themes'

import AmbientReference from './AmbientReference.vue'
import ButtonStateMatrix from './ButtonStateMatrix.vue'
import DensityReference from './DensityReference.vue'
import DialogReference from './DialogReference.vue'
import ModalPrimitivesReference from './ModalPrimitivesReference.vue'
import MotionReference from './MotionReference.vue'
import OverlayReference from './OverlayReference.vue'
import CollapsibleReference from './CollapsibleReference.vue'
import PopoverReference from './PopoverReference.vue'
import TabsReference from './TabsReference.vue'
import VisualReference from './VisualReference.vue'
import {
  GhostBadge,
  GhostButton,
  GhostCheckbox,
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldError,
  GhostFieldLabel,
  GhostInput,
  GhostKbd,
  GhostProgress,
  GhostSeparator,
  GhostSkeleton,
  GhostSwitch,
  GhostTextarea,
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
const searchQuery = ref('')
const submitName = ref('')
const submittedName = ref('')
const opsEmail = ref('')
const distributionOptIn = ref(false)
const playgroundNotes = ref('Headless notes.')
const playgroundBio = ref('Themed bio.')
const playgroundDraft = ref('Auto-resize this draft.\nAdd more lines to grow.')
const playgroundComment = ref('')
const playgroundCommentSent = ref('')
const acceptedTerms = ref(false)
const checkboxSubmissions = ref(0)
const notifications = reactive([
  { id: 'product', label: 'Product updates', selected: true },
  { id: 'digest', label: 'Weekly digest', selected: false },
])

const allNotifications = computed(() =>
  notifications.every((item) => item.selected),
)
const someNotifications = computed(
  () => notifications.some((item) => item.selected) && !allNotifications.value,
)

function toggleAllNotifications(checked: boolean): void {
  for (const item of notifications) {
    item.selected = checked
  }
}

function submitCheckboxForm(event: Event): void {
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return
  // Count only when the named checkbox is checked and therefore in FormData.
  if (new FormData(form).has('subscribe')) {
    checkboxSubmissions.value += 1
  }
}

const airplane = ref(false)
const digestSubmitted = ref('')

function onDigestSubmit(event: Event): void {
  event.preventDefault()
  const data = new FormData(event.target as HTMLFormElement)
  const digest = data.get('digest')
  digestSubmitted.value = typeof digest === 'string' ? digest : 'off'
}

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

function submitPlaygroundComment(event: Event): void {
  event.preventDefault()
  const value = new FormData(event.target as HTMLFormElement).get('comment')
  playgroundCommentSent.value = typeof value === 'string' ? value : ''
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
    <CollapsibleReference />
    <DialogReference />
    <TabsReference />
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

    <section aria-labelledby="checkbox-heading">
      <h2 id="checkbox-heading">GhostCheckbox</h2>
      <div class="comparison">
        <fieldset>
          <legend>Headless</legend>
          <div class="checkbox-list">
            <label>
              <GhostCheckbox
                v-model="acceptedTerms"
                data-testid="checkbox-terms"
              />
              Accept terms
            </label>
            <label>
              <GhostCheckbox
                :model-value="allNotifications"
                :indeterminate="someNotifications"
                data-testid="checkbox-select-all"
                @update:model-value="toggleAllNotifications"
              />
              All notifications
            </label>
            <label v-for="item in notifications" :key="item.id">
              <GhostCheckbox
                v-model="item.selected"
                :data-testid="`checkbox-${item.id}`"
              />
              {{ item.label }}
            </label>
            <label>
              <GhostCheckbox disabled data-testid="checkbox-disabled" />
              Disabled option
            </label>
            <label>
              <GhostCheckbox
                :model-value="false"
                :indeterminate="true"
                data-testid="checkbox-mixed-reject"
              />
              Mixed, controlled false (ignores update)
            </label>
          </div>
          <form class="form-example" @submit.prevent="submitCheckboxForm">
            <span>Subscribe submissions: {{ checkboxSubmissions }}</span>
            <label>
              <GhostCheckbox name="subscribe" data-testid="checkbox-form" />
              Subscribe
            </label>
            <GhostButton type="submit">Submit checkbox form</GhostButton>
          </form>
        </fieldset>

        <fieldset class="ghost-theme" data-ghost-mode="light">
          <legend>Themed checkboxes</legend>
          <div class="checkbox-list">
            <label>
              <GhostCheckboxThemed data-testid="checkbox-themed" />
              Accent
            </label>
            <label>
              <GhostCheckboxThemed
                size="sm"
                tone="neutral"
                data-testid="checkbox-themed-neutral"
              />
              Neutral small
            </label>
            <label>
              <GhostCheckboxThemed
                size="lg"
                tone="danger"
                data-testid="checkbox-themed-danger"
              />
              Danger large
            </label>
            <label>
              <GhostCheckboxThemed
                :model-value="false"
                :indeterminate="true"
                data-testid="checkbox-mixed-reject-themed"
              />
              Mixed reject (themed)
            </label>
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

    <section aria-labelledby="progress-heading">
      <h2 id="progress-heading">GhostProgress</h2>
      <GhostProgress
        class="playground-progress"
        label="Uploading report"
        :value="40"
        data-testid="progress-determinate"
      />
      <GhostProgress
        class="playground-progress"
        label="Uploading files"
        :value="3"
        :max="10"
        value-text="3 of 10 files"
        data-testid="progress-value-text"
      />
      <GhostProgress
        class="playground-progress"
        label="Preparing export"
        data-testid="progress-indeterminate"
      />
      <div
        class="progress-themed ghost-theme"
        data-testid="progress-themed-stack"
      >
        <GhostProgressThemed
          label="Compact export"
          size="sm"
          tone="neutral"
          :value="70"
          data-testid="progress-themed"
        />
        <GhostProgressThemed
          label="Deleting rows"
          tone="danger"
          data-testid="progress-themed-indeterminate"
        />
      </div>
    </section>

    <section aria-labelledby="input-heading">
      <h2 id="input-heading">GhostInput</h2>
      <div class="field">
        <label for="playground-search">Search reports</label>
        <GhostInput
          id="playground-search"
          v-model="searchQuery"
          type="search"
          name="q"
          placeholder="Forecast"
          data-testid="input-search"
        />
        <p data-testid="input-search-value">{{ searchQuery }}</p>
      </div>
      <div class="field">
        <label for="playground-disabled">Disabled filter</label>
        <GhostInput
          id="playground-disabled"
          disabled
          default-value="cannot edit"
        />
      </div>
      <div class="field">
        <label for="playground-readonly">Readonly owner</label>
        <GhostInput id="playground-readonly" readonly default-value="Priya" />
      </div>
      <div class="field">
        <label for="playground-invalid">Invalid query</label>
        <GhostInput id="playground-invalid" invalid default-value="???" />
      </div>
      <div class="field">
        <label for="playground-required">Required name</label>
        <GhostInput id="playground-required" required />
      </div>
      <form class="form-example" @submit.prevent="submittedName = submitName">
        <div class="field">
          <label for="playground-submit-name">Submit name</label>
          <GhostInput
            id="playground-submit-name"
            v-model="submitName"
            name="name"
          />
        </div>
        <GhostButtonThemed data-testid="input-submit" type="submit">
          Save name
        </GhostButtonThemed>
        <p data-testid="input-submitted">{{ submittedName }}</p>
      </form>
      <div class="field ghost-theme">
        <label for="playground-themed">Themed filter</label>
        <GhostInputThemed id="playground-themed" placeholder="Themed" block />
      </div>
    </section>

    <section aria-labelledby="field-heading">
      <h2 id="field-heading">GhostField</h2>
      <GhostField data-testid="field-headless">
        <GhostFieldLabel>Ops contact email</GhostFieldLabel>
        <GhostFieldDescription>
          Escalation address for on-call rotations.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            v-model="opsEmail"
            name="ops-email"
            data-testid="field-input"
          />
        </GhostFieldControl>
      </GhostField>
      <p data-testid="field-input-value">{{ opsEmail }}</p>
      <GhostField invalid data-testid="field-invalid">
        <GhostFieldLabel required>Distribution list</GhostFieldLabel>
        <GhostFieldControl v-slot="field">
          <GhostInput
            v-bind="field"
            default-value="incomplete"
            name="distribution"
            data-testid="field-invalid-input"
          />
        </GhostFieldControl>
        <GhostFieldError>Provide a complete mailing list id.</GhostFieldError>
      </GhostField>
      <GhostField>
        <GhostFieldLabel associate="wrap">
          <GhostFieldControl v-slot="field">
            <GhostCheckbox
              v-bind="field"
              v-model="distributionOptIn"
              name="distribution-opt-in"
              data-testid="field-checkbox"
            />
          </GhostFieldControl>
          Include me on distribution digests
        </GhostFieldLabel>
      </GhostField>
      <GhostFieldThemed class="ghost-theme" data-testid="field-themed">
        <GhostFieldLabel>Billing contact</GhostFieldLabel>
        <GhostFieldDescription>
          Receives renewal paperwork only.
        </GhostFieldDescription>
        <GhostFieldControl v-slot="field">
          <GhostInputThemed
            v-bind="field"
            name="billing-contact"
            data-testid="field-themed-input"
          />
        </GhostFieldControl>
      </GhostFieldThemed>
    </section>

    <section aria-labelledby="textarea-heading">
      <h2 id="textarea-heading">GhostTextarea</h2>
      <div class="textarea-stack">
        <label for="pg-notes">Notes</label>
        <GhostTextarea
          id="pg-notes"
          v-model="playgroundNotes"
          name="notes"
          data-testid="textarea-headless"
        />

        <label for="pg-bio">Bio</label>
        <GhostTextareaThemed
          id="pg-bio"
          v-model="playgroundBio"
          data-testid="textarea-themed"
        />

        <label for="pg-disabled">Disabled</label>
        <GhostTextareaThemed
          id="pg-disabled"
          default-value="Cannot edit"
          disabled
          data-testid="textarea-disabled"
        />

        <label for="pg-readonly">Readonly</label>
        <GhostTextareaThemed
          id="pg-readonly"
          default-value="Visible, not editable"
          readonly
          data-testid="textarea-readonly"
        />

        <label for="pg-invalid">Invalid</label>
        <GhostTextareaThemed
          id="pg-invalid"
          default-value="Needs more detail"
          invalid
          required
          data-testid="textarea-invalid"
        />

        <label for="pg-draft">Draft</label>
        <GhostTextareaThemed
          id="pg-draft"
          v-model="playgroundDraft"
          :rows="3"
          :max-rows="6"
          auto-resize
          data-testid="textarea-auto-resize"
        />
      </div>

      <form
        class="form-example"
        data-testid="textarea-form"
        @submit="submitPlaygroundComment"
      >
        <label for="pg-comment">Comment</label>
        <GhostTextareaThemed
          id="pg-comment"
          v-model="playgroundComment"
          name="comment"
          required
          data-testid="textarea-comment"
        />
        <GhostButtonThemed type="submit">Send comment</GhostButtonThemed>
        <p v-if="playgroundCommentSent" data-testid="textarea-comment-sent">
          Sent: {{ playgroundCommentSent }}
        </p>
      </form>
    </section>

    <section aria-labelledby="switch-heading">
      <h2 id="switch-heading">GhostSwitch</h2>
      <p>Airplane: {{ airplane ? 'on' : 'off' }}</p>
      <div class="switch-row">
        <label for="playground-airplane">Airplane mode</label>
        <GhostSwitch id="playground-airplane" v-model="airplane" />
      </div>
      <div class="switch-row">
        <label for="playground-switch-disabled">Disabled alerts</label>
        <GhostSwitch id="playground-switch-disabled" disabled default-value />
      </div>
      <div class="switch-row">
        <label for="playground-switch-readonly">Read-only policy</label>
        <GhostSwitch id="playground-switch-readonly" readonly default-value />
      </div>
      <form class="form-example" @submit="onDigestSubmit">
        <div class="switch-row">
          <label for="playground-digest">Daily digest</label>
          <GhostSwitch
            id="playground-digest"
            name="digest"
            value="daily"
            default-value
          />
        </div>
        <div class="examples">
          <GhostButton type="submit">Save digest</GhostButton>
          <GhostButton type="reset">Reset digest</GhostButton>
        </div>
        <p>Digest submitted: {{ digestSubmitted || 'none' }}</p>
      </form>
      <fieldset class="ghost-theme">
        <legend>Themed switch</legend>
        <div class="switch-row">
          <label for="playground-dark">Dark mode</label>
          <GhostSwitchThemed id="playground-dark" />
        </div>
      </fieldset>
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

    <section aria-labelledby="skeleton-heading">
      <h2 id="skeleton-heading">GhostSkeleton</h2>
      <p>
        Decorative placeholders. Assistive technology should hear the caption,
        not the bones.
      </p>
      <div class="examples">
        <GhostSkeleton
          data-testid="headless-skeleton"
          style="display: inline-block; inline-size: 8rem; block-size: 1rem"
        />
      </div>
      <fieldset class="ghost-theme" data-ghost-mode="light">
        <legend>Skeleton theme</legend>
        <div class="examples">
          <GhostSkeletonThemed
            data-testid="themed-skeleton-text"
            style="inline-size: 8rem"
          />
          <GhostSkeletonThemed
            shape="rect"
            data-testid="themed-skeleton-rect"
            style="inline-size: 8rem"
          />
          <GhostSkeletonThemed
            shape="circle"
            data-testid="themed-skeleton-circle"
          />
          <GhostSkeletonThemed
            shape="circle"
            data-testid="themed-skeleton-circle-sm"
            style="inline-size: 1.5rem"
          />
        </div>
        <table aria-busy="true" data-testid="skeleton-table">
          <caption>
            Loading invoices
          </caption>
          <thead>
            <tr>
              <th scope="col">Invoice</th>
              <th scope="col">Owner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <GhostSkeletonThemed as="td" />
              <GhostSkeletonThemed as="td" style="inline-size: 6rem" />
            </tr>
          </tbody>
        </table>
      </fieldset>
    </section>

    <!-- After visual fixtures so extra page height does not shift snapshot
         clips. PC labels only: Apple glyphs can load a fallback font and
         change rasterization of earlier shots. -->
    <section aria-labelledby="form-reset-heading">
      <h2 id="form-reset-heading">Form reset</h2>
      <form class="form-example" data-testid="form-reset-suite">
        <div class="field">
          <label for="form-reset-input">Reset input</label>
          <GhostInput
            id="form-reset-input"
            data-testid="form-reset-input"
            default-value="seed"
            name="reset-input"
          />
        </div>
        <div class="field">
          <label for="form-reset-textarea">Reset textarea</label>
          <GhostTextarea
            id="form-reset-textarea"
            data-testid="form-reset-textarea"
            default-value="seed"
            name="reset-notes"
          />
        </div>
        <div class="field">
          <GhostCheckbox
            id="form-reset-checkbox"
            data-testid="form-reset-checkbox"
            default-value
            name="reset-agree"
          />
          <label for="form-reset-checkbox">Reset checkbox</label>
        </div>
        <div class="switch-row">
          <label for="form-reset-switch">Reset switch</label>
          <GhostSwitch
            id="form-reset-switch"
            data-testid="form-reset-switch"
            name="reset-alerts"
            aria-label="Reset switch"
          />
        </div>
        <GhostButton type="reset" data-testid="form-reset-trigger">
          Reset suite
        </GhostButton>
      </form>
    </section>

    <section aria-labelledby="kbd-heading">
      <h2 id="kbd-heading">GhostKbd</h2>
      <p>
        Reload with <GhostKbd>F5</GhostKbd>. Save:
        <GhostKbd :keys="['mod', 's']" platform="pc" />.
      </p>
      <p class="ghost-theme">
        Themed:
        <GhostKbdThemed :keys="['mod', 's']" platform="pc" />
        <GhostKbdThemed size="sm">Esc</GhostKbdThemed>
      </p>
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

.field {
  display: grid;
  gap: 0.35rem;
  margin-block-start: 1rem;
}

.separator-toolbar {
  align-items: stretch;
  display: flex;
  gap: 0.75rem;
  margin-block-start: 1rem;
}

/* Headless progress ships no visuals; playground-owned track, not the themed recipe. */
.playground-progress {
  background: Canvas;
  block-size: 0.5rem;
  border: 1px solid GrayText;
  border-radius: 999px;
  inline-size: min(100%, 24rem);
  overflow: hidden;
}

.playground-progress [data-part='indicator'] {
  background: CanvasText;
  block-size: 100%;
}

.playground-progress[data-state='indeterminate'] [data-part='indicator'] {
  inline-size: 40%;
}

.progress-themed {
  display: grid;
  gap: 1rem;
  inline-size: min(100%, 24rem);
  margin-block-start: 1rem;
}

.textarea-stack {
  display: grid;
  gap: 0.75rem;
  max-inline-size: 32rem;
}

.checkbox-list {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.checkbox-list label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.switch-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block: 0.5rem;
}
</style>
